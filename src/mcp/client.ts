
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process"

import { WebSocket } from "ws"

import type {
  ChatCompletionsFunctionTool,
  ChatToolParametersSchema,
  JsonRecord,
  JsonValue
} from "../types"

const MCP_PROTOCOL_VERSION = "2025-06-18"

type TransportKind = "websocket" | "http" | "stdio"

interface JsonRpcResponse {
  jsonrpc: "2.0"
  id: number | string | null
  result?: JsonValue
  error?: {
    code: number
    message: string
    data?: JsonValue
  }
}

class JsonRpcError extends Error {
  public readonly code: number
  public readonly data?: JsonValue

  constructor(code: number, message: string, data?: JsonValue) {
    super(message)
    this.code = code
    this.data = data
    this.name = "JsonRpcError"
  }
}

interface PendingRequest {
  resolve: (value: JsonValue | undefined) => void
  reject: (reason: unknown) => void
}

export interface McpClientOptions {
  transport?: TransportKind
  url?: string
  headers?: Record<string, string>
  protocolVersion?: string
  fetch?: typeof fetch
  stdio?: {
    command?: string
    args?: string[]
    cwd?: string
    env?: NodeJS.ProcessEnv
    input?: NodeJS.ReadableStream
    output?: NodeJS.WritableStream
  }
}

class McpClient {
  private readonly transport: TransportKind
  private readonly protocolVersion: string
  private readonly headers?: Record<string, string>
  private readonly fetchFn: typeof fetch
  private readonly stdioOptions?: McpClientOptions["stdio"]
  private sessionId?: string
  private httpUrl?: string
  private ws?: WebSocket
  private stdioProcess?: ChildProcessWithoutNullStreams
  private stdioInput?: NodeJS.WritableStream
  private stdioOutput?: NodeJS.ReadableStream
  private stdioBuffer = ""
  private stdioListener?: (chunk: Buffer | string) => void
  private negotiatedProtocolVersion?: string
  private requestId = 0
  private readonly pending = new Map<number, PendingRequest>()

  constructor(options: McpClientOptions) {
    const transport = options.transport ?? McpClient.detectTransport(options)
    this.transport = transport
    this.headers = options.headers
    this.protocolVersion = options.protocolVersion ?? MCP_PROTOCOL_VERSION
    this.fetchFn = options.fetch ?? (typeof fetch !== "undefined" ? fetch.bind(globalThis) : (() => {
      throw new Error("fetch is not available in this environment")
    }))
    this.stdioOptions = options.stdio
    this.sessionId = undefined

    if ((transport === "websocket" || transport === "http") && !options.url) {
      throw new Error("url is required for websocket and http transports")
    }
    if (transport === "stdio" && !options.stdio) {
      throw new Error("stdio options are required for stdio transport")
    }

    if (transport === "http" || transport === "websocket") {
      this.httpUrl = options.url
    }
  }

  private static detectTransport(options: McpClientOptions): TransportKind {
    if (options.transport) return options.transport
    if (options.url?.startsWith("http://") || options.url?.startsWith("https://")) {
      return "http"
    }
    if (options.url?.startsWith("ws://") || options.url?.startsWith("wss://")) {
      return "websocket"
    }
    if (options.stdio) {
      return "stdio"
    }
    throw new Error("Unable to determine MCP transport; specify transport or provide url/stdio options")
  }

  public async connect(): Promise<void> {
    if (this.transport === "websocket") {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) return
      const ws = new WebSocket(this.httpUrl!, { headers: this.headers })
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("connect timeout")), 15_000)
        ws.once("open", () => {
          clearTimeout(timer)
          resolve()
        })
        ws.once("error", error => {
          clearTimeout(timer)
          reject(error)
        })
      })
      ws.on("message", payload => this.processResponsePayload(payload.toString()))
      ws.on("close", () => this.flushPending(new Error("Connection closed")))
      this.ws = ws
      return
    }

    if (this.transport === "stdio") {
      if (this.stdioInput || this.stdioOutput) return
      const stdioOptions = this.stdioOptions!
      if (stdioOptions.command) {
        this.stdioProcess = spawn(stdioOptions.command, stdioOptions.args ?? [], {
          cwd: stdioOptions.cwd,
          env: stdioOptions.env,
          stdio: "pipe"
        })
        this.stdioInput = this.stdioProcess.stdin
        this.stdioOutput = this.stdioProcess.stdout
        this.stdioProcess.stderr?.on("data", data => {
          console.warn("[mcp-client:stdio]", data.toString())
        })
        this.stdioProcess.once("exit", () => {
          this.flushPending(new Error("STDIO process exited"))
        })
      } else {
        if (!stdioOptions.input || !stdioOptions.output) {
          throw new Error("stdio transport requires either command or input/output streams")
        }
        this.stdioOutput = stdioOptions.input
        this.stdioInput = stdioOptions.output
      }

      const output = this.stdioOutput!
      if (typeof (output as NodeJS.ReadableStream & { setEncoding?: (encoding: string) => void }).setEncoding === "function") {
        ;(output as NodeJS.ReadableStream & { setEncoding?: (encoding: string) => void }).setEncoding("utf8")
      }
      this.stdioListener = chunk => {
        this.stdioBuffer += chunk.toString()
        let newlineIndex = this.stdioBuffer.indexOf("\n")
        while (newlineIndex !== -1) {
          const rawLine = this.stdioBuffer.slice(0, newlineIndex).replace(/\r$/, "")
          this.stdioBuffer = this.stdioBuffer.slice(newlineIndex + 1)
          if (rawLine.trim().length > 0) {
            this.processResponsePayload(rawLine)
          }
          newlineIndex = this.stdioBuffer.indexOf("\n")
        }
      }
      output.on("data", this.stdioListener)
      return
    }

    // http transport requires no persistent connection
    return
  }

  public async disconnect(): Promise<void> {
    if (this.transport === "websocket") {
      if (!this.ws) return
      const ws = this.ws
      if (ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
        this.ws = undefined
        this.flushPending(new Error("Connection closed"))
        return
      }
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("disconnect timeout")), 5_000)
        ws.once("close", () => {
          clearTimeout(timer)
          resolve()
        })
        ws.once("error", error => {
          clearTimeout(timer)
          reject(error)
        })
        ws.close()
      })
      this.ws = undefined
      return
    }

    if (this.transport === "stdio") {
      if (this.stdioOutput && this.stdioListener) {
        this.stdioOutput.off("data", this.stdioListener)
      }
      this.stdioListener = undefined
      this.stdioOutput = undefined
      if (this.stdioProcess) {
        this.stdioProcess.kill()
        this.stdioProcess = undefined
      }
      this.stdioInput = undefined
      this.flushPending(new Error("Connection closed"))
    }
  }

  public async initialize(hostInfo?: JsonRecord): Promise<JsonValue> {
    const params: JsonRecord = {
      protocolVersion: this.protocolVersion,
      ...(this.sessionId
        ? {
            sessionId: this.sessionId,
            session_id: this.sessionId,
            session: { id: this.sessionId }
          }
        : {}),
      ...hostInfo
    }
    const result = await this.request("initialize", params)
    // Try to capture session id from the initialize payload as a fallback
    if (!this.sessionId && result && typeof result === "object") {
      const r = result as Record<string, unknown>
      const candidate =
        (typeof r["sessionId"] === "string" && (r["sessionId"] as string)) ||
        (typeof r["session_id"] === "string" && (r["session_id"] as string)) ||
        (r["session"] && typeof (r["session"] as any).id === "string" && (r["session"] as any).id)
      if (candidate) this.sessionId = candidate
    }
    const negotiated = (result as JsonRecord | undefined)?.protocolVersion
    this.negotiatedProtocolVersion = typeof negotiated === "string" ? negotiated : this.protocolVersion
    return result
  }

  public async sendInitialized(capabilities?: JsonRecord): Promise<void> {
    await this.notify("initialized", capabilities ? { capabilities } : undefined)
  }

  public async ping(): Promise<JsonValue> {
    return this.request("ping")
  }

  public async shutdown(): Promise<JsonValue> {
    try {
      return await this.request("shutdown")
    } finally {
      await this.disconnect()
    }
  }

  public async listTools(): Promise<ChatCompletionsFunctionTool[]> {
    const result = await this.request("tools/list")
    const normalize = (tools: unknown[]): ChatCompletionsFunctionTool[] =>
      tools
        .map(tool => {
          if (!tool || typeof tool !== "object") return undefined
          const record = tool as Record<string, unknown>
          if (record.type === "function" && typeof record.function === "object") {
            return record as unknown as ChatCompletionsFunctionTool
          }
          const name = typeof record.name === "string" ? record.name : undefined
          const description = typeof record.description === "string" ? record.description : undefined
          const params = record.inputSchema ?? record.parameters
          if (name && params && typeof params === "object") {
            return {
              type: "function",
              function: {
                name,
                description,
                parameters: params as ChatToolParametersSchema
              }
            } satisfies ChatCompletionsFunctionTool
          }
          return undefined
        })
        .filter((value): value is ChatCompletionsFunctionTool => value !== undefined)

    if (Array.isArray(result)) return normalize(result)
    if (result && typeof result === "object") {
      const record = result as Record<string, unknown>
      if (Array.isArray(record.tools)) return normalize(record.tools)
      if (Array.isArray(record.result)) return normalize(record.result)
    }
    return []
  }

  public async callTool<TSchema extends ChatToolParametersSchema = ChatToolParametersSchema>(
    name: string,
    args: JsonRecord | JsonValue
  ): Promise<JsonValue> {
    try {
      return await this.request("tools/call", { name, arguments: args })
    } catch (error) {
      throw error
    }
  }

  public async listResources(): Promise<JsonValue[]> {
    const result = await this.request("resources/list")
    return (Array.isArray(result) ? result : []) as JsonValue[]
  }

  public async readResource(idOrUri: string): Promise<JsonValue> {
    return this.request("resources/read", { id: idOrUri, uri: idOrUri })
  }

  public async listPrompts(): Promise<JsonValue[]> {
    const result = await this.request("prompts/list")
    return (Array.isArray(result) ? result : []) as JsonValue[]
  }

  public async getPrompt(name: string, args?: JsonRecord): Promise<JsonValue> {
    return this.request("prompts/get", { name, arguments: args })
  }

  public async listModels(): Promise<JsonValue[]> {
    const result = await this.request("models/list")
    return (Array.isArray(result) ? result : []) as JsonValue[]
  }

  public async getModel(name: string): Promise<JsonValue> {
    return this.request("models/get", { name })
  }

  public async selectModel(name: string): Promise<JsonValue> {
    return this.request("models/select", { name })
  }

  public async getMetadata(): Promise<JsonValue> {
    return this.request("metadata/current")
  }

  public async getMetadataEntry(key: string): Promise<JsonValue> {
    return this.request("metadata/get", { key })
  }

  private async request(method: string, params?: JsonRecord | JsonValue): Promise<JsonValue> {
    if (this.transport === "http") {
      return this.httpRequest(method, params, true)
    }
    if (this.transport === "websocket") {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        throw new Error("MCP client is not connected")
      }
      return this.enqueuedRequest(payload => this.ws!.send(payload), method, params)
    }
    if (!this.stdioInput) {
      throw new Error("MCP client is not connected")
    }
    return this.enqueuedRequest(payload => {
      this.stdioInput!.write(`${payload}
`)
    }, method, params)
  }

  private async notify(method: string, params?: JsonRecord | JsonValue): Promise<void> {
    if (this.transport === "http") {
      await this.httpRequest(method, params, false)
      return
    }
    const payload: Record<string, unknown> = {
      jsonrpc: "2.0",
      method
    }
    if (params !== undefined) {
      payload.params = params
    }
    const serialized = JSON.stringify(payload)
    if (this.transport === "websocket") {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) throw new Error("MCP client is not connected")
      this.ws.send(serialized)
      return
    }
    if (!this.stdioInput) throw new Error("MCP client is not connected")
    this.stdioInput.write(`${serialized}
`)
  }

  private async enqueuedRequest(
    sender: (payload: string) => void,
    method: string,
    params?: JsonRecord | JsonValue
  ): Promise<JsonValue> {
    const id = ++this.requestId
    const payload: Record<string, unknown> = {
      jsonrpc: "2.0",
      id,
      method
    }
    if (params !== undefined) {
      payload.params = params
    }
    const serialized = JSON.stringify(payload)
    return new Promise<JsonValue>((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      try {
        sender(serialized)
      } catch (error) {
        this.pending.delete(id)
        reject(error)
      }
    })
  }

  private async httpRequest(
    method: string,
    params: JsonRecord | JsonValue | undefined,
    expectResponse: boolean,
    attempt = 0
  ): Promise<JsonValue> {
    if (!this.httpUrl) {
      throw new Error("HTTP URL is not configured")
    }
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      // Some MCP HTTP servers require clients to accept both JSON and SSE
      // for negotiation; advertise both by default.
      "Accept": "application/json, text/event-stream",
      ...(this.headers ?? {})
    }
    if (this.sessionId) {
      headers["Mcp-Session-Id"] = this.sessionId
    }
    const protocolHeader = this.negotiatedProtocolVersion ?? this.protocolVersion
    headers["MCP-Protocol-Version"] = protocolHeader

    const body: Record<string, unknown> = {
      jsonrpc: "2.0",
      method
    }
    if (expectResponse) {
      const id = ++this.requestId
      body.id = id
    }
    if (params !== undefined) {
      body.params = params
    } else {
      body.params = {}
    }

    const response = await this.fetchFn(this.httpUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    })

    const respSession =
      response.headers.get("Mcp-Session-Id") ||
      response.headers.get("MCP-SESSION-ID") ||
      response.headers.get("MCP-Session-ID") ||
      response.headers.get("mcp-session-id") ||
      response.headers.get("MCP-Session-Id")
    if (respSession && respSession.trim().length > 0) {
      this.sessionId = respSession.trim()
    }

    if (!expectResponse) {
      if (!response.ok && response.status !== 204) {
        if (this.sessionId && attempt === 0) {
          return this.httpRequest(method, params, expectResponse, attempt + 1)
        }
        throw new Error(`HTTP request failed with status ${response.status}`)
      }
      return null
    }

    if (!response.ok) {
      if (this.sessionId && attempt === 0) {
        return this.httpRequest(method, params, expectResponse, attempt + 1)
      }
      const bodyText = await response.text().catch(() => "")
      throw new Error(`HTTP request failed with status ${response.status}: ${bodyText}`)
    }

    const contentType = response.headers.get("content-type") ?? ""

    if (contentType.includes("application/json")) {
      const parsed = (await response.json()) as JsonRpcResponse
      if (parsed.error) {
        throw new JsonRpcError(parsed.error.code, parsed.error.message, parsed.error.data)
      }
      return parsed.result!
    }
    // Some MCP HTTP servers send JSON-RPC replies over SSE (text/event-stream)
    if (contentType.includes("text/event-stream")) {
      const text = await response.text()
      const events: Array<Record<string, unknown>> = []
      let dataBuffer = ""
      const lines = text.split(/\r?\n/)
      let hasAnyEvent = false
      for (const line of lines) {
        if (line.startsWith("data:")) {
          dataBuffer += (dataBuffer ? "\n" : "") + line.slice(5).trimStart()
        } else if (line.trim() === "") {
          if (dataBuffer) {
            try {
              const obj = JSON.parse(dataBuffer) as Record<string, unknown>
              events.push(obj)
            } catch {
              // ignore parse error and continue accumulating next event
            }
            dataBuffer = ""
            hasAnyEvent = true
          }
        }
      }
      if (!hasAnyEvent && dataBuffer) {
        // single data event without trailing blank line
        try { events.push(JSON.parse(dataBuffer) as Record<string, unknown>) } catch {}
      }
      for (const evt of events) {
        // Expect JSON-RPC envelope in data
        const error = (evt as any).error as { code?: number; message?: string; data?: JsonValue } | undefined
        if (error && typeof error.message === "string" && typeof error.code === "number") {
          throw new JsonRpcError(error.code, error.message, error.data)
        }
        if ((evt as any).result !== undefined) {
          return (evt as any).result as JsonValue
        }
      }
      throw new Error("SSE response did not contain a JSON-RPC result")
    }
    // Fallback: attempt to parse as JSON; if it fails, throw a helpful error
    try {
      const parsed = (await response.json()) as JsonRpcResponse
      if (parsed.error) {
        throw new JsonRpcError(parsed.error.code, parsed.error.message, parsed.error.data)
      }
      return parsed.result!
    } catch (e) {
      const bodyText = await response.text().catch(() => "")
      throw new Error(`Unexpected HTTP response; content-type=${contentType || 'unknown'} body=${bodyText.slice(0, 200)}`)
    }
  }

  private processResponsePayload(payload: string): void {
    let message: JsonRpcResponse
    try {
      message = JSON.parse(payload) as JsonRpcResponse
    } catch {
      return
    }
    if (message.id === undefined || message.id === null) {
      return
    }
    const key = typeof message.id === "number" ? message.id : Number(message.id)
    const pending = this.pending.get(key)
    if (!pending) return
    this.pending.delete(key)
    if (message.error) {
      pending.reject(new JsonRpcError(message.error.code, message.error.message, message.error.data))
      return
    }
    pending.resolve(message.result)
  }

  private flushPending(error: Error): void {
    for (const entry of this.pending.values()) {
      entry.reject(error)
    }
    this.pending.clear()
  }
}

export { JsonRpcError, McpClient }

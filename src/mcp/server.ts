import { createServer, type IncomingMessage, type Server as HttpServer, type ServerResponse } from "node:http"
import { randomUUID } from "node:crypto"
import { WebSocketServer, WebSocket } from "ws"

import type {
  ChatCompletionsFunctionTool,
  ChatToolParametersSchema,
  InferToolArguments,
  JsonRecord,
  JsonValue
} from "../types"

interface JsonRpcRequest {
  jsonrpc: "2.0"
  id?: number | string | null
  method: string
  params?: JsonRecord
}

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

export interface McpToolHandlerOptions<TTool extends ChatCompletionsFunctionTool = ChatCompletionsFunctionTool> {
  tool: TTool
  handler: (args: InferToolArguments<TTool>) => Promise<JsonValue> | JsonValue
}

export interface McpResource extends JsonRecord {
  id: string
  name?: string
  uri?: string
  type?: string
  description?: string
  mimeType?: string
}

export interface McpPrompt extends JsonRecord {
  name: string
  description?: string
  arguments?: Array<{ name: string; description?: string; required?: boolean; type?: string }>
}

export type McpServerTransport = "websocket" | "http" | "stdio"

export interface McpModel extends JsonRecord {
  name: string
  label?: string
  description?: string
  provider?: string
}

export interface McpMetadata {
  [key: string]: JsonValue
}

export interface McpServerOptions<
  THandlers extends ReadonlyArray<McpToolHandlerOptions<any>> = ReadonlyArray<McpToolHandlerOptions<any>>
> {
  port?: number
  path?: string
  httpServer?: HttpServer
  transports?: McpServerTransport[]
  stdio?: {
    input?: NodeJS.ReadableStream
    output?: NodeJS.WritableStream
  }
  tools?: THandlers
  resources?: McpResource[]
  readResource?: (idOrUri: string) => Promise<JsonValue> | JsonValue
  prompts?: McpPrompt[]
  getPrompt?: (name: string, args?: JsonRecord) => Promise<JsonValue> | JsonValue
  models?: McpModel[]
  getModel?: (name: string) => Promise<McpModel | null | undefined> | McpModel | null | undefined
  selectModel?: (name: string) => Promise<void> | void
  metadata?: McpMetadata
  getMetadata?: () => Promise<McpMetadata> | McpMetadata
  instructions?: JsonValue
}

const DEFAULT_PORT = 3030
const DEFAULT_PATH = "/mcp"
const MCP_PROTOCOL_VERSION = "2025-06-18"
const SESSION_HEADER = "Mcp-Session-Id"

interface SessionState {
  id?: string
  selectedModel?: string
  initialized?: boolean
  initializedNotified?: boolean
}

interface HttpSseClient {
  res: ServerResponse
  heartbeat?: NodeJS.Timeout
}

const isTextSegment = (value: JsonValue): value is { type: "text"; text: string } =>
  Boolean(
    value &&
      typeof value === "object" &&
      (value as { type?: unknown }).type === "text" &&
      typeof (value as { text?: unknown }).text === "string"
  )

const normalizeInvocationValue = (value: JsonValue): JsonValue => {
  if (Array.isArray(value)) {
    return value.map(normalizeInvocationValue) as JsonValue
  }
  if (value && typeof value === "object") {
    if (isTextSegment(value)) {
      return (value as { text: string }).text
    }
    const record = value as Record<string, JsonValue>
    const entries = Object.entries(record)
    if (Array.isArray(record.content)) {
      const normalizedContent = record.content.map(normalizeInvocationValue)
      const restEntries = entries.filter(([key]) => key !== "content")
      const allText = Array.isArray(normalizedContent) && normalizedContent.every(segment => typeof segment === "string")
      if (restEntries.length === 0 && allText) {
        return (normalizedContent as string[]).join('')
      }
      const normalizedRecord: Record<string, JsonValue> = {}
      for (const [key, entry] of restEntries) {
        normalizedRecord[key] = normalizeInvocationValue(entry)
      }
      normalizedRecord.content = normalizedContent as JsonValue
      if (allText && normalizedRecord.text === undefined) {
        normalizedRecord.text = (normalizedContent as string[]).join('')
      }
      return normalizedRecord
    }
    const normalized: Record<string, JsonValue> = {}
    for (const [key, entry] of entries) {
      normalized[key] = normalizeInvocationValue(entry)
    }
    return normalized
  }
  return value
}

class McpServer<
  THandlers extends ReadonlyArray<McpToolHandlerOptions<any>> = ReadonlyArray<McpToolHandlerOptions<any>>
> {
  private readonly options: McpServerOptions<THandlers>
  private readonly tools = new Map<string, McpToolHandlerOptions>()
  private readonly serverInfo = { name: "open-ai.js-mcp", version: "0.1.0" }
  private readonly transports: Set<McpServerTransport>
  private httpServer?: HttpServer
  private httpServerOwned = false
  private wss?: WebSocketServer
  private httpHandler?: (req: IncomingMessage, res: ServerResponse) => void
  private stdioInput?: NodeJS.ReadableStream
  private stdioOutput?: NodeJS.WritableStream
  private stdioBuffer = ""
  private stdioListener?: (chunk: Buffer | string) => void
  private stdioEndListener?: () => void
  private stdioCloseListener?: () => void
  private started = false
  private readonly httpSessions = new Map<string, SessionState>()
  private readonly httpSseClients = new Map<string, Set<HttpSseClient>>()
  private readonly globalSession: SessionState = { initialized: false, initializedNotified: false }

  constructor(options: McpServerOptions<THandlers> = {}) {
    this.options = options
    const transports = options.transports ?? ["websocket"]
    this.transports = new Set(transports as McpServerTransport[])
    for (const tool of options.tools ?? []) {
      this.registerTool(tool)
    }
  }

  public registerTool<TTool extends ChatCompletionsFunctionTool>(tool: McpToolHandlerOptions<TTool>): void {
    this.tools.set(tool.tool.function.name, tool)
  }

  public async start(): Promise<void> {
    if (this.started) return
    const needsHttpServer = this.transports.has("websocket") || this.transports.has("http")
    const { port = DEFAULT_PORT, path = DEFAULT_PATH } = this.options

    if (needsHttpServer) {
      if (this.options.httpServer) {
        this.httpServer = this.options.httpServer
      } else {
        this.httpServerOwned = true
        this.httpServer = createServer()
      }

      if (this.transports.has("http")) {
        this.httpHandler = (req, res) => {
          this.handleHttpRequest(req, res).catch(error => {
            if (!res.headersSent) {
              res.statusCode = 500
              res.end(JSON.stringify({
                jsonrpc: "2.0",
                id: null,
                error: { code: -32603, message: error instanceof Error ? error.message : String(error) }
              }))
            }
          })
        }
        this.httpServer.on("request", this.httpHandler)
      }

      if (!this.options.httpServer) {
        await new Promise<void>((resolve) => {
          this.httpServer!.listen(port, resolve)
        })
      }

      if (this.transports.has("websocket")) {
        this.wss = new WebSocketServer({ server: this.httpServer!, path })
        this.wss.on("connection", ws => this.bindWebSocket(ws))
      }
    }

    if (this.transports.has("stdio")) {
      this.bindStdio()
    }

    this.started = true
  }

  public async stop(): Promise<void> {
    if (!this.started) return

    if (this.wss) {
      await new Promise<void>(resolve => this.wss!.close(() => resolve()))
      this.wss = undefined
    }

    if (this.httpServer && this.httpHandler) {
      this.httpServer.off("request", this.httpHandler)
      this.httpHandler = undefined
    }

    if (this.httpServer && this.httpServerOwned) {
      await new Promise<void>(resolve => this.httpServer!.close(() => resolve()))
      this.httpServer = undefined
      this.httpServerOwned = false
    }

    const stdioInput = this.stdioInput
    if (stdioInput && this.stdioListener) {
      stdioInput.off("data", this.stdioListener)
      this.stdioListener = undefined
    }
    if (stdioInput && this.stdioEndListener) {
      stdioInput.off("end", this.stdioEndListener)
      this.stdioEndListener = undefined
    }
    if (stdioInput && this.stdioCloseListener) {
      stdioInput.off("close", this.stdioCloseListener)
      this.stdioCloseListener = undefined
    }
    if (stdioInput) {
      this.stdioInput = undefined
      this.stdioBuffer = ""
    }
    this.stdioOutput = undefined

    for (const [, clients] of this.httpSseClients) {
      for (const client of clients) {
        if (client.heartbeat) {
          clearInterval(client.heartbeat)
        }
        if (!client.res.writableEnded) {
          try {
            client.res.end()
          } catch {
            // ignore
          }
        }
      }
    }
    this.httpSseClients.clear()

    this.httpSessions.clear()
    this.globalSession.selectedModel = undefined
    this.globalSession.initialized = false
    this.globalSession.initializedNotified = false
    this.started = false
  }

  private bindWebSocket(ws: WebSocket): void {
    const session: SessionState = {}
    ws.on("message", async raw => {
      try {
        const request = JSON.parse(raw.toString()) as JsonRpcRequest
        const response = await this.handleMessage(request, session)
        if (response && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(response))
        }
      } catch (error) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              jsonrpc: "2.0",
              id: null,
              error: {
                code: -32700,
                message: error instanceof Error ? error.message : "Parse error"
              }
            } satisfies JsonRpcResponse)
          )
        }
      }
    })
  }

  private bindStdio(): void {
    const input = this.options.stdio?.input ?? process.stdin
    const output = this.options.stdio?.output ?? process.stdout

    this.stdioInput = input
    this.stdioOutput = output
    this.globalSession.initialized = false
    this.globalSession.initializedNotified = false
    this.globalSession.selectedModel = undefined
    if (typeof (input as NodeJS.ReadableStream & { setEncoding?: (encoding: string) => void }).setEncoding === "function") {
      ;(input as NodeJS.ReadableStream & { setEncoding?: (encoding: string) => void }).setEncoding("utf8")
    }
    const maybeSetDefault = (output as NodeJS.WritableStream & { setDefaultEncoding?: (encoding: string) => boolean })
      .setDefaultEncoding
    if (typeof maybeSetDefault === "function") {
      maybeSetDefault.call(output as NodeJS.WritableStream, "utf8")
    }

    this.stdioListener = chunk => {
      this.stdioBuffer += chunk.toString()
      let newlineIndex = this.stdioBuffer.indexOf("\n")
      while (newlineIndex !== -1) {
        const slice = this.stdioBuffer.slice(0, newlineIndex)
        const rawLine = (typeof slice === "string" ? slice : String(slice)).replace(/\r$/, "")
        this.stdioBuffer = this.stdioBuffer.slice(newlineIndex + 1)
        if (rawLine.trim().length > 0) {
          try {
            const request = JSON.parse(rawLine) as JsonRpcRequest
            void this.handleMessage(request, this.globalSession).then(response => {
              if (response && this.stdioOutput) {
                this.stdioOutput.write(`${JSON.stringify(response)}\n`)
              }
            })
          } catch {
            if (this.stdioOutput) {
              this.stdioOutput.write(`${JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } })}\n`)
            }
          }
        }
        newlineIndex = this.stdioBuffer.indexOf("\n")
      }
    }
    input.on("data", this.stdioListener)

    this.stdioEndListener = () => {
      void this.stop()
    }
    this.stdioCloseListener = () => {
      void this.stop()
    }
    input.on("end", this.stdioEndListener)
    input.on("close", this.stdioCloseListener)
  }

  private extractSessionId(req: IncomingMessage): string | undefined {
    let sessionId = req.headers[SESSION_HEADER.toLowerCase()]
    if (Array.isArray(sessionId)) {
      sessionId = sessionId[0]
    }
    if (typeof sessionId !== "string") {
      return undefined
    }
    const trimmed = sessionId.trim()
    return trimmed.length > 0 ? trimmed : undefined
  }

  private sendHttpJsonError(res: ServerResponse, statusCode: number, message: string, sessionId?: string): void {
    if (res.headersSent) return
    res.statusCode = statusCode
    res.setHeader("Content-Type", "application/json")
    res.setHeader("MCP-Protocol-Version", MCP_PROTOCOL_VERSION)
    if (sessionId) {
      res.setHeader(SESSION_HEADER, sessionId)
    }
    res.end(
      JSON.stringify({
        jsonrpc: "2.0",
        id: null,
        error: { code: -32600, message }
      })
    )
  }

  private teardownHttpSseClients(sessionId: string): void {
    const clients = this.httpSseClients.get(sessionId)
    if (!clients) return
    for (const client of clients) {
      if (client.heartbeat) {
        clearInterval(client.heartbeat)
      }
      if (!client.res.writableEnded) {
        try {
          client.res.end()
        } catch {
          // ignore
        }
      }
    }
    this.httpSseClients.delete(sessionId)
  }

  private handleHttpStream(req: IncomingMessage, res: ServerResponse): void {
    const sessionId = this.extractSessionId(req)
    if (!sessionId) {
      this.sendHttpJsonError(res, 400, `${SESSION_HEADER} header is required to open an SSE stream`)
      return
    }
    if (!this.httpSessions.has(sessionId)) {
      this.sendHttpJsonError(res, 404, `Unknown session: ${sessionId}`)
      return
    }

    if (typeof req.socket.setTimeout === "function") {
      req.socket.setTimeout(0)
    }
    if (typeof req.socket.setNoDelay === "function") {
      req.socket.setNoDelay(true)
    }
    if (typeof req.socket.setKeepAlive === "function") {
      req.socket.setKeepAlive(true)
    }

    res.statusCode = 200
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8")
    res.setHeader("Cache-Control", "no-cache")
    res.setHeader("Connection", "keep-alive")
    res.setHeader("MCP-Protocol-Version", MCP_PROTOCOL_VERSION)
    res.setHeader(SESSION_HEADER, sessionId)
    res.setHeader("X-Accel-Buffering", "no")

    const stream: HttpSseClient = { res }
    const heartbeat = setInterval(() => {
      if (!res.writableEnded) {
        res.write(`: heartbeat ${Date.now()}\n\n`)
      }
    }, 15000)
    stream.heartbeat = heartbeat

    const clients = this.httpSseClients.get(sessionId) ?? new Set<HttpSseClient>()
    clients.add(stream)
    this.httpSseClients.set(sessionId, clients)

    const cleanup = () => {
      if (stream.heartbeat) {
        clearInterval(stream.heartbeat)
        stream.heartbeat = undefined
      }
      const bucket = this.httpSseClients.get(sessionId)
      if (bucket) {
        bucket.delete(stream)
        if (bucket.size === 0) {
          this.httpSseClients.delete(sessionId)
        }
      }
    }

    req.on("close", cleanup)
    req.on("aborted", cleanup)
    res.on("close", cleanup)

    if (typeof res.flushHeaders === "function") {
      res.flushHeaders()
    }
    res.write(": stream-open\n\n")
  }

  private handleHttpDelete(req: IncomingMessage, res: ServerResponse): void {
    const sessionId = this.extractSessionId(req)
    if (!sessionId) {
      this.sendHttpJsonError(res, 400, `${SESSION_HEADER} header is required to delete a session`)
      return
    }
    if (!this.httpSessions.has(sessionId)) {
      this.sendHttpJsonError(res, 404, `Unknown session: ${sessionId}`)
      return
    }

    this.httpSessions.delete(sessionId)
    this.teardownHttpSseClients(sessionId)

    res.statusCode = 204
    res.setHeader("MCP-Protocol-Version", MCP_PROTOCOL_VERSION)
    res.end()
  }

  private async handleHttpRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const { path = DEFAULT_PATH } = this.options
    const requestPath = (req.url ?? "").split("?")[0]
    if (requestPath !== path) {
      res.statusCode = 404
      res.end()
      return
    }

    if (req.method === "GET") {
      this.handleHttpStream(req, res)
      return
    }

    if (req.method === "DELETE") {
      this.handleHttpDelete(req, res)
      return
    }

    if (req.method !== "POST") {
      res.statusCode = 405
      res.setHeader("Allow", "GET,POST,DELETE")
      res.end()
      return
    }

    const chunks: Buffer[] = []
    req.on("data", chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))

    await new Promise<void>(resolve => req.on("end", () => resolve()))

    try {
      const payload = Buffer.concat(chunks).toString() || "{}"
      const request = JSON.parse(payload) as JsonRpcRequest
      const method = typeof request.method === "string" ? request.method : ""

      let sessionId = this.extractSessionId(req)
      let session: SessionState | undefined
      if (!sessionId) {
        if (method === "initialize") {
          sessionId = randomUUID()
          session = { id: sessionId, initialized: false, initializedNotified: false }
          this.httpSessions.set(sessionId, session)
        } else {
          this.sendHttpJsonError(res, 400, `${SESSION_HEADER} header is required after initialization`)
          return
        }
      }

      session = session ?? this.httpSessions.get(sessionId)
      if (!session) {
        if (method === "initialize") {
          session = { id: sessionId, initialized: false, initializedNotified: false }
          this.httpSessions.set(sessionId, session)
        } else {
          this.sendHttpJsonError(res, 404, `Unknown session: ${sessionId}`, sessionId)
          return
        }
      }

      const response = await this.handleMessage(request, session)
      res.setHeader("MCP-Protocol-Version", MCP_PROTOCOL_VERSION)
      res.setHeader(SESSION_HEADER, sessionId)
      if (!response) {
        res.statusCode = 202
        res.end()
        return
      }
      const body = JSON.stringify(response)
      res.statusCode = 200
      res.setHeader("Content-Type", "application/json")
      res.end(body)
    } catch (error) {
      res.statusCode = 400
      res.setHeader("Content-Type", "application/json")
      res.setHeader("MCP-Protocol-Version", MCP_PROTOCOL_VERSION)
      res.end(
        JSON.stringify({
          jsonrpc: "2.0",
          id: null,
          error: { code: -32700, message: error instanceof Error ? error.message : "Parse error" }
        })
      )
    }
  }

  private async handleMessage(request: JsonRpcRequest, session: SessionState = this.globalSession): Promise<JsonRpcResponse | undefined> {
    const id = request.id ?? null
    const respond = request.id !== undefined && request.id !== null

    const success = (result: JsonValue): JsonRpcResponse | undefined =>
      respond ? { jsonrpc: "2.0", id, result } : undefined
    const error = (code: number, message: string, data?: JsonValue): JsonRpcResponse | undefined =>
      respond ? { jsonrpc: "2.0", id, error: { code, message, data } } : undefined

    const method = request.method

    if (method === "notifications/initialized" || method === "initialized") {
      session.initializedNotified = true
      return undefined
    }

    if (!session.initialized && method !== "initialize") {
      return error(-32002, "Server has not completed initialization")
    }

    if (method === "initialize") {
      const params = (request.params ?? {}) as JsonRecord
      const requestedVersionValue = (params["protocolVersion"] ?? params["mcpVersion"]) as JsonValue
      const requestedVersion = typeof requestedVersionValue === "string" ? requestedVersionValue : undefined
      const negotiatedVersion =
        requestedVersion && requestedVersion.trim() === MCP_PROTOCOL_VERSION ? requestedVersion : MCP_PROTOCOL_VERSION

      session.selectedModel = undefined
      session.initializedNotified = false

      const capabilities: Record<string, JsonValue> = {}
      const toolCaps: JsonRecord = { list: true, invoke: true, call: true }
      capabilities.tools = toolCaps

      const hasResources =
        (Array.isArray(this.options.resources) && this.options.resources.length > 0) ||
        typeof this.options.readResource === "function"
      if (hasResources) {
        const resourceCaps: JsonRecord = { list: true }
        if (this.options.readResource) {
          resourceCaps.read = true
        }
        capabilities.resources = resourceCaps
      }

      const hasPrompts =
        (Array.isArray(this.options.prompts) && this.options.prompts.length > 0) ||
        typeof this.options.getPrompt === "function"
      if (hasPrompts) {
        const promptCaps: JsonRecord = { list: true }
        if (this.options.getPrompt) {
          promptCaps.get = true
        }
        capabilities.prompts = promptCaps
      }

      const hasModels =
        (Array.isArray(this.options.models) && this.options.models.length > 0) ||
        typeof this.options.getModel === "function" ||
        typeof this.options.selectModel === "function"
      if (hasModels) {
        const modelCaps: JsonRecord = { list: true }
        if (typeof this.options.getModel === "function" || Array.isArray(this.options.models)) {
          modelCaps.get = true
        }
        if (typeof this.options.selectModel === "function") {
          modelCaps.select = true
        }
        capabilities.models = modelCaps
      }

      const metadataCaps: JsonRecord = { current: true }
      if (this.options.getMetadata || this.options.metadata) {
        metadataCaps.get = true
      }
      capabilities.metadata = metadataCaps

      const result: JsonRecord = {
        protocolVersion: negotiatedVersion,
        serverInfo: this.serverInfo,
        capabilities
      }
      if (this.options.instructions !== undefined) {
        result.instructions = this.options.instructions
      }
      if (session.id) {
        result.session = { id: session.id }
        result.sessionId = session.id
        result.session_id = session.id
      }
      session.initialized = true
      return success(result)
    }

    if (method === "ping") {
      return success({})
    }

    if (method === "shutdown") {
      const response = success({ ok: true })
      setImmediate(() => {
        void this.stop()
      })
      return response
    }

    if (method === "list_tools" || method === "tools/list") {
      const tools = Array.from(this.tools.values()).map(({ tool }) => {
        const definition = tool;
        const fn = definition.function;
        const parameters = (fn.parameters ?? { type: "object", properties: {} }) as JsonRecord;
        const entry: JsonRecord = {
          name: fn.name,
          type: definition.type,
          inputSchema: parameters,
          parameters
        };
        if (fn.description) {
          entry.description = fn.description;
        }
        return entry;
      });
      return success({ tools });
    }

    if (method === "call_tool" || method === "tools/call" || method === "tools/invoke") {
      const name = request.params?.name as string | undefined
      const args = request.params?.arguments as string | JsonValue | undefined
      if (!name || !this.tools.has(name)) {
        return error(-32601, `Unknown tool: ${name ?? "undefined"}`)
      }
      const registered = this.tools.get(name)!
      try {
        const parsed = typeof args === "string" ? JSON.parse(args) : args
        const normalizedArgs =
          parsed && typeof parsed === "object" ? normalizeInvocationValue(parsed as JsonValue) : parsed
        const result = await registered.handler(
          (normalizedArgs ?? undefined) as InferToolArguments<ChatCompletionsFunctionTool<ChatToolParametersSchema>>
        )
        return success(result)
      } catch (err) {
        const message = err instanceof Error ? err.message : "Tool invocation failed"
        const data = err instanceof Error && err.stack ? { stack: err.stack } : undefined
        return error(-32000, message, data)
      }
    }

    if (method === "resources/list") {
      const resources = this.options.resources ?? []
      return success({ resources })
    }

    if (method === "resources/read") {
      const key = (request.params?.id ?? request.params?.uri) as string | undefined
      if (!key) {
        return error(-32602, "Missing resource id or uri")
      }
      if (!this.options.readResource) {
        return error(-32601, "resources/read not supported")
      }
      try {
        const result = await this.options.readResource(key)
        return success(result)
      } catch (err) {
        return error(-32000, err instanceof Error ? err.message : "Read failed")
      }
    }

    if (method === "prompts/list") {
      const prompts = this.options.prompts ?? []
      return success({ prompts })
    }

    if (method === "prompts/get") {
      const name = request.params?.name as string | undefined
      if (!name) {
        return error(-32602, "Missing prompt name")
      }
      if (!this.options.getPrompt) {
        return error(-32601, "prompts/get not supported")
      }
      try {
        const result = await this.options.getPrompt(name, request.params?.arguments as JsonRecord | undefined)
        return success(result)
      } catch (err) {
        return error(-32000, err instanceof Error ? err.message : "Get prompt failed")
      }
    }

    if (method === "models/list") {
      const models = this.options.models ?? []
      return success({ models })
    }

    if (method === "models/get") {
      const name = request.params?.name as string | undefined
      if (!name) {
        return error(-32602, "Missing model name")
      }
      if (this.options.getModel) {
        const model = await this.options.getModel(name)
        if (!model) {
          return error(-32601, `Unknown model: ${name}`)
        }
        return success(model)
      }
      const model = (this.options.models ?? []).find(entry => entry.name === name)
      if (!model) {
        return error(-32601, `Unknown model: ${name}`)
      }
      return success(model)
    }

    if (method === "models/select") {
      const name = request.params?.name as string | undefined
      if (!name) {
        return error(-32602, "Missing model name")
      }
      if (this.options.selectModel) {
        await this.options.selectModel(name)
      }
      session.selectedModel = name
      return success({ name })
    }

    if (method === "metadata/current") {
      if (this.options.getMetadata) {
        const current = await this.options.getMetadata()
        return success(current ?? {})
      }
      return success(this.options.metadata ?? {})
    }

    if (method === "metadata/get") {
      const key = request.params?.key as string | undefined
      if (!key) {
        return error(-32602, "Missing metadata key")
      }
      const source = this.options.getMetadata ? await this.options.getMetadata() : this.options.metadata
      const metadataSource: McpMetadata = source ?? {}
      if (!(key in metadataSource)) {
        return error(-32601, `Unknown metadata key: ${key}`)
      }
      return success({ key, value: metadataSource[key] })
    }

    return error(-32601, `Unknown method: ${method}`)
  }
}

export { McpServer }

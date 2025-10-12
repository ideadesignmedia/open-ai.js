
import { createServer, type IncomingMessage, type Server as HttpServer, type ServerResponse } from "node:http"
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

class McpServer<
  THandlers extends ReadonlyArray<McpToolHandlerOptions<any>> = ReadonlyArray<McpToolHandlerOptions<any>>
> {
  private readonly options: McpServerOptions<THandlers>
  private readonly tools = new Map<string, McpToolHandlerOptions>()
  private readonly serverInfo = { name: "open-ai.js-mcp", version: "0.1.0" }
  private readonly transports: Set<McpServerTransport>
  private httpServer?: HttpServer
  private selectedModel?: string
  private httpServerOwned = false
  private wss?: WebSocketServer
  private httpHandler?: (req: IncomingMessage, res: ServerResponse) => void
  private stdioInput?: NodeJS.ReadableStream
  private stdioOutput?: NodeJS.WritableStream
  private stdioBuffer = ""
  private stdioListener?: (chunk: Buffer | string) => void
  private started = false

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

    if (this.stdioInput && this.stdioListener) {
      this.stdioInput.off("data", this.stdioListener)
      this.stdioInput = undefined
      this.stdioOutput = undefined
      this.stdioListener = undefined
      this.stdioBuffer = ""
    }

    this.selectedModel = undefined
    this.started = false
  }

  private bindWebSocket(ws: WebSocket): void {
    ws.on("message", async raw => {
      try {
        const request = JSON.parse(raw.toString()) as JsonRpcRequest
        const response = await this.handleMessage(request)
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
    if (typeof (input as NodeJS.ReadableStream & { setEncoding?: (encoding: string) => void }).setEncoding === "function") {
      ;(input as NodeJS.ReadableStream & { setEncoding?: (encoding: string) => void }).setEncoding("utf8")
    }

    this.stdioListener = chunk => {
      this.stdioBuffer += chunk.toString()
      let newlineIndex = this.stdioBuffer.indexOf("\n")
      while (newlineIndex !== -1) {
        const rawLine = this.stdioBuffer.slice(0, newlineIndex).replace(/\r$/, "")
        this.stdioBuffer = this.stdioBuffer.slice(newlineIndex + 1)
        if (rawLine.trim().length > 0) {
          try {
            const request = JSON.parse(rawLine) as JsonRpcRequest
            void this.handleMessage(request).then(response => {
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
  }

  private async handleHttpRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const { path = DEFAULT_PATH } = this.options
    if (req.method !== "POST" || (req.url ?? "") !== path) {
      res.statusCode = 404
      res.end()
      return
    }

    const chunks: Buffer[] = []
    req.on("data", chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))

    await new Promise<void>(resolve => req.on("end", () => resolve()))

    try {
      const payload = Buffer.concat(chunks).toString() || "{}"
      const request = JSON.parse(payload) as JsonRpcRequest
      const response = await this.handleMessage(request)
      if (!response) {
        res.statusCode = 204
        res.end()
        return
      }
      const body = JSON.stringify(response)
      res.statusCode = 200
      res.setHeader("Content-Type", "application/json")
      res.setHeader("MCP-Protocol-Version", MCP_PROTOCOL_VERSION)
      res.end(body)
    } catch (error) {
      res.statusCode = 400
      res.setHeader("Content-Type", "application/json")
      res.end(
        JSON.stringify({
          jsonrpc: "2.0",
          id: null,
          error: { code: -32700, message: error instanceof Error ? error.message : "Parse error" }
        })
      )
    }
  }

  private async handleMessage(request: JsonRpcRequest): Promise<JsonRpcResponse | undefined> {
    const id = request.id ?? null
    const respond = request.id !== undefined && request.id !== null

    const success = (result: JsonValue): JsonRpcResponse | undefined =>
      respond ? { jsonrpc: "2.0", id, result } : undefined
    const error = (code: number, message: string, data?: JsonValue): JsonRpcResponse | undefined =>
      respond ? { jsonrpc: "2.0", id, error: { code, message, data } } : undefined

    const method = request.method

    if (method === "initialize") {
      const clientVersion = typeof request.params?.protocolVersion === "string" ? request.params.protocolVersion : undefined
      const negotiatedVersion = clientVersion ?? MCP_PROTOCOL_VERSION
      this.selectedModel = undefined
      const capabilities: Record<string, JsonValue> = {
        tools: { list: true, call: true },
        resources: { list: true, read: !!this.options.readResource },
        prompts: { list: true, get: !!this.options.getPrompt },
        models: {
          list: true,
          get: typeof this.options.getModel === "function" || Array.isArray(this.options.models),
          select: typeof this.options.selectModel === "function"
        },
        metadata: { current: true, get: true }
      }
      const result: JsonRecord = {
        protocolVersion: negotiatedVersion,
        serverInfo: this.serverInfo,
        capabilities
      }
      if (this.options.instructions !== undefined) {
        result.instructions = this.options.instructions
      }
      return success(result)
    }

    if (method === "initialized") {
      return undefined
    }

    if (method === "ping") {
      return success("pong")
    }

    if (method === "shutdown") {
      const response = success("ok")
      setImmediate(() => {
        void this.stop()
      })
      return response
    }

    if (method === "list_tools" || method === "tools/list") {
      const result = Array.from(this.tools.values()).map(({ tool }) => tool)
      return success(result)
    }

    if (method === "call_tool" || method === "tools/call") {
      const name = request.params?.name as string | undefined
      const args = request.params?.arguments as string | JsonValue | undefined
      if (!name || !this.tools.has(name)) {
        return error(-32601, `Unknown tool: ${name ?? "undefined"}`)
      }
      const registered = this.tools.get(name)!
      try {
        const parsed = typeof args === "string" ? JSON.parse(args) : args
        const result = await registered.handler(
          parsed as InferToolArguments<ChatCompletionsFunctionTool<ChatToolParametersSchema>>
        )
        return success(result)
      } catch (err) {
        const message = err instanceof Error ? err.message : "Tool invocation failed"
        const data = err instanceof Error && err.stack ? { stack: err.stack } : undefined
        return error(-32000, message, data)
      }
    }

    if (method === "resources/list") {
      const result = this.options.resources ?? []
      return success(result)
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
      const result = this.options.prompts ?? []
      return success(result)
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
      return success(this.options.models ?? [])
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
      this.selectedModel = name
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


import assert from "node:assert/strict"
import http from "node:http"
import net from "node:net"
import { PassThrough } from "node:stream"
import { setTimeout as sleep } from "node:timers/promises"
import WebSocket from "ws"
import { test } from "node:test"

import {
  defineFunctionTool,
  defineObjectSchema,
  McpClient,
  McpServer,
  type McpServerOptions
} from "../index"

const PROTOCOL_VERSION = "2025-06-18"

const EXAMPLE_MODELS = [{ name: "demo-model", description: "Demonstration model" }]
const EXAMPLE_METADATA = { contact: "support@example.com", homepage: "https://example.com" }

const createSumTool = () =>
  defineFunctionTool({
    type: "function",
    function: {
      name: "sum_numbers",
      description: "Return the sum of an array of numbers",
      parameters: defineObjectSchema({
        type: "object",
        properties: {
          values: {
            type: "array",
            items: { type: "number" },
            description: "Numbers to add together"
          }
        },
        required: ["values"],
        additionalProperties: false
      } as const)
    }
  } as const)

const getFreePort = (): Promise<number> =>
  new Promise((resolve, reject) => {
    const server = net.createServer()
    server.unref()
    server.on("error", reject)
    server.listen(0, "127.0.0.1", () => {
      const address = server.address()
      if (typeof address === "object" && address && typeof address.port === "number") {
        const port = address.port
        server.close(() => resolve(port))
      } else {
        server.close(() => reject(new Error("Unable to determine free port")))
      }
    })
  })

interface JsonRpcSuccess<T = unknown> {
  jsonrpc: "2.0"
  id: number | string | null
  result?: T
  error?: {
    code: number
    message: string
    data?: unknown
  }
}

class MockMcpClient {
  private ws?: WebSocket
  private nextId = 0
  private readonly pending = new Map<number, { resolve: (value: unknown) => void; reject: (reason?: unknown) => void }>()

  constructor(private readonly url: string) {}

  public async connect(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return
    this.ws = new WebSocket(this.url)
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("connect timeout")), 5_000)
      this.ws!.once("open", () => {
        clearTimeout(timer)
        resolve()
      })
      this.ws!.once("error", error => {
        clearTimeout(timer)
        reject(error)
      })
    })
    this.ws.on("message", data => this.handleMessage(data))
    this.ws.once("close", () => {
      for (const entry of this.pending.values()) {
        entry.reject(new Error("Connection closed"))
      }
      this.pending.clear()
    })
  }

  public async initialize(): Promise<Record<string, unknown>> {
    const params = {
      protocolVersion: PROTOCOL_VERSION,
      clientInfo: { name: "mock-mcp-client", version: "0.0.1" },
      capabilities: {
        tools: { list: true, call: true },
        resources: { list: true, read: true },
        prompts: { list: true, get: true },
        models: { list: true, get: true, select: true },
        metadata: { current: true }
      }
    }
    const result = await this.request("initialize", params)
    return (result ?? {}) as Record<string, unknown>
  }

  public sendInitialized(capabilities?: Record<string, unknown>): void {
    this.notify("initialized", capabilities ? { capabilities } : undefined)
  }

  public async listTools(): Promise<unknown[]> {
    const result = await this.request("tools/list")
    return Array.isArray(result) ? result : []
  }

  public async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    return this.request("tools/call", { name, arguments: args })
  }

  public async listModels(): Promise<unknown[]> {
    const result = await this.request("models/list")
    return Array.isArray(result) ? result : []
  }

  public async getModel(name: string): Promise<unknown> {
    return this.request("models/get", { name })
  }

  public async getMetadata(): Promise<unknown> {
    return this.request("metadata/current")
  }

  public async getMetadataEntry(key: string): Promise<unknown> {
    return this.request("metadata/get", { key })
  }

  public async shutdown(): Promise<unknown> {
    return this.request("shutdown")
  }

  public async disconnect(): Promise<void> {
    if (!this.ws) return
    const ws = this.ws
    if (ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
      this.ws = undefined
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
  }

  private notify(method: string, params?: Record<string, unknown>): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("MCP client is not connected")
    }
    const payload: Record<string, unknown> = {
      jsonrpc: "2.0",
      method
    }
    if (params) {
      payload.params = params
    }
    this.ws.send(JSON.stringify(payload))
  }

  private request(method: string, params?: Record<string, unknown>): Promise<unknown> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error("MCP client is not connected"))
    }
    const id = ++this.nextId
    const payload: Record<string, unknown> = {
      jsonrpc: "2.0",
      id,
      method
    }
    if (params) {
      payload.params = params
    }
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.ws!.send(JSON.stringify(payload))
    })
  }

  private handleMessage(raw: WebSocket.RawData): void {
    let message: JsonRpcSuccess
    try {
      message = JSON.parse(raw.toString()) as JsonRpcSuccess
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
      pending.reject(new Error(message.error.message))
      return
    }
    pending.resolve(message.result)
  }
}

test("mcp: spec-compliant mock client", { timeout: 30_000 }, async t => {
  const httpServer = http.createServer()
  await new Promise<void>(resolve => httpServer.listen(0, resolve))
  const address = httpServer.address()
  assert.ok(address && typeof address === "object" && typeof address.port === "number")
  const port = address.port
  const url = `ws://127.0.0.1:${port}/mcp`

  const server = new McpServer({
    httpServer,
    path: "/mcp",
    instructions: "Spec-compliant mock server",
    tools: [
      {
        tool: createSumTool(),
        handler: async ({ values }) => {
          const numbers = Array.isArray(values) ? (values as number[]) : []
          return { sum: numbers.reduce((acc, value) => acc + value, 0) }
        }
      }
    ],
    models: EXAMPLE_MODELS,
    metadata: EXAMPLE_METADATA
  } satisfies McpServerOptions)

  await server.start()
  t.after(async () => {
    await server.stop()
    httpServer.close()
  })

  const client = new MockMcpClient(url)
  await client.connect()
  t.after(async () => {
    await client.disconnect().catch(() => undefined)
  })

  const init = await client.initialize()
  const capabilities = init.capabilities as Record<string, any> | undefined
  assert.equal(init.protocolVersion, PROTOCOL_VERSION)
  assert.equal(capabilities?.tools?.list, true)
  assert.equal(capabilities?.models?.list, true)
  assert.equal(capabilities?.metadata?.current, true)

  client.sendInitialized()
  await sleep(10)

  const tools = await client.listTools()
  assert.ok(Array.isArray(tools))
  assert.ok(tools.some(tool => (tool as any)?.function?.name === "sum_numbers"))

  const models = await client.listModels()
  assert.ok(Array.isArray(models) && models.length === 1)
  const model = await client.getModel("demo-model") as Record<string, unknown>
  assert.equal((model as any)?.name, "demo-model")

  const metadata = await client.getMetadata() as Record<string, unknown>
  assert.equal((metadata as any)?.contact, "support@example.com")
  const metadataEntry = await client.getMetadataEntry("homepage") as Record<string, unknown>
  assert.equal((metadataEntry as any)?.value, "https://example.com")

  const result = await client.callTool("sum_numbers", { values: [2, 3, 5] }) as Record<string, unknown>
  assert.equal(result.sum, 10)

  const shutdown = await client.shutdown()
  assert.ok(shutdown === "ok" || shutdown === "OK" || shutdown === undefined)

  await client.disconnect()
})

test("mcp client transport: websocket", { timeout: 30_000 }, async t => {
  const httpServer = http.createServer()
  await new Promise<void>(resolve => httpServer.listen(0, resolve))
  const address = httpServer.address()
  assert.ok(address && typeof address === "object" && typeof address.port === "number")
  const port = address.port
  const url = `ws://127.0.0.1:${port}/mcp`

  const server = new McpServer({
    httpServer,
    path: "/mcp",
    instructions: "WebSocket test server",
    tools: [
      {
        tool: createSumTool(),
        handler: async ({ values }) => {
          const numbers = Array.isArray(values) ? (values as number[]) : []
          return { sum: numbers.reduce((acc, value) => acc + value, 0) }
        }
      }
    ],
    models: EXAMPLE_MODELS,
    metadata: EXAMPLE_METADATA
  } satisfies McpServerOptions)

  await server.start()
  t.after(async () => {
    await server.stop()
    httpServer.close()
  })

  const client = new McpClient({ transport: "websocket", url })
  await client.connect()
  t.after(async () => {
    await client.disconnect().catch(() => undefined)
  })

  const init = await client.initialize({ clientInfo: { name: "websocket-client", version: "1.0.0" } }) as Record<string, unknown>
  assert.equal(init?.protocolVersion, PROTOCOL_VERSION)
  await client.sendInitialized()

  const tools = await client.listTools()
  assert.ok(Array.isArray(tools) && tools.length === 1)

  const models = await client.listModels()
  assert.ok(Array.isArray(models) && models.length === 1)
  const metadata = await client.getMetadata() as Record<string, unknown>
  assert.equal((metadata as any)?.contact, "support@example.com")

  const result = await client.callTool("sum_numbers", { values: [1, 2, 3] }) as Record<string, unknown>
  assert.equal(result.sum, 6)

  await client.shutdown()
})

test("mcp client transport: http", { timeout: 30_000 }, async t => {
  const httpServer = http.createServer()
  await new Promise<void>(resolve => httpServer.listen(0, resolve))
  const address = httpServer.address()
  assert.ok(address && typeof address === "object" && typeof address.port === "number")
  const port = address.port
  const url = `http://127.0.0.1:${port}/mcp`

  const server = new McpServer({
    httpServer,
    path: "/mcp",
    transports: ["http"],
    instructions: "HTTP test server",
    tools: [
      {
        tool: createSumTool(),
        handler: async ({ values }) => {
          const numbers = Array.isArray(values) ? (values as number[]) : []
          return { sum: numbers.reduce((acc, value) => acc + value, 0) }
        }
      }
    ],
    models: EXAMPLE_MODELS,
    metadata: EXAMPLE_METADATA
  } satisfies McpServerOptions)

  await server.start()
  t.after(async () => {
    await server.stop()
    httpServer.close()
  })

  const client = new McpClient({ transport: "http", url })
  await client.connect()

  const init = await client.initialize({ clientInfo: { name: "http-client", version: "1.0.0" } }) as Record<string, unknown>
  assert.equal(init?.protocolVersion, PROTOCOL_VERSION)
  await client.sendInitialized()

  const models = await client.listModels()
  assert.ok(Array.isArray(models) && models.length === 1)
  const metadata = await client.getMetadata() as Record<string, unknown>
  assert.equal((metadata as any)?.homepage, "https://example.com")

  const result = await client.callTool("sum_numbers", { values: [4, 5, 6] }) as Record<string, unknown>
  assert.equal(result.sum, 15)

  await client.shutdown()
})

test("mcp client transport: stdio", { timeout: 30_000 }, async t => {
  const clientToServer = new PassThrough()
  const serverToClient = new PassThrough()

  const server = new McpServer({
    transports: ["stdio"],
    instructions: "STDIO test server",
    stdio: {
      input: clientToServer,
      output: serverToClient
    },
    tools: [
      {
        tool: createSumTool(),
        handler: async ({ values }) => {
          const numbers = Array.isArray(values) ? (values as number[]) : []
          return { sum: numbers.reduce((acc, value) => acc + value, 0) }
        }
      }
    ],
    models: EXAMPLE_MODELS,
    metadata: EXAMPLE_METADATA
  } satisfies McpServerOptions)

  await server.start()
  t.after(async () => {
    await server.stop()
  })

  const client = new McpClient({
    transport: "stdio",
    stdio: {
      input: serverToClient,
      output: clientToServer
    }
  })

  await client.connect()
  t.after(async () => {
    await client.disconnect().catch(() => undefined)
  })

  const init = await client.initialize({ clientInfo: { name: "stdio-client", version: "1.0.0" } }) as Record<string, unknown>
  assert.equal(init?.protocolVersion, PROTOCOL_VERSION)
  await client.sendInitialized()

  const models = await client.listModels()
  assert.ok(Array.isArray(models) && models.length === 1)
  const metadata = await client.getMetadata() as Record<string, unknown>
  assert.equal((metadata as any)?.contact, "support@example.com")

  const result = await client.callTool("sum_numbers", { values: [7, 8, 9] }) as Record<string, unknown>
  assert.equal(result.sum, 24)

  await client.shutdown()
})

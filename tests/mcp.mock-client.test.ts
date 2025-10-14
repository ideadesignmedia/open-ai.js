
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
  type McpServerOptions,
  type JsonRecord
} from "../index"

const PROTOCOL_VERSION = "2025-06-18"

const log = (...args: unknown[]): void => console.log('[mock-client-test]', ...args)

const EXAMPLE_RESOURCES = [{ id: "hello", name: "Hello Resource" }]
const readExampleResource = async (id: string): Promise<string> => `Hello Resource ${id}`
const EXAMPLE_PROMPTS = [{ name: "greet", description: "Say hello", arguments: [{ name: "name", required: false }] }]
const getExamplePrompt = async (name: string, args?: Record<string, unknown>): Promise<{ text: string }> => ({
  text:
    name === "greet"
      ? `Hello ${typeof args?.name === "string" ? String(args.name) : "world"}`
      : ""
})

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

const buildSumResponse = (values: unknown): JsonRecord => {
  const rawNumbers = Array.isArray(values) ? (values as unknown[]) : []
  const numbers = rawNumbers
    .map(entry => {
      if (typeof entry === "number" && Number.isFinite(entry)) return entry
      if (typeof entry === "string") {
        const parsed = Number(entry.trim())
        return Number.isNaN(parsed) ? undefined : parsed
      }
      return undefined
    })
    .filter((value): value is number => value !== undefined)
  const sum = numbers.reduce((acc, value) => acc + value, 0)
  const expression = numbers.length > 0 ? `${numbers.join(" + ")} = ${sum}` : `Sum: ${sum}`
  return {
    sum,
    terms: numbers,
    content: [
      { type: "text", text: expression }
    ]
  }
}

const createTimeTool = () =>
  defineFunctionTool({
    type: "function",
    function: {
      name: "current_time",
      description: "Return the current ISO 8601 timestamp.",
      parameters: defineObjectSchema({
        type: "object",
        properties: {},
        additionalProperties: false
      } as const)
    }
  } as const)

const buildTimeResponse = (): JsonRecord => {
  const isoTimestamp = new Date().toISOString()
  return {
    isoTimestamp,
    content: [
      { type: "text", text: `Current time: ${isoTimestamp}` }
    ]
  }
}

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
    log('connecting to server', this.url)
    this.ws = new WebSocket(this.url)
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("connect timeout")), 5_000)
      this.ws!.once("open", () => {
        clearTimeout(timer)
        log('websocket open')
        resolve()
      })
      this.ws!.once("error", error => {
        clearTimeout(timer)
        log('websocket error', error)
        reject(error)
      })
    })
    this.ws.on("message", data => this.handleMessage(data))
    this.ws.once("close", () => {
      log('websocket closed')
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
        roots: { listChanged: true },
        sampling: {},
        elicitation: {}
      }
    }
    const result = await this.request("initialize", params)
    return (result ?? {}) as Record<string, unknown>
  }

  public sendInitialized(): void {
    this.notify("notifications/initialized")
  }

  public async listTools(): Promise<unknown[]> {
    const result = await this.request("tools/list")
    if (Array.isArray(result)) return result
    if (result && typeof result === "object") {
      const record = result as Record<string, unknown>
      if (Array.isArray(record.tools)) return record.tools
      if (Array.isArray(record.result)) return record.result
    }
    return []
  }

  public async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    return this.request("tools/call", { name, arguments: args })
  }

  public async listResources(): Promise<unknown[]> {
    const result = await this.request("resources/list")
    if (Array.isArray(result)) return result
    if (result && typeof result === "object") {
      const record = result as Record<string, unknown>
      if (Array.isArray(record.resources)) return record.resources
      if (Array.isArray(record.result)) return record.result
    }
    return []
  }

  public async readResource(id: string): Promise<unknown> {
    return this.request("resources/read", { id, uri: id })
  }

  public async listPrompts(): Promise<unknown[]> {
    const result = await this.request("prompts/list")
    if (Array.isArray(result)) return result
    if (result && typeof result === "object") {
      const record = result as Record<string, unknown>
      if (Array.isArray(record.prompts)) return record.prompts
      if (Array.isArray(record.result)) return record.result
    }
    return []
  }

  public async getPrompt(name: string, args?: Record<string, unknown>): Promise<unknown> {
    return this.request("prompts/get", { name, arguments: args })
  }

  public async shutdown(): Promise<void> {
    await this.disconnect()
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
    log('notify ->', payload)
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
    log('request ->', payload)
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
      log('received non-json message', raw.toString())
      return
    }
    log('response <-', message)
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
        handler: async ({ values }) => buildSumResponse(values)
      },
      {
        tool: createTimeTool(),
        handler: async () => buildTimeResponse()
      }
    ],
    resources: EXAMPLE_RESOURCES.map(resource => ({ ...resource })),
    readResource: readExampleResource,
    prompts: EXAMPLE_PROMPTS.map(prompt => ({ ...prompt })),
    getPrompt: getExamplePrompt
  } satisfies McpServerOptions)

  await server.start()
  log('server started')
  t.after(async () => {
    await server.stop()
    httpServer.close()
  })

  const client = new MockMcpClient(url)
  await client.connect()
  log('client connected')
  t.after(async () => {
    await client.disconnect().catch(() => undefined)
  })

  const init = await client.initialize()
  log('initialize result', init)
  const serverInfo = init.serverInfo as Record<string, unknown> | undefined
  const capabilities = init.capabilities as Record<string, any> | undefined
  assert.equal(init.protocolVersion, PROTOCOL_VERSION)
  assert.ok(capabilities && typeof capabilities.tools === "object")
  assert.equal(capabilities.tools?.list, true)
  assert.equal(capabilities.tools?.call, true)
  assert.ok(capabilities?.resources && typeof capabilities.resources === "object")
  assert.equal(capabilities.resources?.list, true)
  assert.equal(capabilities.resources?.read, true)
  assert.ok(capabilities?.prompts && typeof capabilities.prompts === "object")
  assert.equal(capabilities.prompts?.list, true)
  assert.equal(capabilities.prompts?.get, true)
  assert.equal(serverInfo?.name, "open-ai.js-mcp")
  assert.equal(init.instructions, "Spec-compliant mock server")

  client.sendInitialized()
  log('sent initialized notification')
  await sleep(10)

  const tools = await client.listTools()
  log('tools', tools)
  assert.ok(Array.isArray(tools))
  assert.ok(tools.some(tool => (tool as any)?.name === "sum_numbers"))
  assert.ok(tools.some(tool => (tool as any)?.name === "current_time" || (tool as any)?.function?.name === "current_time"))

  const resources = await client.listResources()
  log('resources', resources)
  assert.ok(Array.isArray(resources))
  const resource = await client.readResource('hello')
  assert.equal(resource, 'Hello Resource hello')

  const prompts = await client.listPrompts()
  log('prompts', prompts)
  assert.ok(Array.isArray(prompts) && prompts.some(prompt => (prompt as any)?.name === 'greet'))
  const prompt = await client.getPrompt('greet', { name: 'Casey' }) as Record<string, unknown>
  assert.equal((prompt as any)?.text, 'Hello Casey')

  const result = await client.callTool("sum_numbers", { values: [2, 3, 5] }) as Record<string, unknown>
  log('tool result', result)
  assert.equal(result.sum, 10)
  const content = result.content as unknown[] | undefined
  assert.ok(Array.isArray(content) && content.length > 0)
  assert.equal(((content[0] as Record<string, unknown>)?.type), "text")

  const time = await client.callTool("current_time", {}) as Record<string, unknown>
  log('time result', time)
  assert.ok(typeof (time as any)?.isoTimestamp === "string")
  const timeContent = time.content as unknown[] | undefined
  assert.ok(Array.isArray(timeContent) && timeContent.length > 0)
  assert.equal(((timeContent[0] as Record<string, unknown>)?.type), "text")

  await client.shutdown()
  log('client shutdown done')

  await client.disconnect()
  log('client disconnect complete')
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
        handler: async ({ values }) => buildSumResponse(values)
      },
      {
        tool: createTimeTool(),
        handler: async () => buildTimeResponse()
      }
    ],
    resources: EXAMPLE_RESOURCES.map(resource => ({ ...resource })),
    readResource: readExampleResource,
    prompts: EXAMPLE_PROMPTS.map(prompt => ({ ...prompt })),
    getPrompt: getExamplePrompt
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
  assert.equal((init as Record<string, any>)?.instructions, "WebSocket test server")
  await client.sendInitialized()

  const tools = await client.listTools()
  assert.ok(Array.isArray(tools) && tools.length === 2)
  assert.ok(tools.some(tool => (tool as any)?.function?.name === "sum_numbers" || (tool as any)?.name === "sum_numbers"))
  assert.ok(tools.some(tool => (tool as any)?.function?.name === "current_time" || (tool as any)?.name === "current_time"))

  const resources = await client.listResources()
  assert.ok(Array.isArray(resources) && resources.some(resource => (resource as any)?.id === 'hello'))
  const resource = await client.readResource('hello')
  assert.equal(resource, 'Hello Resource hello')

  const prompts = await client.listPrompts()
  assert.ok(Array.isArray(prompts) && prompts.some(prompt => (prompt as any)?.name === 'greet'))
  const prompt = await client.getPrompt('greet', { name: 'Riley' }) as Record<string, unknown>
  assert.equal((prompt as any)?.text, 'Hello Riley')

  const result = await client.callTool("sum_numbers", { values: [1, 2, 3] }) as Record<string, unknown>
  assert.equal(result.sum, 6)
  const content = result.content as unknown[] | undefined
  assert.ok(Array.isArray(content) && content.length > 0)
  assert.equal(((content[0] as Record<string, unknown>)?.type), "text")

  const time = await client.callTool("current_time", {}) as Record<string, unknown>
  assert.ok(typeof (time as any)?.isoTimestamp === "string")
  const timeContent = time.content as unknown[] | undefined
  assert.ok(Array.isArray(timeContent) && timeContent.length > 0)
  assert.equal(((timeContent[0] as Record<string, unknown>)?.type), "text")

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
        handler: async ({ values }) => buildSumResponse(values)
      },
      {
        tool: createTimeTool(),
        handler: async () => buildTimeResponse()
      }
    ],
    resources: EXAMPLE_RESOURCES.map(resource => ({ ...resource })),
    readResource: readExampleResource,
    prompts: EXAMPLE_PROMPTS.map(prompt => ({ ...prompt })),
    getPrompt: getExamplePrompt
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
  assert.equal((init as Record<string, any>)?.instructions, "HTTP test server")
  await client.sendInitialized()

  const tools = await client.listTools()
  assert.ok(Array.isArray(tools) && tools.length === 2)
  assert.ok(tools.some(tool => (tool as any)?.function?.name === "sum_numbers" || (tool as any)?.name === "sum_numbers"))
  assert.ok(tools.some(tool => (tool as any)?.function?.name === "current_time" || (tool as any)?.name === "current_time"))

  const resources = await client.listResources()
  assert.ok(Array.isArray(resources) && resources.some(resource => (resource as any)?.id === 'hello'))
  const resource = await client.readResource('hello')
  assert.equal(resource, 'Hello Resource hello')

  const prompts = await client.listPrompts()
  assert.ok(Array.isArray(prompts) && prompts.some(prompt => (prompt as any)?.name === 'greet'))
  const prompt = await client.getPrompt('greet', { name: 'Jordan' }) as Record<string, unknown>
  assert.equal((prompt as any)?.text, 'Hello Jordan')

  const result = await client.callTool("sum_numbers", { values: [4, 5, 6] }) as Record<string, unknown>
  assert.equal(result.sum, 15)
  const content = result.content as unknown[] | undefined
  assert.ok(Array.isArray(content) && content.length > 0)
  assert.equal(((content[0] as Record<string, unknown>)?.type), "text")

  const time = await client.callTool("current_time", {}) as Record<string, unknown>
  assert.ok(typeof (time as any)?.isoTimestamp === "string")
  const timeContent = time.content as unknown[] | undefined
  assert.ok(Array.isArray(timeContent) && timeContent.length > 0)
  assert.equal(((timeContent[0] as Record<string, unknown>)?.type), "text")

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
        handler: async ({ values }) => buildSumResponse(values)
      },
      {
        tool: createTimeTool(),
        handler: async () => buildTimeResponse()
      }
    ],
    resources: EXAMPLE_RESOURCES.map(resource => ({ ...resource })),
    readResource: readExampleResource,
    prompts: EXAMPLE_PROMPTS.map(prompt => ({ ...prompt })),
    getPrompt: getExamplePrompt
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
  assert.equal((init as Record<string, any>)?.instructions, "STDIO test server")
  await client.sendInitialized()

  const tools = await client.listTools()
  assert.ok(Array.isArray(tools) && tools.length === 2)
  assert.ok(tools.some(tool => (tool as any)?.function?.name === "sum_numbers" || (tool as any)?.name === "sum_numbers"))
  assert.ok(tools.some(tool => (tool as any)?.function?.name === "current_time" || (tool as any)?.name === "current_time"))

  const resources = await client.listResources()
  assert.ok(Array.isArray(resources) && resources.some(resource => (resource as any)?.id === 'hello'))
  const resource = await client.readResource('hello')
  assert.equal(resource, 'Hello Resource hello')

  const prompts = await client.listPrompts()
  assert.ok(Array.isArray(prompts) && prompts.some(prompt => (prompt as any)?.name === 'greet'))
  const prompt = await client.getPrompt('greet', { name: 'Sky' }) as Record<string, unknown>
  assert.equal((prompt as any)?.text, 'Hello Sky')

  const result = await client.callTool("sum_numbers", { values: [7, 8, 9] }) as Record<string, unknown>
  assert.equal(result.sum, 24)
  const content = result.content as unknown[] | undefined
  assert.ok(Array.isArray(content) && content.length > 0)
  assert.equal(((content[0] as Record<string, unknown>)?.type), "text")

  const time = await client.callTool("current_time", {}) as Record<string, unknown>
  assert.ok(typeof (time as any)?.isoTimestamp === "string")
  const timeContent = time.content as unknown[] | undefined
  assert.ok(Array.isArray(timeContent) && timeContent.length > 0)
  assert.equal(((timeContent[0] as Record<string, unknown>)?.type), "text")

  await client.shutdown()
})

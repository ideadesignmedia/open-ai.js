import assert from "node:assert/strict"
import { PassThrough } from "node:stream"
import { test } from "node:test"

import { McpClient, createMockMcpServer } from "../index"

const PROTOCOL_VERSION = "2025-06-18"

void test("mock server: stdio integration", { timeout: 20_000 }, async () => {
  console.log("[mock-server-test] starting stdio integration test")
  const clientToServer = new PassThrough()
  const serverToClient = new PassThrough()

  const server = createMockMcpServer({
    transports: ["stdio"],
    stdio: {
      input: clientToServer,
      output: serverToClient
    }
  })

  let client: McpClient | undefined

  try {
    console.log("[mock-server-test] starting server")
    await server.start()
    console.log("[mock-server-test] server started")

    client = new McpClient({
      transport: "stdio",
      stdio: {
        input: serverToClient,
        output: clientToServer
      }
    })

    console.log("[mock-server-test] connecting client")
    await client.connect()
    console.log("[mock-server-test] client connected")

    console.log("[mock-server-test] sending initialize")
    const init = (await client.initialize({
      clientInfo: { name: "mock-server-test", version: "1.0.0" }
    })) as Record<string, unknown>
    console.log("[mock-server-test] initialize response", init)
    const serverInfo = (init?.serverInfo ?? init?.server ?? {}) as Record<string, unknown>
    const capabilities = (init?.capabilities ?? init?.serverCapabilities ?? {}) as Record<string, unknown>
    assert.equal(serverInfo?.name, "open-ai.js-mcp")
    const toolsCapability = (capabilities as any)?.tools as Record<string, unknown> | undefined
    assert.equal(Boolean(toolsCapability?.list), true)
    assert.equal(Boolean(toolsCapability?.call), true)
    const resourcesCapability = (capabilities as any)?.resources as Record<string, unknown> | undefined
    assert.equal(Boolean(resourcesCapability?.list), true)
    assert.equal(Boolean(resourcesCapability?.read), true)
    const promptsCapability = (capabilities as any)?.prompts as Record<string, unknown> | undefined
    assert.equal(Boolean(promptsCapability?.list), true)
    assert.equal(Boolean(promptsCapability?.get), true)
    assert.ok(typeof init?.instructions === "string" && (init.instructions as string).includes("Mock MCP server"))

    console.log("[mock-server-test] notifying initialized")
    await client.sendInitialized()

    console.log("[mock-server-test] listing tools")
    const tools = await client.listTools()
    console.log("[mock-server-test] tools", tools)
    assert.ok(Array.isArray(tools))
    assert.equal(tools.length, 3)
    assert.ok(tools.some(tool => (tool as any)?.name === "sum_numbers" || (tool as any)?.function?.name === "sum_numbers"))

    console.log("[mock-server-test] calling sum_numbers")
    const sum = (await client.callTool("sum_numbers", { values: [1, 2, 3] })) as Record<string, unknown>
    console.log("[mock-server-test] sum result", sum)
    const sumValue = (sum as any)?.sum ?? (sum as any)?.output?.sum
    assert.equal(sumValue, 6)
    const content = (sum as any)?.content as unknown[] | undefined
    assert.ok(Array.isArray(content) && content.length > 0)
    assert.equal(((content?.[0] as Record<string, unknown>)?.type), "text")

    console.log("[mock-server-test] calling echo_text")
    const echo = (await client.callTool("echo_text", { message: "hello", repeat: 2 })) as Record<string, unknown>
    console.log("[mock-server-test] echo result", echo)
    const echoMessage = (echo as any)?.message ?? (echo as any)?.output?.message
    assert.equal(echoMessage, "hello hello")
    const echoContent = (echo as any)?.content as unknown[] | undefined
    assert.ok(Array.isArray(echoContent) && echoContent.length > 0)
    assert.equal(((echoContent?.[0] as Record<string, unknown>)?.type), "text")

    console.log("[mock-server-test] calling current_time")
    const time = (await client.callTool("current_time", {})) as Record<string, unknown>
    console.log("[mock-server-test] current_time result", time)
    const isoTimestamp = (time as any)?.isoTimestamp
    assert.ok(typeof isoTimestamp === "string" && isoTimestamp.length > 0)
    const timeContent = (time as any)?.content as unknown[] | undefined
    assert.ok(Array.isArray(timeContent) && timeContent.length > 0)
    assert.equal(((timeContent?.[0] as Record<string, unknown>)?.type), "text")

    console.log("[mock-server-test] listing resources")
    const resources = await client.listResources()
    console.log("[mock-server-test] resources", resources)
    assert.ok(Array.isArray(resources) && resources.length >= 2)

    console.log("[mock-server-test] reading welcome resource")
    const welcome = await client.readResource("welcome")
    console.log("[mock-server-test] welcome", welcome)
    assert.ok(typeof welcome === "string" && welcome.includes("mock MCP"))

    console.log("[mock-server-test] listing prompts")
    const prompts = await client.listPrompts()
    console.log("[mock-server-test] prompts", prompts)
    assert.ok(Array.isArray(prompts) && prompts.some(prompt => (prompt as any)?.name === "greet"))

    console.log("[mock-server-test] fetching greet prompt")
    const greetPrompt = (await client.getPrompt("greet", { name: "Alex" })) as Record<string, unknown>
    console.log("[mock-server-test] greet prompt", greetPrompt)
    assert.equal((greetPrompt as any)?.text, "Hello Alex!")

    console.log("[mock-server-test] sending shutdown")
    await client.shutdown()
    console.log("[mock-server-test] shutdown complete")
  } finally {
    console.log("[mock-server-test] cleaning up")
    if (client) {
      try {
        await client.disconnect()
        console.log("[mock-server-test] client disconnected")
      } catch (error) {
        console.warn("[mock-server-test] client disconnect error", error)
      }
    }
    try {
      await server.stop()
      console.log("[mock-server-test] server stopped")
    } catch (error) {
      console.warn("[mock-server-test] server stop error", error)
    }
    clientToServer.end()
    serverToClient.end()
    console.log("[mock-server-test] streams closed")
  }
})






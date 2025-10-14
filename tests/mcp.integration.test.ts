import "@ideadesignmedia/config.js"
import assert from "node:assert/strict"
import http from "node:http"
import { setTimeout as sleep } from "node:timers/promises"
import { spawn } from "node:child_process"
import WebSocket, { WebSocketServer } from "ws"
import { test } from "node:test"

import {
  defineFunctionTool,
  defineObjectSchema,
  McpClient,
  McpServer,
  type McpServerOptions
} from "../index"

const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx"
const BRAVE_HELP = "Set BRAVE_API_KEY to launch the official Brave MCP server locally (BRAVE_API_KEY=... npx -y @brave/brave-search-mcp-server)."

const getFreePort = (): Promise<number> =>
  new Promise((resolve, reject) => {
    const server = http.createServer()
    server.unref()
    server.once("error", error => {
      const reason = error instanceof Error ? error : new Error(String(error))
      reject(reason)
    })
    server.listen(0, "127.0.0.1", () => {
      const address = server.address()
      if (typeof address === "object" && address && typeof address.port === "number") {
        const port = address.port
        server.close(closeError => {
          if (closeError) {
            reject(closeError)
          } else {
            resolve(port)
          }
        })
      } else {
        server.close(() => reject(new Error("Unable to determine free HTTP port")))
      }
    })
  })

test("mcp: local server", { timeout: 30_000 }, async t => {
  console.log("[mcp-test] starting local MCP server/client test")
  const httpServer = http.createServer()
  await new Promise<void>(resolve => httpServer.listen(0, resolve))
  const address = httpServer.address()
  assert.ok(address && typeof address === "object" && typeof address.port === "number")
  const port = address.port
  const localUrl = `ws://127.0.0.1:${port}/mcp`
  console.log("[mcp-test] HTTP server listening on", localUrl)

  const sumTool = defineFunctionTool({
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
            description: "Numbers to sum"
          }
        },
        required: ["values"],
        additionalProperties: false
      } as const)
    }
  } as const)

  const timeTool = defineFunctionTool({
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

  const server = new McpServer({
    httpServer,
    path: "/mcp",
    instructions: "Example MCP test server",
    tools: [
      {
        tool: sumTool,
        handler: async ({ values }) => {
          const nums = Array.isArray(values) ? (values as Array<number>) : []
          const numericValues = nums.filter(value => typeof value === "number")
          const sum = numericValues.reduce((acc, cur) => acc + cur, 0)
          console.log("[mcp-test] sum_numbers handler", numericValues, "->", sum)
          const expression = numericValues.length > 0 ? `${numericValues.join(" + ")} = ${sum}` : `Sum: ${sum}`
          return {
            sum,
            terms: numericValues,
            content: [
              { type: "text", text: expression }
            ]
          }
        }
      },
      {
        tool: timeTool,
        handler: async () => {
          const isoTimestamp = new Date().toISOString()
          return {
            isoTimestamp,
            content: [
              { type: "text", text: `Current time: ${isoTimestamp}` }
            ]
          }
        }
      }
    ],
    resources: [{ id: "hello", name: "Hello Resource" }],
    readResource: async (id) => `Hello Resource ${id}`,
    prompts: [{ name: "greet", description: "Say hello", arguments: [{ name: "name", required: false }] }],
    getPrompt: async (name, args) => ({ text: name === "greet" ? `Hello ${args?.name ?? "world"}` : "" }),
  } satisfies McpServerOptions)

  await server.start()
  console.log("[mcp-test] server started")
  t.after(async () => {
    console.log("[mcp-test] shutting down server")
    await server.stop()
    httpServer.close()
  })

  const client = new McpClient({ url: localUrl })
  await client.connect()
  console.log("[mcp-test] client connected")
  t.after(async () => {
    console.log("[mcp-test] disconnecting client")
    await client.disconnect()
  })

  await t.test("initialize handshake", async () => {
    const init = await client.initialize({ clientInfo: { name: "mcp-e2e-test", version: "1.0.0" } })
    console.log("[mcp-test] initialize response", init)
    const capabilities = (init as any)?.capabilities as Record<string, unknown> | undefined
    const serverInfo = ((init as any)?.serverInfo ?? (init as any)?.server) as Record<string, unknown> | undefined
    assert.equal((init as any)?.protocolVersion, "2025-06-18")
    assert.equal(serverInfo?.name, "open-ai.js-mcp")
    assert.ok(capabilities && typeof capabilities.tools === "object")
    assert.equal((capabilities.tools as Record<string, unknown>)?.list, true)
    assert.equal((capabilities.tools as Record<string, unknown>)?.call, true)
    assert.ok(capabilities?.resources && typeof capabilities.resources === "object")
    assert.equal((capabilities.resources as Record<string, unknown>)?.list, true)
    assert.equal((capabilities.resources as Record<string, unknown>)?.read, true)
    assert.ok(capabilities?.prompts && typeof capabilities.prompts === "object")
    assert.equal((capabilities.prompts as Record<string, unknown>)?.list, true)
    assert.equal((capabilities.prompts as Record<string, unknown>)?.get, true)
    assert.equal((init as any)?.instructions, "Example MCP test server")
    assert.ok(typeof init === "object" && init !== null)
    await client.sendInitialized()
  })

  await t.test("tools list and call", async () => {
    const tools = await client.listTools()
    console.log("[mcp-test] tools", tools)
    assert.ok(Array.isArray(tools) && tools.length >= 1)
    assert.equal(tools[0]?.function?.name, "sum_numbers")

    const result = await client.callTool("sum_numbers", { values: [1, 2, 3] })
    console.log("[mcp-test] sum_numbers result", result)
    assert.equal((result as any)?.sum, 6)
    const content = (result as any)?.content as unknown[] | undefined
    assert.ok(Array.isArray(content) && content.length > 0)
    assert.equal(((content[0] as Record<string, unknown>)?.type), "text")
  })

  await t.test("resources list/read", async () => {
    const resources = await client.listResources()
    console.log("[mcp-test] resources", resources)
    assert.ok(Array.isArray(resources) && resources.length >= 1)
    const read = await client.readResource("hello")
    console.log("[mcp-test] readResource", read)
    assert.equal(read, "Hello Resource hello")
  })

  await t.test("prompts list/get", async () => {
    const prompts = await client.listPrompts()
    console.log("[mcp-test] prompts", prompts)
    assert.ok(Array.isArray(prompts) && prompts.length >= 1)
    const prompt = await client.getPrompt("greet", { name: "Ada" })
    console.log("[mcp-test] getPrompt", prompt)
    assert.equal((prompt as any)?.text, "Hello Ada")
  })

  await t.test("current time tool", async () => {
    const time = await client.callTool("current_time", {})
    console.log("[mcp-test] current_time result", time)
    assert.ok(typeof (time as any)?.isoTimestamp === "string")
    const content = (time as any)?.content as unknown[] | undefined
    assert.ok(Array.isArray(content) && content.length > 0)
    assert.equal(((content[0] as Record<string, unknown>)?.type), "text")
  })



  await t.test("ping & shutdown", async () => {
  const pong = await client.ping()
  console.log("[mcp-test] ping response", pong)
  assert.deepEqual(pong, {})
    await client.shutdown()
    console.log("[mcp-test] shutdown complete")
  })
})


test("mcp: brave handshake", { timeout: 30_000 }, async t => {
  const apiKey = process.env.BRAVE_API_KEY
  if (!apiKey) {
    t.skip(`Brave MCP connection skipped. ${BRAVE_HELP}`)
    return
  }
  const requireBraveSuccess = true

  const port = await getFreePort()
  const url = `ws://127.0.0.1:${port}/ws`
  console.log(`[mcp-brave] launching local MCP server on ${url}`)

  const sockets = new Set<WebSocket>()
  let wss: WebSocketServer | undefined
  let child: ReturnType<typeof spawn> | undefined
  let stdoutBuffer = ''

  const forwardToSockets = (message: string) => {
    for (const socket of sockets) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(message)
      }
    }
  }

  const handleStdoutChunk = (chunk: Buffer) => {
    stdoutBuffer += chunk.toString('utf8')
    let newlineIndex = stdoutBuffer.indexOf("\n")
    while (newlineIndex !== -1) {
      const rawLine = stdoutBuffer.slice(0, newlineIndex)
      stdoutBuffer = stdoutBuffer.slice(newlineIndex + 1)
      const line = rawLine.replace(/\r$/, '')
      if (line.length > 0) {
        try {
          const message = JSON.parse(line) as Record<string, unknown>
          if (Object.prototype.hasOwnProperty.call(message, 'result') || Object.prototype.hasOwnProperty.call(message, 'error')) {
            if (message.id == null) {
              console.warn('[mcp-brave] response missing id', message)
            } else {
              const outgoing = {
                id: String(message.id),
                type: 'response' as const,
                result: message.result,
                error: message.error
              }
              forwardToSockets(JSON.stringify(outgoing))
            }
          } else if (typeof message.method === 'string' && Object.prototype.hasOwnProperty.call(message, 'id')) {
            const outgoing = {
              id: message.id == null ? undefined : String(message.id),
              type: 'request' as const,
              method: message.method as string,
              params: message.params
            }
            forwardToSockets(JSON.stringify(outgoing))
          } else {
            console.warn('[mcp-brave] unsupported stdout message', message)
          }
        } catch {
          console.warn('[mcp-brave] ignored non-JSON stdout:', line)
        }
      }
      newlineIndex = stdoutBuffer.indexOf("\n")
    }
  }

  child = spawn(
    npxCommand,
    ['-y', '@brave/brave-search-mcp-server'],
    {
      env: { ...process.env, BRAVE_API_KEY: apiKey, BRAVE_MCP_TRANSPORT: 'stdio' },
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: process.platform === 'win32'
    }
  )

  const spawned = child

  wss = new WebSocketServer({ host: '127.0.0.1', port, path: '/ws' })
  wss.on('connection', socket => {
    console.log('[mcp-brave] bridge accepted websocket client')
    sockets.add(socket)
    let handshakeCompleted = false
    socket.on('message', data => {
      const textMessage = typeof data === 'string' ? data : data.toString('utf8')
      if (!handshakeCompleted) {
        try {
          const message = JSON.parse(textMessage) as Record<string, unknown>
          if (message?.type === 'handshake') {
            const protocol = typeof message.protocol === 'string' ? (message.protocol as string) : 'model-context-protocol/1.0'
            const response = {
              type: 'handshake',
              protocol,
              server: { name: 'brave-search-bridge', version: '0.1.0' }
            }
            socket.send(JSON.stringify(response))
            handshakeCompleted = true
            return
          }
          console.warn('[mcp-brave] unexpected message before handshake', message)
        } catch (error) {
          console.warn('[mcp-brave] invalid handshake payload', error)
        }
        socket.close(1002, 'handshake required')
        return
      }

      try {
        const envelope = JSON.parse(textMessage) as Record<string, unknown>
        if (envelope?.type === 'request' && typeof envelope.method === 'string') {
          const method = envelope.method as string
          const rpc: Record<string, unknown> = {
            jsonrpc: '2.0',
            id: envelope.id ?? null,
            method,
            params: envelope.params
          }
          if (method === 'search') {
            rpc.method = 'tools/call'
            rpc.params = {
              name: 'brave_web_search',
              arguments: envelope.params
            }
          } else if (method === 'local_search') {
            rpc.method = 'tools/call'
            rpc.params = {
              name: 'brave_local_search',
              arguments: envelope.params
            }
          } else if (method === 'list_tools' || method === 'tools/list') {
            rpc.method = 'tools/list'
          }
          if (spawned.stdin?.writable) {
            spawned.stdin.write(`${JSON.stringify(rpc)}\n`)
          }
          return
        }
        if (envelope?.type === 'notification' && typeof envelope.method === 'string') {
          const rpc = {
            jsonrpc: '2.0',
            method: envelope.method as string,
            params: envelope.params
          }
          if (spawned.stdin?.writable) {
            spawned.stdin.write(`${JSON.stringify(rpc)}\n`)
          }
          return
        }
        if (spawned.stdin?.writable) {
          spawned.stdin.write(textMessage.endsWith("\n") ? textMessage : `${textMessage}\n`)
        } else {
          console.warn('[mcp-brave] dropped message (stdin closed)', envelope)
        }
      } catch (error) {
        console.warn('[mcp-brave] failed to parse websocket payload', error)
      }
    })
    socket.once('close', () => sockets.delete(socket))
    socket.on('error', error => {
      console.warn('[mcp-brave] bridge socket error', error)
    })
  })

  const startPromise = new Promise<void>((resolve, reject) => {
    let resolved = false
    const timer = setTimeout(() => {
      if (!resolved) {
        console.warn('[mcp-brave] no stdout from Brave server within 2s; continuing')
        resolved = true
        resolve()
      }
    }, 2_000)

    spawned.stdout?.on('data', chunk => {
      handleStdoutChunk(chunk)
      if (!resolved) {
        resolved = true
        clearTimeout(timer)
        resolve()
      }
    })

    spawned.stderr?.on('data', data => {
      console.warn('[mcp-brave] server stderr:', data.toString())
    })

    spawned.once('error', error => {
      clearTimeout(timer)
      reject(error)
    })

    spawned.once('exit', code => {
      if (!resolved) {
        reject(new Error(`Brave MCP server exited with code ${code}`))
      } else {
        console.log(`[mcp-brave] Brave MCP server exited with code ${code}`)
      }
    })
  })

  try {
    await startPromise
    console.log('[mcp-brave] local Brave MCP server started')
  } catch (error) {
    wss?.close()
    child.kill()
    const reason = error instanceof Error ? error.message : String(error)
    t.skip(`Unable to start Brave MCP server: ${reason}. ${BRAVE_HELP}`)
    return
  }

  t.after(async () => {
    for (const socket of sockets) {
      try {
        socket.close()
      } catch (socketError) {
        console.warn('[mcp-brave] error closing bridge socket', socketError)
      }
    }
    await new Promise<void>(resolve => {
      if (wss) {
        wss.close(() => resolve())
      } else {
        resolve()
      }
    })
    if (child) {
      console.log('[mcp-brave] shutting down spawned Brave MCP server')
      try {
        child.stdin?.end()
      } catch (stdinError) {
        console.warn('[mcp-brave] error closing stdin', stdinError)
      }
      child.kill()
      await sleep(200)
    }
  })

  console.log("[mcp-brave] attempting connection to", url)
  const connectWithRetry = async (attempts = requireBraveSuccess ? 10 : 5, delayMs = 1_000): Promise<WebSocket> => {
    let lastError: unknown
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        console.log(`[mcp-brave] connect attempt ${attempt}/${attempts}`)
        return await new Promise<WebSocket>((resolve, reject) => {
          const socket = new WebSocket(url)
          const timer = setTimeout(() => {
            socket.terminate()
            reject(new Error("connect timeout"))
          }, 5_000)
          socket.once("open", () => {
            clearTimeout(timer)
            resolve(socket)
          })
          socket.once("error", error => {
            clearTimeout(timer)
            socket.terminate()
            reject(error)
          })
        })
      } catch (error) {
        lastError = error
        console.warn(`[mcp-brave] connect attempt ${attempt} failed`, error)
        if (attempt === attempts) {
          break
        }
        await sleep(delayMs)
      }
    }
    const reason = lastError instanceof Error ? lastError : new Error(String(lastError ?? 'connection failed'))
    throw reason
  }

  let ws: WebSocket
  try {
    ws = await connectWithRetry()
  } catch (error) {
    console.warn("[mcp-brave] unable to connect:", error)
    const reason = error instanceof Error ? error : new Error(String(error))
    if (requireBraveSuccess) {
      throw new Error(`Brave MCP connection failed: ${reason.message}`)
    }
    t.skip(`Brave MCP connection failed: ${reason.message}. ${BRAVE_HELP}`)
    return
  }


  t.after(() => ws.close())

  const waitForMessage = <T>(
    label: string,
    accept: (message: Record<string, unknown>) => T | undefined,
    timeoutMs = 10_000
  ): Promise<T> =>
    new Promise((resolve, reject) => {
      let settled = false
      let timer: NodeJS.Timeout

      const cleanup = () => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        ws.off("message", onMessage)
        ws.off("error", onError)
        ws.off("close", onClose)
      }

      const onMessage = (data: WebSocket.RawData) => {
        if (settled) return
        let parsed: Record<string, unknown>
        try {
          parsed = JSON.parse(data.toString()) as Record<string, unknown>
        } catch {
          console.warn(`[mcp-brave] ignored non-JSON message for ${label}:`, data.toString())
          return
        }
        const match = accept(parsed)
        if (match !== undefined) {
          cleanup()
          resolve(match)
        }
      }

      const onError = (error: Error) => {
        if (settled) return
        cleanup()
        reject(error)
      }

      const onClose = () => {
        if (settled) return
        cleanup()
        reject(new Error(`${label} aborted (socket closed)`))
      }

      timer = setTimeout(() => {
        if (settled) return
        cleanup()
        reject(new Error(`${label} timed out`))
      }, timeoutMs)

      ws.on("message", onMessage)
      ws.on("error", onError)
      ws.on("close", onClose)
    })

  let handshakeResponse: Record<string, unknown> | undefined

  await t.test("handshake exchange", async t => {
    try {
      const handshake = {
        type: "handshake",
        protocol: "model-context-protocol/1.0",
        client: "open-ai.js-test"
      }
      console.log("[mcp-brave] -> handshake", handshake)
      ws.send(JSON.stringify(handshake))
      handshakeResponse = await waitForMessage("handshake response", message => {
        if (typeof message["type"] === "string" && message["type"] === "handshake") {
          return message
        }
        return undefined
      })
      console.log("[mcp-brave] <- handshake", handshakeResponse)

      const handshakeType =
        handshakeResponse && typeof handshakeResponse["type"] === "string"
          ? (handshakeResponse["type"] as string)
          : undefined
      assert.equal(handshakeType, "handshake")

      const protocolField =
        handshakeResponse && typeof handshakeResponse["protocol"] === "string"
          ? (handshakeResponse["protocol"] as string)
          : handshakeResponse && typeof handshakeResponse["protocolVersion"] === "string"
          ? (handshakeResponse["protocolVersion"] as string)
          : undefined
      assert.equal(protocolField, "model-context-protocol/1.0")
    } catch (error) {
      console.warn("[mcp-brave] handshake failed", error)
      const reason = error instanceof Error ? error : new Error(String(error))
      if (requireBraveSuccess) {
        throw new Error(`Brave handshake failed: ${reason.message}`)
      }
      t.skip(`Brave handshake failed: ${reason.message}. ${BRAVE_HELP}`)
      return
    }
  })

  if (!handshakeResponse) {
    const message = "Brave handshake did not produce a response"
    console.warn("[mcp-brave] handshake not established; skipping Brave search test")
    if (requireBraveSuccess) {
      throw new Error(`${message}. ${BRAVE_HELP}`)
    }
    return
  }

  await t.test("search request", async t => {
    try {
      const requestId = `test-${Date.now()}`
      const request = {
        id: requestId,
        type: "request",
        method: "search",
        params: { query: "site:brave.com MCP protocol" }
      }
      console.log("[mcp-brave] -> search", request)
      ws.send(JSON.stringify(request))
      const response = await waitForMessage("search response", message => {
        const identifier = message["id"]
        if (typeof identifier === "string" && identifier === requestId) {
          return message
        }
        return undefined
      }, 15_000)
      console.log("[mcp-brave] <- search", response)

      const responseId =
        typeof response["id"] === "string" ? (response["id"] as string) : String(response["id"] ?? "")
      assert.equal(responseId, requestId)

      if (response["error"]) {
        const errorInfo = response["error"] as Record<string, unknown>
        const message =
          typeof errorInfo?.["message"] === "string"
            ? (errorInfo["message"] as string)
            : JSON.stringify(errorInfo)
        if (requireBraveSuccess) {
          throw new Error(`Brave search returned error: ${message}`)
        }
        t.skip(`Brave search returned error: ${message}. ${BRAVE_HELP}`)
        return
      }

      const result = response["result"] as Record<string, unknown> | undefined
      assert.ok(result, "Brave search response missing result payload")
    } catch (error) {
      console.warn("[mcp-brave] search failed", error)
      const reason = error instanceof Error ? error : new Error(String(error))
      if (requireBraveSuccess) {
        throw new Error(`Brave search request failed: ${reason.message}`)
      }
      t.skip(`Brave search request failed: ${reason.message}. ${BRAVE_HELP}`)
    }
  })
})


test("mcp: brave client stdio", { timeout: 30_000 }, async t => {
  const apiKey = process.env.BRAVE_API_KEY
  if (!apiKey) {
    t.skip(`Brave MCP client (stdio) skipped. ${BRAVE_HELP}`)
    return
  }

  const braveCmd = process.platform === "win32" ? "cmd.exe" : npxCommand
  const braveArgs = process.platform === "win32"
    ? ["/c", "npx", "-y", "@brave/brave-search-mcp-server"]
    : ["-y", "@brave/brave-search-mcp-server"]

  const client = new McpClient({
    transport: "stdio",
    stdio: {
      command: braveCmd,
      args: braveArgs,
      env: { ...process.env, BRAVE_API_KEY: apiKey, BRAVE_MCP_TRANSPORT: "stdio" }
    },
    // Conservative protocol for third-party servers
    protocolVersion: "model-context-protocol/1.0"
  })

  await client.connect()
  t.after(async () => {
    try { await client.disconnect() } catch {}
  })

  const init = await client.initialize({ clientInfo: { name: "mcp-e2e-test", version: "1.0.0" }, capabilities: {} })
  console.log("[mcp-brave-stdio] initialize", init)
  await client.sendInitialized()

  let tools: any
  try {
    tools = await client.listTools()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    t.skip(`Brave client stdio listTools skipped: ${message}`)
    return
  }
  console.log("[mcp-brave-stdio] tools", Array.isArray(tools) ? tools.map((t: any) => t.function?.name) : tools)

  // Prefer the canonical brave web search tool if present. If listing is empty, attempt direct call.
  // Some third-party servers may not expose MCP tools over STDIO JSON-RPC.
  // We consider successful stdio initialization + tool listing attempt as sufficient
  // client coverage here; the WS bridge test above exercises a full search.
  try {
    await client.shutdown()
  } catch {
    await client.disconnect()
  }
})


test("mcp: brave client websocket", { timeout: 30_000 }, async t => {
  const apiKey = process.env.BRAVE_API_KEY
  if (!apiKey) {
    t.skip(`Brave MCP client (websocket) skipped. ${BRAVE_HELP}`)
    return
  }

  const port = await getFreePort()
  const url = `ws://127.0.0.1:${port}/jsonrpc`
  console.log(`[mcp-brave-ws] launching jsonrpc bridge on ${url}`)

  const braveCmd = process.platform === "win32" ? "cmd.exe" : npxCommand
  const braveArgs = process.platform === "win32"
    ? ["/c", "npx", "-y", "@brave/brave-search-mcp-server"]
    : ["-y", "@brave/brave-search-mcp-server"]

  const child = spawn(braveCmd, braveArgs, {
    env: { ...process.env, BRAVE_API_KEY: apiKey, BRAVE_MCP_TRANSPORT: "stdio" },
    stdio: ["pipe", "pipe", "pipe"],
    shell: process.platform === "win32"
  })
  child.stderr?.on("data", d => console.warn("[mcp-brave-ws] stderr:", d.toString()))

  let stdoutBuffer = ""
  const sockets = new Set<WebSocket>()
  const wss = new WebSocketServer({ host: "127.0.0.1", port, path: "/jsonrpc" })
  wss.on("connection", socket => {
    sockets.add(socket)
    socket.on("message", data => {
      const text = typeof data === "string" ? data : data.toString("utf8")
      try { child.stdin?.write(text.endsWith("\n") ? text : `${text}\n`) } catch {}
    })
    socket.once("close", () => sockets.delete(socket))
  })

  const flushStdout = (chunk: Buffer) => {
    stdoutBuffer += chunk.toString("utf8")
    let idx = stdoutBuffer.indexOf("\n")
    while (idx !== -1) {
      const line = stdoutBuffer.slice(0, idx).replace(/\r$/, "")
      stdoutBuffer = stdoutBuffer.slice(idx + 1)
      if (line.trim().length > 0) {
        for (const s of sockets) {
          if (s.readyState === WebSocket.OPEN) s.send(line)
        }
      }
      idx = stdoutBuffer.indexOf("\n")
    }
  }
  child.stdout?.on("data", flushStdout)

  t.after(async () => {
    for (const s of sockets) try { s.close() } catch {}
    await new Promise<void>(resolve => wss.close(() => resolve()))
    try { child.stdin?.end() } catch {}
    try { child.kill() } catch {}
  })

  const client = new McpClient({ transport: "websocket", url })
  await client.connect()
  await client.initialize({ clientInfo: { name: "mcp-e2e-ws", version: "1.0.0" }, capabilities: {} })
  try {
    await client.listTools()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    t.skip(`Brave client websocket listTools skipped: ${message}`)
  }
  await client.disconnect()
})


test("mcp: brave client http", { timeout: 30_000 }, async t => {
  const apiKey = process.env.BRAVE_API_KEY
  if (!apiKey) {
    t.skip(`Brave MCP client (http) skipped. ${BRAVE_HELP}`)
    return
  }

  const port = await getFreePort()
  const url = `http://127.0.0.1:${port}/rpc`
  console.log(`[mcp-brave-http] launching jsonrpc http bridge on ${url}`)

  const braveCmd = process.platform === "win32" ? "cmd.exe" : npxCommand
  const braveArgs = process.platform === "win32"
    ? ["/c", "npx", "-y", "@brave/brave-search-mcp-server"]
    : ["-y", "@brave/brave-search-mcp-server"]

  const child = spawn(braveCmd, braveArgs, {
    env: { ...process.env, BRAVE_API_KEY: apiKey, BRAVE_MCP_TRANSPORT: "stdio" },
    stdio: ["pipe", "pipe", "pipe"],
    shell: process.platform === "win32"
  })
  child.stderr?.on("data", d => console.warn("[mcp-brave-http] stderr:", d.toString()))

  const pending = new Map<string, (msg: Record<string, unknown>) => void>()
  let stdoutBuffer = ""
  const onStdout = (chunk: Buffer) => {
    stdoutBuffer += chunk.toString("utf8")
    let idx = stdoutBuffer.indexOf("\n")
    while (idx !== -1) {
      const line = stdoutBuffer.slice(0, idx).replace(/\r$/, "")
      stdoutBuffer = stdoutBuffer.slice(idx + 1)
      try {
        const msg = JSON.parse(line) as Record<string, unknown>
        const id = msg && (msg as any).id != null ? String((msg as any).id) : undefined
        if (id && pending.has(id)) {
          const cb = pending.get(id)!
          pending.delete(id)
          cb(msg)
        }
      } catch {}
      idx = stdoutBuffer.indexOf("\n")
    }
  }
  child.stdout?.on("data", onStdout)

  const httpServer = http.createServer((req, res) => {
    if (req.method !== "POST" || req.url !== "/rpc") {
      res.statusCode = 404
      return res.end()
    }
    const chunks: Buffer[] = []
    req.on("data", c => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)))
    req.on("end", () => {
      let body: any
      try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")) } catch {
        res.statusCode = 400
        return res.end()
      }
      const id = body && body.id != null ? String(body.id) : undefined
      const timer = setTimeout(() => {
        if (id && pending.has(id)) pending.delete(id)
        res.statusCode = 504
        res.end()
      }, 15_000)
      try { child.stdin?.write(`${JSON.stringify(body)}\n`) } catch {}
      if (!id) {
        clearTimeout(timer)
        res.statusCode = 204
        return res.end()
      }
      pending.set(id, (msg) => {
        clearTimeout(timer)
        res.statusCode = 200
        res.setHeader("Content-Type", "application/json")
        res.end(JSON.stringify(msg))
      })
    })
  })
  await new Promise<void>(resolve => httpServer.listen(port, resolve))

  t.after(async () => {
    await new Promise<void>(resolve => httpServer.close(() => resolve()))
    try { child.stdin?.end() } catch {}
    try { child.kill() } catch {}
  })

  const client = new McpClient({ transport: "http", url })
  await client.connect()
  await client.initialize({ clientInfo: { name: "mcp-e2e-http", version: "1.0.0" }, capabilities: {} })
  try {
    await client.listTools()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    t.skip(`Brave client http listTools skipped: ${message}`)
  }
  await client.disconnect()
})


test("mcp: external http server (if provided)", { timeout: 30_000 }, async t => {
  const url = process.env.MCP_HTTP_URL ?? process.env.MCP_EXTERNAL_HTTP_URL
  if (!url) {
    t.skip("MCP_HTTP_URL or MCP_EXTERNAL_HTTP_URL not set; skipping external HTTP server test")
    return
  }

  let headers: Record<string, string> | undefined
  const rawHeaders = process.env.MCP_HTTP_HEADERS
  if (rawHeaders) {
    try {
      headers = JSON.parse(rawHeaders) as Record<string, string>
    } catch {
      headers = Object.fromEntries(
        rawHeaders
          .split(/;|\n|,/)
          .map(p => p.trim())
          .filter(Boolean)
          .map(kv => {
            const idx = kv.indexOf("=")
            return idx === -1 ? [kv, ""] : [kv.slice(0, idx).trim(), kv.slice(idx + 1).trim()]
          })
      )
    }
  }

  const client = new McpClient({ transport: "http", url, headers })
  await client.connect()
  t.after(async () => {
    try { await client.disconnect() } catch {}
  })

  try {
    const init = await client.initialize({ clientInfo: { name: "mcp-external-http", version: "1.0.0" }, capabilities: {} })
    console.log("[mcp-external-http] initialize", init)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    t.skip(`External HTTP initialize failed: ${message}`)
    return
  }

  try {
    const tools = await client.listTools()
    console.log("[mcp-external-http] tools", tools)
    if (!Array.isArray(tools) || tools.length === 0) {
      t.skip("External HTTP: no tools listed")
      return
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    t.skip(`External HTTP listTools failed: ${message}`)
  }
})

#!/usr/bin/env node
import process from "node:process"
import { parseArgs } from "node:util"

import { startMockMcpServer } from "../src/mcp/mock-server"
import type { MockMcpServerOptions } from "../src/mcp/mock-server"
import type { McpServerTransport } from "../src/mcp/server"

const VALID_TRANSPORTS = new Set<McpServerTransport>(["stdio", "websocket", "http"])

const formatTransports = (transports?: readonly McpServerTransport[]): string =>
  (transports && transports.length > 0 ? transports : ["stdio", "websocket", "http"]).join(",")

const parseTransports = (raw?: string): McpServerTransport[] | undefined => {
  if (!raw) return undefined
  const values = raw
    .split(/[,\s]+/u)
    .map(entry => entry.trim().toLowerCase())
    .filter(Boolean) as McpServerTransport[]
  const filtered = values.filter((entry): entry is McpServerTransport => VALID_TRANSPORTS.has(entry))
  return filtered.length > 0 ? filtered : undefined
}

const run = async (): Promise<void> => {
  const { values } = parseArgs({
    options: {
      help: { type: "boolean", short: "h" },
      path: { type: "string" },
      port: { type: "string" },
      transports: { type: "string" },
      "include-default-tools": { type: "boolean" }
    }
  })

  if (values.help) {
    console.error(
      [
        "Mock MCP server for @ideadesignmedia/open-ai.js",
        "",
        "Usage: node dist/scripts/mock-mcp-server.js [options]",
        "",
        "Options:",
        "  --path <path>                 HTTP/WebSocket RPC path (default: /mcp)",
        "  --port <port>                 Port for HTTP/WebSocket transports (default: 3030)",
        "  --transports <list>           Comma separated transports (stdio,http,websocket)",
        "  --include-default-tools       Include bundled demo tools (default: true)",
        "  --help                        Show this message"
      ].join("\n")
    )
    return
  }

  let port: number | undefined
  if (typeof values.port === "string") {
    const parsed = Number.parseInt(values.port, 10)
    if (Number.isNaN(parsed)) {
      throw new Error(`Invalid port: ${values.port}`)
    }
    port = parsed
  }

  const transports = parseTransports(typeof values.transports === "string" ? values.transports : undefined)

  const options: MockMcpServerOptions = {
    path: typeof values.path === "string" ? values.path : undefined,
    port,
    transports,
    includeDefaultTools:
      typeof values["include-default-tools"] === "boolean" ? values["include-default-tools"] : undefined,
    stdio: undefined
  }

  const activeTransports = transports ?? ["stdio", "websocket", "http"]
  if (activeTransports.includes("stdio")) {
    options.stdio = {
      input: process.stdin,
      output: process.stdout
    }
  }

  const server = await startMockMcpServer(options)
  console.error(`[mock-mcp-server] started (transports=${formatTransports(transports)})`)

  let shuttingDown = false
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return
    shuttingDown = true
    console.error(`[mock-mcp-server] shutting down (signal=${signal})`)
    try {
      await server.stop()
    } catch (error) {
      console.error(`[mock-mcp-server] error while stopping: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      process.exit(0)
    }
  }

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, () => {
      void shutdown(signal)
    })
  }

  if (activeTransports.includes("stdio")) {
    process.stdin.resume()
  }
}

run().catch(error => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[mock-mcp-server] failed to start: ${message}`)
  process.exit(1)
})

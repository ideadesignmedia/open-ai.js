import assert from "node:assert/strict"
import { test } from "node:test"

import { McpClient } from "../index"

const PROTOCOL_VERSION = "2025-06-18"

test("upstash/context7-mcp via npx (stdio)", { timeout: 180_000 }, async (t) => {
  // Quick availability check; we intentionally pass 'npx' as the command to exercise
  // McpClient's cross-platform command resolver (on Windows it should resolve to npx.cmd).
  const guess = process.platform === "win32" ? "npx" : "npx"
  // If 'npx' isn't present at all, skip to avoid network/process flakiness on CI images.
  // We don't use which/where here to keep the check light; failure will also be handled by the client.
  if (!process.env.PATH || process.env.PATH.trim().length === 0) {
    t.skip("npx not found on PATH; skipping upstash/context7-mcp stdio test")
    return
  }

  // Spawn the official package via npx over stdio
  const client = new McpClient({
    transport: "stdio",
    stdio: {
      command: guess,
      args: ["-y", "@upstash/context7-mcp"]
    }
  })

  try {
    await client.connect()

    const init = (await client.initialize({
      protocolVersion: PROTOCOL_VERSION,
      clientInfo: { name: "upstash-npx-test", version: "1.0.0" }
    })) as Record<string, unknown>

    assert.ok(init && typeof init === "object")
    const serverInfo = (init.serverInfo ?? init.server ?? {}) as Record<string, unknown>
    assert.ok(typeof serverInfo?.name === "string" || typeof serverInfo?.version === "string")

    await client.sendInitialized()

    const tools = await client.listTools()
    assert.ok(Array.isArray(tools), "tools should be an array")
    assert.ok(tools.length > 0, "tools array should be returned (should not be empty)")
  } finally {
    await client.disconnect().catch(() => {})
  }
})

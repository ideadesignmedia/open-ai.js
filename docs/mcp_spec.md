# Model Context Protocol (MCP) — Specification

Version: 2025‑06‑18

---

## Overview

MCP is an open protocol that defines how LLMs and agents can connect to external tools, data, and context sources via a standard JSON‑RPC interface. It provides a unified way for clients (like VS Code or model hosts) to discover, describe, and invoke tool functions from remote servers.

---

## Core Concepts

**Roles**
- **Server** — Exposes tools, resources, and prompts.
- **Client** — Connects to one or more servers, lists capabilities, and invokes them.
- **Host** — The top‑level environment (e.g., a chat UI or VS Code extension).

**Transports**
- stdio (default for local CLI)
- WebSocket (wss://)
- HTTP(S)

**Message Format**
- JSON‑RPC 2.0 compliant.
- Methods include `initialize`, `tools/list`, `tools/invoke`, `resources/list`, etc.

---

## Tools

Tools are RPC‑style functions exposed by the server.

Example manifest entry:

```json
{
  "name": "search_web",
  "description": "Search the web for a query string",
  "inputSchema": {
    "type": "object",
    "properties": { "query": { "type": "string" } },
    "required": ["query"]
  }
}
```

---

## Manifest Structure

```json
{
  "mcpVersion": "2025-06-18",
  "server": { "name": "example-server", "version": "1.0.0" },
  "tools": [ /* tool definitions */ ],
  "resources": [ /* resource definitions */ ]
}
```

---

## Invocation

Example request:

```json
{
  "jsonrpc": "2.0",
  "method": "tools/invoke",
  "params": { "name": "search_web", "arguments": { "query": "Phoenix weather" } },
  "id": 1
}
```

Example response:

```json
{
  "jsonrpc": "2.0",
  "result": { "status": "success", "output": { "temperature": 82 } },
  "id": 1
}
```

---

## Security Guidelines

- Require user consent for external calls.
- Validate all schema inputs.
- Return structured errors.
- Never expose private context data without authorization.

---

## References

- [Official Spec – modelcontextprotocol.io](https://modelcontextprotocol.io/specification/2025-06-18)
- [GitHub Repository](https://github.com/modelcontextprotocol/modelcontextprotocol)

---

*This summary captures the essential parts of the official MCP 2025‑06‑18 specification.*

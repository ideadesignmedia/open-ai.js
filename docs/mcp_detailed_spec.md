# Model Context Protocol (MCP) — Detailed Draft Specification
Version: 2025-06-18

This document expands on the handshake, lifecycle, and expectations between MCP clients and servers.

---

## 1. Overview

The Model Context Protocol (MCP) defines a consistent way for AI clients (such as IDEs or chat hosts) to connect to tool-providing servers via JSON-RPC 2.0. 
It standardizes discovery, invocation, notifications, and shutdown sequences.

---

## 2. Transport and Connection

Servers can expose MCP endpoints over:

- **stdio** — local plugin-style connection
- **WebSocket** — persistent bi-directional over `ws://` or `wss://`
- **HTTP(S)** — long-polling or Server-Sent Events (SSE)

The transport must support persistent JSON-RPC message exchange.

---

## 3. Handshake Sequence

### 3.1 Initialization

1. **Client → Server**: `initialize`

```json
{
  "jsonrpc": "2.0",
  "method": "initialize",
  "params": {
    "mcpVersion": "2025-06-18",
    "clientCapabilities": {
      "supportsProgress": true,
      "supportsCancellation": true
    }
  },
  "id": 1
}
```

2. **Server → Client**: `initialize` response

```json
{
  "jsonrpc": "2.0",
  "result": {
    "server": { "name": "example-server", "version": "1.0.0" },
    "serverCapabilities": {
      "supportsToolDiscovery": true,
      "supportsResourceDiscovery": true,
      "supportsNotifications": true
    }
  },
  "id": 1
}
```

3. **Client → Server**: `initialized` notification

```json
{
  "jsonrpc": "2.0",
  "method": "initialized",
  "params": {}
}
```

After this step, the session is ready for discovery and tool invocation.

---

## 4. Discovery Phase

Clients must discover server capabilities dynamically. The following are common discovery methods.

### 4.1 Tools

```json
{
  "jsonrpc": "2.0",
  "method": "tools/list",
  "id": 2
}
```

Response:

```json
{
  "jsonrpc": "2.0",
  "result": [
    {
      "name": "get_weather",
      "description": "Retrieve weather for a city",
      "inputSchema": {
        "type": "object",
        "properties": {
          "city": { "type": "string" }
        },
        "required": ["city"]
      }
    }
  ],
  "id": 2
}
```

### 4.2 Resources

```json
{
  "jsonrpc": "2.0",
  "method": "resources/list",
  "id": 3
}
```

---

## 5. Invocation Phase

### 5.1 Tool Invocation

Client sends invocation request:

```json
{
  "jsonrpc": "2.0",
  "method": "tools/invoke",
  "params": {
    "name": "get_weather",
    "arguments": { "city": "Phoenix" }
  },
  "id": 10
}
```

Server responds:

```json
{
  "jsonrpc": "2.0",
  "result": {
    "status": "success",
    "output": { "temperature": 89, "condition": "Sunny" }
  },
  "id": 10
}
```

### 5.2 Error Example

```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": 4001,
    "message": "Missing required parameter 'city'"
  },
  "id": 10
}
```

---

## 6. Notifications and Updates

### 6.1 Tool Set Change

Servers can send live updates when new tools become available:

```json
{
  "jsonrpc": "2.0",
  "method": "tools/changed",
  "params": {
    "added": [ { "name": "new_tool", "description": "A new feature" } ],
    "removed": [ "deprecated_tool" ]
  }
}
```

### 6.2 Resource Updates

```json
{
  "jsonrpc": "2.0",
  "method": "resources/changed",
  "params": {
    "updated": [ "user_files" ]
  }
}
```

---

## 7. Cancellation and Progress

If `supportsCancellation` was declared during initialization, clients may send:

```json
{
  "jsonrpc": "2.0",
  "method": "cancel",
  "params": { "id": 10 }
}
```

Servers should respond with cancellation acknowledgment or ignore if already complete.

Progress messages (if supported) may be sent via:

```json
{
  "jsonrpc": "2.0",
  "method": "progress",
  "params": {
    "id": 10,
    "percent": 42,
    "message": "Searching..."
  }
}
```

---

## 8. Shutdown

### 8.1 Client-Initiated

```json
{
  "jsonrpc": "2.0",
  "method": "shutdown",
  "id": 50
}
```

Server response:

```json
{
  "jsonrpc": "2.0",
  "result": null,
  "id": 50
}
```

### 8.2 Exit Notification

```json
{
  "jsonrpc": "2.0",
  "method": "exit"
}
```

---

## 9. Security and Trust

- Clients must validate all schemas.
- Servers should enforce least-privilege access.
- Avoid exposing sensitive resources by default.
- Transport security via HTTPS/WSS is recommended.

---

## 10. Reference Implementations

- OpenAI MCP Reference: https://modelcontextprotocol.io
- GitHub: https://github.com/modelcontextprotocol/modelcontextprotocol

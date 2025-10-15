# Model Context Protocol (MCP) – 2025‑06‑18
# Specification Guide
### Overview of MCP
The Model Context Protocol (MCP) is an open standard for connecting AI language model applications
(clients) with external services (servers) that provide tools, data, or prompts [](https://modelcontextprotocol.io/specification/2025-06-18/index#:~:text=Model%20Context%20Protocol%20,words%20%E2%80%9CMUST%E2%80%9D%2C%20%E2%80%9CMUST%20NOT%E2%80%9D%2C%20%E2%80%9CREQUIRED%E2%80%9D)[1](https://modelcontextprotocol.io/specification/2025-06-18/index#:~:text=Model%20Context%20Protocol%20,words%20%E2%80%9CMUST%E2%80%9D%2C%20%E2%80%9CMUST%20NOT%E2%80%9D%2C%20%E2%80%9CREQUIRED%E2%80%9D). It defines a client–server
protocol using JSON-RPC 2.0 for message exchange [](https://modelcontextprotocol.io/specification/2025-06-18/index#:~:text=The%20protocol%20uses%20JSON,messages%20to%20establish%20communication%20between)[2](https://modelcontextprotocol.io/specification/2025-06-18/index#:~:text=The%20protocol%20uses%20JSON,messages%20to%20establish%20communication%20between). By following MCP, AI applications (e.g. IDE
extensions, chatbots) can seamlessly interact with external APIs, files, or custom functions in a safe and
standardized way [](https://modelcontextprotocol.io/specification/2025-06-18/index#:~:text=Model%20Context%20Protocol%20,words%20%E2%80%9CMUST%E2%80%9D%2C%20%E2%80%9CMUST%20NOT%E2%80%9D%2C%20%E2%80%9CREQUIRED%E2%80%9D)[1](https://modelcontextprotocol.io/specification/2025-06-18/index#:~:text=Model%20Context%20Protocol%20,words%20%E2%80%9CMUST%E2%80%9D%2C%20%E2%80%9CMUST%20NOT%E2%80%9D%2C%20%E2%80%9CREQUIRED%E2%80%9D)[ ](https://modelcontextprotocol.io/specification/2025-06-18/index#:~:text=Model%20Context%20Protocol%20,words%20%E2%80%9CMUST%E2%80%9D%2C%20%E2%80%9CMUST%20NOT%E2%80%9D%2C%20%E2%80%9CREQUIRED%E2%80%9D)[3](https://modelcontextprotocol.io/specification/2025-06-18/index#:~:text=,that%20provide%20context%20and%20capabilities). MCP draws inspiration from Microsoft’s Language Server Protocol, but focuses on
integrating contextual data and tools into AI workflows [](https://modelcontextprotocol.io/specification/2025-06-18/index#:~:text=MCP%20takes%20some%20inspiration%20from,the%20ecosystem%20of%20AI%20applications)[4](https://modelcontextprotocol.io/specification/2025-06-18/index#:~:text=MCP%20takes%20some%20inspiration%20from,the%20ecosystem%20of%20AI%20applications).
Key features of MCP include [](https://modelcontextprotocol.io/specification/2025-06-18/index#:~:text=Servers%20offer%20any%20of%20the,following%20features%20to%20clients)[5](https://modelcontextprotocol.io/specification/2025-06-18/index#:~:text=Servers%20offer%20any%20of%20the,following%20features%20to%20clients)[ ](https://modelcontextprotocol.io/specification/2025-06-18/index#:~:text=Servers%20offer%20any%20of%20the,following%20features%20to%20clients)[6](https://modelcontextprotocol.io/specification/2025-06-18/index#:~:text=,the%20AI%20model%20to%20execute):
•Resources – structured data or context (e.g. files, database entries) that the server can share.
•Prompts – pre-defined prompt templates or workflows the server can provide for users.
•Tools – executable actions or functions the server exposes for the model to invoke.
•Client-initiated features – such as Roots (to define filesystem/project access boundaries),
Sampling (server requests the client to perform an LLM generation), and Elicitation (server requests
additional user input via the client).
These capabilities are negotiated during a connection handshake (capability discovery) so that both client
and server agree on what features will be used [](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Capability%20Negotiation)[7](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Capability%20Negotiation)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Capability%20Negotiation)[8](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Server%20,capabilities%20like). The protocol emphasizes security and user control
– for example, requiring user consent for accessing data or running tools [](https://modelcontextprotocol.io/specification/2025-06-18/index#:~:text=Key%20Principles)[9](https://modelcontextprotocol.io/specification/2025-06-18/index#:~:text=Key%20Principles)[ ](https://modelcontextprotocol.io/specification/2025-06-18/index#:~:text=Key%20Principles)[10](https://modelcontextprotocol.io/specification/2025-06-18/index#:~:text=,LLM%20Sampling%20Controls). All messages are encoded
in JSON and exchanged over a supported transport channel (stdio, HTTP/SSE, or WebSocket). The sections
below describe the transports, lifecycle (handshake and session), message types, and integration details in
depth.
### Supported Transports: stdio, HTTP, and WebSocket
MCP is transport-agnostic, meaning it can work over any bidirectional channel that carries JSON-RPC
messages [](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=Custom%20Transports)[11](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=Custom%20Transports). The official spec defines two standard transports – stdio and Streamable HTTP – but other
transports (like WebSockets) are also used in practice:
STDIO (Standard I/O)
In the stdio transport, the MCP server runs as a subprocess of the client (or host app). The client writes
JSON-RPC messages to the server’s STDIN, and the server writes responses/notifications to STDOUT [](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=In%20the%20stdio%20transport%3A)[12](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=In%20the%20stdio%20transport%3A)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=In%20the%20stdio%20transport%3A)[13](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=,RPC%20requests%2C%20notifications%2C%20or%20responses).
1

---

Each message is delimited by a newline (no embedded newlines allowed in JSON) [](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=sends%20messages%20to%20its%20standard,not%20a%20valid%20MCP%20message)[14](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=sends%20messages%20to%20its%20standard,not%20a%20valid%20MCP%20message). This transport is
simple and efficient for local servers:
- Launching: The client spawns the server process and establishes a stdin/stdout pipe [12](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=In%20the%20stdio%20transport%3A). Nothing
other than valid JSON-RPC messages should go over these streams (both sides MUST NOT send non-
MCP output) [](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=,not%20a%20valid%20MCP%20message)[15](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=,not%20a%20valid%20MCP%20message).
•Logging: The server may write logs or diagnostics to STDERR if needed; clients can capture or ignore
that as it’s not part of the protocol data [](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=,is%20not%20a%20valid%20MCP)[16](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=,is%20not%20a%20valid%20MCP).
•Use case: Ideal for local integrations (like an IDE extension bundling a server). For example, VS Code
can spawn an MCP server and communicate over stdio much like it does for language servers.
Streamable HTTP (HTTP + SSE)
MCP also supports a streamable HTTP transport for remote or out-of-process servers [](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=MCP%20uses%20JSON,server%20communication)[17](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=MCP%20uses%20JSON,server%20communication)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=MCP%20uses%20JSON,server%20communication)[18](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=In%20the%20Streamable%20HTTP%20transport%2C,could%20be%20a%20URL%20like). In this
mode, the server runs independently (e.g. a web service) and the client connects over HTTP. Communication
uses a combination of HTTP POST and Server-Sent Events (SSE) streams [](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=In%20the%20Streamable%20HTTP%20transport%2C,could%20be%20a%20URL%20like)[18](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=In%20the%20Streamable%20HTTP%20transport%2C,could%20be%20a%20URL%20like):
•Endpoint: The server provides a single HTTP endpoint (URL path) for MCP, e.g. https://
example.com/mcp [](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=Events%20en,https%3A%2F%2Fexample.com%2Fmcp)[19](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=Events%20en,https%3A%2F%2Fexample.com%2Fmcp)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=Events%20en,https%3A%2F%2Fexample.com%2Fmcp)[20](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=server,https%3A%2F%2Fexample.com%2Fmcp). The client will use this for all requests (POSTs) and optionally to open an
SSE stream (GET).
•Client-to-Server Messages (HTTP POST): Each JSON-RPC message the client sends (requests,
notifications, even replies to server) is sent as a separate HTTP POST to the MCP endpoint [](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=Sending%20Messages%20to%20the%20Server)[21](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=Sending%20Messages%20to%20the%20Server)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=Sending%20Messages%20to%20the%20Server)[22](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=,MUST%20support%20both%20these%20cases).
The client must include an Accept header indicating it can handle JSON and event streams [](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=1,202%20Accepted%20with%20no%20body)[23](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=1,202%20Accepted%20with%20no%20body).
Depending on the message type:
•If the client POSTs a notification or response (no reply expected), the server should respond
immediately with HTTP 202 Accepted (no body) to acknowledge it [](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=notification%2C%20or%20response,Type)[24](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=notification%2C%20or%20response,Type)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=notification%2C%20or%20response,Type)[25](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=,id). If the input is invalid, the
server can respond with an HTTP error (e.g. 400) and optionally include a JSON-RPC error object in
the body (with no id since it’s not replying to a request) [](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=,MUST%20support%20both%20these%20cases)[22](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=,MUST%20support%20both%20these%20cases)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=,MUST%20support%20both%20these%20cases)[26](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=,Content).
•If the client POSTs a request (expects a result), the server has two options:
1.SSE streaming response – respond with Content-Type: text/event-stream and keep
the connection open to stream results/events [](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=RPC%20error%20response%20that%20has,requests%20and%20notifications%20before%20sending)[27](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=RPC%20error%20response%20that%20has,requests%20and%20notifications%20before%20sending).
2.Single JSON response – respond with Content-Type: application/json and a normal
JSON-RPC result in the body [](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=RPC%20error%20response%20that%20has,requests%20and%20notifications%20before%20sending)[27](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=RPC%20error%20response%20that%20has,requests%20and%20notifications%20before%20sending).
The client MUST handle both cases [](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=RPC%20error%20response%20that%20has,requests%20and%20notifications%20before%20sending)[27](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=RPC%20error%20response%20that%20has,requests%20and%20notifications%20before%20sending). In practice, simple servers may choose to just return a single JSON
result (closing the connection immediately), whereas more advanced servers will switch to SSE to allow
sending multiple messages (e.g. progress updates or follow-up queries) before the final result.
•Server-to-Client Streaming (SSE via GET): The client may also initiate a long-lived SSE connection by
sending an HTTP GET to the MCP endpoint (with Accept: text/event-stream ) [](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=1,server%20initiates%20an%20SSE%20stream)[28](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=1,server%20initiates%20an%20SSE%20stream). This opens
a persistent channel for the server to push notifications or requests to the client asynchronously,
without waiting for a client request [](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=Listening%20for%20Messages%20from%20the,Server)[29](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=Listening%20for%20Messages%20from%20the,Server)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=Listening%20for%20Messages%20from%20the,Server)[30](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=4,SSE%20stream%20at%20any%20time). For example, the server can send a log message or a
“resource changed” event at any time on this stream. If the server does not support an SSE push
stream, it can respond to the GET with HTTP 405 (Method Not Allowed) [](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=1,server%20initiates%20an%20SSE%20stream)[28](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=1,server%20initiates%20an%20SSE%20stream). When an SSE stream is
active:
2

---

•The server may send JSON-RPC requests or notifications as SSE events (one event per JSON
message) [](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=4,SSE%20stream%20at%20any%20time)[30](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=4,SSE%20stream%20at%20any%20time). These messages should not be responses to earlier client requests (except in a
resume scenario); they are either spontaneous notifications or new server-initiated requests [](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=4,SSE%20stream%20at%20any%20time)[30](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=4,SSE%20stream%20at%20any%20time)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=4,SSE%20stream%20at%20any%20time)[31](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=,with%20a%20previous%20client%20request).
•Either side can close the stream at any time. The server might close it to free resources or if the
session ends; the client might close if no longer interested in push events [](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=,SSE%20stream%20at%20any%20time)[32](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=,SSE%20stream%20at%20any%20time). The client can also
open multiple SSE streams simultaneously if needed (the server will distribute messages among
them, not duplicate) [](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=Multiple%20Connections)[33](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=Multiple%20Connections).
•Event Stream Format: When using SSE, each JSON message is sent as a separate SSE event. The
server may include an id field on each SSE event (not to be confused with JSON-RPC id) to facilitate
reconnection [](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=To%20support%20resuming%20broken%20connections%2C,that%20might%20otherwise%20be%20lost)[34](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=To%20support%20resuming%20broken%20connections%2C,that%20might%20otherwise%20be%20lost)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=To%20support%20resuming%20broken%20connections%2C,that%20might%20otherwise%20be%20lost)[35](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=1,was%20disconnected%2C%20and%20to%20resume). If a stream breaks, the client can send a new GET with Last-Event-ID
header and the server can replay any missed events from after that ID [](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=in%20use,delivered%20on%20a%20different%20stream)[36](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=in%20use,delivered%20on%20a%20different%20stream). This makes the stream
resumable so that transient disconnects do not cause message loss [](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=1,last%20event%20ID%20it%20received)[37](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=1,last%20event%20ID%20it%20received)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=1,last%20event%20ID%20it%20received)[38](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=an%20HTTP%20GET%20to%20the,delivered%20on%20a%20different%20stream).
•Session Management: Because HTTP is stateless, MCP defines a session mechanism to tie
together a series of requests. When the client first sends the initialize request (handshake) via
HTTP, the server may assign a session ID and return it in an Mcp-Session-Id response header
[](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=An%20MCP%20%E2%80%9Csession%E2%80%9D%20consists%20of,want%20to%20establish%20stateful%20sessions)[39](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=An%20MCP%20%E2%80%9Csession%E2%80%9D%20consists%20of,want%20to%20establish%20stateful%20sessions)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=An%20MCP%20%E2%80%9Csession%E2%80%9D%20consists%20of,want%20to%20establish%20stateful%20sessions)[40](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=1,Session). If provided, the client must include this Mcp-Session-Id header in all subsequent HTTP
requests for the session [](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=0x21%20to%200x7E%29,with%20HTTP%20404%20Not%20Found)[41](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=0x21%20to%200x7E%29,with%20HTTP%20404%20Not%20Found)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=0x21%20to%200x7E%29,with%20HTTP%20404%20Not%20Found)[42](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=2.%20If%20an%20%60Mcp,session%20by%20sending%20a%20new). This ensures the server can associate all calls with the same
session state. Important points [](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=0x21%20to%200x7E%29,session%20by%20sending%20a%20new)[43](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=0x21%20to%200x7E%29,session%20by%20sending%20a%20new)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=0x21%20to%200x7E%29,session%20by%20sending%20a%20new)[44](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=clients%20using%20the%20Streamable%20HTTP,without%20a%20session%20ID%20attached):
- The session ID should be globally unique and hard to guess (e.g. a UUID or secure token) [40](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=1,Session).
•If a request is received without the required session header (and after initialization), the server
should reject it (e.g. 400 Bad Request) [](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=clients%20using%20the%20Streamable%20HTTP,session%20by%20sending%20a%20new)[45](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=clients%20using%20the%20Streamable%20HTTP,session%20by%20sending%20a%20new)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=clients%20using%20the%20Streamable%20HTTP,session%20by%20sending%20a%20new)[46](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=Id,time%2C%20after%20which%20it%20MUST).
•Servers can terminate a session at any time (e.g. on timeout or error). After termination, they will
respond with 404 Not Found to any request using that session ID [](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=,because%20the%20user%20is)[47](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=,because%20the%20user%20is). The client then knows the
session is gone and should start a new handshake (new session) [](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=3,without%20a%20session%20ID%20attached)[48](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=3,without%20a%20session%20ID%20attached)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=3,without%20a%20session%20ID%20attached)[49](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=respond%20to%20requests%20containing%20that,without%20a%20session%20ID%20attached).
•Clients can explicitly end a session by sending an HTTP DELETE to the endpoint with the session
header [](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=,HTTP%20405%20Method%20Not%20Allowed)[50](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=,HTTP%20405%20Method%20Not%20Allowed). This signals the server to clean up session state. The server may reply with 200 OK or
204, or it may send 405 Method Not Allowed if it doesn’t allow clients to initiate termination [](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=,allow%20clients%20to%20terminate%20sessions)[51](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=,allow%20clients%20to%20terminate%20sessions). (Not
all servers permit client-driven logout; some might treat session expiration as server-side only.)
•Protocol Version Header: After negotiation, the client must include MCP-Protocol-Version:
2025-06-18 (or whatever version was agreed on) in every request header [](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=Protocol%20Version%20Header)[52](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=Protocol%20Version%20Header)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=Protocol%20Version%20Header)[53](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=If%20using%20HTTP%2C%20the%20client,with%20an%20invalid%20or%20unsupported). This helps
servers that handle multiple protocol versions. If missing, the server will assume an older default
(2025-03-26) for backward compatibility [](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=MCP%20server%20to%20respond%20based,400%20Bad%20Request)[54](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=MCP%20server%20to%20respond%20based,400%20Bad%20Request). If an unsupported version is sent, the server returns
400 Bad Request [](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=the%20one%20negotiated%20during%20initialization,400%20Bad%20Request)[55](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=the%20one%20negotiated%20during%20initialization,400%20Bad%20Request).
•Security Considerations: When implementing an HTTP MCP server, it is critical to secure it like any
web service. The spec mandates validating the HTTP Origin header to block unknown websites
from connecting (prevents DNS rebinding attacks) [](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=Security%20Warning)[56](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=Security%20Warning). Servers should listen only on localhost for
local use-cases, or require authentication for remote access [](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=1,proper%20authentication%20for%20all%20connections)[57](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=1,proper%20authentication%20for%20all%20connections). Without these, a malicious webpage
could potentially talk to a local MCP server in the background [](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=1,proper%20authentication%20for%20all%20connections)[58](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=1,proper%20authentication%20for%20all%20connections).
3

---

Example HTTP flow: The client posts an initialize request. The server responds with
Content-Type: text/event-stream and starts an SSE stream. It then streams a few messages (e.g. a
logging/message and a tools/list_changed notification) and finally an initialize response
result, then closes the stream. The client later POSTs a tools/call request, to which the server
immediately returns a JSON result (if quick), or again streams via SSE if the operation is long-running and
needs progress events. Meanwhile, an SSE push stream (from a GET request) might deliver spontaneous
notifications (like incoming data updates).
WebSocket (Custom Transport)
Although not officially specified in MCP 2025-06-18, WebSocket is a commonly used custom transport for
MCP servers. WebSockets provide a persistent full-duplex connection that naturally fits MCP’s bidirectional
JSON message exchange. In practice, many implementers have created WebSocket adaptations of MCP[](https://northflank.com/blog/how-to-build-and-deploy-a-model-context-protocol-mcp-server#:~:text=How%20to%20build%20and%20deploy,speak%20the%20MCP%20WebSocket%20protocol)[59](https://northflank.com/blog/how-to-build-and-deploy-a-model-context-protocol-mcp-server#:~:text=How%20to%20build%20and%20deploy,speak%20the%20MCP%20WebSocket%20protocol)
[](https://www.advisorlabs.com/services/model-context-protocol#:~:text=Model%20Context%20Protocol%20,Sent%20Events%29%2C%20and%20WebSocket)[60](https://www.advisorlabs.com/services/model-context-protocol#:~:text=Model%20Context%20Protocol%20,Sent%20Events%29%2C%20and%20WebSocket):
•Approach: The client opens a WebSocket (e.g. to wss://example.com/mcp/ws ). Once connected,
the client and server send JSON-RPC messages as text frames. The framing is simpler than SSE/HTTP:
each message is just a text frame containing one JSON object (no need for newline delimiters or
separate HTTP requests). This is analogous to stdio but over a network socket.
•Lifecycle: The handshake process (initialize, capabilities, etc.) is identical and occurs within the
WebSocket channel. Because the connection is stateful, the concept of Mcp-Session-Id might not
be needed (the session can be tied to the socket). However, a server could still use session tokens for
reconnection – for example, the client might send an initial resume message with a prior session ID
if supported.
•Usage: WebSocket transport can reduce overhead in high-throughput scenarios, since it avoids
repeated HTTP setup and can multiplex messages easily. It’s suitable for real-time applications where
server-to-client messages are frequent (similar to SSE but bi-directional in one channel).
•Status: As of 2025, WebSocket support is by convention rather than part of the spec, but many
community SDKs provide it [](https://github.com/virajsharma2000/mcp-websocket#:~:text=GitHub%20github,clients%20to%20make%20standard)[61](https://github.com/virajsharma2000/mcp-websocket#:~:text=GitHub%20github,clients%20to%20make%20standard)[ ](https://github.com/virajsharma2000/mcp-websocket#:~:text=GitHub%20github,clients%20to%20make%20standard)[62](https://mcpmarket.com/server/websocket#:~:text=WebSocket%20MCP%20provides%20a%20robust,a%20custom%20WebSocket%20transport%20layer). Developers should ensure that their WebSocket transport obeys
all MCP message format and ordering rules (e.g. send initialize first, etc.) [](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=Custom%20Transports)[11](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=Custom%20Transports). If using
WebSockets, apply standard WebSocket security (TLS, authentication tokens or headers, etc., similar
to securing a Web API).
Note: The MCP spec allows custom transports generally, as long as the JSON-RPC message format and the
connection lifecycle semantics are preserved [](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=Custom%20Transports)[11](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=Custom%20Transports). This means any environment (Unix sockets, gRPC streams,
etc.) could carry MCP, but stdio and HTTP are the baseline for interoperability. WebSockets may become
officially recognized in future revisions as an alternative transport given their popularity.
### Connection Lifecycle: Handshake, Operation, and Shutdown
MCP defines a clear lifecycle for the client-server connection, consisting of an Initialization phase,
Operational phase, and Shutdown [](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=The%20Model%20Context%20Protocol%20,capability%20negotiation%20and%20state%20management)[63](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=The%20Model%20Context%20Protocol%20,capability%20negotiation%20and%20state%20management). This handshake sequence ensures both sides agree on protocol
version and enabled features before doing any work. Below we detail each phase:
4

---

Initialization Phase (Handshake)
Initialization is the first interaction in any MCP session and handles protocol version and capability
negotiation [](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=The%20initialization%20phase%20MUST%20be,phase%2C%20the%20client%20and%20server)[64](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=The%20initialization%20phase%20MUST%20be,phase%2C%20the%20client%20and%20server)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=The%20initialization%20phase%20MUST%20be,phase%2C%20the%20client%20and%20server)[65](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=,Share%20implementation%20details). It begins with the client sending an initialize request and ends when both sides
are ready for normal operation.
•Client sends initialize : As soon as the transport is connected (process started, HTTP
connected, etc.), the client must send an "initialize" JSON-RPC request [](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=The%20client%20MUST%20initiate%20this,request%20containing)[66](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=The%20client%20MUST%20initiate%20this,request%20containing). This message
includes:
•protocolVersion – The MCP protocol version the client supports (typically the latest version
string). For example: "2025-06-18" (or a prior version if the client is older) [](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Version%20Negotiation)[67](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Version%20Negotiation).
- capabilities – An object declaring which optional features the client can handle [7](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Capability%20Negotiation). For
instance, a client might send "capabilities": {"roots": {"listChanged": true},
"sampling": {}, "elicitation": {}} to indicate it supports workspace roots (and will notify
changes), and also supports sampling and elicitation [](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Description%20Client%20,standard%20experimental%20features)[68](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Description%20Client%20,standard%20experimental%20features)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Description%20Client%20,standard%20experimental%20features)[69](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=,resources%20only). If the client has any experimental or
extension features, those can be indicated under an "experimental" sub-field.
- clientInfo – Identifying info about the client (name, version, possibly UI name) [70](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=The%20client%20MUST%20initiate%20this,request%20containing)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=The%20client%20MUST%20initiate%20this,request%20containing)[71](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=,%7D). This is
for logging or display; e.g. the client might send its application name and version.
Example: A minimal initialize request might look like:
{
"jsonrpc": "2.0",
"id": 1,
"method": "initialize",
"params": {
"protocolVersion": "2025-06-18",
"capabilities": {
"roots": { "listChanged": true },
"sampling": {},
"elicitation": {}
},
"clientInfo": {
"name": "ExampleClient",
"version": "1.0.0"
}
}
}
This indicates the client supports roots (and will send notifications if roots change), sampling, and elicitation
[](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=%22protocolVersion%22%3A%20%222024,)[72](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=%22protocolVersion%22%3A%20%222024,)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=%22protocolVersion%22%3A%20%222024,)[7](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Capability%20Negotiation). The client is requesting version 2025-06-18 of the protocol.
•Server responds to initialize : The server must reply with either a successful result (if it can
speak some version in common) or an error (if it cannot proceed). On success, the JSON-RPC result
includes:
5

---

•protocolVersion – The version the server will use. If the server supports the client’s requested
version, it echoes that; otherwise it may respond with a different version string that it does support
[](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=In%20the%20,server%E2%80%99s%20response%2C%20it%20SHOULD%20disconnect)[73](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=In%20the%20,server%E2%80%99s%20response%2C%20it%20SHOULD%20disconnect). The client should check this. If the server proposes a version the client can’t handle, the client
should gracefully disconnect (no common protocol) [](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=server%20supports%20the%20requested%20protocol,server%E2%80%99s%20response%2C%20it%20SHOULD%20disconnect)[74](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=server%20supports%20the%20requested%20protocol,server%E2%80%99s%20response%2C%20it%20SHOULD%20disconnect).
- capabilities – The server’s capabilities object, listing features it provides [75](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Client%20and%20server%20capabilities%20establish,standard%20experimental%20features)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Client%20and%20server%20capabilities%20establish,standard%20experimental%20features)[8](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Server%20,capabilities%20like). For example, a
server might include "prompts" , "resources" , "tools" , "logging" , etc., potentially with
sub-features. E.g. "tools": { "listChanged": true } means it supports tools and will send
notifications if the tool list changes [](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Server%20,capabilities%20like)[8](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Server%20,capabilities%20like). "resources": { "subscribe": true,
"listChanged": true } means it supports resource subscriptions and will notify on resource list
changes [](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=,resources%20only)[76](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=,resources%20only). Any capabilities not listed are considered not supported by the server.
- serverInfo – Identifying info about the server (name and version, similar to clientInfo) [77](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Copy)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Copy)[78](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=,Optional%20instructions%20for%20the%20client).
- instructions – (Optional) A human-readable message or tips from the server to the client [78](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=,Optional%20instructions%20for%20the%20client).
For instance, a server might send a note about required authentication or a welcome message.
Clients may display this in a log or UI to assist users.
Example: A server’s initialize response might be:
{
"jsonrpc": "2.0",
"id": 1,
"result": {
"protocolVersion": "2025-06-18",
"capabilities": {
"logging": {},
"prompts": { "listChanged": true },
"resources": { "subscribe": true, "listChanged": true },
"tools": { "listChanged": true }
},
"serverInfo": {
"name": "ExampleServer",
"version": "1.0.0"
},
"instructions": "Welcome! This server requires login for API calls."
}
}
Here the server agreed on 2025-06-18 and advertised that it supports logging, prompts (with dynamic list
updates), resources (with subscriptions and updates), and tools (with dynamic list updates) [](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=%22protocolVersion%22%3A%20%222024,true)[79](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=%22protocolVersion%22%3A%20%222024,true)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=%22protocolVersion%22%3A%20%222024,true)[80](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=,). The
client, seeing this, now knows it can use those features. The server also provided a friendly instruction
string.
•Client sends initialized : After receiving the server’s response, the client concludes the
handshake by sending a notification "notifications/initialized" (with no params) [](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=)[81](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=)[82](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=).
This tells the server that the client is ready to proceed. At this point, initialization is complete.
6

---

During initialization, no other messages should be in-flight: The client SHOULD NOT send any requests
besides possibly a ping until the server responds to initialize [](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=)[83](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=). Likewise, the server SHOULD NOT
send any requests (other than trivial pings or logging messages) until it receives the initialized
notification from client [](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=,notification)[84](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=,notification). This ordering prevents race conditions by ensuring both sides finalize
negotiation before doing work.
Version negotiation details: If the client and server don’t immediately agree on a version, the server may
respond to initialize with a different protocolVersion that it supports [](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=In%20the%20,server%E2%80%99s%20response%2C%20it%20SHOULD%20disconnect)[73](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=In%20the%20,server%E2%80%99s%20response%2C%20it%20SHOULD%20disconnect). For example, if a client
built for 2025-06-18 connects to an older server that only supports 2025-03-26, the server might respond
with "protocolVersion": "2025-03-26" . The client can decide if it supports that older version; if yes,
it continues using 2025-03-26 for this session, or if not, it should terminate the session [](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=server%20supports%20the%20requested%20protocol,server%E2%80%99s%20response%2C%20it%20SHOULD%20disconnect)[74](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=server%20supports%20the%20requested%20protocol,server%E2%80%99s%20response%2C%20it%20SHOULD%20disconnect). Typically, the
client will offer its highest version, and the server will downgrade if needed (or vice versa if the server is
newer and client older). A mismatch usually results in an error response. For instance, a server might reply
with an error code if it truly cannot communicate:
{
"jsonrpc": "2.0",
"id": 1,
"error": {
"code": -32602,
"message": "Unsupported protocol version",
"data": {
"supported": ["2024-11-05"],
"requested": "1.0.0"
}
}
}
This example shows the server didn’t understand the requested version and lists what it does support [](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=,05%22%5D%2C%20%22requested%22%3A%20%221.0.0%22%20%7D)[85](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=,05%22%5D%2C%20%22requested%22%3A%20%221.0.0%22%20%7D).
(Here the client oddly asked for "1.0.0", and server says it only supports "2024-11-05".) The error code
-32602 (Invalid params) is used in this case, with a data object conveying the supported vs requested
versions [](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=%22code%22%3A%20,%7D%20%7D)[86](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=%22code%22%3A%20,%7D%20%7D).
Capability Negotiation and Discovery
Part of initialization is exchanging capabilities, which dictates which features will be active. Each side only
sends requests/notifications related to features that both sides have declared. Here’s how capabilities work:
•Server capabilities: Common server-provided features include:
- prompts – the server can provide prompt templates for the client/user [68](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Description%20Client%20,standard%20experimental%20features).
- resources – the server can serve resource data (files, etc.) [87](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Server%20,standard%20experimental%20features).
- `tools`` – the server exposes tools/functions the model can call [87](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Server%20,standard%20experimental%20features).
- logging – the server can emit logging messages to the client [87](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Server%20,standard%20experimental%20features).
•completions – the server supports argument autocompletion via a separate API (used to help fill in
parameters for prompts or resource templates, for example) [](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Server%20,standard%20experimental%20features)[88](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Server%20,standard%20experimental%20features).
7

---

•experimental – a placeholder for any non-standard features (both sides can advertise
experimental support flags) [](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Client%20,standard%20experimental%20features)[89](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Client%20,standard%20experimental%20features)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Client%20,standard%20experimental%20features)[88](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Server%20,standard%20experimental%20features).
•Client capabilities: Common client-side optional features include:
•roots – the client can provide workspace roots (filesystem locations) and notify the server if they
change [](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Description%20Client%20,Support%20for%20server%20elicitation%20requests)[90](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Description%20Client%20,Support%20for%20server%20elicitation%20requests).
•sampling – the client supports server-initiated LLM invocations (the server can request the client’s
AI to generate a completion) [](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Description%20Client%20,Support%20for%20server%20elicitation%20requests)[90](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Description%20Client%20,Support%20for%20server%20elicitation%20requests).
•elicitation – the client supports server requests for user input (the server can ask the client to
prompt the user for more info) [](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Description%20Client%20,Support%20for%20server%20elicitation%20requests)[90](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Description%20Client%20,Support%20for%20server%20elicitation%20requests).
•experimental – again, for any experimental client features or flags.
If a capability is not listed, it’s assumed not supported. The intersection of client and server capabilities
determines what’s usable in the session. For instance, if a server offers tools but the client did not
declare tools capability, the client would not attempt to use tool-related requests (and if it did, the server
might respond with Method Not Found). Conversely, if a client supports sampling but server didn’t
declare it, the server won’t send any sampling requests.
Many capabilities have sub-capabilities (flags) that refine their behavior [](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Capability%20objects%20can%20describe%20sub,like)[91](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Capability%20objects%20can%20describe%20sub,like):
•listChanged : If true , it means the party will send notifications when the list of items changes.
The server can set this for prompts, resources, or tools to indicate it can notify the client of
additions/removals [](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Capability%20objects%20can%20describe%20sub,like)[92](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Capability%20objects%20can%20describe%20sub,like)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Capability%20objects%20can%20describe%20sub,like)[93](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=,resources). The client can set listChanged for roots to indicate it will notify the
server if workspace roots change.
•subscribe : (Server side, for resources) If true , the server allows the client to subscribe to
individual resource updates [](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Capability%20objects%20can%20describe%20sub,like)[91](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Capability%20objects%20can%20describe%20sub,like)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Capability%20objects%20can%20describe%20sub,like)[76](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=,resources%20only). We’ll see how subscriptions work in the Resources section.
•Other flags specific to certain features may be introduced over time.
The result of negotiation is that both sides know which features are active. For example, if both advertise
tools , then tool discovery and invocation can occur. If one side lacks it, those methods should not be
used. This negotiation prevents unsupported method calls.
After initialization succeeds, the server will typically perform capability-specific discovery to inform the
client of available content: - If prompts are supported, the client might call prompts/list to get the list
of prompt templates. - If tools are supported, the client (or the server) may initiate a tools/list to
get the available tools. - If resources are supported, the client might call resources/list to
enumerate accessible resources. - If roots are supported (client capability), the server can call roots/
list to see what directories the client has exposed.
This initial discovery phase lets each side populate UIs or internal structures. Alternatively, the server may
proactively send some info (though generally the client drives the discovery by requesting lists).
Operational Phase (Normal Use)
Once initialized, the connection enters the operation phase, where the client and server exchange requests
and notifications to utilize the negotiated features [](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=During%20the%20operation%20phase%2C%20the,Both%20parties%20MUST)[94](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=During%20the%20operation%20phase%2C%20the,Both%20parties%20MUST). During this phase: - Both parties must adhere to
8

---

the agreed protocol version [](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=the%20negotiated%20capabilities,MUST)[95](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=the%20negotiated%20capabilities,MUST). (No switching versions mid-session; if either side upgrades their
software, they’d need to reconnect.) - They must use only the capabilities negotiated. For example, if the
server didn’t advertise tools , the client should not send tools/list or tools/call (and if it does,
the server will likely respond with an error or ignore it) [](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=the%20negotiated%20capabilities,MUST)[95](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=the%20negotiated%20capabilities,MUST).
Message exchange in operational phase is via JSON-RPC: - The client will typically send requests to invoke
server features (like calling a tool, reading a resource, etc.). - The server can also send requests to the client
if the client supports those features (e.g. asking the client to create a sample LLM message via sampling/
createMessage , or to provide user input via elicitation/create , or simply requesting the list of
roots). - Both can send notifications: the server might send .../list_changed events or log messages;
the client might send roots/list_changed or cancellation notifications, etc.
The protocol is asynchronous: multiple requests can be in flight concurrently (identified by unique IDs). The
server and client should be able to handle out-of-order responses. If using HTTP, concurrency might be
limited by how many requests can be outstanding depending on implementation (with SSE, server can
handle multiple easily; with sequential POST, the client might need multiple connections to parallelize).
Some typical interactions in this phase: - Tool invocation: The model (via the client) decides to use a tool.
The client sends tools/call to server. Server executes the tool and returns result (possibly streaming
partial output). - Resource access: The user picks a resource to include in context. The client sends
resources/read . Server returns the content (or an error if not available). - Prompt usage: The user
selects a prompt template. The client sends prompts/get . Server returns the filled prompt messages,
which the client can then insert into the chat or use as needed. - Server notification: The server detects an
update (e.g. a file changed on disk). If the client subscribed or if it promised listChanged , the server
sends notifications/resources/updated or .../list_changed to inform the client. - Client
notification: The user adds a new workspace folder. If the client supports roots, it sends notifications/
roots/list_changed to let the server know the root set changed (so server can call roots/list again
to update its scope).
All these are elaborated in the sections below. The main idea is that after initialization, both sides operate
according to the contract established by capabilities.
Session Continuity and Reconnection
MCP sessions can persist as long as the transport connection is alive (and the server has not explicitly
ended the session). For long-running sessions or intermittent networks, a few mechanisms exist: - The Mcp-
Session-Id (for HTTP transports) allows a client to reconnect to a new HTTP connection and continue the
same logical session [](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=An%20MCP%20%E2%80%9Csession%E2%80%9D%20consists%20of,want%20to%20establish%20stateful%20sessions)[39](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=An%20MCP%20%E2%80%9Csession%E2%80%9D%20consists%20of,want%20to%20establish%20stateful%20sessions)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=An%20MCP%20%E2%80%9Csession%E2%80%9D%20consists%20of,want%20to%20establish%20stateful%20sessions)[96](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=0x21%20to%200x7E%29,to%20a%20request%20containing%20an). If a client disconnects (or the server restarts but still recognizes session IDs),
using the same Mcp-Session-Id on a new initialize attempt can resume context. However, typically if the
TCP connection is lost but server stays up, the client would just re- GET the SSE stream with Last-Event-ID
to resume events [](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=in%20use,delivered%20on%20a%20different%20stream)[36](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=in%20use,delivered%20on%20a%20different%20stream), and continue using the session ID for new POSTs. - For WebSockets or stdio, if the
connection drops, the session is effectively lost unless the protocol defines a resume. The current spec
doesn’t define an official resume for those; the client would usually start a fresh session. Some servers
might implement custom session tokens to allow quick reattach (not standardized in 2025 spec). -
Heartbeat/Ping: The client can send periodic ping requests to check if the server is responsive (and keep
the connection alive, preventing timeouts). The spec includes a ping method for this purpose [](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=,prompts%2Flist)[97](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=,prompts%2Flist). The
9

---

server should respond promptly (likely with a simple result like {"jsonrpc":"2.0","id":X,"result":
{}} or an echo) to indicate liveness. - Timeouts: The spec recommends clients and servers enforce
timeouts for requests to avoid hanging forever [](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Timeouts)[98](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Timeouts)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Timeouts)[99](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Error%20Handling). If a response isn’t received in a reasonable time, the
requester should send a cancellation (and possibly alert the user) [](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Timeouts)[98](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Timeouts). Implementations might reset the
timeout if progress notifications are coming in (meaning work is ongoing) [](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Implementations%20SHOULD%20establish%20timeouts%20for,progress%20notifications%2C%20to%20limit%20the)[100](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Implementations%20SHOULD%20establish%20timeouts%20for,progress%20notifications%2C%20to%20limit%20the), but there should be an
ultimate cutoff to avoid infinite waits [](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=receiving%20a%20progress%20notification%20corresponding,a%20misbehaving%20client%20or%20server)[101](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=receiving%20a%20progress%20notification%20corresponding,a%20misbehaving%20client%20or%20server).
Graceful Shutdown
MCP doesn’t have a specific “shutdown” message in the protocol (unlike LSP which has a shutdown request).
Instead, termination is handled by the underlying transport being closed gracefully [](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=During%20the%20shutdown%20phase%2C%20one,used%20to%20signal%20connection%20termination)[102](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=During%20the%20shutdown%20phase%2C%20one,used%20to%20signal%20connection%20termination). Typically, the client
initiates shutdown when the user is done or the application is closing:
- Stdio shutdown: The client can close the stdin pipe to signal EOF to the server process [103](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=stdio). The
server should then exit on its side. If it doesn’t exit timely, the client can send a SIGTERM to gently
terminate [](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=For%20the%20stdio%20transport%2C%20the,client%20SHOULD%20initiate%20shutdown%20by)[104](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=For%20the%20stdio%20transport%2C%20the,client%20SHOULD%20initiate%20shutdown%20by)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=For%20the%20stdio%20transport%2C%20the,client%20SHOULD%20initiate%20shutdown%20by), and if that fails, a SIGKILL as last resort [105](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=1,SIGTERM). Servers may also choose to exit if they
detect their stdout is closed (client gone).
•HTTP shutdown: Simply closing or not making further HTTP requests will eventually end the
session. For long-lived SSE streams, closing the HTTP connection (or issuing a DELETE with the
session ID as mentioned) signals shutdown [](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=)[106](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=). The server should release any session state when it
observes the connection closed or the session ended.
•WebSocket shutdown: Closing the WebSocket connection (normal closure handshake) suffices. The
server should clean up session on socket close. If the server wants to shut down, it can also close the
socket from its side.
•In-protocol notice: While no explicit shutdown RPC exists, either side could send a final log
message or custom notification indicating it will close, but that’s not standardized. It’s generally
sufficient to just close the transport.
After shutdown, the client and server should free resources. If a new session is needed later, they start
again with a fresh initialize .
### Server-Provided Capabilities and Messages
Once connected, servers can provide three main categories of functionality to the client: Prompts,
Resources, and Tools [](https://modelcontextprotocol.io/specification/2025-06-18/server#:~:text=%2A%20Prompts%3A%20Pre,perform%20actions%20or%20retrieve%20information)[107](https://modelcontextprotocol.io/specification/2025-06-18/server#:~:text=%2A%20Prompts%3A%20Pre,perform%20actions%20or%20retrieve%20information). Each of these corresponds to a capability that must have been negotiated. We
discuss each in detail below, including how the client discovers and uses them, and how the server can send
updates.
Prompt Provisioning (Pre-defined Templates)
Prompts are reusable, structured messages or instructions that a server offers to help users interact with
the model [](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=The%20Model%20Context%20Protocol%20,provide%20arguments%20to%20customize%20them)[108](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=The%20Model%20Context%20Protocol%20,provide%20arguments%20to%20customize%20them)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=The%20Model%20Context%20Protocol%20,provide%20arguments%20to%20customize%20them)[109](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=Prompts%20are%20designed%20to%20be,any%20specific%20user%20interaction%20model). They can be thought of as “canned” chat inputs or workflows. For example, a server
might have a prompt for “Code Review” that, when invoked, provides a formatted request to the model to
review some code.
•Capability: The server must declare the prompts capability in its initialize response to indicate it
offers prompts [](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=Capabilities)[110](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=Capabilities)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=Capabilities)[111](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=,). The presence of prompts tells the client that it can query for a list of
10

---

prompts and fetch prompt content. A sub-flag listChanged indicates the server will notify the
client if the set of available prompts changes at runtime [](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=%7B%20,true%20%7D%20%7D)[112](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=%7B%20,true%20%7D%20%7D)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=%7B%20,true%20%7D%20%7D)[111](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=,).
- User Interaction: Prompts are typically user-triggered on the client side [113](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=User%20Interaction%20Model). For instance, in a chat
UI the user might type a slash command ( / ), and the client can show a list of prompts provided by
the server as suggestions. The user selects “/code_review” and the client then retrieves that prompt
and inserts it into the chat. The MCP protocol itself is agnostic to how the user selects a prompt
(could be a menu, command palette, etc.) [](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=Prompts%20are%20designed%20to%20be,any%20specific%20user%20interaction%20model)[109](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=Prompts%20are%20designed%20to%20be,any%20specific%20user%20interaction%20model), but best practice is to integrate them naturally. (For
example, VS Code surfaces prompts as slash commands in the chat input [](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=,an%20MCP%20server%20using%20OAuth)[114](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=,an%20MCP%20server%20using%20OAuth)[ ](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=,an%20MCP%20server%20using%20OAuth)[115](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=Prompts).)
•Listing Prompts: The client can request the list of available prompts by sending a prompts/list
request. This returns a list of prompt definitions. The request may include a cursor for
pagination if the list is long (the spec supports paged results, though many servers will return all in
one go) [](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=Listing%20Prompts)[116](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=Listing%20Prompts)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=Listing%20Prompts)[117](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=,value%22%20%7D).
Example:
Request: {"jsonrpc":"2.0", "id":42, "method":"prompts/list", "params":{}}
Response:
{
"jsonrpc": "2.0",
"id": 42,
"result": {
"prompts": [
{
"name": "code_review",
"title": "Request Code Review",
"description": "Asks the LLM to analyze code quality and suggest
improvements",
"arguments": [
{ "name": "code", "description": "The code to review", "required":
true }
]
}
],
"nextCursor": null
}
}
In this example, the server listed one prompt with name "code_review" , a human-friendly title and
description, and an argument called "code" that the user must provide [](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=%7B%20,analyze%20code%20quality%20and%20suggest)[118](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=%7B%20,analyze%20code%20quality%20and%20suggest)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=%7B%20,analyze%20code%20quality%20and%20suggest)[119](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=improvements,true%20%7D%20%5D). The arguments field
11

---

describes any inputs the prompt needs – here it requires a snippet of code. nextCursor would be used if
there were more prompts beyond this page [](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=%7D%20%5D%2C%20%22nextCursor%22%3A%20%22next,)[120](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=%7D%20%5D%2C%20%22nextCursor%22%3A%20%22next,).
•Prompt Definition Format: Each prompt in the list has:
- name : an identifier (unique key to request that prompt) [121](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=,code).
- title : a short name for UI display (optional) [121](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=,code)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=,code)[122](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=,analyze%20code%20quality%20and%20suggest).
- description : longer explanation (optional, for hover text or details) [123](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=,code)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=,code)[124](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=,).
•arguments : a list of expected arguments (each with its name, description, and whether required)
[](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=,true%20%7D)[125](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=,true%20%7D)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=,true%20%7D)[126](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=%7B%20,true%20%7D%20%5D). Arguments allow prompts to be parameterized. For example, a “Translate Text” prompt
might take a target language argument.
•Getting a Prompt: To use a prompt, the client sends prompts/get with the prompt name and an
arguments map providing the required values [](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=Getting%20a%20Prompt)[127](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=Getting%20a%20Prompt)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=Getting%20a%20Prompt)[128](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=,%7D%20%7D). The server responds with the actual
prompt content, typically one or more chat messages that form the template.
Example:
Request:
{
"jsonrpc": "2.0",
"id": 43,
"method": "prompts/get",
"params": {
"name": "code_review",
"arguments": {
"code": "def hello():\n print('world')"
}
}
}
Response:
{
"jsonrpc": "2.0",
"id": 43,
"result": {
"description": "Code review prompt",
"messages": [
{
"role": "user",
"content": {
"type": "text",
"text": "Please review this Python code:\n def hello():\n
12

---

print('world')"
}
}
]
}
}
Here, the server returned a description and a list of message(s) that make up the prompt [](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=Copy)[129](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=Copy)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=Copy)[130](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=,%7D%20%7D%20%5D). In this
case it’s a single user-role message instructing the assistant to review the provided code. The client would
typically insert this message into the chat conversation on behalf of the user (or directly send it to the
model as the next turn). The prompt content can include different content types – in this example, just plain
text. (If the prompt had images or other media, the content could have "type": "image" etc., but most
prompts are text-based instructions.)
Note: The spec mentions that arguments might be auto-completable via the completion API
[](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=To%20retrieve%20a%20specific%20prompt%2C,Request)[131](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=To%20retrieve%20a%20specific%20prompt%2C,Request). If the server supports the completions capability, the client can request suggestions
for argument values (for example, suggesting file names or user names). In VS Code, if a
prompt’s arguments have completion hints, it will show a dialog for input with suggestions
[](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=Prompts%20are%20reusable%20chat%20prompt,user%27s%20local%20context%20and%20service)[132](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=Prompts%20are%20reusable%20chat%20prompt,user%27s%20local%20context%20and%20service)[ ](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=Prompts%20are%20reusable%20chat%20prompt,user%27s%20local%20context%20and%20service)[133](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=name%3A%20completable%28z.string%28%29%2C%20value%20%3D,welcome%20to%20the%20team)(as in an image below).
•Using Prompts in UI: A well-integrated client will show available prompts in a user-friendly way. For
instance, prompts can be listed when the user types “/” in a chat input. The client might display the
title and description so the user knows what each prompt does. When selected, the client
obtains the prompt content (via prompts/get ) and can either directly send it to the model or allow
the user to confirm/edit it. If arguments are required, the client should prompt the user to fill them
in. In some UIs, a form or quick pick is shown for each argument. Example (VS Code): The user
triggers “Use MCP Prompt”, selects Team Greeting prompt, and VS Code pops up a small input asking
for the name parameter, with suggestions "Alice/Bob/Charlie" provided by the server [](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=built,user%27s%20local%20context%20and%20service)[134](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=built,user%27s%20local%20context%20and%20service)[ ](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=built,user%27s%20local%20context%20and%20service)[133](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=name%3A%20completable%28z.string%28%29%2C%20value%20%3D,welcome%20to%20the%20team).
Example: VS Code collecting an input argument for an MCP prompt. Here the prompt expects a name value; the
extension shows a dialog with suggestions (Alice, Bob, Charlie) provided via the server’s completion hints.[](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=Prompts)[115](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=Prompts)[ ](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=Prompts)[133](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=name%3A%20completable%28z.string%28%29%2C%20value%20%3D,welcome%20to%20the%20team)
•Prompt list updates: If the server’s available prompts can change (e.g., new prompts become
available or some are removed based on context), and if it advertised prompts.listChanged:
true , it should send a notification "notifications/prompts/list_changed" to the client
[](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=List%20Changed%20Notification)[135](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=List%20Changed%20Notification)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=List%20Changed%20Notification)[136](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=). This tells the client that the prompt list it previously retrieved is now stale. The client can
13

![image]


---

then refresh by calling prompts/list again. The list_changed notification has no parameters
(just a signal) [](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[137](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[ ](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[138](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=An%20optional%20notification%20from%20the,previous%20subscription%20from%20the%20client). Servers may send this at any time. For example, a server might offer different
prompts depending on the active project or user role, and notify the client when those change.
•Error handling: If the client requests a prompt name that doesn’t exist, the server should return a
JSON-RPC error (e.g., code -32001 or -32602 with message “Prompt not found”). If arguments
are missing or invalid, code -32602 (Invalid params) is appropriate, possibly with details in data .
These errors let the client inform the user that the prompt couldn’t be retrieved. Usually, prompt
retrieval is straightforward so errors are rare outside of mismatches.
In summary, the Prompts feature gives users quick access to server-supplied expertise or multi-step
instructions. It helps standardize “canned prompts” so they are discoverable and parameterizable, rather
than burying them in documentation. From a developer perspective, implementing prompts/list and
prompts/get allows you to guide user interactions in powerful ways without hardcoding logic in the
client.
Resources (Contextual Data Sharing)
Resources in MCP are pieces of data or content that a server makes available to the client and potentially to
the language model [](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=The%20Model%20Context%20Protocol%20,uniquely%20identified%20by%20a%20URI)[139](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=The%20Model%20Context%20Protocol%20,uniquely%20identified%20by%20a%20URI). Think of resources as the extended context or knowledge base – files, documents,
database entries, or any structured information that can inform the model’s responses. Each resource is
identified by a URI (Uniform Resource Identifier) [](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=context%20to%20language%20models%2C%20such,uniquely%20identified%20by%20a%20URI)[140](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=context%20to%20language%20models%2C%20such,uniquely%20identified%20by%20a%20URI), which often conveys the type or location of the
resource (e.g. a file path).
- Capability: The server must declare the resources capability to use this feature [141](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Capabilities). Subfields:
- subscribe : if true, the server supports subscriptions to resource changes [142](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=The%20capability%20supports%20two%20optional,features)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=The%20capability%20supports%20two%20optional,features)[143](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=,list%20of%20available%20resources%20changes).
•listChanged : if true, the server will send notifications if the overall list of resources changes (e.g.,
new or removed resources) [](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=The%20capability%20supports%20two%20optional,features)[142](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=The%20capability%20supports%20two%20optional,features)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=The%20capability%20supports%20two%20optional,features)[144](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=,list%20of%20available%20resources%20changes).
•Both can be true, false, or either one true as needed (or the server can support neither extra feature)
[](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Both%20,support%20neither%2C%20either%2C%20or%20both)[145](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Both%20,support%20neither%2C%20either%2C%20or%20both)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Both%20,support%20neither%2C%20either%2C%20or%20both)[146](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=%7B%20,). The client will adapt based on what’s declared.
•User Interaction: Resources are generally application-driven and user-controlled in how they are
presented [](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=User%20Interaction%20Model)[147](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=User%20Interaction%20Model). For example, an IDE might show a list or tree of resources (files, etc.) that the user
can choose to attach to the AI chat or open in an editor. Or the AI model might itself request a
resource (like “open file X”) if it’s aware of them, but typically the user explicitly shares resources. The
protocol does not mandate any UI, but common patterns include:
•A “Resources” panel or command where the user can browse available resources (like a file browser).
•The ability for the user to search or filter resources by name.
•Automatic inclusion: in some advanced cases, the client might automatically attach high-priority
resources based on context (though with user knowledge ideally).
14

---

Example: VS Code has an “MCP Resources” Quick Pick where it lists resources and resource templates
provided by the server [](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=Resources)[148](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=Resources)[ ](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=Resources)[149](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=in%20real). The user can pick one to open or attach as context. Resources can also be
added to a chat via an “Add Context” button.
•Listing Resources: The client sends resources/list to get the list of available resources. The
server returns a list of resource descriptors. This may be a subset if pagination is used (with
cursor ), similar to prompts/tools listing [](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Listing%20Resources)[150](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Listing%20Resources)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Listing%20Resources)[151](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=,value%22%20%7D).
Example:
Request: {"jsonrpc":"2.0","id":10,"method":"resources/list","params":{}}
Response:
{
"jsonrpc": "2.0",
"id": 10,
"result": {
"resources": [
{
"uri": "file:///project/src/main.rs",
"name": "main.rs",
"title": "Rust Software Application Main File",
"description": "Primary application entry point",
"mimeType": "text/x-rust"
}
],
"nextCursor": null
}
}
Here the server exposed one resource: a file URI file:///project/src/main.rs , with a human name
and title describing it [](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=,rust%22%20%7D)[152](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=,rust%22%20%7D)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=,rust%22%20%7D)[153](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=,cursor). The MIME type is provided ( text/x-rust ) which hints it’s a Rust source file
[](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=,cursor)[153](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=,cursor). The description could be a short blurb about the resource. The name is a short identifier (in this
case just the filename). The combination of name and title helps UI: e.g., the client might display
“main.rs – Rust Software Application Main File”.
If there were more resources beyond the first page, nextCursor would be non-null and the client could
call resources/list again with that cursor to get the next set [](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Listing%20Resources)[150](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Listing%20Resources)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Listing%20Resources)[154](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=%22mimeType%22%3A%20%22text%2Fx,cursor%22).
•Resource Descriptor Fields:
- uri : A unique identifier (and possibly location) for the resource [140](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=context%20to%20language%20models%2C%20such,uniquely%20identified%20by%20a%20URI)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=context%20to%20language%20models%2C%20such,uniquely%20identified%20by%20a%20URI)[155](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Resource). URIs use schemes like
file:// , https:// , etc., or custom schemes (e.g. repo:// for a repository content).
- name : A short name for display, perhaps a filename or key [155](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Resource)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Resource)[156](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=,Optional%20size%20in%20bytes).
- title : Optional longer name for display [155](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Resource)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Resource)[156](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=,Optional%20size%20in%20bytes).
15

---

- description : Optional description of the resource [155](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Resource)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Resource)[156](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=,Optional%20size%20in%20bytes).
- mimeType : Optional MIME type indicating content type (e.g. text/plain , image/png ) [153](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=,cursor)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=,cursor)[155](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Resource).
- size : (Optional) size in bytes, if known – not shown in example but part of schema [155](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Resource).
- annotations : (Optional) metadata like audience, priority, etc. (discussed below) [157](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Annotations)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Annotations)[158](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=that%20provide%20hints%20to%20clients,use%20or%20display%20the%20resource).
•Reading a Resource: To get the actual content of a resource, the client sends resources/read
with the uri of the desired resource [](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Reading%20Resources)[159](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Reading%20Resources)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Reading%20Resources)[160](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=,%7D). The server responds with the content. The response
format is a bit nested: it typically contains a contents array with one or more content blocks. In
most cases, a single resource URI corresponds to a single content item (for example, reading a file
returns that file’s content). The array allows for composite resources or batched reads.
Example:
Request: {"jsonrpc":"2.0","id":11,"method":"resources/read","params":{"uri":"file:///
project/src/main.rs"}}
Response:
{
"jsonrpc": "2.0",
"id": 11,
"result": {
"contents": [
{
"uri": "file:///project/src/main.rs",
"name": "main.rs",
"title": "Rust Software Application Main File",
"mimeType": "text/x-rust",
"text": "fn main() {\n println!(\"Hello world!\");\n}"
}
]
}
}
The content block echoes some metadata (uri, name, title, mimeType) and then provides either a text
field or blob field with the data [](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=,%7D)[161](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=,%7D)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=,%7D)[162](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Resources%20can%20contain%20either%20text,or%20binary%20data). Here, since it’s a text file, the server returned a text string
containing the source code [](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=,%7D)[161](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=,%7D)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=,%7D)[162](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Resources%20can%20contain%20either%20text,or%20binary%20data). For a binary resource, it would include a blob field with base64-
encoded data instead [](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Binary%20Content)[163](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Binary%20Content). The client, upon receiving this, might display the content (e.g., open the text in
an editor tab or feed it into the AI’s context if the user attached it to a question).
16

---

If the resource is large, the server might in some cases split it into multiple chunks in the contents array,
but typically one item is used. Some servers might also include related resources (for example, if reading a
directory, the server might return multiple entries as separate content objects). The protocol is flexible here.
•Resource Templates: Servers can also expose parameterized resources using URI templates. This is
useful for things like dynamic queries. For example, a server could define a template for a GitHub
repository content: repo://{owner}/{repo}/contents/{path} . The client can then ask the
user to fill in {owner} , {repo} , etc. The MCP method resources/templates/list returns a
list of such templates [](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Resource%20Templates)[164](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Resource%20Templates)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Resource%20Templates)[165](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Copy).
Example:
Response to resources/templates/list :
{
"jsonrpc": "2.0",
"id": 3,
"result": {
"resourceTemplates": [
{
"uriTemplate": "file:///{path}",
"name": "Project Files",
"title": "Project Files",
"description": "Access files in the project directory",
"mimeType": "application/octet-stream"
}
]
}
}
This shows a template with a placeholder {path} in the URI [](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=,stream%22%20%7D)[166](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=,stream%22%20%7D). Essentially it indicates the server can
serve arbitrary files if the client supplies the path. The client could use such templates to prompt the user
(e.g., “Enter a file path”) and then construct the URI and call resources/read . Another example (from VS
Code’s GitHub MCP extension) might be templates for “Repository Content for specific branch” or “for
specific commit”, etc., where placeholders are branch names or commit hashes【39†】. Resource templates
often work in conjunction with completions (if the server supports it) to auto-suggest valid values for those
placeholders (like suggesting branch names or file paths).
•Resource Annotations: Similar to prompt messages and tool outputs, resources can carry
annotations to guide how they should be used [](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Annotations)[157](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Annotations)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Annotations)[167](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=,12T15%3A00%3A58Z):
•audience : ["user"] , ["assistant"] , or ["user","assistant"] indicates who the
content is primarily meant for [](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Resources%2C%20resource%20templates%20and%20content,use%20or%20display%20the%20resource)[168](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Resources%2C%20resource%20templates%20and%20content,use%20or%20display%20the%20resource)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Resources%2C%20resource%20templates%20and%20content,use%20or%20display%20the%20resource)[169](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=,timestamp%20indicating%20when%20the%20resource). For instance, a large documentation file might be marked
["assistant"] meaning it’s mainly for the AI to read, not to show directly to the user. Or a UI
screenshot image might be ["user"] meaning it’s for the user to view.
17

---

- priority : A number 0.0 to 1.0 indicating importance [169](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=,timestamp%20indicating%20when%20the%20resource)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=,timestamp%20indicating%20when%20the%20resource)[170](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=,timestamp%20indicating%20when%20the%20resource). 1.0 means this resource is highly
relevant (almost required context), 0.0 means purely optional. Clients can use this to auto-select or
highlight resources; e.g. always include priority 1.0 items in the prompt to the model.
- lastModified : A timestamp of when the resource was last changed [171](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=resource,12T15%3A00%3A58Z). Useful to display recency
or to ignore stale data. Format is ISO 8601 (e.g. "2025-01-12T15:00:58Z" ) [](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=resource,12T15%3A00%3A58Z)[171](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=resource,12T15%3A00%3A58Z).
Example of a resource with annotations:
{
"uri": "file:///project/README.md",
"name": "README.md",
"title": "Project Documentation",
"mimeType": "text/markdown",
"annotations": {
"audience": ["user"],
"priority": 0.8,
"lastModified": "2025-01-12T15:00:58Z"
}
}
This indicates the README is moderately important (0.8), intended for the user (perhaps the user might
want to read it), and was last edited on Jan 12, 2025 [](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=%7B%20,12T15%3A00%3A58Z)[172](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=%7B%20,12T15%3A00%3A58Z)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=%7B%20,12T15%3A00%3A58Z)[173](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=,12T15%3A00%3A58Z%22). A client UI might show the date or sort
resources by last modified, and maybe automatically suggest including high-priority ones when the AI is
asked a question (with user permission).
•Using Resources in Chat: Typically, if a user wants the AI to use some data, the client will fetch that
resource and then provide its content to the model (for example, by prepending it to the prompt or
using some insertion mechanism). Some clients allow attaching resources directly to a chat turn
(e.g., “Add Context” button in VS Code to attach an MCP resource, which the extension then includes
in the prompt). The model can then see that content. If a resource is large, the client might only
include a summary or skip it based on priority to avoid token limits.
•Live Updates via Subscription: If the server set subscribe: true , the client can subscribe to a
resource to get notified when it changes [](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Subscriptions)[174](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Subscriptions)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Subscriptions)[175](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=%7B%20,%7D). This is useful for real-time updates. For instance, a
server providing a log file could allow subscription so that as new log entries appear, it notifies the
client, which can then read the new content or update an open editor.
To subscribe, the client sends resources/subscribe with the resource’s URI [](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Subscriptions)[174](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Subscriptions)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Subscriptions)[176](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=,%7D). The server will
respond (likely just with an acknowledgment result, possibly empty). From then on, when that resource (or
something within it) updates, the server sends notifications/resources/updated notifications. The
updated notification includes the uri of the resource that changed [](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Update%20Notification%3A)[177](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Update%20Notification%3A)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Update%20Notification%3A)[178](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=interface%20ResourceUpdatedNotification%20,).
Example:
18

---

{
"jsonrpc": "2.0",
"method": "notifications/resources/updated",
"params": { "uri": "file:///project/src/main.rs" }
}
This tells the client that main.rs has new content. The client can then call resources/read again to
get the latest content, or if it has it open in an editor, refresh it. The spec notes that the updated URI could
be a “sub-resource” of what was subscribed – e.g., if you subscribed to a directory, an update may indicate
which file changed within it [](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[179](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[ ](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[180](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=).
If a client no longer wants updates, it can send resources/unsubscribe with the URI [](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=,CreateMessageResult)[181](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=,CreateMessageResult)[ ](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=,CreateMessageResult)[182](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=,tools%2Fcall).
(Unsubscribe was listed in the schema, meaning servers should implement it for completeness.)
•Resource List Changes: Independently of individual content updates, the server can notify if the
catalog of resources changes via notifications/resources/list_changed (if
listChanged: true ) [](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=List%20Changed%20Notification)[183](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=List%20Changed%20Notification)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=List%20Changed%20Notification)[184](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=). This is similar to the prompts case. For example, if a new resource
becomes available (say a new file was added to the project and now the server exposes it), the server
should send resources/list_changed . The client would then refresh its resource list (call
resources/list again) to get the new entry [](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[185](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[ ](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[186](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=An%20optional%20notification%20from%20the,previous%20subscription%20from%20the%20client).
Use case: In an IDE, if the user opens a new project file, the extension might add it to the context list on the
server side and notify the client to update the UI.
- Common URI Schemes: The spec outlines a few standard URI schemes and their intended use[187](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Common%20URI%20Schemes)
[](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Used%20to%20represent%20a%20resource,resource%20contents%20over%20the%20internet)[188](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Used%20to%20represent%20a%20resource,resource%20contents%20over%20the%20internet):
•https:// – for web resources. Should be used only if the client can fetch that URL directly itself
(i.e., it’s publicly accessible). Otherwise, if the server itself needs to fetch/provide the data, a custom
scheme is better [](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=https%3A%2F%2F)[189](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=https%3A%2F%2F).
•file:// – for filesystem-like resources (files, directories). It doesn’t necessarily have to map to a
physical filesystem (server could generate content on the fly when file:// URI is read) [](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=file%3A%2F%2F)[190](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=file%3A%2F%2F). The spec
suggests using appropriate MIME types (like inode/directory for directories) [](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=file%3A%2F%2F)[190](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=file%3A%2F%2F).
- git:// – a scheme for Git repository content [191](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=git%3A%2F%2F). The details aren’t heavily specified, but
presumably a server could use URIs like git://repo/path to identify content in a git repo.
•Custom – Servers can define their own (e.g., repo:// or db:// ). These must conform to URI
syntax rules [](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Custom%20URI%20Schemes)[192](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Custom%20URI%20Schemes)and ideally be documented so the client knows what they refer to. Clients treat
them opaquely (just use the URI with the server).
•Error Handling: If a resource is not found or unavailable, servers should return a JSON-RPC error.
The spec suggests -32002 for “Resource not found” [](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Error%20Handling)[193](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Error%20Handling)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Error%20Handling)[194](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=%7B%20,), including the URI in the error data.
For example:
{
"jsonrpc": "2.0",
19

---

"id": 5,
"error": {
"code": -32002,
"message": "Resource not found",
"data": { "uri": "file:///nonexistent.txt" }
}
}
This lets the client inform the user that the requested file doesn’t exist [](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=%7B%20,)[194](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=%7B%20,). Other errors: if the server
had an internal failure reading the file, -32603 (Internal error) could be returned [](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Error%20Handling)[193](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Error%20Handling). If the client
calls a resource method but the server didn’t advertise resources capability, it will likely respond
with -32601 Method not found [](https://modelcontextprotocol.io/specification/2025-06-18/client/roots#:~:text=Error%20Handling)[195](https://modelcontextprotocol.io/specification/2025-06-18/client/roots#:~:text=Error%20Handling)[ ](https://modelcontextprotocol.io/specification/2025-06-18/client/roots#:~:text=Error%20Handling)[196](https://modelcontextprotocol.io/specification/2025-06-18/client/roots#:~:text=Clients%20SHOULD%20return%20standard%20JSON,errors%20for%20common%20failure%20cases)(as recommended in the Roots error handling, similar
principle).
In summary, Resources provide a structured way to share data context with the model. The client can
browse or query them, present them to the user, and fetch content on demand. The annotation system
helps the client prioritize what to include in the prompt to the model. A key part of MCP’s value is this ability
to attach relevant data (code, docs, records) to model queries in a controlled manner, rather than dumping
everything blindly.
Tools (Functions and Actions)
Tools are perhaps the most powerful feature: they let the server expose arbitrary operations that the AI
model can invoke via the client [](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=The%20Model%20Context%20Protocol%20,includes%20metadata%20describing%20its%20schema)[197](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=The%20Model%20Context%20Protocol%20,includes%20metadata%20describing%20its%20schema)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=The%20Model%20Context%20Protocol%20,includes%20metadata%20describing%20its%20schema)[198](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Tools%20in%20MCP%20are%20designed,any%20specific%20user%20interaction%20model). This enables an AI to do things like run code, query an API, modify
files, etc., through well-defined functions – bringing “agent” capabilities to the model in a safe, supervised
way.
- Capability: The server must declare tools capability to provide tools [199](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Capabilities). An optional
listChanged flag indicates it will notify if tools are added/removed at runtime [](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=%7B%20,true%20%7D%20%7D)[200](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=%7B%20,true%20%7D%20%7D).
•User Interaction & Control: Tools are conceptually model-controlled – the AI decides when to use
a tool based on the conversation [](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Tools%20in%20MCP%20are%20designed,any%20specific%20user%20interaction%20model)[198](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Tools%20in%20MCP%20are%20designed,any%20specific%20user%20interaction%20model). However, due to the potential risk (tools can execute code or
change data), there must always be a human in the loop granting final approval [](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=itself%20does%20not%20mandate%20any,specific%20user%20interaction%20model)[201](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=itself%20does%20not%20mandate%20any,specific%20user%20interaction%20model). This is
emphasized strongly: applications SHOULD present a confirmation to the user before actually
executing a tool call [](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=For%20trust%20%26%20safety%20and,Applications%20SHOULD)[202](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=For%20trust%20%26%20safety%20and,Applications%20SHOULD). The client’s UI should make it clear what tools are available to the AI and
when one is used. For example:
•VS Code shows an AI “tools picker” where users can enable/disable specific tools for the AI to use
[](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=)[203](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=). It also shows a confirmation dialog each time a tool is about to run (displaying the tool name
and the input the AI provided) [](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=Image%3A%20Screenshot%20that%20shows%20the,tools%20from%20an%20MCP%20server)[204](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=Image%3A%20Screenshot%20that%20shows%20the,tools%20from%20an%20MCP%20server)[ ](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=Image%3A%20Screenshot%20that%20shows%20the,tools%20from%20an%20MCP%20server)[205](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=To%20provide%20extra%20metadata%20about,you%20can%20use%20tool%20annotations).
20

---

Example: VS Code’s tool selection interface (agent tools picker). “MCP Server: my-mcp-server” tools like add,
getGreeting, showRoots are listed (with descriptions). The user can check which tools are available to the AI [](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=)[203](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=).
Example: VS Code’s tool execution confirmation dialog. Here the AI chose to run the add tool (from "my-mcp-
server"), which “Adds two numbers together”. The dialog displays the input parameters { "a": 35, "b":
22 } that the AI provided [](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=Image%3A%20Screenshot%20that%20shows%20the,tools%20from%20an%20MCP%20server)[204](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=Image%3A%20Screenshot%20that%20shows%20the,tools%20from%20an%20MCP%20server), so the user can review them. The user must click Continue to actually execute the
tool, or Cancel to refuse.[](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=To%20provide%20extra%20metadata%20about,you%20can%20use%20tool%20annotations)[205](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=To%20provide%20extra%20metadata%20about,you%20can%20use%20tool%20annotations)
21

![image]


---

The spec suggests clients should always confirm tool usage unless a tool is explicitly marked as safe for
auto-execution [](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=For%20trust%20%26%20safety%20and,Applications%20SHOULD)[202](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=For%20trust%20%26%20safety%20and,Applications%20SHOULD)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=For%20trust%20%26%20safety%20and,Applications%20SHOULD)[206](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=%2A%20%60title%60%3A%20Human,only%20tools). Some tools might be read-only (not causing side-effects); for those, clients might
skip confirmation if indicated (see tool annotations below).
•Listing Tools: The client (or server) can list available tools via tools/list . Typically, right after
initialization, the client will do this to know what functions exist. The response gives a list of tool
definitions.
Example:
Response to tools/list :
{
"jsonrpc": "2.0",
"id": 51,
"result": {
"tools": [
{
"name": "get_weather",
"title": "Weather Information Provider",
"description": "Get current weather information for a location",
"inputSchema": {
"type": "object",
"properties": {
"location": {
"type": "string",
"description": "City name or zip code"
}
},
"required": ["location"]
}
// outputSchema could be here if provided
}
],
"nextCursor": null
}
}
This shows one tool get_weather that provides weather info [](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,)[207](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,)[208](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,%7D%20%7D). The tool definition fields: - name :
identifier for the tool (used to invoke it) [](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,)[207](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,). - title : short human-friendly name (optional) [209](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,). -
description : description of what it does (for UI and for the model to understand) [](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,)[210](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,). - inputSchema :
a JSON Schema object describing the tool’s expected input parameters [](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,%7D)[211](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,%7D). In this case, it requires a string
"location" . The schema can include properties with types, descriptions, and a required list [](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,)[212](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,).
This schema is crucial: it tells the client (and effectively the model, via description) what inputs to provide. -
outputSchema : (optional) JSON Schema for the tool’s output if the server returns structured data [](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,optional%20properties%20describing%20tool%20behavior)[213](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,optional%20properties%20describing%20tool%20behavior)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,optional%20properties%20describing%20tool%20behavior)[214](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=%2A%20%60description%60%3A%20Human,optional%20properties%20describing%20tool%20behavior).
22

---

Not present in the above snippet, but we’ll discuss it later. - annotations : optional extra metadata about
the tool’s behavior or usage [](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,optional%20properties%20describing%20tool%20behavior)[213](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,optional%20properties%20describing%20tool%20behavior)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,optional%20properties%20describing%20tool%20behavior)[215](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=).
The client can use this list to display tools in a UI (with title/description) and to inform the model about the
available tools. Many AI systems will inject a list of functions (tools) into the model’s context so the model
knows what it can call. For instance, the client might pass to the model something like: “You have access to
the following tools: get_weather(location: string) – Get current weather information for a location.” The MCP spec
doesn’t dictate how the model is informed, but it’s up to the client integration. (In VS Code, the tools are
integrated into the “agent mode” where the model picks them, likely similar to OpenAI function calling in
principle.)
•Tool Invocation ( tools/call ): When the model (through the client) decides to use a tool, the
client sends a tools/call request to the server. The parameters include the name of the tool
and an arguments object that conforms to the tool’s input schema [](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Calling%20Tools)[216](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Calling%20Tools)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Calling%20Tools)[217](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,%7D).
Example:
Request:
{
"jsonrpc": "2.0",
"id": 52,
"method": "tools/call",
"params": {
"name": "get_weather",
"arguments": { "location": "New York" }
}
}
This asks the server to execute the get_weather tool with "location": "New York" .
The server will perform whatever action is needed (maybe call a weather API) and then return a result. The
result includes: - Either a success result with output data, - Or an indication of an error (either via JSON-RPC
error or in-band error as isError true – explained below).
Successful Response Example:
{
"jsonrpc": "2.0",
"id": 52,
"result": {
"content": [
{
"type": "text",
"text": "Current weather in New York:\nTemperature: 72°F\nConditions:
23

---

Partly cloudy"
}
],
"isError": false
}
}
Here the server returned a human-readable text output with the weather info [](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,false)[218](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,false). It put that in the
content array as a Text content block, and marked isError: false indicating the tool ran
successfully [](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,false)[218](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,false).
However, tool results can be more complex. The content array can contain multiple pieces of content
(text, images, etc.), or even structured data (via a separate field): - Content Blocks: Each content element
has a type (e.g., "text" , "image" , "audio" , "resource_link" , or "resource" ) [](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Tool%20results%20may%20contain%20structured,content%20items%20of%20different%20types)[219](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Tool%20results%20may%20contain%20structured,content%20items%20of%20different%20types)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Tool%20results%20may%20contain%20structured,content%20items%20of%20different%20types)[220](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Text%20Content). We
saw text example above. If the tool returned an image, it would be:
{
"type": "image",
"data": "<base64 image data>",
"mimeType": "image/png",
"annotations": { ... }
}
as part of the content array [](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=)[221](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=)[222](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,9). The client could then display that image to the user (or provide it to
the model if the model can handle images, though current mainstream LLMs are text-based – an image
might be more for user benefit). - The example in spec shows an image with an annotation marking it for
user consumption, priority, etc. [](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Image%20Content)[223](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Image%20Content)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Image%20Content)[224](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,9). - Audio content similarly would have data (base64) and
mimeType in an object with "type": "audio" [](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Audio%20Content)[225](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Audio%20Content). - Resource Links: A tool might not return raw data,
but a reference to a resource that was produced or identified. For example, a tool that searches a database
might return a URI to a resource containing detailed results. In that case, the content block might be:
{
"type": "resource_link",
"uri": "file:///project/src/main.rs",
"name": "main.rs",
"description": "Primary application entry point",
"mimeType": "text/x-rust",
"annotations": { "audience": ["assistant"], "priority": 0.9 }
}
This tells the client “I (the tool) have something at this URI.” The client can then decide to auto-fetch it or
present it to the user as an available resource. The annotations might indicate that this link is mainly for the
assistant (LLM) to use [](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Resource%20Links)[226](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Resource%20Links)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Resource%20Links)[227](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=%22mimeType%22%3A%20%22text%2Fx,0.9%20%7D). The spec notes that resource links returned by tools might not show up in a
normal resources/list – they could be ephemeral or ad-hoc [](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=to%20help%20clients%20understand%20how,to%20use%20them)[228](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=to%20help%20clients%20understand%20how,to%20use%20them). The client should treat them as valid
24

---

resources for reading or subscribing nonetheless. - Embedded Resource Content: In some cases, a tool
could return a content block of type "resource" with an actual resource object embedded (URI plus data)
[](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Embedded%20Resources)[229](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Embedded%20Resources)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Embedded%20Resources)[230](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,0.7). This is like the tool directly giving the data as if it were a resource read. The example in spec shows
embedding a file’s content in the result [](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=%7B%20,assistant)[231](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=%7B%20,assistant). The server should have resources capability if it uses this
(since it’s essentially the same format) [](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Embedded%20Resources)[229](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Embedded%20Resources)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Embedded%20Resources)[232](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Resources%20%20MAY%20be%20embedded,capability). - Structured Content: If the tool has a defined
outputSchema , the server can return a machine-readable result in addition to (or instead of) textual
content. The spec provides a structuredContent field for this purpose [](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Structured%20Content)[233](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Structured%20Content). For backward compatibility,
it’s recommended to also include the equivalent as text in the content array [](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Structured%20Content)[233](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Structured%20Content)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Structured%20Content)[234](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Structured%20content%20is%20returned%20as,JSON%20in%20a%20TextContent%20block)(so older clients or
the model’s context can still see something). - For example, if get_weather had an output schema
specifying temperature, conditions, humidity as fields, the server might return:
"content": [
{ "type": "text", "text": "{\"temperature\":22.5,\"conditions\":\"Partly
cloudy\",\"humidity\":65}" }
],
"structuredContent": {
"temperature": 22.5,
"conditions": "Partly cloudy",
"humidity": 65
}
And indeed the spec example shows exactly this for a weather tool [](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=%7B%20,65)[235](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=%7B%20,65)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=%7B%20,65)[236](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=%7D%20%5D%2C%20,65%20%7D%20%7D). The text version is a JSON
string, and structuredContent is the parsed object. - The client can use structuredContent to, for
instance, present a nicely formatted table or trigger some UI action (since it has actual data types). Or a
programming-oriented client could feed it directly into a function. - If the client (or the model) only
understands text, the textual JSON in content ensures nothing is lost.
•Tool Output Schema: Declaring an outputSchema in the tool definition is optional but
recommended if the tool returns structured results [](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Output%20Schema)[237](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Output%20Schema)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Output%20Schema)[238](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Copy). If provided:
- The server must ensure its structuredContent adheres to that schema [239](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Tools%20may%20also%20provide%20an,an%20output%20schema%20is%20provided)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Tools%20may%20also%20provide%20an,an%20output%20schema%20is%20provided)[240](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,structured%20results%20against%20this%20schema).
- The client should validate the structuredContent against the schema when it receives it[239](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Tools%20may%20also%20provide%20an,an%20output%20schema%20is%20provided)
[](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=an%20output%20schema%20is%20provided%3A)[241](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=an%20output%20schema%20is%20provided%3A). This way, the client can detect if the server or tool produced an unexpected format.
•Schemas help with self-documentation and robust integration – for instance, a UI could
automatically generate forms or result displays from the schema definitions.
Providing an output schema can significantly help an AI or a client know what to expect, especially in typed
scenarios (numbers vs strings, etc.) [](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Providing%20an%20output%20schema%20helps,handle%20structured%20tool%20outputs%20by)[242](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Providing%20an%20output%20schema%20helps,handle%20structured%20tool%20outputs%20by)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Providing%20an%20output%20schema%20helps,handle%20structured%20tool%20outputs%20by)[243](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,and%20utilize%20the%20returned%20data).
•Dynamic Tools and Updates: If listChanged: true , the server can add or remove tools at
runtime and notify via notifications/tools/list_changed [](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=List%20Changed%20Notification)[244](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=List%20Changed%20Notification)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=List%20Changed%20Notification)[245](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=%7B%20,). For example, the server
might detect the project is a Python project and register a run_tests tool dynamically, then send
tools/list_changed . The client, upon receiving that, calls tools/list again to get the new
set. VS Code’s agent mode supports such dynamic discovery [](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=)[246](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=)– e.g., enabling tools based on
context. The list_changed notification has no params (just a signal) [](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[247](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[ ](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[248](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=).
25

---

•Tool Annotations: Tools can have an annotations field in their definition to convey extra
metadata about how/when to use them [](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,optional%20properties%20describing%20tool%20behavior)[213](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,optional%20properties%20describing%20tool%20behavior). The spec leaves this open-ended as an object. One
known annotation (used by VS Code) is:
•readOnlyHint : a boolean indicating the tool does not alter state (read-only). If true, VS Code does
not ask for user confirmation to run that tool [](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=annotations%20modelcontextprotocol)[249](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=annotations%20modelcontextprotocol)[ ](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=annotations%20modelcontextprotocol)[250](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=%2A%20%60title%60%3A%20Human,only%20tools), because it’s considered safe (for example, a
get_weather tool might be read-only). This improves UX by not nagging the user for harmless
queries.
•Other possible annotations could be imagined (like dangerous or costly flags), but as of this
spec the main one highlighted is readOnly. The title was also mentioned as an annotation in VS
Code docs [](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=To%20provide%20extra%20metadata%20about,you%20can%20use%20tool%20annotations)[251](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=To%20provide%20extra%20metadata%20about,you%20can%20use%20tool%20annotations), but that might be a documentation quirk since title is also a top-level field. It’s likely
just clarifying the title is used in UI.
The spec explicitly warns that clients should treat tool annotations as untrusted unless from a trusted
server [](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,tool%20behavior)[252](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,tool%20behavior). This is because a malicious server could mislabel a dangerous tool as readOnly . So clients
should ideally have their own allow-lists or user settings rather than blindly trusting the annotation. In
practice, a well-known server can be trusted, but caution is advised.
•Executing Tools Safely: On the server side, implementing a tool means writing code that will run
triggered by external input (the model’s requests). Therefore, servers must validate all tool inputs
and guard against misuse [](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=1.%20Servers%20MUST%3A%20,malicious%20or%20accidental%20data%20exfiltration)[253](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=1.%20Servers%20MUST%3A%20,malicious%20or%20accidental%20data%20exfiltration). The spec’s security guidelines for tools include:
•Checking that input parameters meet expected formats and ranges (despite the client presumably
validating against schema, double-check on server).
•Enforcing access controls – e.g., if a tool can read a file, ensure the path is within allowed roots and
not something sensitive.
- Rate limiting calls if needed (to avoid abuse or infinite loops) [253](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=1.%20Servers%20MUST%3A%20,malicious%20or%20accidental%20data%20exfiltration).
•Sanitizing outputs (so that returning content doesn’t inject malicious sequences into the model’s
context inadvertently).
•Possibly sandboxing code execution if the tool runs code.
On the client side: - Always confirm with the user before running a tool (unless it’s in some safe auto-mode
as configured by user) [](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=For%20trust%20%26%20safety%20and,Applications%20SHOULD)[202](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=For%20trust%20%26%20safety%20and,Applications%20SHOULD). - Show the exact inputs the model provided, so the user can spot if something is
off (like the model trying to pass rm -rf / to a shell tool, the user can catch it). - Allow user to cancel or
modify the input before running if desired [](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=Image%3A%20Screenshot%20that%20shows%20the,tools%20from%20an%20MCP%20server)[204](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=Image%3A%20Screenshot%20that%20shows%20the,tools%20from%20an%20MCP%20server)[ ](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=Image%3A%20Screenshot%20that%20shows%20the,tools%20from%20an%20MCP%20server)[205](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=To%20provide%20extra%20metadata%20about,you%20can%20use%20tool%20annotations)(some UIs let you edit the arguments in the confirm
dialog). - After execution, possibly show the output to the user or attach it into the chat for the model
(ensuring it doesn’t directly execute code in user environment without showing results).
•Error Handling for Tools: There are two levels of errors:
•Protocol-level errors: If the tool name is invalid or input is wrong format, the server can respond
with a JSON-RPC error (so no result ). For example, unknown tool:
{"code": -32602, "message": "Unknown tool: invalid_tool_name"}
(from spec example) [](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,)[254](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,). Or if required param missing: -32602 Invalid params with details. If
the tools feature isn’t supported at all, server might return -32601 Method not found to any
tools/... call. These errors mean the call didn’t even execute the tool logic.
26

---

•Tool execution errors: The tool ran but encountered a runtime issue (API returned error, the
operation failed, etc.). In this case, the server should return a normal result with isError: true
and perhaps an error message in the content [](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Example%20tool%20execution%20error%3A)[255](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Example%20tool%20execution%20error%3A)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Example%20tool%20execution%20error%3A)[256](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=%7B%20,). This keeps the JSON-RPC request successful
(so the client isn’t confused thinking the protocol failed), but marks to the client and model that the
outcome was an error.
◦E.g., a weather API tool might return isError:true with content "Failed to fetch
weather data: API rate limit exceeded" [](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=%7B%20,)[256](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=%7B%20,). The client can present that message to
the user or model.
◦The model might then respond accordingly (“I couldn’t get the weather because the API limit
was hit.”).
Using isError vs. JSON-RPC error is a design choice: isError is for business-logic errors that are
expected as part of normal operation, whereas JSON-RPC errors are for structural or invocation errors. This
distinction allows the conversation with the AI to continue gracefully even if a tool fails – the failure
becomes part of the assistant’s reasoning rather than a broken protocol interaction.
The client should handle both. If it gets a JSON-RPC error from tools/call , it likely means something
was fundamentally wrong (the client might log it or inform the user that the tool couldn’t run at all). If it
gets a result with isError:true , it can treat it as the tool’s output (often the client will just feed that back
to the model or show it to the user).
- Security Considerations Recap: The spec explicitly enumerates recommendations [257](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Security%20Considerations)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Security%20Considerations)[253](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=1.%20Servers%20MUST%3A%20,malicious%20or%20accidental%20data%20exfiltration):
•Server side: validate inputs, enforce access (e.g., a file write tool should not allow writing outside
allowed directories), maybe implement permission checks (some servers require an API key or user
login to do certain tools, tying in with the Authorization spec).
•Server side: possibly log all tool invocations and results for audit.
- Client side: confirm with user, show inputs, apply timeouts to tool calls to prevent hanging [258](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,tool%20usage%20for%20audit%20purposes), and
treat any output with caution (especially if it could contain code or instructions).
•Both sides: assume the model might try malicious things (since the model’s choice to call a tool could
be influenced by an adversarial prompt). So design tools and their usage defensively. For instance, if
there’s a execute_code tool, have the client always show the code to the user for approval, rather
than just running it.
In essence, the Tools feature transforms the AI from a static Q&A system into an interactive agent that can
perform tasks – but it relies on a tight partnership between server (which implements the tasks) and client
(which mediates those tasks with the user’s oversight). MCP provides the schema and message framework
to do this in a consistent way across different applications.
### Additional Protocol Features and Notifications
Beyond the core “feature” methods above, MCP defines various utility messages that support a robust and
user-friendly experience. These include progress updates, cancellation, logging, pings, and specialized
notifications.
27

---

Progress Updates (Streaming Feedback)
For long-running operations (like a tool that takes several seconds or more), MCP allows the server to send
progress notifications to keep the client (and user) informed [](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Timeouts)[98](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Timeouts)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Timeouts)[100](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Implementations%20SHOULD%20establish%20timeouts%20for,progress%20notifications%2C%20to%20limit%20the). This is done via the
notifications/progress message.
•A progress notification carries:
- An optional message : a text description of current status (e.g. “Indexing file 3 of 10…”) [259](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=Type%20declaration)[ ](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=Type%20declaration)[260](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=).
- A progress number: how much work has been done so far (a count or percentage) [261](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=An%20optional%20message%20describing%20the,current%20progress)[ ](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=An%20optional%20message%20describing%20the,current%20progress)[262](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=).
- An optional total : the total work units, if known [263](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[ ](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[264](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=).
- A progressToken : a token to identify which request this progress is about [265](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=params%3A%20,progressToken%3A%20ProgressToken%3B%20total%3F%3A%20number%3B)[ ](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=params%3A%20,progressToken%3A%20ProgressToken%3B%20total%3F%3A%20number%3B)[266](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=TJS).
Importantly, the progress mechanism is opt-in and initiated by the client. When the client issues a
request that it wants progress on (say a tools/call that might be slow), it includes a progressToken
in that request’s _meta data [](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[267](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[ ](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[268](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=match%20at%20L2258%20,progressToken%3F%3A%20ProgressToken). For example:
{
"id": 55,
"method": "tools/call",
"params": { ... },
"_meta": { "progressToken": 123 }
}
The actual value of the token can be any string or number chosen by the client to correlate messages[](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[269](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)
[](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[270](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=). If the server sees this and supports progress, it may start sending notifications/progress with
that same token.
Each notifications/progress the server sends will look like:
{
"jsonrpc": "2.0",
"method": "notifications/progress",
"params": {
"progressToken": 123,
"progress": 2,
"total": 5,
"message": "Processed 2 out of 5 files"
}
}
This indicates 2/5 files done, with a message [](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=interface%20ProgressNotification%20,)[271](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=interface%20ProgressNotification%20,)[ ](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=interface%20ProgressNotification%20,)[272](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=params%3A%20,progressToken%3A%20ProgressToken%3B%20total%3F%3A%20number%3B). The client matches progressToken: 123 to the
original request ID 55. It can then display a progress bar or status to the user. If multiple requests with
progress are running, the tokens differentiate them.
28

---

The spec notes: - The progress value should be monotonically increasing (never go backwards) [](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[262](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=). - If
total is unknown, the server can omit it or send a best-guess, and just increment progress arbitrarily
(e.g., 0.4, 0.6 if 100% unknown). If known, providing both gives a clear percentage. - The optional message
is for human consumption (so it might be shown in a status line or console) [](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[273](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=). - Example: A tool
“train_model” could send progress 0..100 with total 100 as percentage, or it could send progress=some
bytes processed out of total bytes.
Progress notifications are sent as JSON-RPC notifications (one-way messages) from server to client. They
can be delivered over SSE if HTTP transport, or over the persistent channel if stdio/WS.
Effect on timeouts: As mentioned earlier, receiving a progress notification is a hint to the client that the
request is still active. The client might reset a request’s timeout timer upon each progress update [](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Implementations%20SHOULD%20establish%20timeouts%20for,progress%20notifications%2C%20to%20limit%20the)[100](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Implementations%20SHOULD%20establish%20timeouts%20for,progress%20notifications%2C%20to%20limit%20the), so
that as long as progress is coming, it doesn’t prematurely cancel. However, a maximum cap should still
apply in case progress notifications themselves get stuck or something goes wrong [](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=receiving%20a%20progress%20notification%20corresponding,a%20misbehaving%20client%20or%20server)[101](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=receiving%20a%20progress%20notification%20corresponding,a%20misbehaving%20client%20or%20server).
Not all servers or operations will implement progress. But for heavy tasks, it greatly improves UX – the user
sees that something is happening rather than the application hanging silently.
Cancellation Mechanism
MCP defines a way to cancel in-flight requests cooperatively. Either side can send a notifications/
cancelled message to indicate it will no longer wait for or process a certain request [](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[274](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[ ](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[275](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=This%20notification%20can%20be%20sent,issued%20request).
•The cancellation notification contains:
- requestId : the ID of the request to cancel [276](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[ ](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[277](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=).
- reason : optional human-readable reason for cancellation [278](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=interface%20CancelledNotification%20,)[ ](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=interface%20CancelledNotification%20,)[279](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=).
For example, if a user hits a “Stop” button to halt a long tool call with ID 52, the client could send:
{
"jsonrpc": "2.0",
"method": "notifications/cancelled",
"params": { "requestId": 52, "reason": "User aborted" }
}
The server, upon receiving this, should attempt to stop work on that request. Since JSON-RPC has no built-in
cancel concept, this out-of-band notification is the signal.
Key points: - Timing: The cancellation is advisory. Due to latency, the server might have already finished or
even sent the response by the time it gets the cancel. Or the server might receive it and then shortly after
finish the task. The spec notes cancellation should happen while the request is in-flight, but it might arrive
too late in which case it’s essentially a no-op (the result might still come, but the client will likely ignore it)
[](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=This%20notification%20can%20be%20sent,issued%20request)[275](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=This%20notification%20can%20be%20sent,issued%20request)[ ](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=This%20notification%20can%20be%20sent,issued%20request)[280](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=The%20request%20SHOULD%20still%20be,the%20request%20has%20already%20finished). - Effect: When a side receives a cancel for a request it is handling, it should stop processing and
not send a response (or if already sent, fine). If not yet sent, it can consider the result “unused” so it can
abandon heavy computation [](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=The%20request%20SHOULD%20still%20be,the%20request%20has%20already%20finished)[280](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=The%20request%20SHOULD%20still%20be,the%20request%20has%20already%20finished)[ ](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=The%20request%20SHOULD%20still%20be,the%20request%20has%20already%20finished)[281](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=This%20notification%20indicates%20that%20the,any%20associated%20processing%20SHOULD%20cease). If partial SSE events were being streamed, the server might close the
stream early upon cancel. - No Cancel for Initialize: The spec forbids the client from cancelling an
29

---

initialize request [](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=This%20notification%20indicates%20that%20the,any%20associated%20processing%20SHOULD%20cease)[281](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=This%20notification%20indicates%20that%20the,any%20associated%20processing%20SHOULD%20cease)(that handshake is too fundamental; if it’s stuck, better to drop connection than
send cancel). - Either direction: The server could also cancel a request it made to the client. For example, if
the server requested sampling/createMessage and then no longer needs it (maybe user input arrived
or some other change), it could send cancel. Or if a long elicitation request is no longer needed (user took
too long or gave up), server might cancel it. These scenarios are less common but possible. - Client
behavior on cancel: If the client cancels a request it sent, it will ignore any response that might still come
(since it told the server to stop, but maybe the server was about to reply). If the server cancels a request it
sent (to client), the client should not bother to send a reply for it.
This mechanism aligns with how LSP and others handle cancellation ($/cancelRequest in LSP). It is purely
cooperative – no guarantee – but typically effective for long tasks.
Logging Notifications
MCP servers can emit log messages to share diagnostic or debug info with the client (and ultimately,
possibly the user or developer). The server declares logging capability if it supports this [](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Server%20,capabilities%20like)[8](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Server%20,capabilities%20like). Logging
works via: - A notification notifications/message with params: - data : the log content (could be a
string message or any JSON-serializable object) [](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[282](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[ ](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[283](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=Type%20declaration). - level : the severity level (e.g. “INFO”, “WARN”,
“ERROR”, etc.) [](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=interface%20LoggingMessageNotification%20,)[284](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=interface%20LoggingMessageNotification%20,)[ ](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=interface%20LoggingMessageNotification%20,)[285](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=The%20data%20to%20be%20logged%2C,serializable%20type%20is%20allowed%20here). The spec likely defines an enum for LoggingLevel (commonly levels might be "trace",
"debug", "info", "warn", "error", "fatal"). - logger : optional name of the logger/source [](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=interface%20LoggingMessageNotification%20,)[284](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=interface%20LoggingMessageNotification%20,)[ ](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=interface%20LoggingMessageNotification%20,)[286](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)(could
indicate which component or module of server is producing the message).
Example:
{
"jsonrpc": "2.0",
"method": "notifications/message",
"params": {
"data": "Fetching API data...",
"level": "INFO",
"logger": "WeatherTool"
}
}
This might be sent by the server to inform the client that it’s doing something. The client could display it in a
console or ignore it if not needed.
•Controlling log level: The client can send a logging/setLevel request to tell the server what
minimum level to log at [](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=server%20should%20send%20all%20logs,to%20the%20client%20as%20notifications%2Fmessage)[287](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=server%20should%20send%20all%20logs,to%20the%20client%20as%20notifications%2Fmessage)[ ](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=server%20should%20send%20all%20logs,to%20the%20client%20as%20notifications%2Fmessage)[288](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=). For instance, {"method":"logging/setLevel","params":
{"level":"WARN"}} to only get warnings and errors. If the client never sets a level, the server
decides what to send (maybe errors only, or everything if it’s a debug build) [](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[289](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[ ](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[290](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=Notification%20of%20a%20log%20message,which%20messages%20to%20send%20automatically).
•Use cases: Logging is mainly for developers or advanced users to see what’s happening under the
hood (especially when building custom MCP servers). It can also be useful for auditing actions (the
server might log tool calls, etc., though those might also be conveyed through normal responses).
30

---

•Note: Log messages are separate from the standard JSON-RPC errors. They’re more verbose runtime
info rather than error responses. They also can be sent anytime (even during initialization, the spec
allowed logging notifications early) [](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=,notification)[84](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=,notification).
The client may surface logs in a dedicated output panel. In VS Code, likely these logs could appear in an
Output channel for the MCP server or in the developer console if enabled.
Heartbeat Ping
MCP defines a simple ping request that either side can use to test connectivity. The schema shows ping
(probably returning an EmptyResult or similar) [](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=,ListPromptsRequest)[291](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=,ListPromptsRequest).
•The client might send periodic ping requests if no other traffic has occurred, just to keep the
connection alive or measure latency.
•The server can respond with a trivial success (maybe an empty object). The spec doesn’t detail ping’s
response in the text we have, but presumably it’s just:
{ "jsonrpc": "2.0", "id": X, "result": {} }
or possibly it might echo some timestamp.
•Pings are allowed during initialization wait (the client or server can send a ping to ensure the other
side is still there) [](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=)[292](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=).
It’s mostly a utility and not always needed if there is frequent traffic or if the transport has its own keepalive.
Session Management and Authentication Notifications
We covered session management via headers earlier. There isn’t a specific notification for session end or
anything; it’s handled by HTTP codes or disconnections.
However, related is Authentication under the Authorization extension: - If a server is protected (requires
OAuth tokens), and a client tries to use it without a token or with an expired token, the server will respond
with HTTP 401 and a WWW-Authenticate header indicating where to get the token [](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization#:~:text=Authorization%20Server%20Location)[293](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization#:~:text=Authorization%20Server%20Location)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization#:~:text=Authorization%20Server%20Location)[294](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization#:~:text=following%20the%20guidelines%20specified%20in,responses%20from%20the%20MCP%20server). - The client
then goes through an OAuth flow (outside MCP messages) to obtain a token, then retries requests with
Authorization header containing the token (or maybe includes it in the MCP session handshake if
specified). - The spec’s Authorization section is quite detailed, effectively aligning MCP with OAuth 2.1 flows
(with the server as Resource Server and an external Auth Server) [](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization#:~:text=Roles)[295](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization#:~:text=Roles)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization#:~:text=Roles)[296](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization#:~:text=Overview). It is beyond the core MCP, but key
points: - The client can discover the auth server from the MCP server (via metadata and headers) [](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization#:~:text=)[297](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization#:~:text=)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization#:~:text=)[294](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization#:~:text=following%20the%20guidelines%20specified%20in,responses%20from%20the%20MCP%20server). -
Clients can register dynamically if needed (public vs confidential clients). - Once an access token is obtained,
the client includes it with requests to authorized endpoints (likely via Authorization: Bearer <token>
HTTP header for HTTP transport). - If using stdio, auth is out-of-band (maybe environment variables or a
prompt to user to login and then pass token via some config message – the spec says STDIO should not use
the HTTP auth spec, but could use environment credentials) [](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization#:~:text=Authorization%20is%20OPTIONAL%20for%20MCP,When%20supported)[298](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization#:~:text=Authorization%20is%20OPTIONAL%20for%20MCP,When%20supported). - If a token is revoked or expired, the
server returns 401 and the process repeats.
Visual Studio Code’s MCP integration explicitly supports OAuth with GitHub/Microsoft accounts and
provides UI for users to grant and manage trust for MCP servers [](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=Authorization)[299](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=Authorization)[ ](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=Authorization)[300](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=VS%20Code%20has%20built,Servers%20action%20for%20that%20account). In VS Code, there’s a “Manage
31

---

Trusted MCP Servers” action where a user can see which MCP servers have access to their account tokens
[](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=The%20authorization%20specification%20cleanly%20separates,own%20OAuth%20implementations%20from%20scratch)[301](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=The%20authorization%20specification%20cleanly%20separates,own%20OAuth%20implementations%20from%20scratch)[ ](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=The%20authorization%20specification%20cleanly%20separates,own%20OAuth%20implementations%20from%20scratch)[300](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=VS%20Code%20has%20built,Servers%20action%20for%20that%20account). This is an example of how client integration should give users control over which servers can act
on their behalf.
“Roots” (Workspace Roots) – Client-to-Server Feature
We should mention Roots briefly, as it often ties in with Tools/Resources. The Roots feature (client
capability) allows the client to inform the server about the boundaries of the user’s workspace or project
directories [](https://modelcontextprotocol.io/specification/2025-06-18/client/roots#:~:text=The%20Model%20Context%20Protocol%20,notifications%20when%20that%20list%20changes)[302](https://modelcontextprotocol.io/specification/2025-06-18/client/roots#:~:text=The%20Model%20Context%20Protocol%20,notifications%20when%20that%20list%20changes)[ ](https://modelcontextprotocol.io/specification/2025-06-18/client/roots#:~:text=The%20Model%20Context%20Protocol%20,notifications%20when%20that%20list%20changes)[303](https://modelcontextprotocol.io/specification/2025-06-18/client/roots#:~:text=servers%20can%20operate%20within%20the,notifications%20when%20that%20list%20changes). If the client supports it: - The client declares roots capability (with possibly
listChanged ) [](https://modelcontextprotocol.io/specification/2025-06-18/client/roots#:~:text=Capabilities)[304](https://modelcontextprotocol.io/specification/2025-06-18/client/roots#:~:text=Capabilities)[ ](https://modelcontextprotocol.io/specification/2025-06-18/client/roots#:~:text=Capabilities)[305](https://modelcontextprotocol.io/specification/2025-06-18/client/roots#:~:text=,). - The server can then send roots/list request to get a list of root URIs that
the client provides (e.g. the path of the open folder in an IDE) [](https://modelcontextprotocol.io/specification/2025-06-18/client/roots#:~:text=Listing%20Roots)[306](https://modelcontextprotocol.io/specification/2025-06-18/client/roots#:~:text=Listing%20Roots)[ ](https://modelcontextprotocol.io/specification/2025-06-18/client/roots#:~:text=Listing%20Roots)[307](https://modelcontextprotocol.io/specification/2025-06-18/client/roots#:~:text=Copy). - The client responds with an array of
Root objects (each with a file URI and an optional name/label) [](https://modelcontextprotocol.io/specification/2025-06-18/client/roots#:~:text=%7B%20,)[308](https://modelcontextprotocol.io/specification/2025-06-18/client/roots#:~:text=%7B%20,)[ ](https://modelcontextprotocol.io/specification/2025-06-18/client/roots#:~:text=%7B%20,)[309](https://modelcontextprotocol.io/specification/2025-06-18/client/roots#:~:text=Root). - If at any time the user adds/
removes a workspace folder or the set of roots changes, the client sends notifications/roots/
list_changed [](https://modelcontextprotocol.io/specification/2025-06-18/client/roots#:~:text=Root%20List%20Changes)[310](https://modelcontextprotocol.io/specification/2025-06-18/client/roots#:~:text=Root%20List%20Changes). The server, on receiving that, should call roots/list again to update its internal
notion of accessible directories [](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=interface%20RootsListChangedNotification%20,)[311](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=interface%20RootsListChangedNotification%20,)[ ](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=interface%20RootsListChangedNotification%20,)[312](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=A%20notification%20from%20the%20client,of%20roots%20using%20the%20ListRootsRequest). - This mechanism effectively sandboxes the server’s operations to
certain directories. For example, a tool that reads files should ideally only allow file paths under those roots.
It’s a security measure (prevent server from wandering the filesystem beyond what’s authorized) and also a
context hint (server knows where to search for relevant files).
In an integration like VS Code, when you open a folder, that folder is the root. VS Code’s extension will
support roots, so it will send that information to the MCP server [](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=,s)[313](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=,s). In the tools example screenshot
above, one of the tools was showRoots – likely a tool to list the workspace roots, demonstrating how the
server is aware of them.
Elicitation and Sampling – Server-initiated AI interactions
While not asked explicitly in the user’s request, for completeness we note: - Sampling: If the server declares
completions or specifically uses sampling , it can ask the client to have the model generate a message
(via sampling/createMessage request) [](https://modelcontextprotocol.io/specification/2025-06-18/client/sampling#:~:text=Creating%20Messages)[314](https://modelcontextprotocol.io/specification/2025-06-18/client/sampling#:~:text=Creating%20Messages)[ ](https://modelcontextprotocol.io/specification/2025-06-18/client/sampling#:~:text=Creating%20Messages)[315](https://modelcontextprotocol.io/specification/2025-06-18/client/sampling#:~:text=,). The server provides a prompt (which might include
context it has) and the client’s AI produces a response that is sent back. This is like the server invoking the
model for a sub-task. Use cases include the server doing a multi-step reasoning where it queries the model
for intermediate steps. User control: The spec says sampling must be explicitly approved by user (since it
uses possibly their API credits or might reveal prompt info) [](https://modelcontextprotocol.io/specification/2025-06-18/client/sampling#:~:text=User%20Interaction%20Model)[316](https://modelcontextprotocol.io/specification/2025-06-18/client/sampling#:~:text=User%20Interaction%20Model)[ ](https://modelcontextprotocol.io/specification/2025-06-18/client/sampling#:~:text=User%20Interaction%20Model)[317](https://modelcontextprotocol.io/specification/2025-06-18/client/sampling#:~:text=For%20trust%20%26%20safety%20and,Applications%20SHOULD). So the client should likely prompt the
user “Server X wants the AI to generate text with prompt P – allow?”. - Elicitation: If the client supports
elicitation , the server can send elicitation/create requests to ask the user for more info during
a workflow [](https://modelcontextprotocol.io/specification/2025-06-18/client/elicitation#:~:text=Creating%20Elicitation%20Requests)[318](https://modelcontextprotocol.io/specification/2025-06-18/client/elicitation#:~:text=Creating%20Elicitation%20Requests)[ ](https://modelcontextprotocol.io/specification/2025-06-18/client/elicitation#:~:text=Creating%20Elicitation%20Requests)[319](https://modelcontextprotocol.io/specification/2025-06-18/client/elicitation#:~:text=,). The server provides a message to show the user (e.g. “Please provide your GitHub
username”) and a JSON schema for the expected answer [](https://modelcontextprotocol.io/specification/2025-06-18/client/elicitation#:~:text=,)[319](https://modelcontextprotocol.io/specification/2025-06-18/client/elicitation#:~:text=,)[ ](https://modelcontextprotocol.io/specification/2025-06-18/client/elicitation#:~:text=,)[320](https://modelcontextprotocol.io/specification/2025-06-18/client/elicitation#:~:text=,name). The client then should pop up a form to
the user. The user’s answer comes back as the response to that request. Elicitation is a way for the server
(and thus the AI’s chain of logic) to get clarification or additional data from the user in the middle of a
process. Clients must make it clear which server is asking and allow the user to decline or cancel [](https://modelcontextprotocol.io/specification/2025-06-18/client/elicitation#:~:text=For%20trust%20%26%20safety%20and,security)[321](https://modelcontextprotocol.io/specification/2025-06-18/client/elicitation#:~:text=For%20trust%20%26%20safety%20and,security). The
result from an elicitation includes an action field (accept/decline/cancel) and possibly content with the
provided data [](https://modelcontextprotocol.io/specification/2025-06-18/client/elicitation#:~:text=Reject%20Response%20Example%3A)[322](https://modelcontextprotocol.io/specification/2025-06-18/client/elicitation#:~:text=Reject%20Response%20Example%3A)[ ](https://modelcontextprotocol.io/specification/2025-06-18/client/elicitation#:~:text=Reject%20Response%20Example%3A)[323](https://modelcontextprotocol.io/specification/2025-06-18/client/elicitation#:~:text=%7B%20,%7D).
These two features turn the interaction into a three-way: user, AI, and server all in a loop. They are advanced
and likely used for complex agent workflows (for example, if a tool needs user’s API key, the server could
elicit it through a prompt).
32

---

### Integration with IDEs (Visual Studio Code) and Best Practices
MCP is designed to integrate into developer tools and other AI-assisted applications. A prime example is
Visual Studio Code’s implementation of MCP, which as of 2025 is in preview [](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=Model%20Context%20Protocol%20,AI%20agents%20in%20VS%20Code)[324](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=Model%20Context%20Protocol%20,AI%20agents%20in%20VS%20Code)[ ](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=Model%20Context%20Protocol%20,AI%20agents%20in%20VS%20Code)[325](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=Important). Integrating MCP into
an IDE or app involves handling the technical protocol and also presenting the features to the user in an
intuitive, safe manner. Here we summarize how an integration can work, using VS Code as a model for best
practices:
•Running/Connecting to Servers: The client (IDE) needs to start or connect to the MCP server. In VS
Code, if an extension includes an MCP server (perhaps packaged as a binary or a Python script), it
can be launched via stdio. If the server is remote, the user might configure an endpoint URL and the
client connects via HTTP+SSE. VS Code supports both local and remote transports [](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=)[326](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=). The user
might be asked to trust the server’s source, especially if it’s remote.
•Handshake and Capability Use: The client performs the initialization handshake as per spec. In VS
Code, the extension would negotiate all capabilities it supports (which are quite extensive: tools,
prompts, resources, elicitation, sampling, roots, authentication, etc.) [](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=MCP%20features%20supported%20by%20VS,Code)[327](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=MCP%20features%20supported%20by%20VS,Code)[ ](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=MCP%20features%20supported%20by%20VS,Code)[114](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=,an%20MCP%20server%20using%20OAuth). VS Code’s
documentation explicitly lists those, confirming it implements basically the full MCP feature set.
•Discovering Tools/Prompts/Resources: After init, the client obtains lists of tools, prompts,
resources:
•It may populate a Tools menu or palette. VS Code has a “Tools picker” for agent mode where it lists
all tools from all MCP servers, grouped by server [](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=)[203](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=). The user can check which ones the AI is
allowed to use. The tool’s title and description are shown so the user understands what they
do [](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=)[203](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=). In the screenshot above【37】, we see tools add , getGreeting , showRoots under a
server. Users can toggle them on/off quickly.
•Tools are also referenced in the chat UI. When the AI attempts to use one, a confirmation pops up
(with the tool’s title, description, and the input args) [](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=Image%3A%20Screenshot%20that%20shows%20the,tools%20from%20an%20MCP%20server)[204](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=Image%3A%20Screenshot%20that%20shows%20the,tools%20from%20an%20MCP%20server)[ ](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=Image%3A%20Screenshot%20that%20shows%20the,tools%20from%20an%20MCP%20server)[205](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=To%20provide%20extra%20metadata%20about,you%20can%20use%20tool%20annotations), as shown in screenshot 【38】. The
user can approve or cancel. If approved, the extension sends tools/call to the server. If
cancelled, it sends a cancelled notification to abort the call.
•The client should implement logic to automatically deny or allow some tools based on policy. For
example, if a tool has readOnlyHint true, VS Code does not show the confirmation (auto-runs it)
[](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=annotations%20modelcontextprotocol)[249](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=annotations%20modelcontextprotocol)[ ](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=annotations%20modelcontextprotocol)[250](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=%2A%20%60title%60%3A%20Human,only%20tools), to streamline things like simple getters.
•Tools might also be invoked directly by the user via UI (maybe a context menu “Run tool X now”), but
typically it’s the AI that decides.
•For Resources, the client likely creates a UI to browse them. VS Code allows users to open a list of
resources (by running “MCP: Browse Resources” command) [](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=in%20real)[149](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=in%20real). It shows resource names (and
possibly descriptions). Resource templates are shown as well, often distinguished by needing input
(in the screenshot 【39】, we see a list of “Repository Content for specific branch/commit...” which
are templates from presumably a GitHub MCP server). When the user picks a resource template, VS
Code prompts for the parameters (and if completions are defined for that parameter, it provides
suggestions) [](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=)[328](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=)[ ](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=)[329](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=database%20query%20tool%20could%20ask,for%20the%20database%20table%20name).
33

---

•When a resource is selected, if it’s text, the client can open it in an editor tab. If it’s binary (image/
audio), the client might preview it or save it. If the user wants to share it with the AI, the client can
insert it as context: VS Code has “Add Context” to attach a resource to the chat prompt [](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=in%20real)[149](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=in%20real)[ ](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=in%20real)[330](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=When%20you%20define%20an%20MCP,contain%20text%20or%20binary%20content),
meaning it will include the content in the question to the AI.
•If resources update (via notifications), the client updates the open editors or notifies the user. VS
Code supports resource updates such that an open resource document updates in real-time if the
server sends an update (e.g., log file tailing) [](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=Image%3A%20Screenshot%20that%20shows%20the,MCP%20Resources%20Quick%20Pick)[331](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=Image%3A%20Screenshot%20that%20shows%20the,MCP%20Resources%20Quick%20Pick).
•For Prompts, the client likely merges them into the chat’s slash commands or a similar UI. In VS
Code, prompts become slash commands prefixed with the server name, like /mcp.my-mcp-
server.promptname [](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=Prompts)[115](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=Prompts). The user can trigger them easily. If a prompt has arguments, VS Code
will show a dialog for input, with auto-completion if configured [](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=built,user%27s%20local%20context%20and%20service)[134](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=built,user%27s%20local%20context%20and%20service)[ ](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=built,user%27s%20local%20context%20and%20service)[133](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=name%3A%20completable%28z.string%28%29%2C%20value%20%3D,welcome%20to%20the%20team), as shown in screenshot
【40】. After the user fills the argument(s), VS Code inserts the resulting prompt messages into the
chat and sends them to the model.
•Prompts thus act as “canned expert actions” the user can use without remembering or typing a
complex query.
•Session and Auth: If a server requires authentication (say it needs to access user’s GitHub), the
client should handle that gracefully:
•VS Code’s integration with OAuth is such that if the server advertises an auth server (via the
Authorization spec metadata), VS Code will use its built-in auth support to obtain a token from
GitHub or Entra ID [](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=Authorization)[299](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=Authorization)[ ](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=Authorization)[300](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=VS%20Code%20has%20built,Servers%20action%20for%20that%20account). The user likely goes through a familiar OAuth consent page, then VS
Code stores the token.
•VS Code then associates that token with the MCP server (in its accounts management). The user can
revoke trust via the Accounts menu [](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=The%20authorization%20specification%20cleanly%20separates,own%20OAuth%20implementations%20from%20scratch)[301](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=The%20authorization%20specification%20cleanly%20separates,own%20OAuth%20implementations%20from%20scratch)[ ](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=The%20authorization%20specification%20cleanly%20separates,own%20OAuth%20implementations%20from%20scratch)[300](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=VS%20Code%20has%20built,Servers%20action%20for%20that%20account), which likely stops sending the token or disconnects
from the server.
•The integration should ensure tokens are scoped properly and not exposed beyond the server’s
requests.
•For local servers that don’t need auth, nothing special is needed. For remote, the client might also
verify TLS certificates or allow user to accept self-signed if in enterprise context.
•Multi-server handling: An IDE can connect to multiple MCP servers at once (for example, one might
provide coding tools, another provides access to a database, etc.). The client should keep them
separate and combine their offerings sensibly:
•Tools from multiple servers can be aggregated in the UI (with server grouping as shown).
•Prompts can be namespaced (prefix by server).
•Resources might be listed per server or in different categories (perhaps the Quick Pick shows them
grouped by server or by type).
•Each server runs its own JSON-RPC connection (likely a separate process or endpoint). The client
must manage each handshake individually.
•When the AI (model) is composing a reply, if multiple servers are available, the client might allow the
model to call any tool from any server. This is powerful but also tricky: the model might have to
34

---

specify which server’s tool. Possibly the naming convention serverName.toolName or the client
enforces unique names.
•VS Code’s prompt naming suggests they use mcp.<servername>.<prompt> format in the UI,
which implies similar for tools behind the scenes.
•Error reporting to user: If something goes wrong (server crashes, version mismatch, etc.), the client
should inform the user. E.g., if initialize fails with version error, the client might show “The MCP
server is not compatible (it supports version X, we require Y)”. If a tool call returns a JSON-RPC error,
maybe log it or show a notification.
•VS Code likely shows a toast or an output error if an MCP server disconnects unexpectedly or if a
request fails.
•Consent and Safety: The integration must implement the security principles in UI:
•Make sure the user explicitly enables an MCP server (maybe via installing an extension or
configuration).
•Possibly ask the user on first use: “Allow AI to use tool X which can modify files?” – so user is aware of
capabilities.
•Provide settings to permanently allow certain safe operations without prompt, and always prompt
for riskier ones.
•Keep a clear record of what actions were taken (logging to output each tool invocation and result can
help debugging and trust).
•The user should always be able to stop or pause an AI agent if it’s going out of control with tool
usage.
•Performance: The client should handle concurrency gracefully. For example, if the AI triggers
multiple tool calls in rapid succession (or parallel in different threads of conversation), the client
might queue or allow some concurrency depending on server capabilities. Also, streaming results via
SSE should be handled asynchronously so that partial outputs (like a tool that streams a large result)
don’t block the UI.
•Extensibility: As MCP evolves (new capabilities or changes in future versions), the client should be
built to negotiate versions and degrade gracefully. The VS Code implementation supporting multiple
versions via the MCP-Protocol-Version header ensures it can talk to older servers.
•Testing and Debugging: Tools and resources open up a lot of possibilities but also complexity. A
good integration provides ways for developers to test their MCP servers (maybe a command to
simulate a tool call, etc.) and for users to see what’s happening under the hood (the logging feature,
as well as maybe a verbose mode to print all JSON-RPC traffic for debugging if needed).
To illustrate integration, consider a user story in VS Code:
The user installs an extension that provides an MCP server for a cloud database. They open VS Code and connect
to their database (perhaps the extension starts the server). VS Code initiates MCP handshake, obtains that the
35

---

### server offers: a prompt “Generate SQL Query”, resources listing database tables, and a tool “execute_query”. The
### user sees a new "MCP Tools" section where they enable the execute_query tool (which is read-only in effect as
### it just fetches data). They ask the AI in chat: "What are the names of all customers who spent more than $1000 last
### month?" The AI decides to use the execute_query tool. VS Code intercepts: shows a dialog "Run execute_query
### – SQL Query Tool with input: SELECT name FROM customers WHERE spend > 1000 AND month = 'last'" (which the
### AI formulated). The user clicks Continue. The server runs the query, streams a progress (because it’s a large query,
### progress:50%, etc.) and then returns a result resource link to a CSV file. The VS Code extension gets a resource_link,
### it automatically fetches it via resources/read (or perhaps the AI explicitly asks to read it). The results are
### displayed to the user or summarized by the AI. Throughout, the user had control to cancel (maybe a Stop button
### on the progress notification).
### This scenario shows many pieces working together: tools, prompts (if the server had any), resources,
### progress, cancellation.
### In conclusion, integrating MCP means implementing the protocol plumbing (JSON-RPC messages over a
### chosen transport) and the UX that surfaces these AI capabilities in a user-friendly, safe manner. The latest
### spec (2025-06-18) provides a comprehensive blueprint for both: from handshake negotiation to session
### management, from how to structure a tool’s JSON schema to how to handle errors and streaming. Following
### this spec, developers can create AI extensions that are interoperable with multiple clients, and clients can
### support a growing ecosystem of AI tools and data sources in a standard way. The result is a richer, more
### powerful AI assistance experience – one where the AI is not a black-box, but an agent that can work with
### your tools and data under your supervision.
### Sources:
- Official MCP Spec (2025-06-18)[332](https://modelcontextprotocol.io/specification/2025-06-18/index#:~:text=Model%20Context%20Protocol%20,%E2%80%9CSHOULD%20NOT%E2%80%9D%2C%20%E2%80%9CRECOMMENDED%E2%80%9D%2C%20%E2%80%9CNOT%20RECOMMENDED%E2%80%9D)[ ](https://modelcontextprotocol.io/specification/2025-06-18/index#:~:text=Model%20Context%20Protocol%20,%E2%80%9CSHOULD%20NOT%E2%80%9D%2C%20%E2%80%9CRECOMMENDED%E2%80%9D%2C%20%E2%80%9CNOT%20RECOMMENDED%E2%80%9D)[333](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=The%20client%20MUST%20initiate%20this,request%20containing)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=The%20client%20MUST%20initiate%20this,request%20containing)[77](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Copy)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Copy)[21](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=Sending%20Messages%20to%20the%20Server)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=Sending%20Messages%20to%20the%20Server)[334](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=Session%20Management)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=Session%20Management)[96](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=0x21%20to%200x7E%29,to%20a%20request%20containing%20an)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=0x21%20to%200x7E%29,to%20a%20request%20containing%20an)[118](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=%7B%20,analyze%20code%20quality%20and%20suggest)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=%7B%20,analyze%20code%20quality%20and%20suggest)[130](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=,%7D%20%7D%20%5D)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=,%7D%20%7D%20%5D)[152](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=,rust%22%20%7D)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=,rust%22%20%7D)[335](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=,12T15%3A00%3A58Z)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=,12T15%3A00%3A58Z)[207](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,)[218](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,false)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,false)[235](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=%7B%20,65)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=%7B%20,65)[254](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,)[256](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=%7B%20,)
- Visual Studio Code MCP Integration Guide[203](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=)[ ](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=)[205](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=To%20provide%20extra%20metadata%20about,you%20can%20use%20tool%20annotations)[ ](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=To%20provide%20extra%20metadata%20about,you%20can%20use%20tool%20annotations)[115](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=Prompts)[ ](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=Prompts)[133](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=name%3A%20completable%28z.string%28%29%2C%20value%20%3D,welcome%20to%20the%20team)[ ](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=name%3A%20completable%28z.string%28%29%2C%20value%20%3D,welcome%20to%20the%20team)[301](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=The%20authorization%20specification%20cleanly%20separates,own%20OAuth%20implementations%20from%20scratch)
[](https://modelcontextprotocol.io/specification/2025-06-18/index#:~:text=Model%20Context%20Protocol%20,words%20%E2%80%9CMUST%E2%80%9D%2C%20%E2%80%9CMUST%20NOT%E2%80%9D%2C%20%E2%80%9CREQUIRED%E2%80%9D)[1](https://modelcontextprotocol.io/specification/2025-06-18/index#:~:text=Model%20Context%20Protocol%20,words%20%E2%80%9CMUST%E2%80%9D%2C%20%E2%80%9CMUST%20NOT%E2%80%9D%2C%20%E2%80%9CREQUIRED%E2%80%9D)[ ](https://modelcontextprotocol.io/specification/2025-06-18/index#:~:text=Model%20Context%20Protocol%20,words%20%E2%80%9CMUST%E2%80%9D%2C%20%E2%80%9CMUST%20NOT%E2%80%9D%2C%20%E2%80%9CREQUIRED%E2%80%9D)[2](https://modelcontextprotocol.io/specification/2025-06-18/index#:~:text=The%20protocol%20uses%20JSON,messages%20to%20establish%20communication%20between)[ ](https://modelcontextprotocol.io/specification/2025-06-18/index#:~:text=The%20protocol%20uses%20JSON,messages%20to%20establish%20communication%20between)[3](https://modelcontextprotocol.io/specification/2025-06-18/index#:~:text=,that%20provide%20context%20and%20capabilities)[ ](https://modelcontextprotocol.io/specification/2025-06-18/index#:~:text=,that%20provide%20context%20and%20capabilities)[4](https://modelcontextprotocol.io/specification/2025-06-18/index#:~:text=MCP%20takes%20some%20inspiration%20from,the%20ecosystem%20of%20AI%20applications)[ ](https://modelcontextprotocol.io/specification/2025-06-18/index#:~:text=MCP%20takes%20some%20inspiration%20from,the%20ecosystem%20of%20AI%20applications)[5](https://modelcontextprotocol.io/specification/2025-06-18/index#:~:text=Servers%20offer%20any%20of%20the,following%20features%20to%20clients)[ ](https://modelcontextprotocol.io/specification/2025-06-18/index#:~:text=Servers%20offer%20any%20of%20the,following%20features%20to%20clients)[6](https://modelcontextprotocol.io/specification/2025-06-18/index#:~:text=,the%20AI%20model%20to%20execute)[ ](https://modelcontextprotocol.io/specification/2025-06-18/index#:~:text=,the%20AI%20model%20to%20execute)[9](https://modelcontextprotocol.io/specification/2025-06-18/index#:~:text=Key%20Principles)[ ](https://modelcontextprotocol.io/specification/2025-06-18/index#:~:text=Key%20Principles)[10](https://modelcontextprotocol.io/specification/2025-06-18/index#:~:text=,LLM%20Sampling%20Controls)[ ](https://modelcontextprotocol.io/specification/2025-06-18/index#:~:text=,LLM%20Sampling%20Controls)[332](https://modelcontextprotocol.io/specification/2025-06-18/index#:~:text=Model%20Context%20Protocol%20,%E2%80%9CSHOULD%20NOT%E2%80%9D%2C%20%E2%80%9CRECOMMENDED%E2%80%9D%2C%20%E2%80%9CNOT%20RECOMMENDED%E2%80%9D)Specification - Model Context Protocol
#### [](https://modelcontextprotocol.io/specification/2025-06-18/index)[https://modelcontextprotocol.io/specification/2025-06-18/index](https://modelcontextprotocol.io/specification/2025-06-18/index)
[](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Capability%20Negotiation)[7](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Capability%20Negotiation)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Capability%20Negotiation)[8](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Server%20,capabilities%20like)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Server%20,capabilities%20like)[63](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=The%20Model%20Context%20Protocol%20,capability%20negotiation%20and%20state%20management)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=The%20Model%20Context%20Protocol%20,capability%20negotiation%20and%20state%20management)[64](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=The%20initialization%20phase%20MUST%20be,phase%2C%20the%20client%20and%20server)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=The%20initialization%20phase%20MUST%20be,phase%2C%20the%20client%20and%20server)[65](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=,Share%20implementation%20details)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=,Share%20implementation%20details)[66](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=The%20client%20MUST%20initiate%20this,request%20containing)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=The%20client%20MUST%20initiate%20this,request%20containing)[67](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Version%20Negotiation)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Version%20Negotiation)[68](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Description%20Client%20,standard%20experimental%20features)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Description%20Client%20,standard%20experimental%20features)[69](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=,resources%20only)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=,resources%20only)[70](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=The%20client%20MUST%20initiate%20this,request%20containing)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=The%20client%20MUST%20initiate%20this,request%20containing)[71](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=,%7D)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=,%7D)[72](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=%22protocolVersion%22%3A%20%222024,)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=%22protocolVersion%22%3A%20%222024,)[73](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=In%20the%20,server%E2%80%99s%20response%2C%20it%20SHOULD%20disconnect)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=In%20the%20,server%E2%80%99s%20response%2C%20it%20SHOULD%20disconnect)[74](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=server%20supports%20the%20requested%20protocol,server%E2%80%99s%20response%2C%20it%20SHOULD%20disconnect)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=server%20supports%20the%20requested%20protocol,server%E2%80%99s%20response%2C%20it%20SHOULD%20disconnect)[75](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Client%20and%20server%20capabilities%20establish,standard%20experimental%20features)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Client%20and%20server%20capabilities%20establish,standard%20experimental%20features)[76](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=,resources%20only)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=,resources%20only)[77](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Copy)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Copy)[78](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=,Optional%20instructions%20for%20the%20client)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=,Optional%20instructions%20for%20the%20client)[79](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=%22protocolVersion%22%3A%20%222024,true)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=%22protocolVersion%22%3A%20%222024,true)[80](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=,)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=,)[81](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=)[82](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=)[83](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=)[84](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=,notification)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=,notification)[85](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=,05%22%5D%2C%20%22requested%22%3A%20%221.0.0%22%20%7D)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=,05%22%5D%2C%20%22requested%22%3A%20%221.0.0%22%20%7D)[86](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=%22code%22%3A%20,%7D%20%7D)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=%22code%22%3A%20,%7D%20%7D)[87](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Server%20,standard%20experimental%20features)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Server%20,standard%20experimental%20features)[88](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Server%20,standard%20experimental%20features)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Server%20,standard%20experimental%20features)[89](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Client%20,standard%20experimental%20features)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Client%20,standard%20experimental%20features)[90](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Description%20Client%20,Support%20for%20server%20elicitation%20requests)
[](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Capability%20objects%20can%20describe%20sub,like)[91](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Capability%20objects%20can%20describe%20sub,like)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Capability%20objects%20can%20describe%20sub,like)[92](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Capability%20objects%20can%20describe%20sub,like)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Capability%20objects%20can%20describe%20sub,like)[93](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=,resources)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=,resources)[94](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=During%20the%20operation%20phase%2C%20the,Both%20parties%20MUST)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=During%20the%20operation%20phase%2C%20the,Both%20parties%20MUST)[95](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=the%20negotiated%20capabilities,MUST)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=the%20negotiated%20capabilities,MUST)[98](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Timeouts)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Timeouts)[99](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Error%20Handling)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Error%20Handling)[100](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Implementations%20SHOULD%20establish%20timeouts%20for,progress%20notifications%2C%20to%20limit%20the)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=Implementations%20SHOULD%20establish%20timeouts%20for,progress%20notifications%2C%20to%20limit%20the)[101](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=receiving%20a%20progress%20notification%20corresponding,a%20misbehaving%20client%20or%20server)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=receiving%20a%20progress%20notification%20corresponding,a%20misbehaving%20client%20or%20server)[102](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=During%20the%20shutdown%20phase%2C%20one,used%20to%20signal%20connection%20termination)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=During%20the%20shutdown%20phase%2C%20one,used%20to%20signal%20connection%20termination)[103](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=stdio)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=stdio)[104](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=For%20the%20stdio%20transport%2C%20the,client%20SHOULD%20initiate%20shutdown%20by)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=For%20the%20stdio%20transport%2C%20the,client%20SHOULD%20initiate%20shutdown%20by)[105](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=1,SIGTERM)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=1,SIGTERM)[106](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=)[292](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=)[333](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#:~:text=The%20client%20MUST%20initiate%20this,request%20containing)Lifecycle - Model Context Protocol
#### [](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle)[https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle)
[](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=Custom%20Transports)[11](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=Custom%20Transports)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=Custom%20Transports)[12](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=In%20the%20stdio%20transport%3A)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=In%20the%20stdio%20transport%3A)[13](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=,RPC%20requests%2C%20notifications%2C%20or%20responses)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=,RPC%20requests%2C%20notifications%2C%20or%20responses)[14](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=sends%20messages%20to%20its%20standard,not%20a%20valid%20MCP%20message)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=sends%20messages%20to%20its%20standard,not%20a%20valid%20MCP%20message)[15](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=,not%20a%20valid%20MCP%20message)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=,not%20a%20valid%20MCP%20message)[16](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=,is%20not%20a%20valid%20MCP)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=,is%20not%20a%20valid%20MCP)[17](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=MCP%20uses%20JSON,server%20communication)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=MCP%20uses%20JSON,server%20communication)[18](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=In%20the%20Streamable%20HTTP%20transport%2C,could%20be%20a%20URL%20like)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=In%20the%20Streamable%20HTTP%20transport%2C,could%20be%20a%20URL%20like)[19](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=Events%20en,https%3A%2F%2Fexample.com%2Fmcp)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=Events%20en,https%3A%2F%2Fexample.com%2Fmcp)[20](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=server,https%3A%2F%2Fexample.com%2Fmcp)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=server,https%3A%2F%2Fexample.com%2Fmcp)[21](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=Sending%20Messages%20to%20the%20Server)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=Sending%20Messages%20to%20the%20Server)[22](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=,MUST%20support%20both%20these%20cases)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=,MUST%20support%20both%20these%20cases)[23](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=1,202%20Accepted%20with%20no%20body)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=1,202%20Accepted%20with%20no%20body)[24](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=notification%2C%20or%20response,Type)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=notification%2C%20or%20response,Type)[25](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=,id)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=,id)[26](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=,Content)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=,Content)[27](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=RPC%20error%20response%20that%20has,requests%20and%20notifications%20before%20sending)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=RPC%20error%20response%20that%20has,requests%20and%20notifications%20before%20sending)[28](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=1,server%20initiates%20an%20SSE%20stream)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=1,server%20initiates%20an%20SSE%20stream)[29](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=Listening%20for%20Messages%20from%20the,Server)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=Listening%20for%20Messages%20from%20the,Server)[30](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=4,SSE%20stream%20at%20any%20time)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=4,SSE%20stream%20at%20any%20time)[31](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=,with%20a%20previous%20client%20request)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=,with%20a%20previous%20client%20request)[32](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=,SSE%20stream%20at%20any%20time)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=,SSE%20stream%20at%20any%20time)[33](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=Multiple%20Connections)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=Multiple%20Connections)[34](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=To%20support%20resuming%20broken%20connections%2C,that%20might%20otherwise%20be%20lost)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=To%20support%20resuming%20broken%20connections%2C,that%20might%20otherwise%20be%20lost)[35](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=1,was%20disconnected%2C%20and%20to%20resume)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=1,was%20disconnected%2C%20and%20to%20resume)[36](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=in%20use,delivered%20on%20a%20different%20stream)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=in%20use,delivered%20on%20a%20different%20stream)[37](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=1,last%20event%20ID%20it%20received)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=1,last%20event%20ID%20it%20received)[38](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=an%20HTTP%20GET%20to%20the,delivered%20on%20a%20different%20stream)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=an%20HTTP%20GET%20to%20the,delivered%20on%20a%20different%20stream)[39](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=An%20MCP%20%E2%80%9Csession%E2%80%9D%20consists%20of,want%20to%20establish%20stateful%20sessions)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=An%20MCP%20%E2%80%9Csession%E2%80%9D%20consists%20of,want%20to%20establish%20stateful%20sessions)[40](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=1,Session)
[](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=0x21%20to%200x7E%29,with%20HTTP%20404%20Not%20Found)[41](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=0x21%20to%200x7E%29,with%20HTTP%20404%20Not%20Found)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=0x21%20to%200x7E%29,with%20HTTP%20404%20Not%20Found)[42](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=2.%20If%20an%20%60Mcp,session%20by%20sending%20a%20new)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=2.%20If%20an%20%60Mcp,session%20by%20sending%20a%20new)[43](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=0x21%20to%200x7E%29,session%20by%20sending%20a%20new)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=0x21%20to%200x7E%29,session%20by%20sending%20a%20new)[44](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=clients%20using%20the%20Streamable%20HTTP,without%20a%20session%20ID%20attached)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=clients%20using%20the%20Streamable%20HTTP,without%20a%20session%20ID%20attached)[45](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=clients%20using%20the%20Streamable%20HTTP,session%20by%20sending%20a%20new)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=clients%20using%20the%20Streamable%20HTTP,session%20by%20sending%20a%20new)[46](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=Id,time%2C%20after%20which%20it%20MUST)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=Id,time%2C%20after%20which%20it%20MUST)[47](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=,because%20the%20user%20is)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=,because%20the%20user%20is)[48](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=3,without%20a%20session%20ID%20attached)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=3,without%20a%20session%20ID%20attached)[49](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=respond%20to%20requests%20containing%20that,without%20a%20session%20ID%20attached)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=respond%20to%20requests%20containing%20that,without%20a%20session%20ID%20attached)[50](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=,HTTP%20405%20Method%20Not%20Allowed)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=,HTTP%20405%20Method%20Not%20Allowed)[51](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=,allow%20clients%20to%20terminate%20sessions)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=,allow%20clients%20to%20terminate%20sessions)[52](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=Protocol%20Version%20Header)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=Protocol%20Version%20Header)[53](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=If%20using%20HTTP%2C%20the%20client,with%20an%20invalid%20or%20unsupported)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=If%20using%20HTTP%2C%20the%20client,with%20an%20invalid%20or%20unsupported)[54](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=MCP%20server%20to%20respond%20based,400%20Bad%20Request)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=MCP%20server%20to%20respond%20based,400%20Bad%20Request)[55](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=the%20one%20negotiated%20during%20initialization,400%20Bad%20Request)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=the%20one%20negotiated%20during%20initialization,400%20Bad%20Request)[56](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=Security%20Warning)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=Security%20Warning)[57](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=1,proper%20authentication%20for%20all%20connections)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=1,proper%20authentication%20for%20all%20connections)[58](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=1,proper%20authentication%20for%20all%20connections)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=1,proper%20authentication%20for%20all%20connections)[96](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=0x21%20to%200x7E%29,to%20a%20request%20containing%20an)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=0x21%20to%200x7E%29,to%20a%20request%20containing%20an)[334](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#:~:text=Session%20Management)Transports - Model Context Protocol
#### [](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports)[https://modelcontextprotocol.io/specification/2025-06-18/basic/transports](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports)
#### [](https://northflank.com/blog/how-to-build-and-deploy-a-model-context-protocol-mcp-server#:~:text=How%20to%20build%20and%20deploy,speak%20the%20MCP%20WebSocket%20protocol)[59](https://northflank.com/blog/how-to-build-and-deploy-a-model-context-protocol-mcp-server#:~:text=How%20to%20build%20and%20deploy,speak%20the%20MCP%20WebSocket%20protocol)How to build and deploy a Model Context Protocol (MCP) server | Blog
#### [](https://northflank.com/blog/how-to-build-and-deploy-a-model-context-protocol-mcp-server)[https://northflank.com/blog/how-to-build-and-deploy-a-model-context-protocol-mcp-server](https://northflank.com/blog/how-to-build-and-deploy-a-model-context-protocol-mcp-server)
#### [](https://www.advisorlabs.com/services/model-context-protocol#:~:text=Model%20Context%20Protocol%20,Sent%20Events%29%2C%20and%20WebSocket)[60](https://www.advisorlabs.com/services/model-context-protocol#:~:text=Model%20Context%20Protocol%20,Sent%20Events%29%2C%20and%20WebSocket)Model Context Protocol | AI MCP Server Consulting Experts
#### [](https://www.advisorlabs.com/services/model-context-protocol)[https://www.advisorlabs.com/services/model-context-protocol](https://www.advisorlabs.com/services/model-context-protocol)
#### [](https://github.com/virajsharma2000/mcp-websocket#:~:text=GitHub%20github,clients%20to%20make%20standard)[61](https://github.com/virajsharma2000/mcp-websocket#:~:text=GitHub%20github,clients%20to%20make%20standard)virajsharma2000/mcp-websocket: This server implements ... - GitHub
#### [](https://github.com/virajsharma2000/mcp-websocket)[https://github.com/virajsharma2000/mcp-websocket](https://github.com/virajsharma2000/mcp-websocket)
### 36

---

[](https://mcpmarket.com/server/websocket#:~:text=WebSocket%20MCP%20provides%20a%20robust,a%20custom%20WebSocket%20transport%20layer)[62](https://mcpmarket.com/server/websocket#:~:text=WebSocket%20MCP%20provides%20a%20robust,a%20custom%20WebSocket%20transport%20layer)Enhanced LLM Communication via WebSockets - MCP Market
#### [](https://mcpmarket.com/server/websocket)[https://mcpmarket.com/server/websocket](https://mcpmarket.com/server/websocket)
[](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=,prompts%2Flist)[97](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=,prompts%2Flist)[ ](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=,prompts%2Flist)[137](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[ ](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[138](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=An%20optional%20notification%20from%20the,previous%20subscription%20from%20the%20client)[ ](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=An%20optional%20notification%20from%20the,previous%20subscription%20from%20the%20client)[178](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=interface%20ResourceUpdatedNotification%20,)[ ](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=interface%20ResourceUpdatedNotification%20,)[179](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[ ](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[180](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[ ](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[181](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=,CreateMessageResult)[ ](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=,CreateMessageResult)[182](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=,tools%2Fcall)[ ](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=,tools%2Fcall)[185](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[ ](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[186](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=An%20optional%20notification%20from%20the,previous%20subscription%20from%20the%20client)[ ](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=An%20optional%20notification%20from%20the,previous%20subscription%20from%20the%20client)[247](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[ ](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[248](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[ ](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[259](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=Type%20declaration)[ ](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=Type%20declaration)[260](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[ ](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[261](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=An%20optional%20message%20describing%20the,current%20progress)[ ](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=An%20optional%20message%20describing%20the,current%20progress)[262](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[ ](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[263](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[ ](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[264](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[ ](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[265](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=params%3A%20,progressToken%3A%20ProgressToken%3B%20total%3F%3A%20number%3B)[ ](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=params%3A%20,progressToken%3A%20ProgressToken%3B%20total%3F%3A%20number%3B)[266](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=TJS)[ ](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=TJS)[267](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[ ](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[268](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=match%20at%20L2258%20,progressToken%3F%3A%20ProgressToken)[ ](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=match%20at%20L2258%20,progressToken%3F%3A%20ProgressToken)[269](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[ ](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[270](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[ ](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[271](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=interface%20ProgressNotification%20,)[ ](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=interface%20ProgressNotification%20,)[272](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=params%3A%20,progressToken%3A%20ProgressToken%3B%20total%3F%3A%20number%3B)[ ](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=params%3A%20,progressToken%3A%20ProgressToken%3B%20total%3F%3A%20number%3B)[273](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[ ](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[274](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)
[](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=This%20notification%20can%20be%20sent,issued%20request)[275](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=This%20notification%20can%20be%20sent,issued%20request)[ ](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=This%20notification%20can%20be%20sent,issued%20request)[276](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[ ](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[277](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[ ](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[278](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=interface%20CancelledNotification%20,)[ ](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=interface%20CancelledNotification%20,)[279](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[ ](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[280](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=The%20request%20SHOULD%20still%20be,the%20request%20has%20already%20finished)[ ](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=The%20request%20SHOULD%20still%20be,the%20request%20has%20already%20finished)[281](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=This%20notification%20indicates%20that%20the,any%20associated%20processing%20SHOULD%20cease)[ ](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=This%20notification%20indicates%20that%20the,any%20associated%20processing%20SHOULD%20cease)[282](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[ ](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[283](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=Type%20declaration)[ ](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=Type%20declaration)[284](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=interface%20LoggingMessageNotification%20,)[ ](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=interface%20LoggingMessageNotification%20,)[285](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=The%20data%20to%20be%20logged%2C,serializable%20type%20is%20allowed%20here)[ ](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=The%20data%20to%20be%20logged%2C,serializable%20type%20is%20allowed%20here)[286](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[ ](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[287](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=server%20should%20send%20all%20logs,to%20the%20client%20as%20notifications%2Fmessage)[ ](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=server%20should%20send%20all%20logs,to%20the%20client%20as%20notifications%2Fmessage)[288](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[ ](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[289](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[ ](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=)[290](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=Notification%20of%20a%20log%20message,which%20messages%20to%20send%20automatically)[ ](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=Notification%20of%20a%20log%20message,which%20messages%20to%20send%20automatically)[291](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=,ListPromptsRequest)[ ](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=,ListPromptsRequest)[311](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=interface%20RootsListChangedNotification%20,)[ ](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=interface%20RootsListChangedNotification%20,)[312](https://modelcontextprotocol.io/specification/2025-06-18/schema#:~:text=A%20notification%20from%20the%20client,of%20roots%20using%20the%20ListRootsRequest)Schema Reference - Model
### Context Protocol
#### [](https://modelcontextprotocol.io/specification/2025-06-18/schema)[https://modelcontextprotocol.io/specification/2025-06-18/schema](https://modelcontextprotocol.io/specification/2025-06-18/schema)
#### [](https://modelcontextprotocol.io/specification/2025-06-18/server#:~:text=%2A%20Prompts%3A%20Pre,perform%20actions%20or%20retrieve%20information)[107](https://modelcontextprotocol.io/specification/2025-06-18/server#:~:text=%2A%20Prompts%3A%20Pre,perform%20actions%20or%20retrieve%20information)Overview - Model Context Protocol
#### [](https://modelcontextprotocol.io/specification/2025-06-18/server)[https://modelcontextprotocol.io/specification/2025-06-18/server](https://modelcontextprotocol.io/specification/2025-06-18/server)
[](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=The%20Model%20Context%20Protocol%20,provide%20arguments%20to%20customize%20them)[108](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=The%20Model%20Context%20Protocol%20,provide%20arguments%20to%20customize%20them)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=The%20Model%20Context%20Protocol%20,provide%20arguments%20to%20customize%20them)[109](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=Prompts%20are%20designed%20to%20be,any%20specific%20user%20interaction%20model)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=Prompts%20are%20designed%20to%20be,any%20specific%20user%20interaction%20model)[110](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=Capabilities)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=Capabilities)[111](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=,)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=,)[112](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=%7B%20,true%20%7D%20%7D)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=%7B%20,true%20%7D%20%7D)[113](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=User%20Interaction%20Model)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=User%20Interaction%20Model)[116](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=Listing%20Prompts)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=Listing%20Prompts)[117](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=,value%22%20%7D)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=,value%22%20%7D)[118](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=%7B%20,analyze%20code%20quality%20and%20suggest)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=%7B%20,analyze%20code%20quality%20and%20suggest)[119](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=improvements,true%20%7D%20%5D)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=improvements,true%20%7D%20%5D)[120](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=%7D%20%5D%2C%20%22nextCursor%22%3A%20%22next,)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=%7D%20%5D%2C%20%22nextCursor%22%3A%20%22next,)[121](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=,code)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=,code)[122](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=,analyze%20code%20quality%20and%20suggest)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=,analyze%20code%20quality%20and%20suggest)[123](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=,code)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=,code)[124](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=,)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=,)[125](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=,true%20%7D)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=,true%20%7D)[126](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=%7B%20,true%20%7D%20%5D)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=%7B%20,true%20%7D%20%5D)[127](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=Getting%20a%20Prompt)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=Getting%20a%20Prompt)[128](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=,%7D%20%7D)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=,%7D%20%7D)[129](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=Copy)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=Copy)[130](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=,%7D%20%7D%20%5D)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=,%7D%20%7D%20%5D)[131](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=To%20retrieve%20a%20specific%20prompt%2C,Request)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=To%20retrieve%20a%20specific%20prompt%2C,Request)[135](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=List%20Changed%20Notification)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=List%20Changed%20Notification)[136](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#:~:text=)Prompts -
### Model Context Protocol
#### [](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts)[https://modelcontextprotocol.io/specification/2025-06-18/server/prompts](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts)
[](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=,an%20MCP%20server%20using%20OAuth)[114](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=,an%20MCP%20server%20using%20OAuth)[ ](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=,an%20MCP%20server%20using%20OAuth)[115](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=Prompts)[ ](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=Prompts)[132](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=Prompts%20are%20reusable%20chat%20prompt,user%27s%20local%20context%20and%20service)[ ](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=Prompts%20are%20reusable%20chat%20prompt,user%27s%20local%20context%20and%20service)[133](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=name%3A%20completable%28z.string%28%29%2C%20value%20%3D,welcome%20to%20the%20team)[ ](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=name%3A%20completable%28z.string%28%29%2C%20value%20%3D,welcome%20to%20the%20team)[134](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=built,user%27s%20local%20context%20and%20service)[ ](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=built,user%27s%20local%20context%20and%20service)[148](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=Resources)[ ](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=Resources)[149](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=in%20real)[ ](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=in%20real)[203](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=)[ ](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=)[204](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=Image%3A%20Screenshot%20that%20shows%20the,tools%20from%20an%20MCP%20server)[ ](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=Image%3A%20Screenshot%20that%20shows%20the,tools%20from%20an%20MCP%20server)[205](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=To%20provide%20extra%20metadata%20about,you%20can%20use%20tool%20annotations)[ ](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=To%20provide%20extra%20metadata%20about,you%20can%20use%20tool%20annotations)[206](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=%2A%20%60title%60%3A%20Human,only%20tools)[ ](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=%2A%20%60title%60%3A%20Human,only%20tools)[215](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=)[ ](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=)[246](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=)[ ](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=)[249](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=annotations%20modelcontextprotocol)[ ](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=annotations%20modelcontextprotocol)[250](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=%2A%20%60title%60%3A%20Human,only%20tools)[ ](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=%2A%20%60title%60%3A%20Human,only%20tools)[251](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=To%20provide%20extra%20metadata%20about,you%20can%20use%20tool%20annotations)[ ](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=To%20provide%20extra%20metadata%20about,you%20can%20use%20tool%20annotations)[299](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=Authorization)[ ](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=Authorization)[300](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=VS%20Code%20has%20built,Servers%20action%20for%20that%20account)[ ](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=VS%20Code%20has%20built,Servers%20action%20for%20that%20account)[301](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=The%20authorization%20specification%20cleanly%20separates,own%20OAuth%20implementations%20from%20scratch)[ ](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=The%20authorization%20specification%20cleanly%20separates,own%20OAuth%20implementations%20from%20scratch)[313](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=,s)[ ](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=,s)[324](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=Model%20Context%20Protocol%20,AI%20agents%20in%20VS%20Code)[ ](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=Model%20Context%20Protocol%20,AI%20agents%20in%20VS%20Code)[325](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=Important)[ ](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=Important)[326](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=)[ ](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=)[327](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=MCP%20features%20supported%20by%20VS,Code)[ ](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=MCP%20features%20supported%20by%20VS,Code)[328](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=)[ ](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=)[329](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=database%20query%20tool%20could%20ask,for%20the%20database%20table%20name)[ ](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=database%20query%20tool%20could%20ask,for%20the%20database%20table%20name)[330](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=When%20you%20define%20an%20MCP,contain%20text%20or%20binary%20content)
#### [](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=Image%3A%20Screenshot%20that%20shows%20the,MCP%20Resources%20Quick%20Pick)[331](https://code.visualstudio.com/api/extension-guides/ai/mcp#:~:text=Image%3A%20Screenshot%20that%20shows%20the,MCP%20Resources%20Quick%20Pick)MCP developer guide | Visual Studio Code Extension API
#### [](https://code.visualstudio.com/api/extension-guides/ai/mcp)[https://code.visualstudio.com/api/extension-guides/ai/mcp](https://code.visualstudio.com/api/extension-guides/ai/mcp)
[](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=The%20Model%20Context%20Protocol%20,uniquely%20identified%20by%20a%20URI)[139](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=The%20Model%20Context%20Protocol%20,uniquely%20identified%20by%20a%20URI)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=The%20Model%20Context%20Protocol%20,uniquely%20identified%20by%20a%20URI)[140](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=context%20to%20language%20models%2C%20such,uniquely%20identified%20by%20a%20URI)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=context%20to%20language%20models%2C%20such,uniquely%20identified%20by%20a%20URI)[141](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Capabilities)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Capabilities)[142](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=The%20capability%20supports%20two%20optional,features)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=The%20capability%20supports%20two%20optional,features)[143](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=,list%20of%20available%20resources%20changes)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=,list%20of%20available%20resources%20changes)[144](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=,list%20of%20available%20resources%20changes)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=,list%20of%20available%20resources%20changes)[145](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Both%20,support%20neither%2C%20either%2C%20or%20both)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Both%20,support%20neither%2C%20either%2C%20or%20both)[146](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=%7B%20,)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=%7B%20,)[147](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=User%20Interaction%20Model)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=User%20Interaction%20Model)[150](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Listing%20Resources)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Listing%20Resources)[151](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=,value%22%20%7D)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=,value%22%20%7D)[152](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=,rust%22%20%7D)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=,rust%22%20%7D)[153](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=,cursor)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=,cursor)[154](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=%22mimeType%22%3A%20%22text%2Fx,cursor%22)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=%22mimeType%22%3A%20%22text%2Fx,cursor%22)[155](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Resource)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Resource)[156](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=,Optional%20size%20in%20bytes)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=,Optional%20size%20in%20bytes)[157](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Annotations)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Annotations)[158](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=that%20provide%20hints%20to%20clients,use%20or%20display%20the%20resource)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=that%20provide%20hints%20to%20clients,use%20or%20display%20the%20resource)[159](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Reading%20Resources)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Reading%20Resources)[160](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=,%7D)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=,%7D)[161](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=,%7D)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=,%7D)[162](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Resources%20can%20contain%20either%20text,or%20binary%20data)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Resources%20can%20contain%20either%20text,or%20binary%20data)[163](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Binary%20Content)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Binary%20Content)[164](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Resource%20Templates)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Resource%20Templates)[165](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Copy)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Copy)[166](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=,stream%22%20%7D)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=,stream%22%20%7D)[167](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=,12T15%3A00%3A58Z)
[](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Resources%2C%20resource%20templates%20and%20content,use%20or%20display%20the%20resource)[168](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Resources%2C%20resource%20templates%20and%20content,use%20or%20display%20the%20resource)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Resources%2C%20resource%20templates%20and%20content,use%20or%20display%20the%20resource)[169](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=,timestamp%20indicating%20when%20the%20resource)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=,timestamp%20indicating%20when%20the%20resource)[170](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=,timestamp%20indicating%20when%20the%20resource)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=,timestamp%20indicating%20when%20the%20resource)[171](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=resource,12T15%3A00%3A58Z)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=resource,12T15%3A00%3A58Z)[172](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=%7B%20,12T15%3A00%3A58Z)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=%7B%20,12T15%3A00%3A58Z)[173](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=,12T15%3A00%3A58Z%22)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=,12T15%3A00%3A58Z%22)[174](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Subscriptions)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Subscriptions)[175](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=%7B%20,%7D)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=%7B%20,%7D)[176](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=,%7D)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=,%7D)[177](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Update%20Notification%3A)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Update%20Notification%3A)[183](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=List%20Changed%20Notification)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=List%20Changed%20Notification)[184](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=)[187](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Common%20URI%20Schemes)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Common%20URI%20Schemes)[188](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Used%20to%20represent%20a%20resource,resource%20contents%20over%20the%20internet)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Used%20to%20represent%20a%20resource,resource%20contents%20over%20the%20internet)[189](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=https%3A%2F%2F)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=https%3A%2F%2F)[190](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=file%3A%2F%2F)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=file%3A%2F%2F)[191](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=git%3A%2F%2F)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=git%3A%2F%2F)[192](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Custom%20URI%20Schemes)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Custom%20URI%20Schemes)[193](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Error%20Handling)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=Error%20Handling)[194](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=%7B%20,)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=%7B%20,)[335](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#:~:text=,12T15%3A00%3A58Z)Resources - Model
### Context Protocol
#### [](https://modelcontextprotocol.io/specification/2025-06-18/server/resources)[https://modelcontextprotocol.io/specification/2025-06-18/server/resources](https://modelcontextprotocol.io/specification/2025-06-18/server/resources)
[](https://modelcontextprotocol.io/specification/2025-06-18/client/roots#:~:text=Error%20Handling)[195](https://modelcontextprotocol.io/specification/2025-06-18/client/roots#:~:text=Error%20Handling)[ ](https://modelcontextprotocol.io/specification/2025-06-18/client/roots#:~:text=Error%20Handling)[196](https://modelcontextprotocol.io/specification/2025-06-18/client/roots#:~:text=Clients%20SHOULD%20return%20standard%20JSON,errors%20for%20common%20failure%20cases)[ ](https://modelcontextprotocol.io/specification/2025-06-18/client/roots#:~:text=Clients%20SHOULD%20return%20standard%20JSON,errors%20for%20common%20failure%20cases)[302](https://modelcontextprotocol.io/specification/2025-06-18/client/roots#:~:text=The%20Model%20Context%20Protocol%20,notifications%20when%20that%20list%20changes)[ ](https://modelcontextprotocol.io/specification/2025-06-18/client/roots#:~:text=The%20Model%20Context%20Protocol%20,notifications%20when%20that%20list%20changes)[303](https://modelcontextprotocol.io/specification/2025-06-18/client/roots#:~:text=servers%20can%20operate%20within%20the,notifications%20when%20that%20list%20changes)[ ](https://modelcontextprotocol.io/specification/2025-06-18/client/roots#:~:text=servers%20can%20operate%20within%20the,notifications%20when%20that%20list%20changes)[304](https://modelcontextprotocol.io/specification/2025-06-18/client/roots#:~:text=Capabilities)[ ](https://modelcontextprotocol.io/specification/2025-06-18/client/roots#:~:text=Capabilities)[305](https://modelcontextprotocol.io/specification/2025-06-18/client/roots#:~:text=,)[ ](https://modelcontextprotocol.io/specification/2025-06-18/client/roots#:~:text=,)[306](https://modelcontextprotocol.io/specification/2025-06-18/client/roots#:~:text=Listing%20Roots)[ ](https://modelcontextprotocol.io/specification/2025-06-18/client/roots#:~:text=Listing%20Roots)[307](https://modelcontextprotocol.io/specification/2025-06-18/client/roots#:~:text=Copy)[ ](https://modelcontextprotocol.io/specification/2025-06-18/client/roots#:~:text=Copy)[308](https://modelcontextprotocol.io/specification/2025-06-18/client/roots#:~:text=%7B%20,)[ ](https://modelcontextprotocol.io/specification/2025-06-18/client/roots#:~:text=%7B%20,)[309](https://modelcontextprotocol.io/specification/2025-06-18/client/roots#:~:text=Root)[ ](https://modelcontextprotocol.io/specification/2025-06-18/client/roots#:~:text=Root)[310](https://modelcontextprotocol.io/specification/2025-06-18/client/roots#:~:text=Root%20List%20Changes)Roots - Model Context Protocol
#### [](https://modelcontextprotocol.io/specification/2025-06-18/client/roots)[https://modelcontextprotocol.io/specification/2025-06-18/client/roots](https://modelcontextprotocol.io/specification/2025-06-18/client/roots)
[](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=The%20Model%20Context%20Protocol%20,includes%20metadata%20describing%20its%20schema)[197](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=The%20Model%20Context%20Protocol%20,includes%20metadata%20describing%20its%20schema)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=The%20Model%20Context%20Protocol%20,includes%20metadata%20describing%20its%20schema)[198](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Tools%20in%20MCP%20are%20designed,any%20specific%20user%20interaction%20model)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Tools%20in%20MCP%20are%20designed,any%20specific%20user%20interaction%20model)[199](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Capabilities)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Capabilities)[200](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=%7B%20,true%20%7D%20%7D)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=%7B%20,true%20%7D%20%7D)[201](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=itself%20does%20not%20mandate%20any,specific%20user%20interaction%20model)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=itself%20does%20not%20mandate%20any,specific%20user%20interaction%20model)[202](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=For%20trust%20%26%20safety%20and,Applications%20SHOULD)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=For%20trust%20%26%20safety%20and,Applications%20SHOULD)[207](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,)[208](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,%7D%20%7D)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,%7D%20%7D)[209](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,)[210](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,)[211](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,%7D)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,%7D)[212](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,)[213](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,optional%20properties%20describing%20tool%20behavior)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,optional%20properties%20describing%20tool%20behavior)[214](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=%2A%20%60description%60%3A%20Human,optional%20properties%20describing%20tool%20behavior)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=%2A%20%60description%60%3A%20Human,optional%20properties%20describing%20tool%20behavior)[216](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Calling%20Tools)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Calling%20Tools)[217](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,%7D)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,%7D)[218](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,false)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,false)[219](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Tool%20results%20may%20contain%20structured,content%20items%20of%20different%20types)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Tool%20results%20may%20contain%20structured,content%20items%20of%20different%20types)[220](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Text%20Content)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Text%20Content)[221](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=)[222](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,9)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,9)[223](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Image%20Content)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Image%20Content)[224](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,9)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,9)[225](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Audio%20Content)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Audio%20Content)[226](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Resource%20Links)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Resource%20Links)[227](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=%22mimeType%22%3A%20%22text%2Fx,0.9%20%7D)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=%22mimeType%22%3A%20%22text%2Fx,0.9%20%7D)[228](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=to%20help%20clients%20understand%20how,to%20use%20them)
[](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Embedded%20Resources)[229](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Embedded%20Resources)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Embedded%20Resources)[230](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,0.7)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,0.7)[231](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=%7B%20,assistant)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=%7B%20,assistant)[232](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Resources%20%20MAY%20be%20embedded,capability)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Resources%20%20MAY%20be%20embedded,capability)[233](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Structured%20Content)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Structured%20Content)[234](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Structured%20content%20is%20returned%20as,JSON%20in%20a%20TextContent%20block)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Structured%20content%20is%20returned%20as,JSON%20in%20a%20TextContent%20block)[235](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=%7B%20,65)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=%7B%20,65)[236](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=%7D%20%5D%2C%20,65%20%7D%20%7D)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=%7D%20%5D%2C%20,65%20%7D%20%7D)[237](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Output%20Schema)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Output%20Schema)[238](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Copy)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Copy)[239](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Tools%20may%20also%20provide%20an,an%20output%20schema%20is%20provided)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Tools%20may%20also%20provide%20an,an%20output%20schema%20is%20provided)[240](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,structured%20results%20against%20this%20schema)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,structured%20results%20against%20this%20schema)[241](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=an%20output%20schema%20is%20provided%3A)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=an%20output%20schema%20is%20provided%3A)[242](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Providing%20an%20output%20schema%20helps,handle%20structured%20tool%20outputs%20by)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Providing%20an%20output%20schema%20helps,handle%20structured%20tool%20outputs%20by)[243](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,and%20utilize%20the%20returned%20data)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,and%20utilize%20the%20returned%20data)[244](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=List%20Changed%20Notification)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=List%20Changed%20Notification)[245](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=%7B%20,)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=%7B%20,)[252](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,tool%20behavior)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,tool%20behavior)[253](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=1.%20Servers%20MUST%3A%20,malicious%20or%20accidental%20data%20exfiltration)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=1.%20Servers%20MUST%3A%20,malicious%20or%20accidental%20data%20exfiltration)[254](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,)[255](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Example%20tool%20execution%20error%3A)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Example%20tool%20execution%20error%3A)[256](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=%7B%20,)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=%7B%20,)[257](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Security%20Considerations)[ ](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=Security%20Considerations)[258](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#:~:text=,tool%20usage%20for%20audit%20purposes)Tools - Model
### Context Protocol
#### [](https://modelcontextprotocol.io/specification/2025-06-18/server/tools)[https://modelcontextprotocol.io/specification/2025-06-18/server/tools](https://modelcontextprotocol.io/specification/2025-06-18/server/tools)
[](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization#:~:text=Authorization%20Server%20Location)[293](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization#:~:text=Authorization%20Server%20Location)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization#:~:text=Authorization%20Server%20Location)[294](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization#:~:text=following%20the%20guidelines%20specified%20in,responses%20from%20the%20MCP%20server)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization#:~:text=following%20the%20guidelines%20specified%20in,responses%20from%20the%20MCP%20server)[295](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization#:~:text=Roles)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization#:~:text=Roles)[296](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization#:~:text=Overview)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization#:~:text=Overview)[297](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization#:~:text=)[ ](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization#:~:text=)[298](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization#:~:text=Authorization%20is%20OPTIONAL%20for%20MCP,When%20supported)Authorization - Model Context Protocol
#### [](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization)[https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization)
[](https://modelcontextprotocol.io/specification/2025-06-18/client/sampling#:~:text=Creating%20Messages)[314](https://modelcontextprotocol.io/specification/2025-06-18/client/sampling#:~:text=Creating%20Messages)[ ](https://modelcontextprotocol.io/specification/2025-06-18/client/sampling#:~:text=Creating%20Messages)[315](https://modelcontextprotocol.io/specification/2025-06-18/client/sampling#:~:text=,)[ ](https://modelcontextprotocol.io/specification/2025-06-18/client/sampling#:~:text=,)[316](https://modelcontextprotocol.io/specification/2025-06-18/client/sampling#:~:text=User%20Interaction%20Model)[ ](https://modelcontextprotocol.io/specification/2025-06-18/client/sampling#:~:text=User%20Interaction%20Model)[317](https://modelcontextprotocol.io/specification/2025-06-18/client/sampling#:~:text=For%20trust%20%26%20safety%20and,Applications%20SHOULD)Sampling - Model Context Protocol
#### [](https://modelcontextprotocol.io/specification/2025-06-18/client/sampling)[https://modelcontextprotocol.io/specification/2025-06-18/client/sampling](https://modelcontextprotocol.io/specification/2025-06-18/client/sampling)
[](https://modelcontextprotocol.io/specification/2025-06-18/client/elicitation#:~:text=Creating%20Elicitation%20Requests)[318](https://modelcontextprotocol.io/specification/2025-06-18/client/elicitation#:~:text=Creating%20Elicitation%20Requests)[ ](https://modelcontextprotocol.io/specification/2025-06-18/client/elicitation#:~:text=Creating%20Elicitation%20Requests)[319](https://modelcontextprotocol.io/specification/2025-06-18/client/elicitation#:~:text=,)[ ](https://modelcontextprotocol.io/specification/2025-06-18/client/elicitation#:~:text=,)[320](https://modelcontextprotocol.io/specification/2025-06-18/client/elicitation#:~:text=,name)[ ](https://modelcontextprotocol.io/specification/2025-06-18/client/elicitation#:~:text=,name)[321](https://modelcontextprotocol.io/specification/2025-06-18/client/elicitation#:~:text=For%20trust%20%26%20safety%20and,security)[ ](https://modelcontextprotocol.io/specification/2025-06-18/client/elicitation#:~:text=For%20trust%20%26%20safety%20and,security)[322](https://modelcontextprotocol.io/specification/2025-06-18/client/elicitation#:~:text=Reject%20Response%20Example%3A)[ ](https://modelcontextprotocol.io/specification/2025-06-18/client/elicitation#:~:text=Reject%20Response%20Example%3A)[323](https://modelcontextprotocol.io/specification/2025-06-18/client/elicitation#:~:text=%7B%20,%7D)Elicitation - Model Context Protocol
#### [](https://modelcontextprotocol.io/specification/2025-06-18/client/elicitation)[https://modelcontextprotocol.io/specification/2025-06-18/client/elicitation](https://modelcontextprotocol.io/specification/2025-06-18/client/elicitation)
### 37
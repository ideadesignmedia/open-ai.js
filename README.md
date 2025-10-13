# @ideadesignmedia/open-ai.js

TypeScript-first helpers for OpenAI-compatible APIs, a unified multi-provider LLM client, and a fully spec-compliant Model Context Protocol (MCP) server/client toolkit. Ship chat completions, Responses API workflows, vector stores, images, audio, and tools (including MCP bridges) without hunting through docs.

## Table of Contents
- [Installation](#installation)
- [Configuration](#configuration)
- [Quick Start: OpenAI Helpers](#quick-start-openai-helpers)
  - [Chat and Tool Calling](#chat-and-tool-calling)
  - [Streaming Responses](#streaming-responses)
  - [Images, Audio, Files, and Vector Stores](#images-audio-files-and-vector-stores)
  - [Fine-Tuning and Moderation](#fine-tuning-and-moderation)
- [Typing Tool Parameters](#typing-tool-parameters)
- [Working with Alternative Endpoints](#working-with-alternative-endpoints)
- [Unified LLM Client](#unified-llm-client)
  - [Provider Setups](#provider-setups)
  - [Shared Tool Definitions and Model Discovery](#shared-tool-definitions-and-model-discovery)
  - [Custom Fetch / Transport Overrides](#custom-fetch--transport-overrides)
  - [End-to-End Provider Tests](#end-to-end-provider-tests)
- [MCP Server and Client Toolkit](#mcp-server-and-client-toolkit)
  - [Authoring Custom Tools](#authoring-custom-tools)
  - [Transport Options: WebSocket, HTTP, STDIO](#transport-options-websocket-http-stdio)
  - [Bridging LLM Tool Calls to MCP](#bridging-llm-tool-calls-to-mcp)
  - [Brave Search Integration](#brave-search-integration)
- [Testing & Scripts](#testing--scripts)
- [Troubleshooting & Tips](#troubleshooting--tips)

---

## Installation
```bash
# npm
npm install @ideadesignmedia/open-ai.js

# yarn
yarn add @ideadesignmedia/open-ai.js

# pnpm
pnpm add @ideadesignmedia/open-ai.js
```

> `sharp` is bundled for image helpers. Ensure your runtime can load native add-ons (Windows users may need the Visual C++ build tools; Alpine users should install `libvips`).

---

## Configuration

Create `config.json` (or use environment variables) with the keys you need. The library auto-loads `config.json` when you import `"@ideadesignmedia/config.js"` in tests or entry files.

```json
{
  "OPEN_AI_ENDPOINT": "https://api.openai.com",
  "OPEN_AI_API_KEY": "sk-...",
  "OPEN_AI_ORGANIZATION": "",
  "MODEL_ENDPOINT": "https://llama.yourcompany.net",
  "API_KEY": "access-token-for-model-endpoint",
  "BRAVE_API_KEY": "",
  "ANTHROPIC_API_KEY": "",
  "GOOGLE_GEMINI_API_KEY": "",
  "COHERE_API_KEY": "",
  "MISTRAL_API_KEY": ""
}
```

- `OPEN_AI_*` drive the default `OpenAIClient`.
- `MODEL_ENDPOINT` / `API_KEY` are picked up by helpers or tests when you target an alternative deployment.
- Unified providers (`UnifiedLLMClient`) look for their respective keys.
- `BRAVE_API_KEY` lets the MCP test suite spawn the official Brave search server locally.

You can also construct clients manually and supply keys/options in code; the config file is just a convenient default.

---

## Quick Start: OpenAI Helpers

```ts
import OpenAIClient, { Message } from '@ideadesignmedia/open-ai.js'

const openai = new OpenAIClient({
  apiKey: process.env.OPEN_AI_API_KEY,
  organization: process.env.OPEN_AI_ORGANIZATION
})
```

### Chat and Tool Calling

```ts
const weatherTool = {
  type: 'function' as const,
  function: {
    name: 'get_weather',
    description: 'Return the temperature for a city',
    parameters: {
      type: 'object',
      properties: {
        city: { type: 'string', description: 'City name' },
        units: { type: 'string', enum: ['metric', 'imperial'] }
      },
      required: ['city']
    }
  }
}

const response = await openai.chatCompletion(
  [
    Message('You are a weather assistant.', 'system'),
    Message('What is the weather in Paris?', 'user')
  ],
  1,
  undefined,
  {
    model: 'gpt-4o-mini',
    tools: [weatherTool],
    tool_choice: 'auto'
  }
)

const firstChoice = response.choices[0]
if (firstChoice.message.tool_calls?.length) {
  // Call your real tool, then feed the result back with another Message('tool payload', 'tool')
}
```

### Streaming Responses

Use the `ResponseStream` helper for streaming chat completions or the Responses API.

```ts
const stream = await openai.chatCompletionStream(
  [Message('Stream a haiku about MCP.', 'user')],
  1,
  undefined,
  { model: 'gpt-4o-mini' }
)

stream.onData = (delta) => process.stdout.write(delta ?? '')
stream.onError = (err) => console.error('[stream-error]', err)
stream.onComplete = (chunks) => {
  console.log('\nfinished', chunks.join(''))
}
```

Responses API example (structured output + streaming):

```ts
const responseStream = await openai.createResponseStream({
  model: 'gpt-4.1-mini',
  input: [
    { role: 'system', content: 'Return JSON with `summary` and `tags`.' },
    { role: 'user', content: 'Summarise MCP transports.' }
  ],
  response_format: {
    type: 'json_schema',
    json_schema: {
      name: 'brief',
      schema: {
        type: 'object',
        required: ['summary', 'tags'],
        properties: {
          summary: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } }
        }
      }
    }
  }
})

responseStream.onComplete = chunks => {
  const payload = JSON.parse(chunks.join(''))
  console.log(payload.summary, payload.tags)
}
```

### Images, Audio, Files, and Vector Stores

```ts
// Images (uses sharp under the hood)
const image = await openai.generateImage({
  prompt: 'Blueprint of an MCP-compliant server rack',
  size: '512x512'
})

// Text-to-speech
const speech = await openai.generateSpeech({
  model: 'gpt-4o-mini-tts',
  input: 'Welcome to the MCP operations center.'
})

// Whisper transcription
const transcript = await openai.getTranscription({
  file: createReadStream('meeting.mp3'),
  model: 'whisper-1'
})

// Files and vector stores
const file = await openai.uploadFile('knowledge.jsonl', 'fine-tune')
const store = await openai.createVectorStore({ name: 'mcp-knowledge' })
await openai.addFileToVectorStore(store.id, file.id)
const search = await openai.searchVectorStore(store.id, { query: 'tools handshake' })
```

### Fine-Tuning and Moderation

```ts
const job = await openai.createFineTuningJob({
  model: 'gpt-4o-mini',
  training_file: file.id
})

const moderation = await openai.moderation({
  model: 'omni-moderation-latest',
  input: 'Quick MCP status recap'
})

if (moderation.results[0].flagged) {
  console.log('Content needs review')
}
```

---

## Typing Tool Parameters

Use `defineObjectSchema` and `defineFunctionTool` to author JSON Schema payloads that double as TypeScript types.

```ts
import {
  defineFunctionTool,
  defineObjectSchema,
  type InferParams,
  type InferToolArguments
} from '@ideadesignmedia/open-ai.js'

const scheduleParameters = defineObjectSchema({
  type: 'object',
  properties: {
    date: { type: 'string', format: 'date' },
    slot: { type: 'integer', minimum: 0, maximum: 23 },
    reason: { type: 'string' }
  },
  required: ['date', 'slot'],
  additionalProperties: false
} as const)

const scheduleTool = defineFunctionTool({
  type: 'function',
  function: {
    name: 'schedule_incident_review',
    description: 'Book time to discuss an MCP incident',
    parameters: scheduleParameters
  }
} as const)

type ScheduleArguments = InferParams<typeof scheduleParameters>
type ScheduleCall = InferToolArguments<typeof scheduleTool>

const handler = async (args: ScheduleArguments) => ({
  confirmation: `set for ${args.date} ${args.slot}:00`
})
```

The same `scheduleTool` can be passed to chat completions, the Responses API, or registered as an MCP tool handler. Type inference keeps the handler signature aligned with your schema.

---

## Working with Alternative Endpoints

Point `OpenAIClient` at any OpenAI-compatible deployment by supplying `baseURL` and `apiKey` options.

```ts
const alt = new OpenAIClient({
  apiKey: process.env.API_KEY,
  baseURL: process.env.MODEL_ENDPOINT,
  organization: undefined
})

const resp = await alt.completion('Hello alt endpoint', 1, undefined, {
  model: 'llama-3-instruct'
})
```

All helpers (including streaming, images, files, vector stores) reuse the same HTTP client, so overriding once affects every call. Tests such as `tests/openai.integration.test.ts` will also respect `MODEL_ENDPOINT`/`API_KEY` when present.

---

## Unified LLM Client

`UnifiedLLMClient` gives you one interface across OpenAI, Anthropic, Google Gemini, Cohere, and Mistral. Messages, tool definitions, and metadata share a single TypeScript shape so routing logic stays provider agnostic.

```ts
import {
  UnifiedLLMClient,
  type UnifiedChatRequest,
  type UnifiedModelInfo
} from '@ideadesignmedia/open-ai.js'

const baseRequest: UnifiedChatRequest = {
  model: 'gpt-4o-mini',
  messages: [
    { role: 'system', content: 'Reply tersely.' },
    { role: 'user', content: 'Give me an MCP elevator pitch.' }
  ]
}

const openaiClient = new UnifiedLLMClient({
  provider: 'openai',
  apiKey: process.env.OPEN_AI_API_KEY!,
  openai: { organization: process.env.OPEN_AI_ORGANIZATION }
})

const answer = await openaiClient.generateChat(baseRequest)
console.log(answer.content)
```

### Provider Setups

```ts
// Anthropic
const anthropic = new UnifiedLLMClient({
  provider: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY!,
  anthropic: { version: '2023-06-01' }
})
await anthropic.generateChat({
  model: 'claude-3-haiku-20240307',
  messages: [{ role: 'user', content: 'List MCP transports.' }]
})

// Google Gemini
const gemini = new UnifiedLLMClient({
  provider: 'google',
  apiKey: process.env.GOOGLE_GEMINI_API_KEY!
})
await gemini.generateChat({
  model: 'models/gemini-pro',
  messages: [{ role: 'user', content: 'Name a compliant MCP client.' }]
})

// Cohere
const cohere = new UnifiedLLMClient({
  provider: 'cohere',
  apiKey: process.env.COHERE_API_KEY!
})
await cohere.generateChat({
  model: 'command-r',
  messages: [{ role: 'user', content: 'Return a JSON summary of MCP.' }]
})

// Mistral
const mistral = new UnifiedLLMClient({
  provider: 'mistral',
  apiKey: process.env.MISTRAL_API_KEY!
})
await mistral.generateChat({
  model: 'mistral-small-latest',
  messages: [{ role: 'user', content: 'Give one benefit of MCP.' }]
})
```

### Shared Tool Definitions and Model Discovery

All providers accept the same `tools` array if the upstream API supports function calling.

```ts
const tools = [
  {
    name: 'lookup_incident',
    description: 'Fetch incident details',
    parameters: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id']
    }
  }
]

const routed = new UnifiedLLMClient({ provider: 'openai', apiKey: process.env.OPEN_AI_API_KEY! })
const result = await routed.generateChat({
  ...baseRequest,
  tools,
  toolChoice: 'auto'
})

if (routed.supportsStreaming()) {
  const stream = routed.streamChat({ ...baseRequest, model: 'gpt-4o-mini' })
  for await (const chunk of stream) {
    if (chunk.type === 'content') process.stdout.write(chunk.delta)
  }
}

const models: UnifiedModelInfo[] = await routed.listModels()
models.forEach(model => console.log(`${model.provider}: ${model.name}`))
```

### Custom Fetch / Transport Overrides

Every provider accepts an optional `fetch` implementation, headers, or base URL.

```ts
const proxyFetch: typeof fetch = async (input, init) => {
  const next = new Request(String(input), {
    ...init,
    headers: { ...(init?.headers ?? {}), 'X-Debug-Request': 'true' }
  })
  return fetch(next)
}

const custom = new UnifiedLLMClient({
  provider: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY!,
  anthropic: { fetch: proxyFetch, baseURL: 'https://api.anthropic.com/v1' }
})
```

### End-to-End Provider Tests

`tests/unified.llm.test.ts` exercises the `UnifiedLLMClient` against real Anthropic, Google Gemini, Cohere, and Mistral APIs. Provide the corresponding keys (set in `config.json` or environment vars) and run:

```bash
yarn node --require ts-node/register --test tests/unified.llm.test.ts
```

Each sub-test lists models, chooses an accessible candidate, runs a chat request, and logs responses. Failures due to quota/auth produce skips with contextual messages so CI stays informative without hard failing your pipeline.

---

## MCP Server and Client Toolkit

The MCP helpers implement the latest protocol spec (2025-06-18). You can ship servers that expose tools/resources/prompts/models and clients that connect over WebSocket, HTTP long-polling, or STDIO.

### Authoring Custom Tools

```ts
import {
  defineFunctionTool,
  defineObjectSchema,
  McpServer,
  type McpServerOptions
} from '@ideadesignmedia/open-ai.js'

const incidentTool = defineFunctionTool({
  type: 'function',
  function: {
    name: 'get_incident_status',
    description: 'Look up an incident by ticket id',
    parameters: defineObjectSchema({
      type: 'object',
      properties: { ticket: { type: 'string' } },
      required: ['ticket']
    } as const)
  }
} as const)

const server = new McpServer({
  instructions: 'Incident MCP server',
  tools: [
    {
      tool: incidentTool,
      handler: async ({ ticket }) => ({ ticket, status: 'RESOLVED' })
    }
  ],
  resources: [{ id: 'runbook', name: 'Incident runbook' }],
  readResource: async () => 'Always update status channels.',
  prompts: [{ name: 'postmortem', description: 'Generate postmortem template' }],
  getPrompt: async () => ({ text: '# Postmortem\n- Summary\n- Timeline' }),
  models: [{ name: 'playground', description: 'Demo model' }],
  selectModel: (name) => console.log('model selected:', name)
} satisfies McpServerOptions)
```

### Transport Options: WebSocket, HTTP, STDIO

```ts
// WebSocket listener
await server.start({ websocket: { host: '127.0.0.1', port: 3030, path: '/mcp' } })

// HTTP listener
await server.start({ http: { host: '127.0.0.1', port: 3333, path: '/mcp' } })

// STDIO bridge
const clientToServer = new PassThrough()
const serverToClient = new PassThrough()
await server.start({ stdio: { input: clientToServer, output: serverToClient } })

const client = new McpClient({
  transport: 'websocket',
  url: 'ws://127.0.0.1:3030/mcp'
})
await client.connect()
await client.initialize({ clientInfo: { name: 'dashboard', version: '1.2.0' } })
await client.sendInitialized()

const tools = await client.listTools()
const incident = await client.callTool('get_incident_status', { ticket: 'INC-42' })
```

### Bridging LLM Tool Calls to MCP

1. Register your tool schema once (`incidentTool`).
2. Hand it to the LLM via `chatCompletion({ tools: [incidentTool] })`.
3. When the LLM emits a tool call, forward it to the MCP server using `client.callTool(...)`.
4. Send the MCP response back to the LLM as a tool message.

This pattern keeps LLM glue thin, with full MCP logging and transport flexibility.

### Brave Search Integration

If `BRAVE_API_KEY` is set, `tests/mcp.integration.test.ts` will:

1. Allocate a free local port.
2. Spawn `@brave/brave-search-mcp-server` via `npx -y` on STDIO.
3. Bridge STDIO <-> WebSocket so our `McpClient` sees a normal socket.
4. Run a handshake and issue a `search` request.

Run everything with:

```bash
yarn test-mcp
```

If Brave is unavailable the suite logs why and skips gracefully.

---

## Testing & Scripts

- `yarn build` – type-check and emit `dist/`.
- `yarn test-openai` – exhaustive OpenAI helper integration (completions, responses, files, fine-tuning, images, moderation, etc.).
- `yarn test-mcp` – MCP compliance harness + Brave Search integration.
- `node --require ts-node/register --test tests/unified.llm.test.ts` – Unified client tests against Anthropic, Gemini, Cohere, Mistral (skips automatically on auth/quota issues).

Each test file logs rich diagnostics (`[mcp-test]`, `[unified-google]`, etc.) so you can follow handshake and API behavior in CI.

---

## Troubleshooting & Tips

- **401/403 or quota errors:** Most integration tests convert these into skips; inspect the console logs for `HTTP 401`, `quota`, or `billing` messages before re-running.
- **Streaming stalls:** Ensure your environment allows outbound SSE/WebSocket connections; behind strict proxies provide a custom `fetch` implementation.
- **Native builds failing (`sharp`):** Install the prerequisite build toolchain or use prebuilt Docker images.
- **Alt providers missing streaming:** Only the OpenAI provider currently implements `streamChat`; others throw a descriptive error until their APIs expose compatible transports.
- **Brave integration stuck:** Double-check `BRAVE_API_KEY` and ensure `npx` can download `@brave/brave-search-mcp-server`.

Happy building! The project directory includes additional PDFs under `docs/` that detail MCP compliance and cross-provider LLM guidance if you need deeper architectural references.

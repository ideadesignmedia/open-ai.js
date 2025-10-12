# @ideadesignmedia/open-ai.js

Modern helper library for OpenAI-style APIs: chat and text completions, the Responses API, tool calling (including remote MCP), vector stores, fine-tuning, images, Whisper, speech, files, moderation, and more. The helpers stay close to the official REST payloads so you can point the same code at OpenAI's hosted service or a compatible private deployment.

## Table of Contents
- [Features](#features)
- [Installation](#installation)
- [Client Reference](#client-reference)
- [Configuration](#configuration)
- [Importing and Quick Start](#importing-and-quick-start)
- [Working with Multiple Endpoints](#working-with-multiple-endpoints)
- [Testing](#testing)
- [Build Output](#build-output)
- [Troubleshooting](#troubleshooting)

---

## Features
- Typed wrappers around every major OpenAI endpoint, including modern `/v1/responses` and streaming variants.
- Event-driven `ResponseStream` helper for SSE chat/completion streams.
- Image helpers that automatically resize input assets via `sharp`.
- Fine-tuning, vector stores, Whisper transcription/translation, moderation, files, and model catalogue helpers.
- Works against alternative base URLs (for example llama-cpp) by swapping a single configuration value.
- Authored in TypeScript with an exported `index.d.ts` and CommonJS build for drop-in consumption.

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

> **Native dependency:** [`sharp`](https://sharp.pixelplumbing.com/) ships with the package for image helpers. Make sure your environment can compile native extensions (for example on Alpine Linux or Windows).

---

## Client Reference

### Common Helpers

- Message(content, role = 'assistant') -> MessagePayload<T>: builds a typed chat message object without mutating the original array.

- post(path, data) / get(path) / del(path) -> Promise<JsonValue>: direct HTTP helpers returning typed JSON parsed via @ideadesignmedia/helpers.

- postStream(path, payload?) -> Promise<ResponseStream>: opens an SSE stream with the same auth headers as other calls.

- postForm(path, formData, parser) -> Promise<T>: uploads multipart payloads (images, audio) and hands the raw body to your parser.

### Text and Chat Completions

- completion(prompt = '', resultCount = 1, stop?, options = { model: 'gpt-4o-mini-instruct' }) -> Promise<TextCompletionResponse>: wraps `/v1/completions` with `CompletionRequestOptions`.

- completionStream(prompt, resultCount = 1, stop?, options?) -> Promise<ResponseStream>: streaming variant of `completion`; emits token deltas via `ResponseStream`.

- chatCompletion(messages = [], resultCount = 1, stop?, options = { model: 'gpt-4o-mini' }) -> Promise<ChatCompletionResponse>: wraps `/v1/chat/completions`.

- chatCompletionStream(messages = [], resultCount = 1, stop?, options = { model: 'gpt-4o-mini' }) -> Promise<ResponseStream>: streaming chat completions.

Example with function tools:

```ts
import OpenAIClient, { Message, type ChatCompletionsFunctionTool } from '@ideadesignmedia/open-ai.js'

const client = new OpenAIClient({ key: process.env.OPEN_AI_API_KEY! })

const tools: ChatCompletionsFunctionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_weather',
      description: 'Get current weather for a city',
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
]

const reply = await client.chatCompletion(
  [Message('What is the weather in Paris today?', 'user')],
  1,
  undefined,
  {
    model: 'gpt-4o-mini',
    tools,
    tool_choice: 'auto',
    parallel_tool_calls: true
  }
)
```

Typed tool parameters and inference:

```ts
import OpenAIClient, {
  Message,
  defineFunctionTool,
  defineObjectSchema,
  type InferParams,
  type InferToolArguments
} from '@ideadesignmedia/open-ai.js'

const bookAppointmentParameters = defineObjectSchema({
  type: 'object',
  properties: {
    timeslot: { type: 'integer', description: '24h hour (e.g. 16 for 4 PM)' },
    Date: { type: 'string', description: 'today | tomorrow | YYYY-MM-DD' },
    name_of_doctor: { type: 'string', description: 'Normalized doctor name (e.g. "smith")' }
  },
  required: ['timeslot', 'Date', 'name_of_doctor'],
  additionalProperties: false
} as const)

const bookAppointmentTool = defineFunctionTool({
  type: 'function',
  function: {
    name: 'get_time_date_doctor_book_appointement',
    description: 'Fix an appointment with a doctor for a given date and time',
    parameters: bookAppointmentParameters
  }
} as const)

type BookAppointmentArgs = InferParams<typeof bookAppointmentParameters>
type BookAppointmentCallArgs = InferToolArguments<typeof bookAppointmentTool>

const tools = [bookAppointmentTool] as const

const client = new OpenAIClient({ key: process.env.OPEN_AI_API_KEY! })
const reply = await client.chatCompletion(
  [Message('Book an appointment with Dr Smith for tomorrow at 4 PM', 'user')],
  1,
  undefined,
  {
    model: 'gpt-4o-mini',
    tools,
    tool_choice: { type: 'function', function: { name: bookAppointmentTool.function.name } }
  }
)

for (const choice of reply.choices) {
  for (const tc of choice.message.tool_calls ?? []) {
    if (tc.function.name === bookAppointmentTool.function.name) {
      const args = JSON.parse(tc.function.arguments) as BookAppointmentCallArgs
      // args.timeslot -> number, args.Date -> string, args.name_of_doctor -> string
    }
  }
}
```

### Responses API

- createResponse(params: ResponseCreateParams) -> Promise<ResponseObject>: calls `/v1/responses`.

- createResponseStream(params: ResponseCreateParams) -> Promise<ResponseStream>: streaming Responses API helper.

- getResponse(id) -> Promise<ResponseObject>: fetches a stored response.

- cancelResponse(id) -> Promise<ResponseObject>: cancels a background response job.

### Audio

- generateSpeech(input, voice = 'nova', options = { model: 'tts-1', responseFormat: 'mp3', speed: 1 }) -> Promise<AudioSpeechResponse>: text-to-speech helper.

- getTranscription<TFormat extends WhisperResponseFormat = 'json'>(file, prompt?, language?, responseFormat?, temperature = 0) -> Promise<WhisperTranscriptionResult<TFormat>>: uploads audio to `/v1/audio/transcriptions`.

- getTranslation<TFormat extends WhisperResponseFormat = 'json'>(file, prompt?, responseFormat?, temperature = 0) -> Promise<WhisperTranscriptionResult<TFormat>>: translates audio via `/v1/audio/translations`.

### Images

- generateImage(prompt, resultCount = 1, size = 0, responseFormat = 'url', user?) -> Promise<ImageResponse>: wraps `/v1/images/generations`.

- editImage(imagePath, prompt, mask?, resultCount = 1, size = 0, responseFormat = 'url', user?) -> Promise<ImageResponse>: resizes assets with `sharp` before calling `/v1/images/edits`.

- getImageVariations(imagePath, resultCount = 1, size = 0, responseFormat = 'url', user?) -> Promise<ImageResponse>: variation helper.

### Embeddings

- getEmbedding(input, model = 'text-embedding-3-small', user?) -> Promise<EmbeddingResponse>: wraps `/v1/embeddings`.

### Files

- uploadFile(path, purpose = 'fine-tune') -> Promise<FileObject>: multipart upload helper.

- getFiles() -> Promise<FileListResponse>: lists uploaded files.

- getFile(id) -> Promise<FileObject>: retrieves metadata.

- getFileContent(id) -> Promise<string>: returns decoded text for `/content`.

- deleteFile(id) -> Promise<DeleteResponse>: deletes uploaded content.

### Vector Stores

- createVectorStore(name?, metadata?) -> Promise<VectorStore>: creates a store.

- addFileToVectorStore(storeId, fileId, attributes = {}) -> Promise<VectorStoreFileAssociation>: attaches a file.

- searchVectorStore(storeId, query, options?) -> Promise<VectorStoreSearchResponse>: semantic search helper.

- getVectorStore(storeId) -> Promise<VectorStore>: fetches detail.

- deleteVectorStore(storeId) -> Promise<VectorStoreDeletion>: deletes a store.

### Fine-tuning

- listFineTuningJobs() -> Promise<ListResponse<FineTuningJob>>: wraps `/v1/fine_tuning/jobs`.

- createFineTuningJob(payload) -> Promise<FineTuningJob>: starts a job.

- retrieveFineTuningJob(id) -> Promise<FineTuningJob>: fetches job status.

- cancelFineTuningJob(id) -> Promise<FineTuningJob>: cancels a running job.

- listFineTuningJobEvents(id) -> Promise<ListResponse<FineTuningJobEvent>>: event stream.

- listFineTuningJobCheckpoints(id) -> Promise<ListResponse<FineTuningJobCheckpoint>>: retrieves checkpoints.

### Moderation

- moderation(input, model = 'text-moderation-latest') -> Promise<ModerationResponse>: wraps `/v1/moderations`.

### Models

- getModels() -> Promise<ListResponse<ModelInfo>>: lists available models.

- getModel(modelId) -> Promise<ModelInfo>: fetches a single model description.

### ResponseStream basics

- ResponseStream exposes `onData`, `onComplete`, and `onError` callbacks along with an `EventEmitter` for streaming completions. Each chunk is an array of string deltas; `onComplete` receives the concatenated output when the stream finishes.

## Configuration

The v2 release introduces an instantiated client so you can bind helpers to a specific endpoint + credential set. Configuration still honours environment variables and the optional `@ideadesignmedia/arguments.js` CLI shim, but you pass the settings explicitly when you construct the client.

```ts
import OpenAIClient from '@ideadesignmedia/open-ai.js'

const openAI = new OpenAIClient({
  host: 'https://api.openai.com',
  key: process.env.OPEN_AI_API_KEY!,
  organization: process.env.OPEN_AI_ORGANIZATION
})
```

`OpenAIClientConfig` accepts three fields today:

- `host` - base URL (defaults to `process.env.OPEN_AI_ENDPOINT` or `https://api.openai.com`).
- `key` - bearer token used for every request. Required unless it can be resolved from `OPEN_AI_SECRET`/`OPEN_AI_API_KEY` via env/arguments.
- `organization` - optional organization header for multi-tenant OpenAI accounts.

Any property you omit falls back to environment variables or the `@ideadesignmedia/arguments.js` module, so existing deployments that rely on env-only configuration keep working.

The integration tests still use a JSON file so they can run against two different backends in a single pass.

```jsonc
// config-sample.json
{
  "OPEN_AI_ENDPOINT": "https://api.openai.com",
  "OPEN_AI_API_KEY": "sk-...",
  "OPEN_AI_ORGANIZATION": "org-...",
  "MODEL_ENDPOINT": "https://my-private-endpoint/v1",
  "API_KEY": "priv-..."
}
```

Copy the sample to `config.json` (ignored by Git and npm) and populate whichever credentials you use:

- `OPEN_AI_*` values drive the client you instantiate for OpenAI's hosted platform.
- `MODEL_ENDPOINT` / `API_KEY` describe an optional private deployment. If both are set, the test suite automatically exercises every helper against **both** backends in a single pass.

You can still override values at runtime with environment variables if you prefer not to hardcode secrets:

```bash
export OPEN_AI_ENDPOINT="https://api.openai.com"
export OPEN_AI_API_KEY="sk-your-hosted-key"
export MODEL_ENDPOINT="https://llama.example.com/v1"
export API_KEY="priv-your-private-key"
```

Missing `key` values (after fallbacks) throw immediately during client construction.

## Importing and Quick Start

### TypeScript / ES modules

```ts
import OpenAIClient, { Message } from '@ideadesignmedia/open-ai.js'

const client = new OpenAIClient({
  key: process.env.OPEN_AI_API_KEY!,
  organization: process.env.OPEN_AI_ORGANIZATION
})

const reply = await client.chatCompletion([
  Message('Hello!', 'user')
])

console.log(reply.choices?.[0]?.message?.content)
```

All helpers are exposed as methods on the instance (`client.completion`, `client.createResponseStream`, `client.generateImage`, ...). The `Message` factory remains exported separately for convenience, and is also available as `client.Message` if you prefer instance-only access.

### CommonJS

```js
const OpenAIClient = require('@ideadesignmedia/open-ai.js').default
const { Message } = require('@ideadesignmedia/open-ai.js')

async function main() {
  const client = new OpenAIClient({ key: process.env.OPEN_AI_API_KEY })
  const reply = await client.chatCompletion([Message('Hello!', 'user')])
  console.log(reply.choices?.[0]?.message?.content)
}

main().catch(console.error)
```

You can instantiate as many clients as you need - each one keeps its own host/key combo so concurrent requests to different providers stay isolated.

## Working with Multiple Endpoints

Create one `OpenAIClient` per backend and call the same helpers through each instance:

```ts
import OpenAIClient, { Message } from '@ideadesignmedia/open-ai.js'

const hosted = new OpenAIClient({
  key: process.env.OPEN_AI_API_KEY!,
  organization: process.env.OPEN_AI_ORGANIZATION
})

const privateDeployment = new OpenAIClient({
  host: process.env.MODEL_ENDPOINT!,
  key: process.env.API_KEY!
})

const prompt = [Message('Summarise the latest release notes', 'user')]

const hostedReply = await hosted.chatCompletion(prompt)
const privateReply = await privateDeployment.chatCompletion(prompt)
```

Because each client caches its own resolved configuration you can run these calls in parallel without mutating global state. The integration tests take the same approach: they load credentials from `config.json`, instantiate two clients, and run every helper against both targets.

## Testing

The integration suite exercises every helper against each configured backend. With `config.json` populated it runs once against OpenAI's hosted API and once against your private endpoint.

```bash

# Run all stages (~3 minutes when both endpoints are available)

yarn test

# Focus on a single stage and target

yarn test -- --test-name-pattern "private: Image helpers"

```

Each sub-test logs `[INFO]`, `[PASS]`, or `[SKIP]` diagnostics so you can see which features are supported by the private deployment. When an API is unavailable (for example moderation on a private model), the diagnostic is recorded without failing the run.

---

## Build Output

The package ships transpiled CommonJS in `dist/index.js` and auto-generated declaration files (with all JSDoc preserved). Build locally with:

```bash
yarn build
```

`dist/index.js` and `dist/index.d.ts` are tracked so consumers installing from GitHub receive the compiled JavaScript and typings.

---

## Troubleshooting

- **`OPEN_AI_API_KEY` missing** - set `OPEN_AI_API_KEY` (or `OPEN_AI_SECRET`) before importing the helpers.

- **Deprecation warning for `util.isArray`** - the entrypoint replaces Node's deprecated helper; ensure you are using the exported module rather than bundling a local copy of `form-data` first.

- **Streaming never completes** - confirm the target endpoint actually emits SSE responses and that intermediaries (CDNs, proxies) are not buffering them.

- **Image helpers fail on private endpoints** - some deployments only implement a subset of the OpenAI API surface; check your provider's documentation for supported routes.

If you spot a drift between these helpers and the latest OpenAI payloads, open an issue with the sample JSON payload so we can keep things in sync.

### MCP Server & Client

```ts
import {
  defineFunctionTool,
  defineObjectSchema,
  McpServer,
  McpClient,
  type McpServerOptions
} from '@ideadesignmedia/open-ai.js'

const weatherTool = defineFunctionTool({
  type: 'function',
  function: {
    name: 'get_weather',
    description: 'Return the current temperature for a city',
    parameters: defineObjectSchema({
      type: 'object',
      properties: {
        city: { type: 'string', description: 'City to query' }
      },
      required: ['city']
    } as const)
  }
} as const)

const server = new McpServer({
  port: 3030,
  tools: [
    {
      tool: weatherTool,
      handler: async ({ city }) => ({ city, temperatureC: 22 })
    }
  ]
} satisfies McpServerOptions)

await server.start()

const client = new McpClient({ url: 'ws://localhost:3030/mcp' })
await client.connect()

const availableTools = await client.listTools()
const weather = await client.callTool('get_weather', { city: 'Paris' })
```

You can hand the same `weatherTool` definition to `chatCompletion({ tools: [weatherTool] })`, wire the tool handler into `McpServer`, and forward tool calls/responses between the LLM and your hosted MCP tool. The server now supports all three transports defined in the 2025-06-18 MCP spec: set `transports` to any combination of `['websocket', 'http', 'stdio']` and provide optional `stdio` streams when you want to run over pipes.

On the client side, pass `transport: 'websocket' | 'http' | 'stdio'` to `new McpClient(...)` (with either a URL or STDIO stream/command). The helper automatically negotiates `protocolVersion: '2025-06-18'`, sends the follow-up `initialized` notification via `client.sendInitialized()`, and keeps the HTTP `MCP-Protocol-Version` header in sync.

### Brave MCP

To exercise the Brave Search MCP helpers locally:

1. Export your Brave API key.
2. Run the official MCP server:
   ```bash
   BRAVE_API_KEY=sk-... npx -y @brave/brave-search-mcp-server
   ```
3. Point the tests/client at the instance:
   ```bash
   export MCP_BRAVE_WS_URL="ws://127.0.0.1:3333/ws"
   yarn test-mcp
   ```

If `MCP_BRAVE_WS_URL` is not set (or the endpoint is unreachable) the Brave portions of the tests automatically skip.

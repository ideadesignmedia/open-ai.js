# @ideadesignmedia/open-ai.js

TypeScript-first helpers for OpenAI-compatible APIs, a unified multi-provider LLM client, and a Model Context Protocol (MCP) server and client toolkit. One ergonomic, strongly typed surface for chat, Responses API, tools, vector stores, images, audio, files, moderation, embeddings, and models.

## Installation

```bash
# npm
npm install @ideadesignmedia/open-ai.js

# yarn
yarn add @ideadesignmedia/open-ai.js

# pnpm
pnpm add @ideadesignmedia/open-ai.js
```

Node 18+ is recommended for global `fetch` and `FormData`. If you use image helpers at runtime, ensure your environment supports native addons such as `sharp`.

## Importing

ESM:

```ts
import OpenAIClient, {
  Message,
  McpServer,
  McpClient,
  UnifiedLLMClient,
  defineFunctionTool,
  defineObjectSchema
} from '@ideadesignmedia/open-ai.js'
```

The package provides a native ESM entry so named imports work in Node ESM without extra flags. TypeScript consumers get accurate types from the bundled declarations.

CommonJS:

```js
const OpenAIClient = require('@ideadesignmedia/open-ai.js')
const {
  Message,
  McpServer,
  McpClient,
  UnifiedLLMClient,
  defineFunctionTool,
  defineObjectSchema
} = require('@ideadesignmedia/open-ai.js')
```

Using CommonJS, `require('@ideadesignmedia/open-ai.js')` returns an object that includes all named exports and a `default` (the `OpenAIClient` class). Both styles work regardless of your TS module settings.

---

## Quick start: OpenAI helpers

### Chat and tool calling

```ts
import OpenAIClient, { Message } from '@ideadesignmedia/open-ai.js'

const openai = new OpenAIClient({
  key: process.env.OPEN_AI_API_KEY!,
  organization: process.env.OPEN_AI_ORGANIZATION
})

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
      required: ['city'],
      additionalProperties: false
    }
  }
}

const completion = await openai.chatCompletion(
  [
    Message('You are a helpful assistant.', 'system'),
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

const first = completion.choices[0]
if (first.message.tool_calls?.length) {
  // Step 1: read the requested tool + args
  const call = first.message.tool_calls[0]
  const args = JSON.parse(call.function.arguments)

  // Step 2: run your actual function
  const result = await get_weather(args)

  // Step 3: send follow-up with assistant tool_calls and tool result
  const followUp = await openai.chatCompletion(
    [
      Message('You are a helpful assistant.', 'system'),
      Message('What is the weather in Paris?', 'user'),
      // Assistant message must include tool_calls it requested
      { role: 'assistant', content: null, tool_calls: first.message.tool_calls },
      // Tool message must include tool_call_id of the call you are answering
      { role: 'tool', content: JSON.stringify(result), tool_call_id: call.id }
    ],
    1,
    undefined,
    { model: 'gpt-4o-mini', tools: [weatherTool], tool_choice: 'none' }
  )
  console.log(followUp.choices[0]?.message?.content)
}
```

### Streaming chat

```ts
const stream = await openai.chatCompletionStream(
  [Message('Write one short line about MCP.', 'user')],
  1,
  undefined,
  { model: 'gpt-4o-mini' }
)

stream.onData = (delta) => process.stdout.write(delta ?? '')
stream.onError = (err) => console.error('stream error:', err)
stream.onComplete = () => process.stdout.write('\n')
```

### Images, audio, files, vector stores

```ts
// Image generation
// Args: (prompt: string, resultCount = 1, size: 0|1|2, responseFormat: 'url'|'b64_json'|'file')
// Size aliases: 0 => 256x256, 1 => 512x512, 2 => 1024x1024
const image = await openai.generateImage('Blueprint of a minimal MCP architecture', 1, 1)

// Text to speech
// generateSpeech(input, voice = 'nova', { model = 'tts-1', responseFormat = 'mp3', speed = 1.0 })
const speech = await openai.generateSpeech('Welcome to the control room.', 'nova', { model: 'tts-1', responseFormat: 'mp3' })

// Whisper transcription
// getTranscription(filePath, prompt?, language?, responseFormat?, temperature?)
const transcript = await openai.getTranscription('meeting.mp3')

// Files and vector stores
const file = await openai.uploadFile('knowledge.jsonl', 'fine-tune')
const store = await openai.createVectorStore('docs')
await openai.addFileToVectorStore(store.id, file.id)
const search = await openai.searchVectorStore(store.id, 'handshake')
```

### Moderation, embeddings, models, fine-tuning

```ts
const moderation = await openai.moderation('Check this text', 'omni-moderation-latest')

const embedding = await openai.getEmbedding('Vector me', 'text-embedding-3-small')

const models = await openai.getModels()

const job = await openai.createFineTuningJob({
  model: 'gpt-4o-mini',
  training_file: file.id
})
```

### Alternative endpoints

Point the client to any OpenAI-compatible base URL.

```ts
const alt = new OpenAIClient({
  key: process.env.ALT_KEY!,
  host: 'https://my-compat-endpoint/v1'
})

const r = await alt.completion('hello', 1, undefined, { model: 'llama-3-instruct' })
```

---

## API Cheat Sheet

Primary helpers with call signatures (Promises unless noted):

- Chat
  - `Message(content, role = 'assistant', tool_calls?)`
  - `chatCompletion(messages, resultCount = 1, stop?, { model = 'gpt-4o-mini', tools?, tool_choice?, temperature?, ... })`
  - `chatCompletionStream(messages, resultCount = 1, stop?, { model = 'gpt-4o-mini', tools?, tool_choice?, ... })` → `ResponseStream`

- Text Completions
  - `completion(prompt = '', resultCount = 1, stop?, { model = 'gpt-4o-mini-instruct', temperature?, ... })`
  - `completionStream(prompt, resultCount = 1, stop?, { model = 'gpt-4o-mini-instruct', ... })` → `ResponseStream`

- Responses API
  - `createResponse({ model, input, metadata? })`
  - `createResponseStream({ model, input, metadata? })` → `ResponseStream`
  - `getResponse(id)`
  - `cancelResponse(id)`

- Images
  - `generateImage(prompt, resultCount = 1, size: 0|1|2 = 0, responseFormat: 'url'|'b64_json'|'file' = 'url', user?)`
  - `editImage(imagePath, prompt, mask?, resultCount = 1, size: 0|1|2 = 0, responseFormat = 'url', user?)`
  - `getImageVariations(imagePath, resultCount = 1, size: 0|1|2 = 0, responseFormat = 'url', user?)`

- Audio
  - `generateSpeech(input, voice = 'nova', { model = 'tts-1', responseFormat = 'mp3', speed = 1.0 })`
  - `getTranscription(filePath, prompt?, language = 'en', responseFormat?, temperature = 0)`
  - `getTranslation(filePath, prompt?, responseFormat?, temperature = 0)`

- Files
  - `getFiles()`
  - `getFile(id)`
  - `getFileContent(id)`
  - `uploadFile(filePath, purpose = 'fine-tune')`
  - `deleteFile(id)`

- Vector Stores
  - `createVectorStore(name?, metadata?)`
  - `getVectorStore(id)`
  - `deleteVectorStore(id)`
  - `addFileToVectorStore(vectorStoreId, fileId, attributes = {})`
  - `searchVectorStore(vectorStoreId, query, { filters?, maxNumResults = 10, rewriteQuery = false })`

- Moderation
  - `moderation(input: string | string[], model = 'text-moderation-latest')`

- Embeddings
  - `getEmbedding(input: string | string[], model = 'text-embedding-3-small', user?)`

- Models
  - `getModels()`
  - `getModel(id)`

- Fine-tuning
  - `createFineTuningJob({ model, training_file, ... })`
  - `retrieveFineTuningJob(id)`
  - `listFineTuningJobs()`
  - `cancelFineTuningJob(id)`
  - `listFineTuningJobEvents(id)`
  - `listFineTuningJobCheckpoints(id)`

Notes
- Image size aliases: `0` → `256x256`, `1` → `512x512`, `2` → `1024x1024`.
- Tool calls: include the assistant message with `tool_calls` and one or more `tool` messages with matching `tool_call_id` on the follow-up request.

---

## Type-safe tool schemas

Author a JSON Schema once and reuse it for LLM tool calling and MCP.

```ts
import {
  defineFunctionTool,
  defineObjectSchema,
  type InferParams,
  type InferToolArguments
} from '@ideadesignmedia/open-ai.js'

const scheduleParams = defineObjectSchema({
  type: 'object',
  properties: {
    date: { type: 'string', format: 'date' },
    hour: { type: 'integer', minimum: 0, maximum: 23 },
    reason: { type: 'string' }
  },
  required: ['date', 'hour'],
  additionalProperties: false
} as const)

export const scheduleTool = defineFunctionTool({
  type: 'function',
  function: {
    name: 'schedule_incident_review',
    description: 'Book a review slot',
    parameters: scheduleParams
  }
} as const)

type ScheduleArgs = InferParams<typeof scheduleParams>
type ScheduleCall = InferToolArguments<typeof scheduleTool>
```

---

## UnifiedLLMClient

One interface across providers. Keep your message shape and tools and just swap providers.

```ts
import { UnifiedLLMClient } from '@ideadesignmedia/open-ai.js'

const client = new UnifiedLLMClient({
  provider: 'openai',
  apiKey: process.env.OPEN_AI_API_KEY!
})

const answer = await client.generateChat({
  model: 'gpt-4o-mini',
  messages: [
    { role: 'system', content: 'Be terse.' },
    { role: 'user', content: 'Explain MCP in one line.' }
  ],
  tools: [
    {
      name: 'lookup_doc',
      description: 'Look up a document',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id']
      }
    }
  ],
  toolChoice: 'auto'
})

console.log(answer.content)

if (client.supportsStreaming()) {
  for await (const chunk of client.streamChat({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: 'Stream one sentence' }]
  })) {
    if (chunk.type === 'content') process.stdout.write(chunk.delta)
  }
}
```

To use other providers, instantiate with `provider: 'anthropic' | 'google' | 'cohere' | 'mistral'` and the matching API key. You can also override transport with a custom `fetch` function if needed.

---

## MCP toolkit

Build MCP servers that expose tools, resources, prompts, and models. Connect with MCP clients over WebSocket, HTTP, or stdio.

### Define tools and start a server

```ts
import {
  McpServer,
  defineFunctionTool,
  defineObjectSchema
} from '@ideadesignmedia/open-ai.js'

const getIncident = defineFunctionTool({
  type: 'function',
  function: {
    name: 'get_incident_status',
    description: 'Fetch incident by ticket id',
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
      tool: getIncident,
      handler: async ({ ticket }) => ({ ticket, status: 'RESOLVED' })
    }
  ],
  resources: [{ id: 'runbook', name: 'Incident runbook' }],
  readResource: async () => 'Always update status channels.',
  prompts: [{ name: 'postmortem', description: 'Postmortem template' }],
  getPrompt: async () => ({ text: '# Postmortem\n- Summary\n- Timeline' }),
  models: [{ name: 'playground', description: 'Demo model' }],
  selectModel: (name) => console.log('selected model:', name),

  // If your server implementation supports configuring transports in the constructor,
  // include them here. Otherwise, configure them according to your host's expectations.
  // Example fields that some hosts use: transports, port, path
  // transports: ['websocket'], port: 3030, path: '/mcp'
})

// Start the server
await server.start()
```

### Connect with an MCP client

```ts
import { McpClient } from '@ideadesignmedia/open-ai.js'

const client = new McpClient({
  transport: 'websocket',
  url: 'ws://127.0.0.1:3030/mcp'
})

await client.connect()
await client.initialize({ clientInfo: { name: 'dashboard', version: '1.0.0' } })
await client.sendInitialized()

const tools = await client.listTools()
const status = await client.callTool('get_incident_status', { ticket: 'INC-42' })
console.log(status)
```

### Bridging LLM tool calls to MCP

You can reuse the same tool schema for LLM tool-calls and for MCP. Typical loop:

- Send your `tools` to the LLM via `chatCompletion`.
- If the assistant returns `message.tool_calls`, forward each call to your MCP server via `McpClient.callTool`.
- Push two messages to the next `chatCompletion` request:
  - `{ role: 'assistant', content: null, tool_calls: [...] }`
  - `{ role: 'tool', content: JSON.stringify(result), tool_call_id: <matching id> }`
  - Repeat for multiple calls if `parallel_tool_calls` is enabled.

---

## Exports and capabilities

**Default export: `OpenAIClient`**

- Chat: `chatCompletion`, `chatCompletionStream`, helper `Message`
- Responses API: `createResponse`, `createResponseStream`, `getResponse`, `cancelResponse`
- Images: `generateImage`, `editImage`, `getImageVariations`
- Audio: `generateSpeech`, `getTranscription`, `getTranslation`
- Files: `uploadFile`, `getFiles`, `getFile`, `getFileContent`, `deleteFile`
- Vector stores: `createVectorStore`, `addFileToVectorStore`, `searchVectorStore`, `getVectorStore`, `deleteVectorStore`
- Embeddings: `getEmbedding`
- Moderation: `moderation`
- Models: `getModels`, `getModel`
- Fine-tuning: `createFineTuningJob`, `listFineTuningJobs`, `retrieveFineTuningJob`, `cancelFineTuningJob`, `listFineTuningJobEvents`, `listFineTuningJobCheckpoints`

**Named exports**

- `UnifiedLLMClient` with `generateChat`, `streamChat`, `listModels`
- `McpServer`, `McpClient`
- Tool helpers: `defineFunctionTool`, `defineObjectSchema`, plus types like `InferParams`, `InferToolArguments`

---

## Troubleshooting

- Authentication/quota
  - Verify key validity and project/model access.
  - Common API errors include `invalid_api_key`, `insufficient_quota`, or `model_not_found`.

- Tool calling
  - Some models may return `finish_reason: 'stop'` even when `message.tool_calls` is present; rely on `message.tool_calls`.
  - On the second turn, include both: `{ role: 'assistant', content: null, tool_calls }` and `{ role: 'tool', content, tool_call_id }`, and set `tool_choice: 'none'`.

- Streaming/network
  - If behind strict proxies, ensure SSE/WebSockets are allowed, or route through a proxy that supports them.
  - With the unified client providers, you can supply a custom `fetch` when needed.

- Images and native deps
  - `sharp` requires platform toolchains; if unavailable, avoid image helpers or install prerequisites for your OS.

- ESM/CommonJS
  - ESM: `import { McpServer, McpClient, Message } from '@ideadesignmedia/open-ai.js'`.
  - CommonJS: `const { McpServer, McpClient, Message } = require('@ideadesignmedia/open-ai.js')`.
  - Both module styles are supported without additional bundler configuration.

---

## License

See the repository license file.

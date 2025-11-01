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
  // call get_weather(...)
  // push another Message(JSON.stringify(result), 'tool') and call chatCompletion again
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
const image = await openai.generateImage({
  prompt: 'Blueprint of a minimal MCP architecture',
  size: '512x512'
})

// Text to speech
const speech = await openai.generateSpeech({
  model: 'gpt-4o-mini-tts',
  input: 'Welcome to the control room.'
})

// Whisper transcription
import { createReadStream } from 'node:fs'
const transcript = await openai.getTranscription({
  file: createReadStream('meeting.mp3'),
  model: 'whisper-1'
})

// Files and vector stores
const file = await openai.uploadFile('knowledge.jsonl', 'fine-tune')
const store = await openai.createVectorStore({ name: 'docs' })
await openai.addFileToVectorStore(store.id, file.id)
const search = await openai.searchVectorStore(store.id, { query: 'handshake' })
```

### Moderation, embeddings, models, fine-tuning

```ts
const moderation = await openai.moderation({
  model: 'omni-moderation-latest',
  input: 'Check this text'
})

const embedding = await openai.getEmbedding({
  model: 'text-embedding-3-small',
  input: 'Vector me'
})

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

You can pass the same tool schema to an LLM for tool-calling and also register it with your MCP server. When the LLM returns a tool call, forward it to the MCP server and send the result back as a tool message.

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

- Authentication or quota errors: verify API key and model access
- Streaming behind strict proxies: provide a custom `fetch` or allow SSE and WebSocket
- Image helper build issues on some OS images: ensure toolchains for `sharp` if needed

---

## License

See the repository license file.

# @ideadesignmedia/open-ai.js

Modern helper library for OpenAI-style APIs – chat and text completions, the Responses API, tool calling (including remote MCP), vector stores, fine-tuning, images, Whisper, speech, files, moderation, and more. The helpers stay close to the official REST payloads so you can point the same code at OpenAI’s hosted service or a compatible private deployment.

## Table of Contents
- [Features](#features)
- [Installation](#installation)
- [Configuration](#configuration)
- [Importing and Quick Start](#importing-and-quick-start)
- [Working with Multiple Endpoints](#working-with-multiple-endpoints)
- [Testing](#testing)
- [Build Output](#build-output)
- [Troubleshooting](#troubleshooting)

---

## Features
- Typed wrappers around every major OpenAI endpoint, including modern /v1/responses and streaming variants.
- Event-driven ResponseStream helper for SSE chat/completion streams.
- Image helpers that automatically resize input assets via sharp.
- Fine-tuning, vector stores, Whisper transcription/translation, moderation, files, and model catalogue helpers.
- Works against alternative base URLs (e.g. llama-cpp) by swapping a single configuration value.
- Authored in TypeScript with an exported index.d.ts and CommonJS build for drop-in consumption.

---

## Installation

`ash
# npm
npm install @ideadesignmedia/open-ai.js
# yarn
yarn add @ideadesignmedia/open-ai.js
# pnpm
pnpm add @ideadesignmedia/open-ai.js
`

> **Native dependency:** [sharp](https://sharp.pixelplumbing.com/) ships with the package for image helpers. Make sure your environment can compile native extensions (for example on Alpine Linux or Windows).

---

## Configuration

The library honours both environment variables and the optional @ideadesignmedia/arguments.js CLI shim. The integration tests use a JSON file so they can run against two different backends in a single pass.

`jsonc
// config-sample.json
{
  "OPEN_AI_ENDPOINT": "https://api.openai.com",
  "OPEN_AI_API_KEY": "sk-...",
  "OPEN_AI_ORGANIZATION": "org-...",
  "MODEL_ENDPOINT": "https://my-private-endpoint/v1",
  "API_KEY": "priv-..."
}
`

Copy the sample to config.json (the file is ignored by Git and npm) and populate whichever credentials you use:

- OPEN_AI_* values drive requests to OpenAI’s hosted platform.
- MODEL_ENDPOINT / API_KEY describe an optional private deployment. If both are set, the test suite automatically exercises every helper against **both** backends in a single pass.

At runtime you can still override any value with process environment variables:

`ash
export OPEN_AI_ENDPOINT="https://api.openai.com"
export OPEN_AI_API_KEY="sk-your-hosted-key"
export MODEL_ENDPOINT="https://llama.example.com/v1"
export API_KEY="priv-your-private-key"
`

If OPEN_AI_API_KEY (or OPEN_AI_SECRET) is missing, the helpers throw as soon as you make a request.

---

## Importing and Quick Start

### TypeScript / ES modules
`	s
import openAI, { Message, chatCompletion } from '@ideadesignmedia/open-ai.js'

const reply = await chatCompletion([
  Message('Hello!', 'user')
])

console.log(reply.choices?.[0]?.message?.content)
`

### CommonJS
`js
const { chatCompletion, Message } = require('@ideadesignmedia/open-ai.js')

async function main() {
  const reply = await chatCompletion([
    Message('Hello!', 'user')
  ])

  console.log(reply.choices?.[0]?.message?.content)
}

main().catch(console.error)
`

The default export openAI exposes every helper if you prefer a single aggregate object.

---

## Working with Multiple Endpoints

The helpers read credentials from the active environment at call time. That means you can do in-process switches if you need to route particular requests to different providers:

`	s
import { completion } from '@ideadesignmedia/open-ai.js'

// Hosted OpenAI request
process.env.OPEN_AI_ENDPOINT = 'https://api.openai.com'
process.env.OPEN_AI_API_KEY = process.env.OPENAI_PROD_KEY
await completion('Write a haiku about timezones')

// Private deployment request
process.env.OPEN_AI_ENDPOINT = process.env.MODEL_ENDPOINT
process.env.OPEN_AI_API_KEY = process.env.API_KEY
await completion('Summarise today\'s error logs')
`

For local development, keep config.json in sync with both credential sets and let the test runner flip back and forth automatically.

---

## Testing

The integration suite exercises every helper against each configured backend. With config.json populated it runs once against OpenAI’s hosted API and once against your private endpoint.

`ash
# Run all stages (˜3 minutes when both endpoints are available)
yarn test

# Focus on a single stage and target
yarn test -- --test-name-pattern "private: Image helpers"
`

Each sub-test logs [INFO], [PASS], or [SKIP] diagnostics so you can see which features are supported by the private deployment. When an API is unavailable (for example moderation on a private model), the diagnostic is recorded without failing the run.

---

## Build Output

The package ships transpiled CommonJS in dist/index.js. Build locally with:

`ash
yarn build
`

dist/index.js is tracked in git so consumers who install from GitHub receive the compiled artifact.

---

## Troubleshooting

- **OPEN_AI_API_KEY missing** – set OPEN_AI_API_KEY (or OPEN_AI_SECRET) before importing the helpers.
- **Deprecation warning for util.isArray** – the entrypoint replaces Node’s deprecated helper; ensure you are using the exported module rather than bundling a local copy of orm-data first.
- **Streaming never completes** – confirm the target endpoint actually emits SSE responses and that intermediaries (CDNs, proxies) are not buffering them.
- **Image helpers fail on private endpoints** – some deployments only implement a subset of the OpenAI API surface; check your provider’s documentation for supported routes.

If you spot a drift between these helpers and the latest OpenAI payloads, open an issue with the sample JSON payload so we can keep things in sync.

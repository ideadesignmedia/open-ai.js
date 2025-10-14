# Repository Guidance (Maintainers & Contributors)

This document explains how to work on the repository as a package developer: how to configure a local environment, run tests, understand the code layout, and make changes confidently without affecting consumers of the published package.

The end‑user README intentionally focuses on package usage. This file contains repo‑specific guidance removed from README.

## Prerequisites
- Node.js 20+ (built‑in `fetch` and `node:test` are used).
- Yarn Classic (1.x) or npm/pnpm for scripts.
- A working C/C++ toolchain if you exercise image helpers via `sharp`.
  - Windows: Visual C++ build tools
  - Alpine Linux: `libvips`
- `npx` available on PATH (used to spawn the Brave MCP server during tests).

## Repository Layout
- `src/`
  - `index.ts` – main entry, re‑exports helpers and types for consumers.
  - `unified.ts` – unified multi‑provider LLM client surface.
  - `providers/` – provider adapters:
    - `openai.ts`, `anthropic.ts`, `google.ts`, `cohere.ts`, `mistral.ts`
    - `types.ts` – shared types used by providers and the unified client
    - `base.ts` – small utilities (`resolveFetch`, `FetchError`, `pickSystemPrompt`)
  - `mcp/` – MCP server and client implementation.
  - other feature modules (responses, audio, images, files, fine‑tuning, etc.)
- `tests/`
  - `openai.integration.test.ts` – exhaustive OpenAI helper integration (hosted + optional private endpoint)
  - `mcp.integration.test.ts` – local MCP end‑to‑end plus Brave Search MCP integration
  - `mcp.mock-client.test.ts` – spec‑compliance checks using a mock client
  - `unified.llm.test.ts` – unified client integration across Anthropic, Gemini, Cohere, and Mistral
- `config-sample.json` – sample env values used by tests; copy and fill as `config.json` (optional)
- `docs/` – PDF guidance for MCP and cross‑provider integrations (reference material)

## Local Configuration for Tests
For development convenience, tests can read environment variables directly. Optionally, you can place a `config.json` in the repo root (ignored by git) with the same shape as `config-sample.json` to populate those variables using `@ideadesignmedia/config.js` in test files.

Relevant variables:
- `OPEN_AI_API_KEY` (and optionally `OPEN_AI_ENDPOINT`, `OPEN_AI_ORGANIZATION`)
- `MODEL_ENDPOINT`, `API_KEY` (for a private OpenAI‑compatible deployment)
- `ANTHROPIC_API_KEY`, `GOOGLE_GEMINI_API_KEY`, `COHERE_API_KEY`, `MISTRAL_API_KEY`
- `BRAVE_API_KEY` (for Brave MCP server integration in the MCP tests)

Never commit real secrets. `config.json` is for local dev only.

## Scripts
- `yarn build` – type‑check and emit `dist/`
- `yarn test-openai` – OpenAI helper integration
- `yarn test-mcp` – MCP local + Brave Search integration
- `node scripts/run-test-with-timeout.js --timeout=90000 node --test-timeout=20000 --require ts-node/register --test tests/mcp.integration.test.ts tests/mcp.mock-client.test.ts tests/mcp.mock-server.test.ts` � required wrapper when running the MCP suites directly; it enforces cleanup of sockets and files.
- Unified LLM integration: run directly
  - `node --require ts-node/register --test tests/unified.llm.test.ts`

## Running Tests

### OpenAI integration (`tests/openai.integration.test.ts`)
- Exercises completions, chat, Responses API (including streaming), images, audio, files, moderation, model catalog, fine‑tuning, and direct HTTP helpers.
- Supports both hosted OpenAI and a private compatible endpoint:
  - Set `MODEL_ENDPOINT` and `API_KEY` to target a non‑OpenAI deployment.
  - Tests log clearly when a feature is unavailable on a private deployment and continue.

### MCP integration (`tests/mcp.integration.test.ts`)
- Spins up a local MCP server over HTTP+WS, verifying the 2025-06-18 handshake, capability flags (tools/resources/prompts), tool invocation, and ping/shutdown.
- Brave Search MCP:
  - If `BRAVE_API_KEY` is set, the test will find a free port, spawn `@brave/brave-search-mcp-server` via `npx` (STDIO transport), bridge STDIO↔WS locally, then perform handshake and a `search` request.
  - If unavailable or failing auth/quota, the subtests log the reason and skip.
- Timeouts are kept short (~30s per suite) with granular logging (`[mcp-test]`, `[mcp-brave]`).

### MCP mock client (`tests/mcp.mock-client.test.ts`)
- Uses the mock client harness to assert spec compliance: 2025-06-18 handshake, capability negotiation, tool calls, resource reads, prompt fetches, notifications, and error handling.
- Negotiates `protocolVersion: '2025-06-18'` by default; mismatches surface with actionable assertions.

### MCP mock server (`tests/mcp.mock-server.test.ts`)
- Validates `createMockMcpServer`/`startMockMcpServer` over STDIO, covering tools, resources, prompts, and graceful shutdown.

### Unified LLM client (`tests/unified.llm.test.ts`)
- Calls real Anthropic, Google Gemini, Cohere, and Mistral APIs using their keys.
- Each provider:
  - Lists models, selects a preferred candidate, then runs a single chat call.
  - On 401/403/404/quota issues, the test logs context and skips that provider while letting others run.
- Gemini notes: the test includes a fallback list of common model IDs and logs the first 10 discovered model names to aid debugging.

## Development Workflow
1. Install deps: `yarn install`
2. Build frequently: `yarn build`
3. Run targeted tests during iteration:
   - `yarn test-mcp`
   - `yarn test-openai`
   - `node --require ts-node/register --test tests/unified.llm.test.ts`
4. Keep changes minimal and typed. When editing public surfaces, ensure:
   - JSDoc comments are present and informative (inputs, outputs, examples)
   - Types remain narrow enough for autocompletion while matching provider payloads

### Adding or Updating Providers
- Implement adapter under `src/providers/<name>.ts` using the same patterns as existing providers:
  - Map unified request → provider payload (tools/messages format)
  - Parse provider response → unified shape (including tool calls)
  - Throw `FetchError(status, message, body)` on HTTP errors
  - Set `supportsStreaming`/`supportsTools` appropriately
- Wire into `src/unified.ts`:
  - Extend `SupportedProvider`
  - Add constructor case and options type
- Add/adjust tests in `tests/unified.llm.test.ts` accordingly.

### MCP Server/Client Tips
- Server options allow exposing tools/resources/prompts/models and selecting transports (`websocket`, `http`, `stdio`).
- The Brave Search MCP subtests run only when `BRAVE_API_KEY` is provided. The harness auto‑bridges STDIO to a local WebSocket.
- Client and server negotiate `protocolVersion: '2025-06-18'` and send the `initialized` notification as per spec.

## Troubleshooting
- 401/403/quota/404 errors: Tests convert many of these into skips with context; verify keys, project access to models, and any provider‑side feature flags.
- Streaming stalls: Ensure outbound SSE/WebSocket connectivity; provide a custom `fetch` if needed (see unified client examples).
- Sharp build failures: Install platform prerequisites or skip image tests during local iteration.
- Windows `npx` notes: The MCP Brave test uses `npx.cmd` on Windows; the harness logs stderr lines and continues after a brief startup grace period.

## Security & Hygiene
- Do not commit real API keys. `config.json` (if you use it locally) must never be checked in.
- Keep changes focused; avoid unrelated edits in large files.
- Follow the TypeScript style in the repo (no extraneous comments, strong typing, clear JSDoc).

## Known Limitations
- Unified streaming is implemented for the OpenAI provider; other providers currently throw a descriptive error from `streamChat`.
- Provider naming and models evolve quickly; the unified test harness includes reasonable fallbacks but may need updates if upstream model IDs change.

Happy hacking!

import { setTimeout as sleep } from "node:timers/promises"

import { McpServer } from "./server"
import type {
  McpMetadata,
  McpModel,
  McpPrompt,
  McpResource,
  McpServerOptions,
  McpServerTransport,
  McpToolHandlerOptions
} from "./server"
import { defineFunctionTool, defineObjectSchema } from "../tools"
import type { JsonRecord, JsonValue } from "../types"

const DEFAULT_INSTRUCTIONS =
  "Mock MCP server bundled with @ideadesignmedia/open-ai.js. Explore tools, resources, and prompts locally or from VS Code."

const sumNumbersTool = defineFunctionTool({
  type: "function",
  function: {
    name: "sum_numbers",
    description: "Sum an array of numbers and return the total.",
    parameters: defineObjectSchema({
      type: "object",
      properties: {
        values: {
          type: "array",
          items: { type: "number" },
          minItems: 1,
          description: "Array of numeric values to sum"
        }
      },
      required: ["values"],
      additionalProperties: false
    } as const)
  }
} as const)

const echoTool = defineFunctionTool({
  type: "function",
  function: {
    name: "echo_text",
    description: "Echo text back to the caller with optional formatting.",
    parameters: defineObjectSchema({
      type: "object",
      properties: {
        message: {
          type: "string",
          description: "Text to echo back to the caller"
        },
        uppercase: {
          type: "boolean",
          description: "Return the message in uppercase",
          default: false
        },
        repeat: {
          type: "integer",
          minimum: 1,
          maximum: 5,
          description: "How many times to repeat the message",
          default: 1
        },
        delayMs: {
          type: "integer",
          minimum: 0,
          maximum: 2000,
          description: "Optional artificial delay before responding (milliseconds)",
          default: 0
        }
      },
      required: ["message"],
      additionalProperties: false
    } as const)
  }
} as const)

const timeTool = defineFunctionTool({
  type: "function",
  function: {
    name: "current_time",
    description: "Return the current ISO 8601 timestamp.",
    parameters: defineObjectSchema({
      type: "object",
      properties: {},
      additionalProperties: false
    } as const)
  }
} as const)

const DEFAULT_TOOL_HANDLERS = [
  {
    tool: sumNumbersTool,
    async handler({ values }) {
      const numbers = Array.isArray(values)
        ? (values as number[]).filter(value => typeof value === "number" && Number.isFinite(value))
        : []
      const sum = numbers.reduce((total, value) => total + value, 0)
      const expression = numbers.length > 0 ? `${numbers.join(" + ")} = ${sum}` : `Sum: ${sum}`
      return createTextContentPayload(expression, { sum, terms: numbers })
    }
  },
  {
    tool: echoTool,
    async handler({ message, uppercase = false, repeat = 1, delayMs = 0 }) {
      const safeMessage = typeof message === "string" ? message : String(message ?? "")
      const repeatNumber =
        typeof repeat === "number" ? repeat : Number.parseInt(String(repeat ?? 1), 10)
      const count = Number.isFinite(repeatNumber) ? Math.min(Math.max(1, repeatNumber), 5) : 1
      const decorated = uppercase ? safeMessage.toUpperCase() : safeMessage
      const delayNumber =
        typeof delayMs === "number" ? delayMs : Number.parseInt(String(delayMs ?? 0), 10)
      if (Number.isFinite(delayNumber) && delayNumber > 0) {
        const clamped = Math.min(Math.max(0, delayNumber), 2000)
        await sleep(clamped)
      }
      const rendered = Array.from({ length: count }, () => decorated).join(" ")
      return createTextContentPayload(rendered, { message: rendered })
    }
  },
  {
    tool: timeTool,
    async handler() {
      const isoTimestamp = new Date().toISOString()
      return createTextContentPayload(`Current time: ${isoTimestamp}`, { isoTimestamp })
    }
  }
] as const satisfies ReadonlyArray<McpToolHandlerOptions>

const DEFAULT_RESOURCES: McpResource[] = [
  {
    id: "welcome",
    name: "Welcome",
    uri: "mcp://mock/resources/welcome",
    type: "text/plain",
    description: "High level introduction to the mock MCP server"
  },
  {
    id: "capabilities",
    name: "Capabilities",
    uri: "mcp://mock/resources/capabilities",
    type: "application/json",
    description: "Supported transports, tools, and prompts"
  }
]

const DEFAULT_PROMPTS: McpPrompt[] = [
  {
    name: "greet",
    description: "Generate a friendly greeting",
    arguments: [
      { name: "name", description: "Name to greet", required: false },
      { name: "tone", description: "Optional tone such as cheerful or formal", required: false }
    ]
  },
  {
    name: "summarize",
    description: "Summarize a topic in a single paragraph",
    arguments: [{ name: "topic", description: "Topic to summarize", required: true }]
  }
]

const DEFAULT_MODELS: McpModel[] = [
  {
    name: "mock-gpt",
    label: "Mock GPT",
    description: "Demonstration text-only model",
    provider: "mock"
  },
  {
    name: "mock-vision",
    label: "Mock Vision",
    description: "Demonstration multimodal model",
    provider: "mock"
  }
]

const DEFAULT_METADATA: McpMetadata = {
  package: "@ideadesignmedia/open-ai.js",
  repository: "https://github.com/ideadesignmedia/open-ai.js",
  documentation: "https://github.com/ideadesignmedia/open-ai.js#readme"
}

const createTextContentPayload = (text: string, extras: JsonRecord = {}): JsonRecord => ({
  ...extras,
  content: [
    { type: "text", text }
  ]
})

const resolveResourceKey = (idOrUri: string): string => {
  const normalized = idOrUri.trim()
  if (normalized.startsWith("mcp://mock/resources/")) {
    return normalized.slice("mcp://mock/resources/".length)
  }
  return normalized
}

const createDefaultReadResource = (
  transports: readonly McpServerTransport[],
  tools: ReadonlyArray<McpToolHandlerOptions>
) =>
  async (idOrUri: string): Promise<JsonValue> => {
    const key = resolveResourceKey(idOrUri)
    if (key === "welcome") {
      return "Welcome! This mock MCP server is backed by @ideadesignmedia/open-ai.js."
    }
    if (key === "capabilities") {
      return {
        transports,
        tools: tools.map(entry => entry.tool.function.name),
        prompts: DEFAULT_PROMPTS.map(prompt => prompt.name),
        resources: DEFAULT_RESOURCES.map(resource => resource.id)
      }
    }
    throw new Error(`Unknown resource: ${idOrUri}`)
  }

const defaultGetPrompt = async (name: string, args: JsonRecord | undefined): Promise<JsonValue> => {
  if (name === "greet") {
    const target = args?.name ? String(args.name) : "there"
    const tone = args?.tone ? ` (${String(args.tone)})` : ""
    return { text: `Hello ${target}!${tone}` }
  }
  if (name === "summarize") {
    const topic = args?.topic ? String(args.topic) : "the provided subject"
    return {
      text: `Provide a concise paragraph summarizing ${topic}. Focus on the most important details and keep the tone informative.`
    }
  }
  throw new Error(`Unknown prompt: ${name}`)
}

export interface MockMcpServerOptions
  extends Partial<Omit<McpServerOptions<ReadonlyArray<McpToolHandlerOptions>>, "tools">> {
  tools?: ReadonlyArray<McpToolHandlerOptions>
  includeDefaultTools?: boolean
}

/**
 * Create a configured mock MCP server preloaded with demonstration tools, resources, and prompts.
 *
 * @param options - Optional overrides for transports, metadata, and other server behaviours.
 * @returns New {@link McpServer} instance. Call {@link McpServer.start} to begin serving requests.
 */
export const createMockMcpServer = (options: MockMcpServerOptions = {}): McpServer => {
  const {
    includeDefaultTools,
    tools,
    transports,
    metadata,
    getMetadata,
    selectModel,
    readResource,
    getPrompt,
    prompts,
    models,
    getModel,
    resources,
    instructions,
    ...rest
  } = options

  const activeTransports = transports ?? ["stdio", "websocket", "http"]
  const toolHandlers: ReadonlyArray<McpToolHandlerOptions> = [
    ...(includeDefaultTools === false ? [] : DEFAULT_TOOL_HANDLERS),
    ...(tools ?? [])
  ]

  const modelEntries = models ?? DEFAULT_MODELS
  let activeModel = modelEntries[0]?.name
  const baseMetadata = metadata ?? DEFAULT_METADATA
  const defaultReader = createDefaultReadResource(activeTransports, toolHandlers)

  const userReadResource = readResource
  const readResourceHandler = async (idOrUri: string): Promise<JsonValue> => {
    try {
      return await defaultReader(idOrUri)
    } catch (error) {
      if (userReadResource) {
        return await userReadResource(idOrUri)
      }
      throw error
    }
  }

  const userGetPrompt = getPrompt
  const getPromptHandler = async (name: string, args?: JsonRecord): Promise<JsonValue> => {
    try {
      return await defaultGetPrompt(name, args)
    } catch (error) {
      if (userGetPrompt) {
        return await userGetPrompt(name, args)
      }
      throw error
    }
  }

  const userSelectModel = selectModel
  const selectModelHandler = async (modelName: string): Promise<void> => {
    activeModel = modelName
    if (userSelectModel) {
      await userSelectModel(modelName)
    }
  }

  const userGetMetadata = getMetadata
  const getMetadataHandler = async (): Promise<McpMetadata> => {
    const supplemental = userGetMetadata ? await userGetMetadata() : undefined
    return {
      ...baseMetadata,
      ...(supplemental ?? {}),
      ...(activeModel ? { activeModel } : {})
    }
  }

  const server = new McpServer({
    transports: activeTransports,
    tools: toolHandlers,
    resources: resources ?? DEFAULT_RESOURCES,
    readResource: readResourceHandler,
    prompts: prompts ?? DEFAULT_PROMPTS,
    getPrompt: getPromptHandler,
    models: modelEntries,
    getModel,
    selectModel: selectModelHandler,
    metadata: baseMetadata,
    getMetadata: getMetadataHandler,
    instructions: instructions ?? DEFAULT_INSTRUCTIONS,
    ...rest
  } satisfies McpServerOptions)

  return server
}

/**
 * Start the mock MCP server immediately and return the instance for lifecycle management.
 *
 * @param options - Optional configuration overrides passed to {@link createMockMcpServer}.
 * @returns Started {@link McpServer} ready to accept requests.
 */
export const startMockMcpServer = async (options: MockMcpServerOptions = {}): Promise<McpServer> => {
  const server = createMockMcpServer(options)
  await server.start()
  return server
}



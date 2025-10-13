
import { resolveFetch, FetchError } from './base'
import type { LLMProvider, LLMProviderConfig, UnifiedChatRequest, UnifiedChatResponse, UnifiedChatStreamChunk, UnifiedModelInfo, UnifiedToolDefinition, UnifiedToolCall } from './types'
import type { JsonRecord, JsonValue } from '../types'

interface MistralResponse {
  id: string
  model: string
  choices: Array<{
    message?: {
      role: string
      content?: string
      tool_calls?: Array<{
        function: { name: string; arguments: string }
      }>
    }
  }>
}

export interface MistralProviderOptions extends LLMProviderConfig {}

const mapMessages = (messages: UnifiedChatRequest['messages']) =>
  messages.map(message => {
    if (message.role === 'tool') {
      const payload: JsonRecord = { role: 'tool', content: message.content }
      if (message.name) payload.name = message.name
      return payload
    }
    return {
      role: message.role,
      content: message.content
    }
  })

const mapTools = (tools: UnifiedToolDefinition[] | undefined) =>
  tools?.map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }
  }))

const parseToolCalls = (toolCalls: Array<{ function: { name: string; arguments: string } }> | undefined): UnifiedToolCall[] | undefined => {
  if (!toolCalls || toolCalls.length === 0) return undefined
  return toolCalls.map(call => ({
    name: call.function.name,
    arguments: safeJSONParse(call.function.arguments)
  }))
}

const safeJSONParse = (value: string): JsonRecord => {
  try {
    return JSON.parse(value) as JsonRecord
  } catch {
    return { raw: value }
  }
}

export class MistralProvider implements LLMProvider {
  public readonly name = 'mistral'
  public readonly supportsStreaming = false
  public readonly supportsTools = true

  private readonly options: MistralProviderOptions
  private readonly fetchFn: typeof fetch
  private readonly baseURL: string

  constructor(options: MistralProviderOptions) {
    this.options = options
    this.fetchFn = resolveFetch(options)
    this.baseURL = options.baseURL ?? 'https://api.mistral.ai/v1'
  }

  public async listModels(): Promise<UnifiedModelInfo[]> {
    const response = await this.fetchFn(`${this.baseURL}/models`, {
      method: 'GET',
      headers: this.headers()
    })
    if (!response.ok) {
      throw new FetchError(response.status, 'Failed to list Mistral models', await response.text())
    }
    const json = await response.json() as { data: Array<{ id: string; description?: string }> }
    return json.data.map(model => ({
      name: model.id,
      provider: this.name,
      description: model.description
    }))
  }

  public async chat(request: UnifiedChatRequest): Promise<UnifiedChatResponse> {
    const body: Record<string, unknown> = {
      model: request.model,
      messages: mapMessages(request.messages),
      temperature: request.temperature,
      top_p: request.topP,
      max_tokens: request.maxTokens,
      tools: mapTools(request.tools)
    }
    const response = await this.fetchFn(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: this.headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body)
    })
    if (!response.ok) {
      throw new FetchError(response.status, 'Mistral chat completion failed', await response.text())
    }
    const json = await response.json() as MistralResponse
    const choice = json.choices[0]
    return {
      id: json.id,
      model: json.model,
      role: 'assistant',
      content: choice.message?.content ?? '',
      toolCalls: parseToolCalls(choice.message?.tool_calls),
      raw: json as unknown as JsonValue
    }
  }

  public async *streamChat(_request: UnifiedChatRequest): AsyncIterable<UnifiedChatStreamChunk> {
    throw new Error('Mistral streaming not implemented')
  }

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    return {
      Authorization: `Bearer ${this.options.apiKey}`,
      ...this.options.headers,
      ...extra
    }
  }
}

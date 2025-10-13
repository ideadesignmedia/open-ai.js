
import { resolveFetch, FetchError } from './base'
import type { LLMProvider, LLMProviderConfig, UnifiedChatRequest, UnifiedChatResponse, UnifiedChatStreamChunk, UnifiedModelInfo, UnifiedToolDefinition, UnifiedToolCall } from './types'
import type { JsonRecord, JsonValue } from '../types'

interface OpenAIChatResponse {
  id: string
  model: string
  choices: Array<{
    index: number
    message?: {
      role: string
      content?: string
      tool_calls?: Array<{
        id: string
        type: string
        function: {
          name: string
          arguments: string
        }
      }>
    }
    finish_reason?: string
    delta?: {
      role?: string
      content?: string
    }
  }>
}

export interface OpenAIProviderOptions extends LLMProviderConfig {
  organization?: string
}

const mapMessages = (messages: UnifiedChatRequest['messages']) =>
  messages.map(message => {
    if (message.role === 'tool') {
      const payload: JsonRecord = { role: 'tool', content: message.content }
      if (message.name) {
        payload.name = message.name
      }
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

export class OpenAIProvider implements LLMProvider {
  public readonly name = 'openai'
  public readonly supportsStreaming = true
  public readonly supportsTools = true

  private readonly options: OpenAIProviderOptions
  private readonly fetchFn: typeof fetch
  private readonly baseURL: string

  constructor(options: OpenAIProviderOptions) {
    this.options = options
    this.fetchFn = resolveFetch(options)
    this.baseURL = options.baseURL ?? 'https://api.openai.com/v1'
  }

  public async listModels(): Promise<UnifiedModelInfo[]> {
    const response = await this.fetchFn(`${this.baseURL}/models`, {
      method: 'GET',
      headers: this.headers()
    })
    if (!response.ok) {
      throw new FetchError(response.status, 'Failed to list OpenAI models', await response.text())
    }
    const json = await response.json() as { data: Array<{ id: string; owned_by?: string }>; }
    return json.data.map(model => ({
      name: model.id,
      provider: this.name,
      description: model.owned_by ? `Owned by ${model.owned_by}` : undefined
    }))
  }

  public async chat(request: UnifiedChatRequest): Promise<UnifiedChatResponse> {
    const body: Record<string, unknown> = {
      model: request.model,
      messages: mapMessages(request.messages),
      temperature: request.temperature,
      top_p: request.topP,
      max_tokens: request.maxTokens,
      tools: mapTools(request.tools),
      tool_choice: request.toolChoice === 'none' ? 'none' : request.toolChoice === 'auto' || !request.toolChoice ? 'auto' : request.toolChoice
    }
    const response = await this.fetchFn(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: this.headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body)
    })
    if (!response.ok) {
      throw new FetchError(response.status, 'OpenAI chat completion failed', await response.text())
    }
    const json = await response.json() as OpenAIChatResponse
    const choice = json.choices[0]
    const content = choice.message?.content ?? ''
    return {
      id: json.id,
      model: json.model,
      role: 'assistant',
      content,
      toolCalls: parseToolCalls(choice.message?.tool_calls),
      raw: json as unknown as JsonValue
    }
  }

  public async *streamChat(request: UnifiedChatRequest): AsyncIterable<UnifiedChatStreamChunk> {
    const body: Record<string, unknown> = {
      model: request.model,
      messages: mapMessages(request.messages),
      tools: mapTools(request.tools),
      temperature: request.temperature,
      top_p: request.topP,
      max_tokens: request.maxTokens,
      stream: true,
      tool_choice: request.toolChoice === 'none' ? 'none' : request.toolChoice === 'auto' || !request.toolChoice ? 'auto' : request.toolChoice
    }
    const response = await this.fetchFn(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: this.headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body)
    })
    if (!response.ok) {
      throw new FetchError(response.status, 'OpenAI streaming request failed', await response.text())
    }
    if (!response.body) {
      throw new Error('Streaming not supported by fetch implementation')
    }
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    const delimiter = '\n\n'

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      let boundaryIndex = buffer.indexOf(delimiter)
      while (boundaryIndex !== -1) {
        const rawChunk = buffer.slice(0, boundaryIndex)
        buffer = buffer.slice(boundaryIndex + delimiter.length)
        const trimmed = rawChunk.trim()
        if (trimmed.startsWith('data:')) {
          const payload = trimmed.slice(5).trim()
          if (payload === '[DONE]') {
            yield { type: 'finish', reason: 'done', raw: payload as unknown as JsonValue }
          } else if (payload) {
            const json = JSON.parse(payload) as OpenAIChatResponse
            const choice = json.choices[0]
            if (choice.delta?.content) {
              yield { type: 'content', delta: choice.delta.content, raw: json as unknown as JsonValue }
            }
          }
        }
        boundaryIndex = buffer.indexOf(delimiter)
      }
    }
  }

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.options.apiKey}`,
      ...this.options.headers,
      ...extra
    }
    if (this.options.organization) {
      headers['OpenAI-Organization'] = this.options.organization
    }
    return headers
  }
}

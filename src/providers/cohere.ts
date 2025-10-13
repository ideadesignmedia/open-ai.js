
import { resolveFetch, FetchError } from './base'
import { randomUUID } from 'node:crypto'
import type { LLMProvider, LLMProviderConfig, UnifiedChatRequest, UnifiedChatResponse, UnifiedChatStreamChunk, UnifiedModelInfo } from './types'
import type { JsonValue } from '../types'

interface CohereResponse {
  id?: string
  text?: string
  response?: {
    text?: string
  }
  message?: {
    content?: Array<{ text?: string }>
  }
}

export interface CohereProviderOptions extends LLMProviderConfig {}

const splitMessages = (messages: UnifiedChatRequest['messages']) => {
  const history: Array<{ role: string; message: string }> = []
  let current: string | undefined
  for (const message of messages) {
    if (message.role === 'assistant') {
      history.push({ role: 'CHATBOT', message: message.content })
    } else if (message.role === 'user') {
      if (current) {
        history.push({ role: 'USER', message: current })
      }
      current = message.content
    }
  }
  const lastUser = current ?? ''
  return { history, lastUser }
}

export class CohereProvider implements LLMProvider {
  public readonly name = 'cohere'
  public readonly supportsStreaming = false
  public readonly supportsTools = false

  private readonly options: CohereProviderOptions
  private readonly fetchFn: typeof fetch
  private readonly baseURL: string

  constructor(options: CohereProviderOptions) {
    this.options = options
    this.fetchFn = resolveFetch(options)
    this.baseURL = options.baseURL ?? 'https://api.cohere.com/v1'
  }

  public async listModels(): Promise<UnifiedModelInfo[]> {
    const response = await this.fetchFn(`${this.baseURL}/models`, {
      method: 'GET',
      headers: this.headers()
    })
    if (!response.ok) {
      throw new FetchError(response.status, 'Failed to list Cohere models', await response.text())
    }
    const json = await response.json() as { models?: Array<{ name: string; description?: string }> }
    return (json.models ?? []).map(model => ({
      name: model.name,
      provider: this.name,
      description: model.description
    }))
  }

  public async chat(request: UnifiedChatRequest): Promise<UnifiedChatResponse> {
    const { history, lastUser } = splitMessages(request.messages)
    const body: Record<string, unknown> = {
      model: request.model,
      message: lastUser,
      chat_history: history,
      temperature: request.temperature
    }
    const response = await this.fetchFn(`${this.baseURL}/chat`, {
      method: 'POST',
      headers: this.headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body)
    })
    if (!response.ok) {
      throw new FetchError(response.status, 'Cohere chat request failed', await response.text())
    }
    const json = await response.json() as CohereResponse
    const text = json.text ?? json.response?.text ?? json.message?.content?.map(part => part.text ?? '').join('') ?? ''
    return {
      id: json.id ?? randomUUID(),
      model: request.model,
      role: 'assistant',
      content: text,
      raw: json as JsonValue
    }
  }

  public async *streamChat(_request: UnifiedChatRequest): AsyncIterable<UnifiedChatStreamChunk> {
    throw new Error('Cohere streaming not implemented')
  }

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    return {
      Authorization: `Bearer ${this.options.apiKey}`,
      ...this.options.headers,
      ...extra
    }
  }
}


import { resolveFetch, FetchError, pickSystemPrompt } from './base'
import { randomUUID } from 'node:crypto'
import type { LLMProvider, LLMProviderConfig, UnifiedChatRequest, UnifiedChatResponse, UnifiedChatStreamChunk, UnifiedModelInfo } from './types'
import type { JsonValue } from '../types'

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>
    }
  }>
}

export interface GoogleProviderOptions extends LLMProviderConfig {
  project?: string
}

const buildContents = (messages: UnifiedChatRequest['messages']) =>
  messages.map(message => ({
    role: message.role,
    parts: [{ text: message.content }]
  }))

export class GoogleProvider implements LLMProvider {
  public readonly name = 'google'
  public readonly supportsStreaming = false
  public readonly supportsTools = false

  private readonly options: GoogleProviderOptions
  private readonly fetchFn: typeof fetch
  private readonly baseURL: string

  constructor(options: GoogleProviderOptions) {
    this.options = options
    this.fetchFn = resolveFetch(options)
    this.baseURL = options.baseURL ?? 'https://generativelanguage.googleapis.com/v1beta'
  }

  public async listModels(): Promise<UnifiedModelInfo[]> {
    const url = `${this.baseURL}/models?key=${encodeURIComponent(this.options.apiKey)}`
    const response = await this.fetchFn(url, { method: 'GET', headers: this.options.headers })
    if (!response.ok) {
      throw new FetchError(response.status, 'Failed to list Google models', await response.text())
    }
    const json = await response.json() as { models?: Array<{ name: string; displayName?: string }> }
    return (json.models ?? []).map(model => ({
      name: model.name,
      provider: this.name,
      description: model.displayName
    }))
  }

  public async chat(request: UnifiedChatRequest): Promise<UnifiedChatResponse> {
    const { system, rest } = pickSystemPrompt(request)
    const url = `${this.baseURL}/models/${request.model}:generateContent?key=${encodeURIComponent(this.options.apiKey)}`
    const body: Record<string, unknown> = {
      contents: buildContents(rest)
    }
    if (system) {
      body.systemInstruction = { parts: [{ text: system }] }
    }
    const response = await this.fetchFn(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(this.options.headers ?? {}) },
      body: JSON.stringify(body)
    })
    if (!response.ok) {
      throw new FetchError(response.status, 'Google Gemini request failed', await response.text())
    }
    const json = await response.json() as GeminiResponse
    const candidate = json.candidates?.[0]
    const text = candidate?.content?.parts?.map(part => part.text ?? '').join('') ?? ''
    return {
      id: randomUUID(),
      model: request.model,
      role: 'assistant',
      content: text,
      raw: json as JsonValue
    }
  }

  public async *streamChat(_request: UnifiedChatRequest): AsyncIterable<UnifiedChatStreamChunk> {
    throw new Error('Google streaming not yet implemented')
  }
}

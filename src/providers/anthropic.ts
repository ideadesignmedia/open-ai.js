
import { resolveFetch, FetchError, pickSystemPrompt } from './base'
import type { LLMProvider, LLMProviderConfig, UnifiedChatRequest, UnifiedChatResponse, UnifiedChatStreamChunk, UnifiedModelInfo, UnifiedToolDefinition, UnifiedToolCall } from './types'
import type { JsonRecord, JsonValue } from '../types'

interface AnthropicMessageContent {
  type: 'text'
  text: string
}

interface AnthropicToolUse {
  type: 'tool_use'
  name: string
  input: JsonRecord
}

interface AnthropicResponse {
  id: string
  model: string
  content: Array<AnthropicMessageContent | AnthropicToolUse>
}

export interface AnthropicProviderOptions extends LLMProviderConfig {
  version?: string
}

const mapTools = (tools: UnifiedToolDefinition[] | undefined) =>
  tools?.map(tool => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.parameters
  }))

const parseContent = (content: AnthropicResponse['content']): { text: string; toolCalls?: UnifiedToolCall[] } => {
  let text = ''
  const toolCalls: UnifiedToolCall[] = []
  for (const item of content) {
    if (item.type === 'text') {
      text += item.text
    } else if (item.type === 'tool_use') {
      toolCalls.push({ name: item.name, arguments: item.input })
    }
  }
  return { text, toolCalls: toolCalls.length ? toolCalls : undefined }
}

export class AnthropicProvider implements LLMProvider {
  public readonly name = 'anthropic'
  public readonly supportsStreaming = false
  public readonly supportsTools = true

  private readonly options: AnthropicProviderOptions
  private readonly fetchFn: typeof fetch
  private readonly baseURL: string
  private readonly version: string

  constructor(options: AnthropicProviderOptions) {
    this.options = options
    this.fetchFn = resolveFetch(options)
    this.baseURL = options.baseURL ?? 'https://api.anthropic.com/v1'
    this.version = options.version ?? '2023-06-01'
  }

  public async listModels(): Promise<UnifiedModelInfo[]> {
    const response = await this.fetchFn(`${this.baseURL}/models`, {
      method: 'GET',
      headers: this.headers()
    })
    if (!response.ok) {
      throw new FetchError(response.status, 'Failed to list Anthropic models', await response.text())
    }
    const json = await response.json() as { data: Array<{ id: string; display_name?: string }> }
    return json.data.map(model => ({
      name: model.id,
      provider: this.name,
      description: model.display_name
    }))
  }

  public async chat(request: UnifiedChatRequest): Promise<UnifiedChatResponse> {
    const { system, rest } = pickSystemPrompt(request)
    const userMessages: JsonRecord[] = []
    let assistantReply: string | undefined

    for (const message of rest) {
      if (message.role === 'assistant') {
        assistantReply = message.content
      } else {
        userMessages.push({ role: message.role, content: [{ type: 'text', text: message.content }] })
      }
    }

    const body: Record<string, unknown> = {
      model: request.model,
      max_tokens: request.maxTokens ?? 1024,
      temperature: request.temperature,
      top_p: request.topP,
      system,
      messages: userMessages,
      tools: mapTools(request.tools)
    }

    const response = await this.fetchFn(`${this.baseURL}/messages`, {
      method: 'POST',
      headers: this.headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body)
    })
    if (!response.ok) {
      throw new FetchError(response.status, 'Anthropic messages call failed', await response.text())
    }
    const json = await response.json() as AnthropicResponse
    const parsed = parseContent(json.content)
    return {
      id: json.id,
      model: json.model,
      role: 'assistant',
      content: parsed.text,
      toolCalls: parsed.toolCalls,
      raw: json as unknown as JsonValue
    }
  }

  public async *streamChat(_request: UnifiedChatRequest): AsyncIterable<UnifiedChatStreamChunk> {
    throw new Error('Anthropic streaming is not yet implemented in this client')
  }

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    return {
      'x-api-key': this.options.apiKey,
      'anthropic-version': this.version,
      ...this.options.headers,
      ...extra
    }
  }
}

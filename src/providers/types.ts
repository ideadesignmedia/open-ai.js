
import type { ChatToolParametersSchema, ChatCompletionsFunctionTool, JsonRecord, JsonValue } from "../types"

export type UnifiedRole = 'system' | 'user' | 'assistant' | 'tool'

export interface UnifiedMessage {
  role: UnifiedRole
  content: string
  name?: string
}

export interface UnifiedToolDefinition {
  name: string
  description?: string
  parameters: ChatToolParametersSchema
}

export interface UnifiedChatRequest {
  model: string
  messages: UnifiedMessage[]
  tools?: UnifiedToolDefinition[]
  toolChoice?: 'auto' | 'none' | { name: string }
  temperature?: number
  topP?: number
  maxTokens?: number
  metadata?: JsonRecord
}

export interface UnifiedToolCall {
  name: string
  arguments: JsonRecord
}

export interface UnifiedChatResponse {
  id: string
  model: string
  role: 'assistant'
  content: string
  toolCalls?: UnifiedToolCall[]
  raw: JsonValue
}

export type UnifiedChatStreamChunk =
  | { type: 'content'; delta: string; raw: JsonValue }
  | { type: 'tool_call'; name: string; argumentsDelta: string; raw: JsonValue }
  | { type: 'finish'; reason: string; raw: JsonValue }

export interface UnifiedModelInfo {
  name: string
  provider: string
  description?: string
  contextWindow?: number
  inputModalities?: string[]
  outputModalities?: string[]
}

export interface LLMProviderConfig {
  apiKey: string
  baseURL?: string
  headers?: Record<string, string>
  fetch?: typeof fetch
}

export interface ChatRequestAdapters {
  toProviderMessages(messages: UnifiedMessage[]): unknown
  toProviderTools?(tools: UnifiedToolDefinition[]): unknown
}

export interface LLMProvider {
  readonly name: string
  readonly supportsStreaming: boolean
  readonly supportsTools: boolean
  listModels(): Promise<UnifiedModelInfo[]>
  chat(request: UnifiedChatRequest): Promise<UnifiedChatResponse>
  streamChat(request: UnifiedChatRequest): AsyncIterable<UnifiedChatStreamChunk>
}

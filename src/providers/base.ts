
import type { LLMProviderConfig, UnifiedChatRequest } from './types'

export class FetchError extends Error {
  public readonly status: number
  public readonly responseBody: string | undefined

  constructor(status: number, message: string, responseBody?: string) {
    super(message)
    this.status = status
    this.responseBody = responseBody
    this.name = 'FetchError'
  }
}

export const resolveFetch = (config: LLMProviderConfig): typeof fetch => {
  if (config.fetch) return config.fetch
  if (typeof fetch === 'function') return fetch.bind(globalThis)
  throw new Error('fetch is not available in this environment; provide options.fetch')
}

export const pickSystemPrompt = (request: UnifiedChatRequest): { system?: string; rest: UnifiedChatRequest['messages'] } => {
  const [first, ...rest] = request.messages
  if (first && first.role === 'system') {
    return { system: first.content, rest }
  }
  return { rest: request.messages }
}

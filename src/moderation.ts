import type { HttpClient } from './http'
import type { ModerationResponse } from './types'

/**
 * Creates helper for OpenAI moderation endpoints.
 */
const createModerationClient = (http: HttpClient) => {
  /**
   * Runs moderation on one or more inputs via `/v1/moderations`.
   *
   * @param input - String or batch of strings to classify.
   * @param model - Moderation model name (defaults to latest hosted preset).
   */
  const moderation = (input: string | string[], model = 'text-moderation-latest'): Promise<ModerationResponse> => {
    const payload = {
      input,
      model
    }
    return http.post<ModerationResponse, typeof payload>('/v1/moderations', payload)
  }

  /**
   * Moderation helper surface.
   */
  return {
    moderation
  }
}

export { createModerationClient }

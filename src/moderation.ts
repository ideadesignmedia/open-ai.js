import type { HttpClient } from './http'
import type { ModerationResponse } from './types'

const createModerationClient = (http: HttpClient) => {
  const moderation = (input: string | string[], model = 'text-moderation-latest'): Promise<ModerationResponse> => {
    const payload = {
      input,
      model
    }
    return http.post<ModerationResponse, typeof payload>('/v1/moderations', payload)
  }

  return {
    moderation
  }
}

export { createModerationClient }

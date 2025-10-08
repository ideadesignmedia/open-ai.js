import { post } from './http'
import type { ModerationResponse } from './types'

const moderation = (input: string | string[], model = 'text-moderation-latest'): Promise<ModerationResponse> => {
  const payload = {
    input,
    model
  }
  return post<ModerationResponse, typeof payload>('/v1/moderations', payload)
}

export { moderation }

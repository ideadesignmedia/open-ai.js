import { post } from './http'
import type { EmbeddingResponse } from './types'

const getEmbedding = (
  input: string | string[],
  model = 'text-embedding-3-small',
  user?: string
): Promise<EmbeddingResponse> => {
  const payload = {
    model,
    input,
    user
  }
  return post<EmbeddingResponse, typeof payload>('/v1/embeddings', payload)
}

export { getEmbedding }

import type { HttpClient } from './http'
import type { EmbeddingResponse } from './types'

const createEmbeddingsClient = (http: HttpClient) => {
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
    return http.post<EmbeddingResponse, typeof payload>('/v1/embeddings', payload)
  }

  return {
    getEmbedding
  }
}

export { createEmbeddingsClient }

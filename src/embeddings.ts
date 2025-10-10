import type { HttpClient } from './http'
import type { EmbeddingResponse } from './types'

/**
 * Creates helper for embedding requests against the Embeddings API.
 *
 * @param http - HTTP client for issuing JSON requests.
 */
const createEmbeddingsClient = (http: HttpClient) => {
  /**
   * Generates embeddings for a string or string array via `/v1/embeddings`.
   *
   * @param input - Text input or batch of inputs to embed.
   * @param model - Target embedding model (defaults to `text-embedding-3-small`).
   * @param user - Optional end-user identifier for tracing.
   */
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

  /**
   * Embeddings helper surface.
   */
  return {
    getEmbedding
  }
}

export { createEmbeddingsClient }

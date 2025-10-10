import type { HttpClient } from './http'
import type {
  Dictionary,
  JsonRecord,
  VectorStore,
  VectorStoreDeletion,
  VectorStoreFileAssociation,
  VectorStoreSearchResponse
} from './types'

/**
 * Creates helper methods for vector store operations.
 */
const createVectorStoreClient = (http: HttpClient) => {
  /**
   * Executes a semantic search within a vector store.
   */
  const searchVectorStore = (
    vectorStoreId: string,
    query: string,
    { filters, maxNumResults = 10, rewriteQuery = false }: { filters?: Dictionary; maxNumResults?: number; rewriteQuery?: boolean } = {}
  ): Promise<VectorStoreSearchResponse> => {
    const payload: JsonRecord = {
      query,
      max_num_results: maxNumResults,
      rewrite_query: rewriteQuery,
      ...(filters ? { filters } : {})
    }
    return http.post<VectorStoreSearchResponse, JsonRecord>(`/v1/vector_stores/${vectorStoreId}/search`, payload)
  }

  /**
   * Associates an uploaded file with a vector store for indexing.
   */
  const addFileToVectorStore = (vectorStoreId: string, fileId: string, attributes: Dictionary = {}): Promise<VectorStoreFileAssociation> => {
    const payload: JsonRecord = {
      file_id: fileId,
      attributes
    }
    return http.post<VectorStoreFileAssociation, JsonRecord>(`/v1/vector_stores/${vectorStoreId}/files`, payload)
  }

  /**
   * Creates a new vector store container.
   */
  const createVectorStore = (name?: string, metadata?: Dictionary): Promise<VectorStore> => {
    const payload: JsonRecord = {
      name,
      metadata
    }
    return http.post<VectorStore, JsonRecord>('/v1/vector_stores', payload)
  }

  /**
   * Retrieves metadata and stats for a vector store.
   */
  const getVectorStore = (vectorStoreId: string): Promise<VectorStore> => {
    return http.get<VectorStore>(`/v1/vector_stores/${vectorStoreId}`)
  }

  /**
   * Deletes a vector store and its indexed metadata.
   */
  const deleteVectorStore = (vectorStoreId: string): Promise<VectorStoreDeletion> => {
    return http.del<VectorStoreDeletion>(`/v1/vector_stores/${vectorStoreId}`)
  }

  /**
   * Vector store helper surface.
   */
  return {
    searchVectorStore,
    addFileToVectorStore,
    createVectorStore,
    getVectorStore,
    deleteVectorStore
  }
}

export { createVectorStoreClient }

import type { HttpClient } from './http'
import type {
  Dictionary,
  JsonRecord,
  VectorStore,
  VectorStoreDeletion,
  VectorStoreFileAssociation,
  VectorStoreSearchResponse
} from './types'

const createVectorStoreClient = (http: HttpClient) => {
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

  const addFileToVectorStore = (vectorStoreId: string, fileId: string, attributes: Dictionary = {}): Promise<VectorStoreFileAssociation> => {
    const payload: JsonRecord = {
      file_id: fileId,
      attributes
    }
    return http.post<VectorStoreFileAssociation, JsonRecord>(`/v1/vector_stores/${vectorStoreId}/files`, payload)
  }

  const createVectorStore = (name?: string, metadata?: Dictionary): Promise<VectorStore> => {
    const payload: JsonRecord = {
      name,
      metadata
    }
    return http.post<VectorStore, JsonRecord>('/v1/vector_stores', payload)
  }

  const getVectorStore = (vectorStoreId: string): Promise<VectorStore> => {
    return http.get<VectorStore>(`/v1/vector_stores/${vectorStoreId}`)
  }

  const deleteVectorStore = (vectorStoreId: string): Promise<VectorStoreDeletion> => {
    return http.del<VectorStoreDeletion>(`/v1/vector_stores/${vectorStoreId}`)
  }

  return {
    searchVectorStore,
    addFileToVectorStore,
    createVectorStore,
    getVectorStore,
    deleteVectorStore
  }
}

export { createVectorStoreClient }

import { del, get, post } from './http'
import type {
  Dictionary,
  JsonRecord,
  VectorStore,
  VectorStoreDeletion,
  VectorStoreFileAssociation,
  VectorStoreSearchResponse
} from './types'

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
  return post<VectorStoreSearchResponse, JsonRecord>(`/v1/vector_stores/${vectorStoreId}/search`, payload)
}

const addFileToVectorStore = (vectorStoreId: string, fileId: string, attributes: Dictionary = {}): Promise<VectorStoreFileAssociation> => {
  const payload: JsonRecord = {
    file_id: fileId,
    attributes
  }
  return post<VectorStoreFileAssociation, JsonRecord>(`/v1/vector_stores/${vectorStoreId}/files`, payload)
}

const createVectorStore = (name?: string, metadata?: Dictionary): Promise<VectorStore> => {
  const payload: JsonRecord = {
    name,
    metadata
  }
  return post<VectorStore, JsonRecord>('/v1/vector_stores', payload)
}

const getVectorStore = (vectorStoreId: string): Promise<VectorStore> => {
  return get<VectorStore>(`/v1/vector_stores/${vectorStoreId}`)
}

const deleteVectorStore = (vectorStoreId: string): Promise<VectorStoreDeletion> => {
  return del<VectorStoreDeletion>(`/v1/vector_stores/${vectorStoreId}`)
}

export { addFileToVectorStore, createVectorStore, deleteVectorStore, getVectorStore, searchVectorStore }

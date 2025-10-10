import type { HttpClient } from './http'
import type { ListResponse, ModelInfo } from './types'

/**
 * Creates helpers for the Models API surface.
 */
const createModelClient = (http: HttpClient) => {
  /**
   * Lists available models exposed by the API key.
   */
  const getModels = (): Promise<ListResponse<ModelInfo>> => {
    return http.get<ListResponse<ModelInfo>>('/v1/models')
  }

  /**
   * Retrieves metadata for a single model.
   *
   * @param model - Model identifier to fetch.
   */
  const getModel = (model: string): Promise<ModelInfo> => {
    return http.get<ModelInfo>(`/v1/models/${model}`)
  }

  /**
   * Model helper surface.
   */
  return {
    getModels,
    getModel
  }
}

export { createModelClient }

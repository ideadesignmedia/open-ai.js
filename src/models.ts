import type { HttpClient } from './http'
import type { ListResponse, ModelInfo } from './types'

const createModelClient = (http: HttpClient) => {
  const getModels = (): Promise<ListResponse<ModelInfo>> => {
    return http.get<ListResponse<ModelInfo>>('/v1/models')
  }

  const getModel = (model: string): Promise<ModelInfo> => {
    return http.get<ModelInfo>(`/v1/models/${model}`)
  }

  return {
    getModels,
    getModel
  }
}

export { createModelClient }

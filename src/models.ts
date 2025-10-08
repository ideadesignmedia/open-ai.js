import { get } from './http'
import type { ListResponse, ModelInfo } from './types'

const getModels = (): Promise<ListResponse<ModelInfo>> => {
  return get<ListResponse<ModelInfo>>('/v1/models')
}

const getModel = (model: string): Promise<ModelInfo> => {
  return get<ModelInfo>(`/v1/models/${model}`)
}

export { getModel, getModels }

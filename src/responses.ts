import { get, post, postStream } from './http'
import type { JsonRecord, ResponseCreateParams, ResponseObject, ResponseStream } from './types'

const createResponse = (payload: ResponseCreateParams): Promise<ResponseObject> => {
  return post<ResponseObject, ResponseCreateParams>('/v1/responses', payload)
}

const createResponseStream = (payload: ResponseCreateParams): Promise<ResponseStream> => {
  const streamPayload: JsonRecord = { ...payload, stream: true }
  return postStream('/v1/responses', streamPayload)
}

const getResponse = (id: string): Promise<ResponseObject> => {
  return get<ResponseObject>(`/v1/responses/${id}`)
}

const cancelResponse = (id: string): Promise<ResponseObject> => {
  return post<ResponseObject, Record<string, never>>(`/v1/responses/${id}/cancel`, {})
}

export { cancelResponse, createResponse, createResponseStream, getResponse }

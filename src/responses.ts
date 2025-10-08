import type { HttpClient } from './http'
import type { JsonRecord, ResponseCreateParams, ResponseObject, ResponseStream } from './types'

const createResponseClient = (http: HttpClient) => {
  const createResponse = (payload: ResponseCreateParams): Promise<ResponseObject> => {
    return http.post<ResponseObject, ResponseCreateParams>('/v1/responses', payload)
  }

  const createResponseStream = (payload: ResponseCreateParams): Promise<ResponseStream> => {
    const streamPayload: JsonRecord = { ...payload, stream: true }
    return http.postStream('/v1/responses', streamPayload)
  }

  const getResponse = (id: string): Promise<ResponseObject> => {
    return http.get<ResponseObject>(`/v1/responses/${id}`)
  }

  const cancelResponse = (id: string): Promise<ResponseObject> => {
    return http.post<ResponseObject, Record<string, never>>(`/v1/responses/${id}/cancel`, {})
  }

  return {
    createResponse,
    createResponseStream,
    getResponse,
    cancelResponse
  }
}

export { createResponseClient }

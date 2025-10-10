import type { HttpClient } from './http'
import type { JsonRecord, ResponseCreateParams, ResponseObject, ResponseStream } from './types'

/**
 * Creates helper utilities for the `/v1/responses` endpoint family.
 */
const createResponseClient = (http: HttpClient) => {
  /**
   * Creates a non-streaming Response object.
   */
  const createResponse = (payload: ResponseCreateParams): Promise<ResponseObject> => {
    return http.post<ResponseObject, ResponseCreateParams>('/v1/responses', payload)
  }

  /**
   * Creates a streaming Response by toggling the `stream` flag.
   */
  const createResponseStream = (payload: ResponseCreateParams): Promise<ResponseStream> => {
    const streamPayload: JsonRecord = { ...payload, stream: true }
    return http.postStream('/v1/responses', streamPayload)
  }

  /**
   * Retrieves a stored response record by id.
   */
  const getResponse = (id: string): Promise<ResponseObject> => {
    return http.get<ResponseObject>(`/v1/responses/${id}`)
  }

  /**
   * Cancels a background response job.
   */
  const cancelResponse = (id: string): Promise<ResponseObject> => {
    return http.post<ResponseObject, Record<string, never>>(`/v1/responses/${id}/cancel`, {})
  }

  /**
   * Responses helper surface.
   */
  return {
    createResponse,
    createResponseStream,
    getResponse,
    cancelResponse
  }
}

export { createResponseClient }

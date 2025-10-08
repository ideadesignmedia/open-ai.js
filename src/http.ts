import helpers from '@ideadesignmedia/helpers'
import * as http from 'http'
import type { RequestOptions } from 'http'
import * as https from 'https'
import { URL } from 'url'

import { OPEN_AI_ENDPOINT, OPEN_AI_ORGANIZATION, OPEN_AI_SECRET, jsonHeaders } from './config'
import { ResponseStream } from './stream'
import type { JsonRecord, NodeFormData } from './types'

const utilBinding = require('util') as typeof import('util') & { isArray?: (value: unknown) => boolean }
utilBinding.isArray = Array.isArray

const FormDataConstructor = require('form-data') as typeof import('form-data')

const rawRequest = helpers.request

const request = async <TResponse>(url: string, options: RequestOptions, body?: string): Promise<TResponse> => {
  const result = await rawRequest<TResponse | string>(url, options, body)
  return result as TResponse
}

const post = async <TResponse, TRequest>(path: string, data: TRequest): Promise<TResponse> => {
  return request<TResponse>(
    `${OPEN_AI_ENDPOINT}${path}`,
    {
      method: 'POST',
      headers: jsonHeaders()
    },
    JSON.stringify(data)
  )
}

const get = async <TResponse>(path: string): Promise<TResponse> => {
  return request<TResponse>(`${OPEN_AI_ENDPOINT}${path}`, {
    method: 'GET',
    headers: jsonHeaders()
  })
}

const del = async <TResponse>(path: string): Promise<TResponse> => {
  return request<TResponse>(`${OPEN_AI_ENDPOINT}${path}`, {
    method: 'DELETE',
    headers: jsonHeaders()
  })
}

const postStream = (path: string, data?: JsonRecord): Promise<ResponseStream> => new Promise((resolve, reject) => {
  const url = new URL(`${OPEN_AI_ENDPOINT}${path}`)
  const provider = url.protocol === 'https:' ? https : http
  const req = provider.request(
    url,
    {
      method: 'POST',
      headers: jsonHeaders()
    },
    response => resolve(new ResponseStream(response))
  )
  req.on('error', reject)
  if (data !== undefined) {
    req.write(JSON.stringify(data))
  }
  req.end()
})

const postForm = <TResponse>(path: string, form: NodeFormData, parser: (input: string) => TResponse): Promise<TResponse> => new Promise((resolve, reject) => {
  const url = new URL(`${OPEN_AI_ENDPOINT}${path}`)
  const provider = url.protocol === 'https:' ? https : http
  const headers = {
    ...form.getHeaders(),
    Authorization: `Bearer ${OPEN_AI_SECRET}`,
    'OpenAI-Organization': OPEN_AI_ORGANIZATION
  } as Record<string, string | undefined>

  const req = provider.request(url, {
    method: 'POST',
    headers
  })
  req.on('error', reject)
  req.on('response', response => {
    let output = ''
    response.on('data', (chunk: Buffer | string) => {
      output += chunk.toString()
    })
    response.on('end', () => {
      try {
        resolve(parser(output))
      } catch (error) {
        reject(error)
      }
    })
  })
  form.pipe(req)
})

const createFormData = (): NodeFormData => new FormDataConstructor() as NodeFormData

export { request, post, get, del, postStream, postForm, createFormData }


import type {
  ChatCompletionRequestOptions,
  ChatCompletionResponse,
  ChatRole,
  CompletionRequestOptions,
  JsonRecord,
  JsonValue,
  MessagePayload,
  ResponseStream,
  TextCompletionResponse
} from './types'
import { post, postStream } from './http'

interface CompletionRequestPayload extends CompletionRequestOptions, JsonRecord {
  prompt: string
  n: number
  stop?: string | string[]
  stream?: boolean
}

interface ChatCompletionRequestPayload extends ChatCompletionRequestOptions, JsonRecord {
  messages: MessagePayload[]
  n: number
  stop?: string | string[]
  stream?: boolean
}

const Message = <TContent extends JsonValue = string>(content: TContent, role: ChatRole = 'assistant'): MessagePayload<TContent> => ({
  role,
  content
})

const completion = (
  prompt = '',
  resultCount = 1,
  stop?: string | string[],
  options: CompletionRequestOptions = { model: 'gpt-4o-mini-instruct' }
): Promise<TextCompletionResponse> => {
  const payload: CompletionRequestPayload = {
    prompt,
    n: resultCount,
    ...options
  }
  if (stop) {
    payload.stop = stop
  }
  return post<TextCompletionResponse, CompletionRequestPayload>('/v1/completions', payload)
}

const chatCompletion = (
  messages: MessagePayload[] = [],
  resultCount = 1,
  stop?: string | string[],
  options: ChatCompletionRequestOptions = { model: 'gpt-4o-mini' }
): Promise<ChatCompletionResponse> => {
  const payload: ChatCompletionRequestPayload = {
    messages,
    n: resultCount,
    ...options
  }
  if (stop) {
    payload.stop = stop
  }
  return post<ChatCompletionResponse, ChatCompletionRequestPayload>('/v1/chat/completions', payload)
}

const completionStream = (
  prompt: string,
  resultCount = 1,
  stop?: string | string[],
  options: CompletionRequestOptions = { model: 'gpt-4o-mini-instruct' }
): Promise<ResponseStream> => {
  const payload: CompletionRequestPayload = {
    prompt,
    n: resultCount,
    ...options
  }
  if (stop) {
    payload.stop = stop
  }
  const streamPayload: JsonRecord = { ...payload, stream: true }
  return postStream('/v1/completions', streamPayload)
}

const chatCompletionStream = (
  messages: MessagePayload[] = [],
  resultCount = 1,
  stop?: string | string[],
  options: ChatCompletionRequestOptions = { model: 'gpt-4o-mini' }
): Promise<ResponseStream> => {
  const payload: ChatCompletionRequestPayload = {
    messages,
    n: resultCount,
    ...options,
    stream: true
  }
  if (stop) {
    payload.stop = stop
  }
  const streamPayload: JsonRecord = payload
  return postStream('/v1/chat/completions', streamPayload)
}

export { Message, completion, completionStream, chatCompletion, chatCompletionStream }

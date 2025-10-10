import type { HttpClient } from './http'
import type {
  ChatCompletionRequestOptions,
  ChatCompletionResponse,
  ChatCompletionsFunctionTool,
  ChatRole,
  CompletionRequestOptions,
  JsonRecord,
  JsonValue,
  MessagePayload,
  ResponseStream,
  TextCompletionResponse
} from './types'

/**
 * Internal payload for `/v1/completions` requests with helper defaults baked in.
 */
interface CompletionRequestPayload extends CompletionRequestOptions, JsonRecord {
  prompt: string
  n: number
  stop?: string | string[]
  stream?: boolean
}

/**
 * Internal payload for `/v1/chat/completions` requests with helper defaults baked in.
 */
interface ChatCompletionRequestPayload<
  TTools extends readonly ChatCompletionsFunctionTool[] = readonly ChatCompletionsFunctionTool[]
> extends ChatCompletionRequestOptions<TTools> {
  messages: MessagePayload[]
  n: number
  stop?: string | string[]
  stream?: boolean
}

/**
 * Creates a strongly typed chat message payload for the OpenAI Chat API.
 *
 * @param content - Message body (text, JSON, or structured array/object content).
 * @param role - Chat role to attach to the message; defaults to `assistant`.
 */
const Message = <TContent extends JsonValue = string>(content: TContent, role: ChatRole = 'assistant'): MessagePayload<TContent> => ({
  role,
  content
})

/**
 * Creates a chat/completions helper set bound to the provided HTTP client.
 *
 * @param http - Preconfigured HTTP client used to call the REST endpoints.
 */
const createChatClient = (http: HttpClient) => {
  /**
   * Calls `/v1/completions` with sane defaults for simple text completion scenarios.
   *
   * @param prompt - Text prompt to send; defaults to an empty string for backwards compatibility.
   * @param resultCount - Number of completions to request (maps to `n`).
   * @param stop - Optional stop sequence(s) to truncate generation.
   * @param options - Additional completion options (model, temperature, etc.).
   */
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
    return http.post<TextCompletionResponse, CompletionRequestPayload>('/v1/completions', payload)
  }

  /**
   * Calls `/v1/chat/completions` with a message array and helper defaults.
   *
   * @param messages - Chat history (defaults to empty array).
   * @param resultCount - Number of completions to request (maps to `n`).
   * @param stop - Optional stop sequence(s) to truncate generation.
   * @param options - Additional chat completion options (model, temperature, tools, etc.).
   */
  const chatCompletion = <
    TTools extends readonly ChatCompletionsFunctionTool[] = readonly ChatCompletionsFunctionTool[]
  >(
    messages: MessagePayload[] = [],
    resultCount = 1,
    stop?: string | string[],
    options: ChatCompletionRequestOptions<TTools> = { model: 'gpt-4o-mini' } as ChatCompletionRequestOptions<TTools>
  ): Promise<ChatCompletionResponse> => {
    const payload: ChatCompletionRequestPayload<TTools> = {
      messages,
      n: resultCount,
      ...options
    }
    if (stop) {
      payload.stop = stop
    }
    return http.post<ChatCompletionResponse, ChatCompletionRequestPayload>('/v1/chat/completions', payload)
  }

  /**
   * Creates an SSE stream for `/v1/completions` results.
   *
   * @param prompt - Prompt text that must be provided for streaming.
   * @param resultCount - Number of completions to stream (maps to `n`).
   * @param stop - Optional stop sequences to enforce server-side.
   * @param options - Completion options; merged with stream flag.
   */
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
    return http.postStream('/v1/completions', streamPayload)
  }

  /**
   * Creates an SSE stream for `/v1/chat/completions` responses.
   *
   * @param messages - Chat messages to send with the request.
   * @param resultCount - Number of chat completions requested.
   * @param stop - Optional stop sequences to enforce server-side.
   * @param options - Additional chat completion request options.
   */
  const chatCompletionStream = <
    TTools extends readonly ChatCompletionsFunctionTool[] = readonly ChatCompletionsFunctionTool[]
  >(
    messages: MessagePayload[] = [],
    resultCount = 1,
    stop?: string | string[],
    options: ChatCompletionRequestOptions<TTools> = { model: 'gpt-4o-mini' } as ChatCompletionRequestOptions<TTools>
  ): Promise<ResponseStream> => {
    const payload: ChatCompletionRequestPayload<TTools> = {
      messages,
      n: resultCount,
      ...options,
      stream: true
    }
    if (stop) {
      payload.stop = stop
    }
    const streamPayload: JsonRecord = payload
    return http.postStream('/v1/chat/completions', streamPayload)
  }

  /**
   * Helpers for synchronous and streaming completion requests bound to this client.
   */
  return {
    completion,
    completionStream,
    chatCompletion,
    chatCompletionStream
  }
}

export { Message, createChatClient }

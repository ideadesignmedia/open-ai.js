import argsModule from '@ideadesignmedia/arguments.js'
import helpers from '@ideadesignmedia/helpers'
import * as http from 'http'
import * as https from 'https'
import type { IncomingMessage, RequestOptions } from 'http'
import { URL } from 'url'
import { EventEmitter } from 'events'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { exec } from 'child_process'
import sharp from 'sharp'

const utilBinding = require('util') as typeof import('util') & { isArray?: (value: unknown) => boolean }
utilBinding.isArray = Array.isArray

const FormData = require('form-data') as typeof import('form-data')

type NodeFormData = import('form-data')

type JsonPrimitive = string | number | boolean | null

type JsonValue = JsonPrimitive | JsonRecord | JsonValue[] | undefined

type JsonRecord = { [key: string]: JsonValue }

type JsonObject = JsonRecord

type UnixTimestamp = number

type Nullable<T> = T | null

type Dictionary<T = JsonValue> = Record<string, T>

interface EnvArgs {
  OPEN_AI_SECRET?: string
  OPEN_AI_API_KEY?: string
  OPEN_AI_ORGANIZATION?: string
}

type ChatRole = 'assistant' | 'system' | 'user' | 'tool'

interface MessagePayload<TContent extends JsonValue = string> extends JsonRecord {
  role: ChatRole
  content: TContent
}

interface CompletionLogprobs {
  tokens: string[]
  token_logprobs: number[]
  top_logprobs: Array<Record<string, number>>
  text_offset: number[]
}

interface TextCompletionChoice {
  text: string
  index: number
  logprobs: CompletionLogprobs | null
  finish_reason: Nullable<'stop' | 'length' | 'content_filter'>
}

interface UsageMetrics {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
}

interface TextCompletionResponse {
  id: string
  object: 'text_completion'
  created: UnixTimestamp
  model: string
  choices: TextCompletionChoice[]
  usage: UsageMetrics
}

interface ChatToolCallFunction extends JsonRecord {
  name: string
  arguments: string
}

interface ChatToolCall extends JsonRecord {
  id: string
  type: 'function'
  function: ChatToolCallFunction
}

interface ChatCompletionMessage extends MessagePayload<string> {
  name?: string
  tool_calls?: ChatToolCall[]
  refusal?: string | null
}

interface ChatCompletionChoice {
  index: number
  message: ChatCompletionMessage
  finish_reason: Nullable<'stop' | 'length' | 'tool_calls' | 'content_filter'>
  logprobs?: null
}

interface ChatCompletionResponse {
  id: string
  object: 'chat.completion'
  created: UnixTimestamp
  model: string
  choices: ChatCompletionChoice[]
  usage: UsageMetrics
  system_fingerprint?: string
}

interface ChatCompletionStreamChoiceDelta {
  [key: string]: JsonValue
  delta?: {
    role?: ChatRole
    content?: string
  }
  index: number
  finish_reason?: Nullable<'stop' | 'length' | 'tool_calls' | 'content_filter'>
}

interface StreamErrorPayload {
  [key: string]: JsonValue
  message: string
  type?: string
  code?: string | null
  param?: string | null
}

interface CompletionStreamPayload extends JsonRecord {
  choices?: ChatCompletionStreamChoiceDelta[]
  error?: StreamErrorPayload
}

interface ResponseUsage {
  total_tokens: number
  input_tokens: number
  output_tokens: number
}

interface ResponseOutputText {
  type: 'output_text'
  text: string
  annotations?: JsonValue[]
}

interface ResponseOutputToolCall {
  type: 'tool_call'
  tool_call_id: string
  output: JsonValue
}

type ResponseOutputItem = ResponseOutputText | ResponseOutputToolCall | { type: string; [key: string]: JsonValue }

interface ResponseStatusDetails {
  error?: StreamErrorPayload
  type?: string
}

interface ResponseObject {
  id: string
  object: 'response'
  created: UnixTimestamp
  model: string
  status: 'in_progress' | 'queued' | 'completed' | 'requires_action' | 'cancelled' | 'failed' | 'expired'
  output: ResponseOutputItem[]
  usage?: ResponseUsage
  metadata?: Dictionary
  instructions?: string | null
  status_details?: ResponseStatusDetails | null
  input?: JsonValue
}

interface SpeechGenerationOptions {
  model?: string
  responseFormat?: 'mp3' | 'opus' | 'aac' | 'flac' | 'wav' | 'pcm' | 'json'
  speed?: number
}


type AudioSpeechResponse = string | {
  audio: string
  format: string
  voice: string
}

interface FineTuningJob {
  id: string
  object: 'fine_tuning.job'
  model: string
  created_at: UnixTimestamp
  finished_at: Nullable<UnixTimestamp>
  status: 'validating_files' | 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled'
  fine_tuned_model: Nullable<string>
  error?: StreamErrorPayload | null
  training_file: string
  validation_file?: string | null
  result_files: string[]
  hyperparameters?: Dictionary
  metadata?: Dictionary
  organization_id?: string
}

interface FineTuningJobEvent {
  id: string
  object: 'fine_tuning.job.event'
  created_at: UnixTimestamp
  level: 'info' | 'warn' | 'error'
  message: string
  data?: Dictionary
}

interface FineTuningJobCheckpoint {
  id: string
  object: 'fine_tuning.job.checkpoint'
  created_at: UnixTimestamp
  metrics?: Dictionary<number>
  fine_tuned_model_checkpoint?: string | null
  step_number?: number
}

interface VectorStore {
  id: string
  object: 'vector_store'
  created_at: UnixTimestamp
  name?: string
  status?: 'in_progress' | 'completed' | 'failed' | 'cancelled'
  metadata?: Dictionary
  usage_bytes?: number
}

interface VectorStoreFileAssociation {
  id: string
  object: 'vector_store.file'
  created_at: UnixTimestamp
  vector_store_id?: string
  status?: 'in_progress' | 'completed' | 'failed'
  last_error?: StreamErrorPayload | null
  attributes?: Dictionary
}

interface VectorStoreSearchResult {
  id: string
  object: 'vector_store.document'
  score: number
  attributes?: Dictionary
  document?: Dictionary
}

interface VectorStoreSearchResponse {
  object: 'list'
  data: VectorStoreSearchResult[]
}

interface VectorStoreDeletion {
  id: string
  object: 'vector_store'
  deleted: boolean
}

type ImageSize = '256x256' | '512x512' | '1024x1024'

interface ImageDataItem {
  url?: string
  b64_json?: string
  revised_prompt?: string
}

interface ImageResponse {
  created: UnixTimestamp
  data: ImageDataItem[]
}

interface EmbeddingItem {
  object: 'embedding'
  embedding: number[]
  index: number
}

interface EmbeddingResponse {
  data: EmbeddingItem[]
  model: string
  usage: {
    prompt_tokens: number
    total_tokens: number
  }
}

interface WhisperSegment {
  id: number
  seek: number
  start: number
  end: number
  text: string
  tokens: number[]
  temperature: number
  avg_logprob: number
  compression_ratio: number
  no_speech_prob: number
  transient?: boolean
}

interface WhisperTranscriptionResponse {
  text: string
  segments?: WhisperSegment[]
  language?: string
  duration?: number
  task?: string
}

type WhisperResponseFormat = 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt'

type WhisperTranscriptionResult<TFormat extends WhisperResponseFormat> = TFormat extends 'json' | 'verbose_json' ? WhisperTranscriptionResponse : string

interface FileObject {
  id: string
  object: 'file'
  bytes: number
  created_at: UnixTimestamp
  filename: string
  purpose: string
  status?: string
  status_details?: string | null
}

interface FileListResponse {
  object: 'list'
  data: FileObject[]
}

interface DeleteResponse {
  id: string
  object: string
  deleted: boolean
}

interface ModerationCategoryScores {
  [category: string]: number
}

interface ModerationCategories {
  [category: string]: boolean
}

interface ModerationResult {
  categories: ModerationCategories
  category_scores: ModerationCategoryScores
  flagged: boolean
}

interface ModerationResponse {
  id: string
  model: string
  results: ModerationResult[]
}

interface ModelPermission {
  id: string
  object: 'model_permission'
  created: UnixTimestamp
  allow_create_engine: boolean
  allow_sampling: boolean
  allow_logprobs: boolean
  allow_search_indices: boolean
  allow_view: boolean
  allow_fine_tuning: boolean
  organization: string
  group?: string | null
  is_blocking: boolean
}

interface ModelInfo {
  id: string
  object: 'model'
  created?: UnixTimestamp
  owned_by: string
  permission?: ModelPermission[]
  root?: string
  parent?: string | null
}

interface ListResponse<T> {
  object: 'list'
  data: T[]
  has_more?: boolean
}

type CompletionRequestOptions = JsonRecord & {
  model?: string
  temperature?: number
  max_tokens?: number
  top_p?: number
  frequency_penalty?: number
  presence_penalty?: number
  logprobs?: number | null
  echo?: boolean
  user?: string
  best_of?: number
  suffix?: string | null
  logit_bias?: Record<string, number>
}

type ChatCompletionRequestOptions = JsonRecord & {
  model?: string
  temperature?: number
  max_tokens?: number
  top_p?: number
  frequency_penalty?: number
  presence_penalty?: number
  user?: string
  response_format?: { type: 'json_schema'; json_schema: JsonObject } | { type: 'text' }
  tools?: Array<{
    type: string
    function?: {
      name: string
      description?: string
      parameters?: JsonObject
    }
  }>
  tool_choice?: 'none' | 'auto' | { type: 'function'; function: { name: string } }
}


type ResponseToolDefinition = {
  type: 'code_interpreter' | 'file_search' | 'image_generation' | 'function' | 'mcp' | string
  [key: string]: JsonValue
}

type ResponseInput = string | JsonValue | Array<MessagePayload | JsonValue>

interface ResponseCreateParams {
  [key: string]: JsonValue
  model: string
  input?: ResponseInput
  instructions?: string
  metadata?: Dictionary
  tools?: ResponseToolDefinition[]
  reasoning?: {
    effort?: 'low' | 'medium' | 'high'
    summary?: 'auto'
  }
  include?: string[]
  background?: boolean
}

type VectorSize = 0 | 1 | 2

type ResponseStreamEvent = string[]

type ResponseStreamError = StreamErrorPayload | Error

interface OpenAIHelpers {
  post: <TResponse, TRequest>(path: string, data: TRequest) => Promise<TResponse>
  get: <TResponse>(path: string) => Promise<TResponse>
  del: <TResponse>(path: string) => Promise<TResponse>
  postStream: <TPayload extends JsonObject>(path: string, data?: TPayload) => Promise<ResponseStream>
  postForm: <TResponse>(path: string, form: NodeFormData, parser: (input: string) => TResponse) => Promise<TResponse>
  Message: <TContent extends JsonValue = string>(content: TContent, role?: ChatRole) => MessagePayload<TContent>
  completion: (
    prompt?: string,
    resultCount?: number,
    stop?: string | string[],
    options?: CompletionRequestOptions
  ) => Promise<TextCompletionResponse>
  completionStream: (
    prompt: string,
    resultCount?: number,
    stop?: string | string[],
    options?: CompletionRequestOptions
  ) => Promise<ResponseStream>
  chatCompletion: (
    messages?: MessagePayload[],
    resultCount?: number,
    stop?: string | string[],
    options?: ChatCompletionRequestOptions
  ) => Promise<ChatCompletionResponse>
  chatCompletionStream: (
    messages?: MessagePayload[],
    resultCount?: number,
    stop?: string | string[],
    options?: ChatCompletionRequestOptions
  ) => Promise<ResponseStream>
  createResponse: (payload: ResponseCreateParams) => Promise<ResponseObject>
  createResponseStream: (payload: ResponseCreateParams) => Promise<ResponseStream>
  getResponse: (id: string) => Promise<ResponseObject>
  cancelResponse: (id: string) => Promise<ResponseObject>
  generateSpeech: (input: string, voice?: string, options?: SpeechGenerationOptions) => Promise<AudioSpeechResponse>
  listFineTuningJobs: () => Promise<ListResponse<FineTuningJob>>
  retrieveFineTuningJob: (id: string) => Promise<FineTuningJob>
  createFineTuningJob: (payload: Dictionary) => Promise<FineTuningJob>
  cancelFineTuningJob: (id: string) => Promise<FineTuningJob>
  listFineTuningJobEvents: (id: string) => Promise<ListResponse<FineTuningJobEvent>>
  listFineTuningJobCheckpoints: (id: string) => Promise<ListResponse<FineTuningJobCheckpoint>>
  searchVectorStore: (vectorStoreId: string, query: string, options?: {
    filters?: Dictionary
    maxNumResults?: number
    rewriteQuery?: boolean
  }) => Promise<VectorStoreSearchResponse>
  addFileToVectorStore: (vectorStoreId: string, fileId: string, attributes?: Dictionary) => Promise<VectorStoreFileAssociation>
  createVectorStore: (name?: string, metadata?: Dictionary) => Promise<VectorStore>
  getVectorStore: (vectorStoreId: string) => Promise<VectorStore>
  deleteVectorStore: (vectorStoreId: string) => Promise<VectorStoreDeletion>
  generateImage: (
    prompt: string,
    resultCount?: number,
    size?: VectorSize,
    responseFormat?: 'url' | 'b64_json' | 'file',
    user?: string
  ) => Promise<ImageResponse>
  editImage: (
    imagePath: string,
    prompt: string,
    mask?: string | null,
    resultCount?: number,
    size?: VectorSize,
    responseFormat?: 'url' | 'b64_json' | 'file',
    user?: string
  ) => Promise<ImageResponse>
  getImageVariations: (
    imagePath: string,
    resultCount?: number,
    size?: VectorSize,
    responseFormat?: 'url' | 'b64_json' | 'file',
    user?: string
  ) => Promise<ImageResponse>
  getEmbedding: (input: string | string[], model?: string, user?: string) => Promise<EmbeddingResponse>
  getTranscription: <TFormat extends WhisperResponseFormat = 'json'>(
    file: string,
    prompt?: string,
    language?: string,
    responseFormat?: TFormat,
    temperature?: number
  ) => Promise<WhisperTranscriptionResult<TFormat>>
  getTranslation: <TFormat extends WhisperResponseFormat = 'json'>(
    file: string,
    prompt?: string,
    responseFormat?: TFormat,
    temperature?: number
  ) => Promise<WhisperTranscriptionResult<TFormat>>
  getFiles: () => Promise<FileListResponse>
  getFile: (id: string) => Promise<FileObject>
  getFileContent: (id: string) => Promise<string>
  uploadFile: (file: string, purpose?: string) => Promise<FileObject>
  deleteFile: (id: string) => Promise<DeleteResponse>
  moderation: (input: string | string[], model?: string) => Promise<ModerationResponse>
  getModels: () => Promise<ListResponse<ModelInfo>>
  getModel: (model: string) => Promise<ModelInfo>
}


class ResponseStream {
  readonly emitter: EventEmitter
  onData?: (chunk: ResponseStreamEvent) => void
  onComplete?: (result: ResponseStreamEvent) => void
  onError?: (error: ResponseStreamError) => void

  private readonly stream: IncomingMessage
  private buffer: string
  private readonly chunks: ResponseStreamEvent[]
  private errorPayload: StreamErrorPayload | null

  constructor(stream: IncomingMessage) {
    this.stream = stream
    this.emitter = new EventEmitter()
    this.buffer = ''
    this.chunks = []
    this.errorPayload = null

    this.stream.on('error', (error: Error) => {
      this.emitter.emit('error', error)
      if (this.onError) this.onError(error)
    })

    this.stream.on('data', (chunk: Buffer | string) => {
      try {
        this.handleChunk(typeof chunk === 'string' ? chunk : chunk.toString())
      } catch (error) {
        const castError = error instanceof Error ? error : new Error(String(error))
        this.emitter.emit('error', castError)
        if (this.onError) this.onError(castError)
        this.stream.destroy(castError)
      }
    })

    this.stream.on('end', () => {
      this.flushBuffer()
      if (this.errorPayload) {
        const payloadError = new Error(this.errorPayload.message)
        payloadError.name = this.errorPayload.type ?? 'StreamError'
        if (this.onError) this.onError(this.errorPayload)
        this.emitter.emit('error', payloadError)
        return
      }
      const aggregated = this.chunks.reduce<string[]>((acc, cur) => {
        return cur.map((value, index) => (acc[index] ?? '') + value)
      }, [])
      if (this.onComplete) this.onComplete(aggregated)
      this.emitter.emit('complete', aggregated)
    })

    this.emitter.on('data', chunk => {
      if (this.onData) this.onData(chunk as ResponseStreamEvent)
    })
    this.emitter.on('complete', result => {
      if (this.onComplete) this.onComplete(result as ResponseStreamEvent)
    })
  }

  private handleChunk(data: string): void {
    this.buffer += data
    const rows = this.buffer.split('\n')
    this.buffer = rows.pop() ?? ''
    for (const rawLine of rows) {
      const line = rawLine.trim()
      if (!line.startsWith('data: ')) continue
      const payload = line.replace(/^data: /, '')
      this.consumePayload(payload)
    }
  }

  private consumePayload(raw: string): void {
    if (raw.trim() === '' || raw.trim() === '[DONE]') {
      return
    }
    const parsed = parseJson(raw)
    if (isCompletionStreamPayload(parsed) && parsed.choices) {
      const choices = parsed.choices
        .filter(choice => !choice.delta?.role)
        .map(choice => choice.delta?.content ?? '')
      if (choices.length > 0) {
        this.chunks.push(choices)
        this.emitter.emit('data', choices)
      }
    }
    if (isCompletionStreamPayload(parsed) && parsed.error) {
      this.errorPayload = parsed.error
    }
  }

  private flushBuffer(): void {
    const bufferContent = this.buffer.trim()
    if (bufferContent) {
      this.consumePayload(bufferContent)
    }
    this.buffer = ''
  }
}


const parseJson = (data: string): JsonValue => JSON.parse(data) as JsonValue

const isJsonObject = (value: JsonValue): value is JsonObject => typeof value === 'object' && value !== null && !Array.isArray(value)

const isCompletionStreamPayload = (value: JsonValue): value is CompletionStreamPayload => {
  if (!isJsonObject(value)) return false
  const possibleChoices = value.choices
  const possibleError = value.error
  const hasChoices = Array.isArray(possibleChoices)
  const hasError = typeof possibleError === 'object' && possibleError !== null
  return hasChoices || hasError
}

const rawRequest = helpers.request

const request = async <TResponse>(
  url: string,
  options: RequestOptions & { headers?: Record<string, string | undefined> },
  body?: string | Buffer
): Promise<TResponse> => {
  const result = await rawRequest<TResponse>(url, options, body)
  return result as TResponse
}

type ArgumentsModule = Partial<EnvArgs> & Dictionary<string | undefined>

const { OPEN_AI_SECRET, OPEN_AI_ORGANIZATION } = (() => {
  const args = argsModule as ArgumentsModule
  let secret = args.OPEN_AI_SECRET ?? args.OPEN_AI_API_KEY
  let organization = args.OPEN_AI_ORGANIZATION
  if (!secret) secret = process.env.OPEN_AI_SECRET ?? process.env.OPEN_AI_API_KEY
  if (!organization) organization = process.env.OPEN_AI_ORGANIZATION
  return { OPEN_AI_SECRET: secret, OPEN_AI_ORGANIZATION: organization }
})()

if (!OPEN_AI_SECRET) {
  throw new Error('OPEN_AI_SECRET or OPEN_AI_API_KEY must be defined')
}

const OPEN_AI_ENDPOINT = process.env.OPEN_AI_ENDPOINT ?? 'https://api.openai.com'

const jsonHeaders = (): Record<string, string | undefined> => ({
  Authorization: `Bearer ${OPEN_AI_SECRET}`,
  'OpenAI-Organization': OPEN_AI_ORGANIZATION,
  'Content-Type': 'application/json'
})

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
    response.on('data', chunk => {
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

interface CompletionRequestPayload extends CompletionRequestOptions {
  [key: string]: JsonValue
  prompt: string
  n: number
  stop?: string | string[]
  stream?: boolean
}

interface ChatCompletionRequestPayload extends ChatCompletionRequestOptions {
  [key: string]: JsonValue
  messages: MessagePayload[]
  n: number
  stop?: string | string[]
  stream?: boolean
}


const Message = <TContent extends JsonValue = string>(content: TContent, role: ChatRole = 'assistant'): MessagePayload<TContent> => ({ role, content })

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

const createResponse = (payload: ResponseCreateParams): Promise<ResponseObject> => {
  return post<ResponseObject, ResponseCreateParams>('/v1/responses', payload)
}

const createResponseStream = (payload: ResponseCreateParams): Promise<ResponseStream> => {
  const streamPayload: JsonRecord = { ...payload, stream: true }
  return postStream('/v1/responses', streamPayload)
}

const getResponse = (id: string): Promise<ResponseObject> => get<ResponseObject>(`/v1/responses/${id}`)

const cancelResponse = (id: string): Promise<ResponseObject> => post<ResponseObject, Record<string, never>>(`/v1/responses/${id}/cancel`, {})


const generateSpeech = (
  input: string,
  voice = 'nova',
  { model = 'tts-1', responseFormat = 'mp3', speed = 1.0 }: SpeechGenerationOptions = {}
): Promise<AudioSpeechResponse> => {
  return post<AudioSpeechResponse, { input: string; model: string; voice: string; response_format: string; speed: number }>(
    '/v1/audio/speech',
    {
      input,
      model,
      voice,
      response_format: responseFormat,
      speed
    }
  )
}

const listFineTuningJobs = (): Promise<ListResponse<FineTuningJob>> => get<ListResponse<FineTuningJob>>('/v1/fine_tuning/jobs')

const retrieveFineTuningJob = (id: string): Promise<FineTuningJob> => get<FineTuningJob>(`/v1/fine_tuning/jobs/${id}`)

const createFineTuningJob = (payload: Dictionary): Promise<FineTuningJob> => post<FineTuningJob, Dictionary>('/v1/fine_tuning/jobs', payload)

const cancelFineTuningJob = (id: string): Promise<FineTuningJob> => post<FineTuningJob, Record<string, never>>(`/v1/fine_tuning/jobs/${id}/cancel`, {})

const listFineTuningJobEvents = (id: string): Promise<ListResponse<FineTuningJobEvent>> => get<ListResponse<FineTuningJobEvent>>(`/v1/fine_tuning/jobs/${id}/events`)

const listFineTuningJobCheckpoints = (id: string): Promise<ListResponse<FineTuningJobCheckpoint>> => get<ListResponse<FineTuningJobCheckpoint>>(`/v1/fine_tuning/jobs/${id}/checkpoints`)

const searchVectorStore = (
  vectorStoreId: string,
  query: string,
  { filters, maxNumResults = 10, rewriteQuery = false }: {
    filters?: Dictionary
    maxNumResults?: number
    rewriteQuery?: boolean
  } = {}
): Promise<VectorStoreSearchResponse> => {
  return post<VectorStoreSearchResponse, { query: string; max_num_results: number; rewrite_query: boolean; filters?: Dictionary }>(
    `/v1/vector_stores/${vectorStoreId}/search`,
    {
      query,
      max_num_results: maxNumResults,
      rewrite_query: rewriteQuery,
      ...(filters ? { filters } : {})
    }
  )
}

const addFileToVectorStore = (vectorStoreId: string, fileId: string, attributes: Dictionary = {}): Promise<VectorStoreFileAssociation> => {
  return post<VectorStoreFileAssociation, { file_id: string; attributes: Dictionary }>(
    `/v1/vector_stores/${vectorStoreId}/files`,
    {
      file_id: fileId,
      attributes
    }
  )
}

const createVectorStore = (name?: string, metadata?: Dictionary): Promise<VectorStore> => {
  return post<VectorStore, { name?: string; metadata?: Dictionary }>('/v1/vector_stores', {
    name,
    metadata
  })
}

const getVectorStore = (vectorStoreId: string): Promise<VectorStore> => get<VectorStore>(`/v1/vector_stores/${vectorStoreId}`)

const deleteVectorStore = (vectorStoreId: string): Promise<VectorStoreDeletion> => del<VectorStoreDeletion>(`/v1/vector_stores/${vectorStoreId}`)


const imageSize = (size: VectorSize): ImageSize => {
  switch (size) {
    case 0:
      return '256x256'
    case 1:
      return '512x512'
    case 2:
      return '1024x1024'
    default:
      return '256x256'
  }
}

const sizeToDimensions = (size: ImageSize): { width: number; height: number } => {
  const [widthString, heightString] = size.split('x')
  const width = Number.parseInt(widthString, 10)
  const height = Number.parseInt(heightString, 10)
  return {
    width,
    height
  }
}

const createPng = async (sourcePath: string, size: ImageSize): Promise<string> => {
  const absoluteSource = path.resolve(sourcePath)
  const { width, height } = sizeToDimensions(size)
  const temporaryImage = path.join(os.tmpdir(), `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}.png`)
  await sharp(absoluteSource)
    .resize(width, height, { fit: 'contain' })
    .png()
    .toFile(temporaryImage)
  return temporaryImage
}

const generateImage = (
  prompt: string,
  resultCount = 1,
  size: VectorSize = 0,
  responseFormat: 'url' | 'b64_json' | 'file' = 'url',
  user?: string
): Promise<ImageResponse> => {
  return post<ImageResponse, { prompt: string; n: number; response_format: string; size: ImageSize; user?: string }>(
    '/v1/images/generations',
    {
      n: Math.max(1, Math.min(10, resultCount)),
      prompt,
      response_format: responseFormat === 'file' ? 'url' : responseFormat,
      size: imageSize(size),
      user
    }
  )
}

const editImage = async (
  imagePath: string,
  prompt: string,
  mask?: string | null,
  resultCount = 1,
  size: VectorSize = 0,
  responseFormat: 'url' | 'b64_json' | 'file' = 'url',
  user?: string
): Promise<ImageResponse> => {
  const derivedSize = imageSize(size)
  const temporaryImage = await createPng(path.isAbsolute(imagePath) ? imagePath : path.resolve(imagePath), derivedSize)
  const temporaryMask = mask ? await createPng(path.isAbsolute(mask) ? mask : path.resolve(mask), derivedSize) : null
  const form = new FormData()
  form.append('prompt', prompt)
  form.append('image', fs.createReadStream(temporaryImage))
  if (temporaryMask) {
    form.append('mask', fs.createReadStream(temporaryMask))
  }
  form.append('n', Math.max(Math.min(10, resultCount), 1))
  form.append('response_format', responseFormat === 'file' ? 'url' : responseFormat)
  form.append('size', derivedSize)
  if (user) {
    form.append('user', user)
  }
  try {
    return await postForm<ImageResponse>('/v1/images/edits', form, raw => JSON.parse(raw) as ImageResponse)
  } finally {
    try {
      if (fs.existsSync(temporaryImage)) fs.unlinkSync(temporaryImage)
    } catch {
    }
    if (temporaryMask) {
      try {
        if (fs.existsSync(temporaryMask)) fs.unlinkSync(temporaryMask)
      } catch {
      }
    }
  }
}

const getImageVariations = async (
  imagePath: string,
  resultCount = 1,
  size: VectorSize = 0,
  responseFormat: 'url' | 'b64_json' | 'file' = 'url',
  user?: string
): Promise<ImageResponse> => {
  const derivedSize = imageSize(size)
  const temporaryImage = await createPng(path.isAbsolute(imagePath) ? imagePath : path.resolve(imagePath), derivedSize)
  const form = new FormData()
  form.append('image', fs.createReadStream(temporaryImage))
  form.append('n', Math.max(1, Math.min(10, resultCount)))
  form.append('response_format', responseFormat === 'file' ? 'url' : responseFormat)
  form.append('size', derivedSize)
  if (user) {
    form.append('user', user)
  }
  try {
    return await postForm<ImageResponse>('/v1/images/variations', form, raw => JSON.parse(raw) as ImageResponse)
  } finally {
    try {
      if (fs.existsSync(temporaryImage)) fs.unlinkSync(temporaryImage)
    } catch {
    }
  }
}


const getEmbedding = (input: string | string[], model = 'text-embedding-3-small', user?: string): Promise<EmbeddingResponse> => {
  return post<EmbeddingResponse, { model: string; input: string | string[]; user?: string }>('/v1/embeddings', {
    model,
    input,
    user
  })
}

const getTranscription = async <TFormat extends WhisperResponseFormat = 'json'>(
  file: string,
  prompt = '',
  language = 'en',
  responseFormat?: TFormat,
  temperature = 0
): Promise<WhisperTranscriptionResult<TFormat>> => {
  const format = responseFormat ?? 'json'
  const form = new FormData()
  if (prompt) form.append('prompt', prompt)
  form.append('temperature', temperature)
  if (language) form.append('language', language)
  form.append('response_format', format)
  form.append('model', 'whisper-1')
  form.append('file', fs.createReadStream(file))

  const parser = (raw: string): WhisperTranscriptionResult<TFormat> => {
    if (format === 'json' || format === 'verbose_json') {
      return JSON.parse(raw) as WhisperTranscriptionResult<TFormat>
    }
    return raw as WhisperTranscriptionResult<TFormat>
  }
  return postForm(`/v1/audio/transcriptions`, form, parser)
}

const getTranslation = async <TFormat extends WhisperResponseFormat = 'json'>(
  file: string,
  prompt = '',
  responseFormat?: TFormat,
  temperature = 0
): Promise<WhisperTranscriptionResult<TFormat>> => {
  const format = responseFormat ?? 'json'
  const form = new FormData()
  if (prompt) form.append('prompt', prompt)
  form.append('temperature', temperature)
  form.append('response_format', format)
  form.append('model', 'whisper-1')
  form.append('file', fs.createReadStream(file))
  const parser = (raw: string): WhisperTranscriptionResult<TFormat> => {
    if (format === 'json' || format === 'verbose_json') {
      return JSON.parse(raw) as WhisperTranscriptionResult<TFormat>
    }
    return raw as WhisperTranscriptionResult<TFormat>
  }
  return postForm(`/v1/audio/translations`, form, parser)
}


const getFiles = (): Promise<FileListResponse> => get<FileListResponse>('/v1/files')

const getFile = (id: string): Promise<FileObject> => get<FileObject>(`/v1/files/${id}`)

const getFileContent = async (id: string): Promise<string> => {
  const content = await get<string | Buffer | Uint8Array | JsonValue>(`/v1/files/${id}/content`)
  if (typeof content === 'string') {
    return content
  }
  if (Buffer.isBuffer(content)) {
    return content.toString('utf8')
  }
  if (content instanceof Uint8Array) {
    return Buffer.from(content).toString('utf8')
  }
  if (typeof content === 'object' && content !== null) {
    return JSON.stringify(content)
  }
  throw new Error('Unexpected file content type')
}

const uploadFile = async (file: string, purpose = 'fine-tune'): Promise<FileObject> => {
  const absolutePath = path.isAbsolute(file) ? file : path.resolve(file)
  if (!fs.existsSync(absolutePath)) {
    throw new Error('File not found: ' + absolutePath)
  }
  const form = new FormData()
  form.append('purpose', purpose)
  form.append('file', fs.createReadStream(absolutePath))
  return postForm<FileObject>('/v1/files', form, raw => JSON.parse(raw) as FileObject)
}

const deleteFile = (id: string): Promise<DeleteResponse> => del<DeleteResponse>(`/v1/files/${id}`)

const moderation = (input: string | string[], model = 'text-moderation-latest'): Promise<ModerationResponse> => {
  return post<ModerationResponse, { input: string | string[]; model: string }>('/v1/moderations', {
    input,
    model
  })
}

const getModels = (): Promise<ListResponse<ModelInfo>> => get<ListResponse<ModelInfo>>('/v1/models')

const getModel = (model: string): Promise<ModelInfo> => get<ModelInfo>(`/v1/models/${model}`)


const api: OpenAIHelpers = {
  post,
  get,
  del,
  postStream,
  postForm,
  Message,
  completion,
  completionStream,
  chatCompletion,
  chatCompletionStream,
  createResponse,
  createResponseStream,
  getResponse,
  cancelResponse,
  generateSpeech,
  listFineTuningJobs,
  retrieveFineTuningJob,
  createFineTuningJob,
  cancelFineTuningJob,
  listFineTuningJobEvents,
  listFineTuningJobCheckpoints,
  searchVectorStore,
  addFileToVectorStore,
  createVectorStore,
  getVectorStore,
  deleteVectorStore,
  generateImage,
  editImage,
  getImageVariations,
  getEmbedding,
  getTranscription,
  getTranslation,
  getFiles,
  getFile,
  getFileContent,
  uploadFile,
  deleteFile,
  moderation,
  getModels,
  getModel
}

const openAI: OpenAIHelpers = api

export {
  Message,
  openAI,
  completion,
  completionStream,
  chatCompletion,
  chatCompletionStream,
  createResponse,
  createResponseStream,
  getResponse,
  cancelResponse,
  generateSpeech,
  listFineTuningJobs,
  retrieveFineTuningJob,
  createFineTuningJob,
  cancelFineTuningJob,
  listFineTuningJobEvents,
  listFineTuningJobCheckpoints,
  searchVectorStore,
  addFileToVectorStore,
  createVectorStore,
  getVectorStore,
  deleteVectorStore,
  generateImage,
  editImage,
  getImageVariations,
  getEmbedding,
  getTranscription,
  getTranslation,
  getFiles,
  getFile,
  getFileContent,
  uploadFile,
  deleteFile,
  moderation,
  getModels,
  getModel,
  post,
  get,
  del,
  postStream,
  postForm
}

export type {
  AudioSpeechResponse,
  ChatCompletionMessage,
  ChatCompletionRequestOptions,
  ChatCompletionResponse,
  ChatRole,
  CompletionRequestOptions,
  Dictionary,
  FileListResponse,
  FileObject,
  DeleteResponse,
  FineTuningJob,
  FineTuningJobCheckpoint,
  FineTuningJobEvent,
  ImageResponse,
  JsonPrimitive,
  JsonValue,
  JsonObject,
  ListResponse,
  MessagePayload,
  ModelInfo,
  ModerationResponse,
  Nullable,
  OpenAIHelpers,
  ResponseCreateParams,
  ResponseObject,
  ResponseStreamError,
  ResponseStreamEvent,
  SpeechGenerationOptions,
  TextCompletionResponse,
  UnixTimestamp,
  VectorStore,
  VectorStoreDeletion,
  VectorStoreFileAssociation,
  VectorStoreSearchResponse,
  WhisperResponseFormat,
  WhisperTranscriptionResponse,
  WhisperTranscriptionResult
}



export default api




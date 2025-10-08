export type NodeFormData = import('form-data')

export type JsonPrimitive = string | number | boolean | null

export type JsonValue = JsonPrimitive | JsonRecord | JsonValue[] | undefined

export type JsonRecord = { [key: string]: JsonValue }

export type JsonObject = JsonRecord

export type UnixTimestamp = number

export type Nullable<T> = T | null

export type Dictionary<T = JsonValue> = Record<string, T>

export interface EnvArgs {
  OPEN_AI_SECRET?: string
  OPEN_AI_API_KEY?: string
  OPEN_AI_ORGANIZATION?: string
}

export interface ArgumentsModule extends EnvArgs, Record<string, string | undefined> {}


export interface OpenAIClientConfig {
  host?: string
  key?: string
  organization?: string
}

export interface ResolvedOpenAIClientConfig {
  host: string
  key: string
  organization?: string
}

export type ChatRole = 'assistant' | 'system' | 'user' | 'tool'

export interface MessagePayload<TContent extends JsonValue = string> extends JsonRecord {
  role: ChatRole
  content: TContent
}

export interface CompletionLogprobs {
  tokens: string[]
  token_logprobs: number[]
  top_logprobs: Array<Record<string, number>>
  text_offset: number[]
}

export interface TextCompletionChoice {
  text: string
  index: number
  logprobs: CompletionLogprobs | null
  finish_reason: Nullable<'stop' | 'length' | 'content_filter'>
}

export interface UsageMetrics {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
}

export interface TextCompletionResponse {
  id: string
  object: 'text_completion'
  created: UnixTimestamp
  model: string
  choices: TextCompletionChoice[]
  usage: UsageMetrics
}

export interface ChatToolCallFunction extends JsonRecord {
  name: string
  arguments: string
}

export interface ChatToolCall extends JsonRecord {
  id: string
  type: 'function'
  function: ChatToolCallFunction
}

export interface ChatCompletionMessage extends MessagePayload<string> {
  name?: string
  tool_calls?: ChatToolCall[]
  refusal?: string | null
}

export interface ChatCompletionChoice {
  index: number
  message: ChatCompletionMessage
  finish_reason: Nullable<'stop' | 'length' | 'tool_calls' | 'content_filter'>
  logprobs?: null
}

export interface ChatCompletionResponse {
  id: string
  object: 'chat.completion'
  created: UnixTimestamp
  model: string
  choices: ChatCompletionChoice[]
  usage: UsageMetrics
  system_fingerprint?: string
}

export interface ChatCompletionStreamChoiceDelta {
  [key: string]: JsonValue
  delta?: {
    role?: ChatRole
    content?: string
  }
  index: number
  finish_reason?: Nullable<'stop' | 'length' | 'tool_calls' | 'content_filter'>
}

export interface StreamErrorPayload {
  [key: string]: JsonValue
  message: string
  type?: string
  code?: string | null
  param?: string | null
}

export interface CompletionStreamPayload extends JsonRecord {
  choices?: ChatCompletionStreamChoiceDelta[]
  error?: StreamErrorPayload
}

export interface ResponseUsage {
  total_tokens: number
  input_tokens: number
  output_tokens: number
}

export interface ResponseOutputText {
  type: 'output_text'
  text: string
  annotations?: JsonValue[]
}

export interface ResponseOutputToolCall {
  type: 'tool_call'
  tool_call_id: string
  output: JsonValue
}

export type ResponseOutputItem = ResponseOutputText | ResponseOutputToolCall | { type: string; [key: string]: JsonValue }

export interface ResponseStatusDetails {
  error?: StreamErrorPayload
  type?: string
}

export interface ResponseObject {
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

export interface SpeechGenerationOptions {
  model?: string
  responseFormat?: 'mp3' | 'opus' | 'aac' | 'flac' | 'wav' | 'pcm' | 'json'
  speed?: number
}


export type AudioSpeechResponse = string | {
  audio: string
  format: string
  voice: string
}

export interface FineTuningJob {
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

export interface FineTuningJobEvent {
  id: string
  object: 'fine_tuning.job.event'
  created_at: UnixTimestamp
  level: 'info' | 'warn' | 'error'
  message: string
  data?: Dictionary
}

export interface FineTuningJobCheckpoint {
  id: string
  object: 'fine_tuning.job.checkpoint'
  created_at: UnixTimestamp
  metrics?: Dictionary<number>
  fine_tuned_model_checkpoint?: string | null
  step_number?: number
}

export interface VectorStore {
  id: string
  object: 'vector_store'
  created_at: UnixTimestamp
  name?: string
  status?: 'in_progress' | 'completed' | 'failed' | 'cancelled'
  metadata?: Dictionary
  usage_bytes?: number
}

export interface VectorStoreFileAssociation {
  id: string
  object: 'vector_store.file'
  created_at: UnixTimestamp
  vector_store_id?: string
  status?: 'in_progress' | 'completed' | 'failed'
  last_error?: StreamErrorPayload | null
  attributes?: Dictionary
}

export interface VectorStoreSearchResult {
  id: string
  object: 'vector_store.document'
  score: number
  attributes?: Dictionary
  document?: Dictionary
}

export interface VectorStoreSearchResponse {
  object: 'list'
  data: VectorStoreSearchResult[]
}

export interface VectorStoreDeletion {
  id: string
  object: 'vector_store'
  deleted: boolean
}

export type ImageSize = '256x256' | '512x512' | '1024x1024'

export interface ImageDataItem {
  url?: string
  b64_json?: string
  revised_prompt?: string
}

export interface ImageResponse {
  created: UnixTimestamp
  data: ImageDataItem[]
}

export interface EmbeddingItem {
  object: 'embedding'
  embedding: number[]
  index: number
}

export interface EmbeddingResponse {
  data: EmbeddingItem[]
  model: string
  usage: {
    prompt_tokens: number
    total_tokens: number
  }
}

export interface WhisperSegment {
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

export interface WhisperTranscriptionResponse {
  text: string
  segments?: WhisperSegment[]
  language?: string
  duration?: number
  task?: string
}

export type WhisperResponseFormat = 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt'

export type WhisperTranscriptionResult<TFormat extends WhisperResponseFormat> = TFormat extends 'json' | 'verbose_json' ? WhisperTranscriptionResponse : string

export interface FileObject {
  id: string
  object: 'file'
  bytes: number
  created_at: UnixTimestamp
  filename: string
  purpose: string
  status?: string
  status_details?: string | null
}

export interface FileListResponse {
  object: 'list'
  data: FileObject[]
}

export interface DeleteResponse {
  id: string
  object: string
  deleted: boolean
}

export interface ModerationCategoryScores {
  [category: string]: number
}

export interface ModerationCategories {
  [category: string]: boolean
}

export interface ModerationResult {
  categories: ModerationCategories
  category_scores: ModerationCategoryScores
  flagged: boolean
}

export interface ModerationResponse {
  id: string
  model: string
  results: ModerationResult[]
}

export interface ModelPermission {
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

export interface ModelInfo {
  id: string
  object: 'model'
  created?: UnixTimestamp
  owned_by: string
  permission?: ModelPermission[]
  root?: string
  parent?: string | null
}

export interface ListResponse<T> {
  object: 'list'
  data: T[]
  has_more?: boolean
}

export type CompletionRequestOptions = JsonRecord & {
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

export type ChatCompletionRequestOptions = JsonRecord & {
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


export type ResponseToolDefinition = {
  type: 'code_interpreter' | 'file_search' | 'image_generation' | 'function' | 'mcp' | string
  [key: string]: JsonValue
}

export type ResponseInput = string | JsonValue | Array<MessagePayload | JsonValue>

export interface ResponseCreateParams {
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

export type VectorSize = 0 | 1 | 2

export type ResponseStreamEvent = string[]

export type ResponseStreamError = StreamErrorPayload | Error

export interface OpenAIHelpers {
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


export type ResponseStream = import('./stream').ResponseStream





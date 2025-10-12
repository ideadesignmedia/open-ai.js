/**
 * FormData constructor type that maps to the Node polyfill implementation.
 */
export type NodeFormData = import('form-data')

/**
 * Primitive JSON-compatible scalars.
 */
export type JsonPrimitive = string | number | boolean | null

/**
 * JSON Schema primitive type keywords supported by OpenAI tool definitions.
 */
export type JsonSchemaType = 'object' | 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'null'

/**
 * Recursive JSON-compatible structure comprising primitives, records, arrays, or nested schemas.
 */
export type JsonValue =
  | JsonPrimitive
  | JsonRecord
  | JsonValue[]
  | readonly JsonValue[]
  | JsonSchema
  | undefined

/**
 * String-keyed JSON object helper type.
 */
export type JsonRecord = { [key: string]: JsonValue }

/**
 * Alias for legacy JsonObject naming used in helper surfaces.
 */
export type JsonObject = JsonRecord

/**
 * Unix timestamp measured in seconds from epoch.
 */
export type UnixTimestamp = number

/**
 * Nullable helper alias used throughout API payloads.
 */
export type Nullable<T> = T | null

/**
 * Convenience typed dictionary used for metadata maps.
 */
export type Dictionary<T = JsonValue> = Record<string, T>

/**
 * Optional OPEN_AI_* env/CLI bindings resolved by helpers.
 */
export interface EnvArgs {
  OPEN_AI_SECRET?: string
  OPEN_AI_API_KEY?: string
  OPEN_AI_ORGANIZATION?: string
}

/**
 * Typing for the CLI/environment shim module binding.
 */
export interface ArgumentsModule extends EnvArgs, Record<string, string | undefined> {}


/**
 * User-supplied client configuration overrides.
 */
export interface OpenAIClientConfig {
  host?: string
  key?: string
  organization?: string
}

/**
 * Fully resolved configuration with required host/key values.
 */
export interface ResolvedOpenAIClientConfig {
  host: string
  key: string
  organization?: string
}

/**
 * Roles recognized by the chat and response helpers.
 */
export type ChatRole = 'assistant' | 'system' | 'user' | 'tool'

/**
 * Generic chat message payload capturing role/content pairs.
 */
export interface MessagePayload<TContent extends JsonValue = string> extends JsonRecord {
  role: ChatRole
  content: TContent
}

/**
 * Token-level log probability diagnostics for text completions.
 */
export interface CompletionLogprobs {
  tokens: string[]
  token_logprobs: number[]
  top_logprobs: Array<Record<string, number>>
  text_offset: number[]
}

/**
 * Individual completion entry returned from /v1/completions.
 */
export interface TextCompletionChoice {
  text: string
  index: number
  logprobs: CompletionLogprobs | null
  finish_reason: Nullable<'stop' | 'length' | 'content_filter'>
}

/**
 * Token accounting shared across completion/response APIs.
 */
export interface UsageMetrics {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
}

/**
 * Envelope emitted by /v1/completions requests.
 */
export interface TextCompletionResponse {
  id: string
  object: 'text_completion'
  created: UnixTimestamp
  model: string
  choices: TextCompletionChoice[]
  usage: UsageMetrics
}

/**
 * Function metadata describing a single chat tool invocation.
 */
export interface ChatToolCallFunction extends JsonRecord {
  name: string
  arguments: string
}

/**
 * Tool call envelope attached to assistant responses.
 */
export interface ChatToolCall extends JsonRecord {
  id: string
  type: 'function'
  function: ChatToolCallFunction
}

/**
 * Assistant/tool message payload for chat completions, including tool metadata.
 */
export interface ChatCompletionMessage extends MessagePayload<string> {
  // For assistant messages requesting tools
  tool_calls?: ChatToolCall[]
  // For tool role messages sending back tool outputs
  tool_call_id?: string
  // Optional function/tool name (legacy/compat)
  name?: string
  refusal?: string | null
}

/**
 * Single choice returned from chat completions with metadata.
 */
export interface ChatCompletionChoice {
  index: number
  message: ChatCompletionMessage
  finish_reason: Nullable<'stop' | 'length' | 'tool_calls' | 'content_filter'>
  logprobs?: null
}

/**
 * Envelope returned from /v1/chat/completions.
 */
export interface ChatCompletionResponse {
  id: string
  object: 'chat.completion'
  created: UnixTimestamp
  model: string
  choices: ChatCompletionChoice[]
  usage: UsageMetrics
  system_fingerprint?: string
}

/**
 * Partial delta chunk delivered within chat completion streams.
 */
export interface ChatCompletionStreamChoiceDelta {
  [key: string]: JsonValue
  delta?: {
    role?: ChatRole
    content?: string
    tool_calls?: Array<{
      id?: string
      type: 'function'
      function: Partial<ChatToolCallFunction>
    }>
  }
  index: number
  finish_reason?: Nullable<'stop' | 'length' | 'tool_calls' | 'content_filter'>
}

/**
 * Error payload structure emitted from streaming endpoints.
 */
/**
 * Error payload structure emitted from streaming endpoints.
 */
export interface StreamErrorPayload {
  [key: string]: JsonValue
  message: string
  type?: string
  code?: string | null
  param?: string | null
}

/**
 * Streaming payload union for completions SSE transport.
 */
export interface CompletionStreamPayload extends JsonRecord {
  choices?: ChatCompletionStreamChoiceDelta[]
  error?: StreamErrorPayload
}

/**
 * Token usage record for Responses API payloads.
 */
/**
 * Token usage record for Responses API payloads.
 */
export interface ResponseUsage {
  total_tokens: number
  input_tokens: number
  output_tokens: number
}

/**
 * Text output chunk emitted by the Responses API.
 */
/**
 * Text output chunk emitted by the Responses API.
 */
export interface ResponseOutputText {
  type: 'output_text'
  text: string
  annotations?: JsonValue[]
}

/**
 * Tool call output chunk emitted by the Responses API.
 */
/**
 * Tool call record containing serialized tool results.
 */
/**
 * Tool call record containing serialized tool results.
 */
export interface ResponseOutputToolCall {
  type: 'tool_call'
  tool_call_id: string
  output: JsonValue
}

/**
 * Union describing a single output item from the Responses API.
 */
/**
 * Union describing a single output item from the Responses API.
 */
export type ResponseOutputItem = ResponseOutputText | ResponseOutputToolCall | { type: string; [key: string]: JsonValue }

/**
 * Additional status/error information for Response objects.
 */
/**
 * Additional status/error information for Response objects.
 */
/**
 * Additional status/error information for Response objects.
 */
export interface ResponseStatusDetails {
  error?: StreamErrorPayload
  type?: string
}

/**
 * /v1/responses object describing Responses API state and metadata.
 */
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

/**
 * Optional controls for the speech synthesis helper.
 */
export interface SpeechGenerationOptions {
  model?: string
  responseFormat?: 'mp3' | 'opus' | 'aac' | 'flac' | 'wav' | 'pcm' | 'json'
  speed?: number
}


/**
 * Result from generateSpeech returning inline audio metadata or raw audio.
 */
export type AudioSpeechResponse = string | {
  audio: string
  format: string
  voice: string
}

/**
 * Fine-tuning job metadata payload representing the job lifecycle.
 */
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

/**
 * Event emitted while a fine-tuning job is running.
 */
export interface FineTuningJobEvent {
  id: string
  object: 'fine_tuning.job.event'
  created_at: UnixTimestamp
  level: 'info' | 'warn' | 'error'
  message: string
  data?: Dictionary
}

/**
 * Stored checkpoint produced during a fine-tuning job.
 */
export interface FineTuningJobCheckpoint {
  id: string
  object: 'fine_tuning.job.checkpoint'
  created_at: UnixTimestamp
  metrics?: Dictionary<number>
  fine_tuned_model_checkpoint?: string | null
  step_number?: number
}

/**
 * Vector store metadata container with status fields.
 */
export interface VectorStore {
  id: string
  object: 'vector_store'
  created_at: UnixTimestamp
  name?: string
  status?: 'in_progress' | 'completed' | 'failed' | 'cancelled'
  metadata?: Dictionary
  usage_bytes?: number
}

/**
 * Association linking a file to a vector store.
 */
export interface VectorStoreFileAssociation {
  id: string
  object: 'vector_store.file'
  created_at: UnixTimestamp
  vector_store_id?: string
  status?: 'in_progress' | 'completed' | 'failed'
  last_error?: StreamErrorPayload | null
  attributes?: Dictionary
}

/**
 * Individual vector store search hit with a similarity score.
 */
export interface VectorStoreSearchResult {
  id: string
  object: 'vector_store.document'
  score: number
  attributes?: Dictionary
  document?: Dictionary
}

/**
 * Envelope of vector store search results.
 */
export interface VectorStoreSearchResponse {
  object: 'list'
  data: VectorStoreSearchResult[]
}

/**
 * Confirmation payload returned after deleting a vector store.
 */
export interface VectorStoreDeletion {
  id: string
  object: 'vector_store'
  deleted: boolean
}

/**
 * Supported image sizes for generation/edit helpers.
 */
export type ImageSize = '256x256' | '512x512' | '1024x1024'

/**
 * Single image result entry returned by the image helpers.
 */
export interface ImageDataItem {
  url?: string
  b64_json?: string
  revised_prompt?: string
}

/**
 * Response envelope for image generation/edit/variation requests.
 */
export interface ImageResponse {
  created: UnixTimestamp
  data: ImageDataItem[]
}

/**
 * Single embedding vector metadata entry.
 */
export interface EmbeddingItem {
  object: 'embedding'
  embedding: number[]
  index: number
}

/**
 * Envelope returned by /v1/embeddings.
 */
export interface EmbeddingResponse {
  data: EmbeddingItem[]
  model: string
  usage: {
    prompt_tokens: number
    total_tokens: number
  }
}

/**
 * Metadata describing a Whisper transcription segment.
 */
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

/**
 * JSON response from Whisper transcription endpoints.
 */
export interface WhisperTranscriptionResponse {
  text: string
  segments?: WhisperSegment[]
  language?: string
  duration?: number
  task?: string
}

export type WhisperResponseFormat = 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt'

/**
 * Conditional transcription result shaped to the requested format.
 */
export type WhisperTranscriptionResult<TFormat extends WhisperResponseFormat> = TFormat extends 'json' | 'verbose_json' ? WhisperTranscriptionResponse : string

/**
 * Metadata for a stored file within the Files API.
 */
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

/**
 * Envelope returned when listing files.
 */
export interface FileListResponse {
  object: 'list'
  data: FileObject[]
}

/**
 * Deletion confirmation payload with success flag.
 */
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

/**
 * Moderation category and score details for a single input.
 */
export interface ModerationResult {
  categories: ModerationCategories
  category_scores: ModerationCategoryScores
  flagged: boolean
}

/**
 * Envelope returned from /v1/moderations.
 */
export interface ModerationResponse {
  id: string
  model: string
  results: ModerationResult[]
}

/**
 * Model permission entry returned when listing models.
 */
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

/**
 * Model metadata entry from /v1/models.
 */
export interface ModelInfo {
  id: string
  object: 'model'
  created?: UnixTimestamp
  owned_by: string
  permission?: ModelPermission[]
  root?: string
  parent?: string | null
}

/**
 * Generic list pagination envelope.
 */
export interface ListResponse<T> {
  object: 'list'
  data: T[]
  has_more?: boolean
}

/**
 * Optional parameters accepted by /v1/completions requests.
 */
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

// A simplified, recursive JSON Schema object for tool parameter typing
/**
 * Simplified JSON Schema representation for defining tool parameters.
 */
export interface JsonSchema extends JsonRecord {
  $schema?: string
  $id?: string
  title?: string
  description?: string
  type?: JsonSchemaType
  format?: string
  default?: JsonValue
  enum?: JsonPrimitive[]
  const?: JsonPrimitive
  properties?: Record<string, JsonSchema>
  required?: string[]
  additionalProperties?: boolean | JsonSchema
  items?: JsonSchema | JsonSchema[]
  minimum?: number
  maximum?: number
  exclusiveMinimum?: number
  exclusiveMaximum?: number
  minLength?: number
  maxLength?: number
  pattern?: string
  minItems?: number
  maxItems?: number
  uniqueItems?: boolean
  anyOf?: JsonSchema[]
  oneOf?: JsonSchema[]
  allOf?: JsonSchema[]
}

/**
 * Convenience alias for defining tool schema property maps.
 */
export type ToolSchemaProperties<TEntry extends JsonSchema = JsonSchema> = Record<string, TEntry>

/**
 * Utility type that flattens intersections for improved IntelliSense.
 */
type Simplify<T> = { [K in keyof T]: T[K] } & {}

/**
 * Extracts required property names from an ObjectSchema definition.
 */
type RequiredKeys<T extends { required?: readonly string[] | undefined }> =
  T['required'] extends readonly (infer R extends string)[] ? R[number] : never

/**
 * Maps a schema's additionalProperties entry to a concrete record type.
 */
/**
 * Maps a schema's additionalProperties entry to a typed record.
 */
type AdditionalPropertiesResult<TAdditional> =
  TAdditional extends false | undefined
    ? {}
    : TAdditional extends true
      ? Record<string, JsonValue>
      : TAdditional extends JsonSchema
        ? Record<string, InferJsonType<TAdditional>>
        : Record<string, JsonValue>

// Strongly-typed helpers for building tool parameter schemas and inferring types
/**
 * Helper for constructing object-shaped JSON Schemas with typed keys.
 */
/**
 * Helper for constructing object-shaped JSON Schemas with typed keys.
 */
export type ObjectSchema<
  TProps extends Record<string, JsonSchema>,
  TRequired extends readonly (keyof TProps & string)[] | undefined = undefined,
  TAdditional extends boolean | JsonSchema | undefined = undefined
> = JsonSchema & {
  type: 'object'
  properties: TProps
  required?: TRequired
  additionalProperties?: TAdditional
}

/**
 * Strongly typed JSON Schema definition for chat tool parameter objects.
 */
export type ChatToolParametersSchema<
  TProps extends ToolSchemaProperties = ToolSchemaProperties,
  TRequired extends readonly string[] | undefined = readonly string[] | undefined,
  TAdditional extends boolean | JsonSchema | undefined = boolean | JsonSchema | undefined
> = ObjectSchema<TProps, TRequired, TAdditional>

/**
 * Infers a TypeScript type from a simplified JSON Schema node.
 */
export type InferJsonType<S extends JsonSchema | undefined> =
  S extends undefined
    ? JsonValue
    : S extends { enum: readonly (infer E extends JsonPrimitive)[] }
      ? E
      : S extends { const: infer C extends JsonPrimitive }
        ? C
        : S extends { type: 'string' }
          ? string
          : S extends { type: 'number' }
            ? number
            : S extends { type: 'integer' }
              ? number
              : S extends { type: 'boolean' }
                ? boolean
                : S extends { type: 'array', items: infer I }
                  ? I extends JsonSchema[]
                    ? Array<InferJsonType<I[number]>>
                    : I extends JsonSchema
                      ? Array<InferJsonType<I>>
                      : JsonValue[]
                  : S extends { type: 'object', properties: infer P extends Record<string, JsonSchema> }
                    ? Simplify<
                        {
                          [K in keyof P & string]: K extends RequiredKeys<S>
                            ? InferJsonType<P[K]>
                            : InferJsonType<P[K]> | undefined
                        } & AdditionalPropertiesResult<S extends { additionalProperties?: infer A } ? A : undefined>
                      >
                    : JsonValue

/**
 * Infers parameter objects from strongly typed object schemas.
 */
export type InferParams<
  S extends ObjectSchema<Record<string, JsonSchema>, readonly string[] | undefined, boolean | JsonSchema | undefined>
> =
  S extends ObjectSchema<infer P, infer R, infer A>
    ? Simplify<
        {
          [K in keyof P & string]: K extends (R extends readonly (infer RK extends string)[] ? RK : never)
            ? InferJsonType<P[K]>
            : InferJsonType<P[K]> | undefined
        } & AdditionalPropertiesResult<A>
      >
    : never

// Chat Completions function tool definition (tools only support type: 'function')
/**
 * JSON Schema-backed metadata describing a callable chat tool.
 */
export interface ChatFunctionDefinition<
  TParameters extends ChatToolParametersSchema = ChatToolParametersSchema
> extends JsonRecord {
  name: string
  description?: string
  parameters?: TParameters
}

/**
 * Function tool declaration accepted by /v1/chat/completions.
 */
export interface ChatCompletionsFunctionTool<
  TParameters extends ChatToolParametersSchema = ChatToolParametersSchema
> extends JsonRecord {
  type: 'function'
  function: ChatFunctionDefinition<TParameters>
}

/**
 * Infers a tool-call argument type from a chat tool definition.
 */
export type InferToolArguments<TTool extends ChatCompletionsFunctionTool> =
  TTool['function']['parameters'] extends ObjectSchema<infer P, infer R, infer A>
    ? InferParams<ObjectSchema<P, R, A>>
    : JsonRecord

/**
 * Tool selection hints accepted by chat completions.
 */
export type ChatToolChoice<
  TTools extends readonly ChatCompletionsFunctionTool[] = readonly ChatCompletionsFunctionTool[]
> =
  | 'none'
  | 'auto'
  | 'required'
  | { type: 'function'; function: { name: Extract<TTools[number]['function']['name'], string> } }

/**
 * Options accepted by /v1/chat/completions including tool metadata.
 */
export type ChatCompletionRequestOptions<
  TTools extends readonly ChatCompletionsFunctionTool[] = readonly ChatCompletionsFunctionTool[]
> = JsonRecord & {
  model?: string
  temperature?: number
  max_tokens?: number
  top_p?: number
  frequency_penalty?: number
  presence_penalty?: number
  user?: string
  // Chat Completions response formatting (current API: text | json_object | json_schema)
  response_format?:
    | { type: 'text' }
    | { type: 'json_object' }
    | { type: 'json_schema'; json_schema: { name: string; schema: JsonSchema; strict?: boolean } }
  // Only function tools are supported on /v1/chat/completions
  tools?: TTools
  tool_choice?: ChatToolChoice<TTools>
  // Whether the model may produce multiple tool calls in parallel (defaults may vary by model)
  parallel_tool_calls?: boolean
}


/**
 * Tool descriptor accepted by the Responses API for multi-tool workflows.
 */
export type ResponseToolDefinition = {
  type: 'code_interpreter' | 'file_search' | 'image_generation' | 'function' | 'mcp' | string
  [key: string]: JsonValue
}

export type ResponseInput = string | JsonValue | Array<MessagePayload | JsonValue>

/**
 * Request payload accepted by /v1/responses.
 */
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

/**
 * Convenience size alias consumed by image helpers.
 */
export type VectorSize = 0 | 1 | 2

/**
 * Aggregate chunk signature emitted by the streaming helper.
 */
export type ResponseStreamEvent = string[]

/**
 * Errors surfaced through the streaming helper interface.
 */
export type ResponseStreamError = StreamErrorPayload | Error

/**
 * Shape of the helper surface exposed by OpenAIClient instances.
 */
/**
 * Shape of the helper surface exposed by OpenAIClient instances.
 */
/**
 * Shape of the helper surface exposed by OpenAIClient instances.
 */
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
  chatCompletion: <
    TTools extends readonly ChatCompletionsFunctionTool[] = readonly ChatCompletionsFunctionTool[]
  >(
    messages?: MessagePayload[],
    resultCount?: number,
    stop?: string | string[],
    options?: ChatCompletionRequestOptions<TTools>
  ) => Promise<ChatCompletionResponse>
  chatCompletionStream: <
    TTools extends readonly ChatCompletionsFunctionTool[] = readonly ChatCompletionsFunctionTool[]
  >(
    messages?: MessagePayload[],
    resultCount?: number,
    stop?: string | string[],
    options?: ChatCompletionRequestOptions<TTools>
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


/**
 * Convenience alias linking to the streaming helper class implementation.
 */
export type ResponseStream = import('./stream').ResponseStream

















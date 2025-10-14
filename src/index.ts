import { createHttpClient, type HttpClient } from './http'
import { resolveConfig } from './config'
import { createAudioClient } from './audio'
import { Message, createChatClient } from './chat'
import { createEmbeddingsClient } from './embeddings'
import { createFileClient } from './files'
import { createFineTuningClient } from './fine-tuning'
import { createImageClient } from './images'
import { createModelClient } from './models'
import { createModerationClient } from './moderation'
import { createResponseClient } from './responses'
import { createVectorStoreClient } from './vector-store'
import type { OpenAIClientConfig, OpenAIHelpers, ResolvedOpenAIClientConfig } from './types'

/**
 * High-level OpenAI helper bundling REST, streaming, and tool surfaces.
 */
class OpenAIClient implements OpenAIHelpers {
  public readonly config: ResolvedOpenAIClientConfig
  private readonly http: HttpClient

  public readonly post!: OpenAIHelpers['post']
  public readonly get!: OpenAIHelpers['get']
  public readonly del!: OpenAIHelpers['del']
  public readonly postStream!: OpenAIHelpers['postStream']
  public readonly postForm!: OpenAIHelpers['postForm']

  public readonly Message!: OpenAIHelpers['Message']
  public readonly completion!: OpenAIHelpers['completion']
  public readonly completionStream!: OpenAIHelpers['completionStream']
  public readonly chatCompletion!: OpenAIHelpers['chatCompletion']
  public readonly chatCompletionStream!: OpenAIHelpers['chatCompletionStream']

  public readonly createResponse!: OpenAIHelpers['createResponse']
  public readonly createResponseStream!: OpenAIHelpers['createResponseStream']
  public readonly getResponse!: OpenAIHelpers['getResponse']
  public readonly cancelResponse!: OpenAIHelpers['cancelResponse']

  public readonly generateSpeech!: OpenAIHelpers['generateSpeech']
  public readonly getTranscription!: OpenAIHelpers['getTranscription']
  public readonly getTranslation!: OpenAIHelpers['getTranslation']

  public readonly listFineTuningJobs!: OpenAIHelpers['listFineTuningJobs']
  public readonly retrieveFineTuningJob!: OpenAIHelpers['retrieveFineTuningJob']
  public readonly createFineTuningJob!: OpenAIHelpers['createFineTuningJob']
  public readonly cancelFineTuningJob!: OpenAIHelpers['cancelFineTuningJob']
  public readonly listFineTuningJobEvents!: OpenAIHelpers['listFineTuningJobEvents']
  public readonly listFineTuningJobCheckpoints!: OpenAIHelpers['listFineTuningJobCheckpoints']

  public readonly searchVectorStore!: OpenAIHelpers['searchVectorStore']
  public readonly addFileToVectorStore!: OpenAIHelpers['addFileToVectorStore']
  public readonly createVectorStore!: OpenAIHelpers['createVectorStore']
  public readonly getVectorStore!: OpenAIHelpers['getVectorStore']
  public readonly deleteVectorStore!: OpenAIHelpers['deleteVectorStore']

  public readonly generateImage!: OpenAIHelpers['generateImage']
  public readonly editImage!: OpenAIHelpers['editImage']
  public readonly getImageVariations!: OpenAIHelpers['getImageVariations']

  public readonly getEmbedding!: OpenAIHelpers['getEmbedding']

  public readonly getFiles!: OpenAIHelpers['getFiles']
  public readonly getFile!: OpenAIHelpers['getFile']
  public readonly getFileContent!: OpenAIHelpers['getFileContent']
  public readonly uploadFile!: OpenAIHelpers['uploadFile']
  public readonly deleteFile!: OpenAIHelpers['deleteFile']

  public readonly moderation!: OpenAIHelpers['moderation']

  public readonly getModels!: OpenAIHelpers['getModels']
  public readonly getModel!: OpenAIHelpers['getModel']

  /**
   * Constructs an OpenAI helper, resolving configuration and wiring sub-clients.
   *
   * @param config - Optional overrides for host, key, and organization.
   */
  constructor(config: OpenAIClientConfig = {}) {
    this.config = resolveConfig(config)
    this.http = createHttpClient(this.config)

    const http = this.http
    const chat = createChatClient(http)
    const audio = createAudioClient(http)
    const embeddings = createEmbeddingsClient(http)
    const files = createFileClient(http)
    const fineTuning = createFineTuningClient(http)
    const images = createImageClient(http)
    const responses = createResponseClient(http)
    const vectorStores = createVectorStoreClient(http)
    const moderation = createModerationClient(http)
    const models = createModelClient(http)

    this.post = http.post
    this.get = http.get
    this.del = http.del
    this.postStream = http.postStream
    this.postForm = http.postForm

    this.Message = Message
    this.completion = chat.completion
    this.completionStream = chat.completionStream
    this.chatCompletion = chat.chatCompletion
    this.chatCompletionStream = chat.chatCompletionStream

    this.createResponse = responses.createResponse
    this.createResponseStream = responses.createResponseStream
    this.getResponse = responses.getResponse
    this.cancelResponse = responses.cancelResponse

    this.generateSpeech = audio.generateSpeech
    this.getTranscription = audio.getTranscription
    this.getTranslation = audio.getTranslation

    this.listFineTuningJobs = fineTuning.listFineTuningJobs
    this.retrieveFineTuningJob = fineTuning.retrieveFineTuningJob
    this.createFineTuningJob = fineTuning.createFineTuningJob
    this.cancelFineTuningJob = fineTuning.cancelFineTuningJob
    this.listFineTuningJobEvents = fineTuning.listFineTuningJobEvents
    this.listFineTuningJobCheckpoints = fineTuning.listFineTuningJobCheckpoints

    this.searchVectorStore = vectorStores.searchVectorStore
    this.addFileToVectorStore = vectorStores.addFileToVectorStore
    this.createVectorStore = vectorStores.createVectorStore
    this.getVectorStore = vectorStores.getVectorStore
    this.deleteVectorStore = vectorStores.deleteVectorStore

    this.generateImage = images.generateImage
    this.editImage = images.editImage
    this.getImageVariations = images.getImageVariations

    this.getEmbedding = embeddings.getEmbedding

    this.getFiles = files.getFiles
    this.getFile = files.getFile
    this.getFileContent = files.getFileContent
    this.uploadFile = files.uploadFile
    this.deleteFile = files.deleteFile

    this.moderation = moderation.moderation

    this.getModels = models.getModels
    this.getModel = models.getModel
  }
}

export { OpenAIClient, Message }
export { defineFunctionTool, defineObjectSchema } from './tools'
export { McpClient, McpServer, JsonRpcError, createMockMcpServer, startMockMcpServer } from './mcp'
export { UnifiedLLMClient } from './unified'

export type {
  AudioSpeechResponse,
  ChatCompletionMessage,
  ChatCompletionRequestOptions,
  ChatCompletionResponse,
  ChatFunctionDefinition,
  ChatCompletionsFunctionTool,
  ChatToolChoice,
  ChatRole,
  CompletionRequestOptions,
  DeleteResponse,
  Dictionary,
  FileListResponse,
  FileObject,
  FineTuningJob,
  FineTuningJobCheckpoint,
  FineTuningJobEvent,
  ImageResponse,
  JsonObject,
  JsonPrimitive,
  JsonRecord,
  JsonSchema,
  JsonSchemaType,
  ObjectSchema,
  ToolSchemaProperties,
  ChatToolParametersSchema,
  InferJsonType,
  InferParams,
  InferToolArguments,
  JsonValue,
  ListResponse,
  MessagePayload,
  ModelInfo,
  ModerationResponse,
  Nullable,
  OpenAIClientConfig,
  OpenAIHelpers,
  ResolvedOpenAIClientConfig,
  ResponseCreateParams,
  ResponseObject,
  ResponseStream,
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
} from './types'

export type { McpClientOptions, MockMcpServerOptions } from './mcp'
export type { McpServerOptions, McpToolHandlerOptions, McpModel, McpMetadata, McpServerTransport } from './mcp/server'
export type { UnifiedChatRequest, UnifiedChatResponse, UnifiedChatStreamChunk, UnifiedModelInfo } from './providers/types'
export type { UnifiedLLMClientOptions } from './unified'

export default OpenAIClient










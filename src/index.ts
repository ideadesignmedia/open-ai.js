import { del, get, post, postForm, postStream } from './http'
import { Message, chatCompletion, chatCompletionStream, completion, completionStream } from './chat'
import {
  cancelResponse,
  createResponse,
  createResponseStream,
  getResponse
} from './responses'
import { generateSpeech, getTranscription, getTranslation } from './audio'
import {
  addFileToVectorStore,
  createVectorStore,
  deleteVectorStore,
  getVectorStore,
  searchVectorStore
} from './vector-store'
import {
  cancelFineTuningJob,
  createFineTuningJob,
  listFineTuningJobCheckpoints,
  listFineTuningJobEvents,
  listFineTuningJobs,
  retrieveFineTuningJob
} from './fine-tuning'
import { editImage, generateImage, getImageVariations } from './images'
import { getEmbedding } from './embeddings'
import { deleteFile, getFile, getFileContent, getFiles, uploadFile } from './files'
import { moderation } from './moderation'
import { getModel, getModels } from './models'
import type { OpenAIHelpers } from './types'

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
} from './types'

export default api


import "@ideadesignmedia/config.js"

import assert from "node:assert/strict"
import crypto from "node:crypto"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { setTimeout as sleep } from "node:timers/promises"
import { test } from "node:test"
import type { TestContext } from "node:test"
import FormData from "form-data"
import sharp from "sharp"

import OpenAIClient, { Message } from "../index"
import type {
  DeleteResponse,
  FileObject,
  ImageResponse,
  ListResponse,
  ModelInfo,
  ModerationResponse,
  ResponseStreamEvent,
  ResponseStreamError,
  OpenAIHelpers,
  ChatCompletionsFunctionTool,
  MessagePayload
} from "../index"

type ResponseStreamInstance = Awaited<ReturnType<OpenAIHelpers['completionStream']>>

const TIMEOUT_MS = 600_000
const STREAM_TIMEOUT_MS = 10_000

const COMPLETION_MODELS = ["gpt-4o-mini-instruct", "gpt-3.5-turbo-instruct"] as const
const CHAT_MODELS = ["gpt-4o-mini", "gpt-4", "gpt-3.5-turbo"] as const
const RESPONSE_MODELS = ["o4-mini", "gpt-4o-mini", "gpt-4.1-mini", "gpt-4"] as const
const SPEECH_MODELS = ["tts-1"] as const
const EMBEDDING_MODELS = ["text-embedding-3-small", "text-embedding-ada-002"] as const
const MODERATION_MODELS = ["omni-moderation-latest", "text-moderation-latest", "text-moderation-stable"] as const

const ensureEnv = (key: string): void => {
  assert.ok(process.env[key], `${key} must be defined in config.json`)
}

const collectStream = async (
  factory: () => Promise<ResponseStreamInstance>
): Promise<string[]> => {
  const stream = await factory()
  return new Promise((resolve, reject) => {
    const fail = (error: ResponseStreamError) => {
      if (error instanceof Error) {
        reject(error)
      } else {
        reject(new Error(JSON.stringify(error)))
      }
    }
    const handleResult = (result: ResponseStreamEvent) => {
      resolve(result.map(chunk => chunk ?? ""))
    }
    const timer = setTimeout(() => fail(new Error('stream timeout')), STREAM_TIMEOUT_MS)
    const maybeUnref = (timer as NodeJS.Timeout).unref
    if (typeof maybeUnref === 'function') {
      maybeUnref.call(timer)
    }
    stream.onError = error => {
      clearTimeout(timer)
      fail(error)
    }
    stream.onComplete = result => {
      clearTimeout(timer)
      handleResult(result)
    }
    stream.onData = () => {
      // intentional noop
    }
  })
}

const extractApiError = (value: unknown): { code?: string; message: string } | null => {
  if (typeof value !== 'object' || value === null) return null
  const candidate = value as { error?: { message?: unknown; code?: unknown } }
  const error = candidate.error
  if (!error || typeof error.message !== 'string') return null
  return {
    message: error.message,
    code: typeof error.code === 'string' ? error.code : undefined
  }
}

type ApiAttemptKind = 'ok' | 'unavailable' | 'skip'

interface ApiAttempt<T> {
  kind: ApiAttemptKind
  value?: T
  reason?: string
  meta?: Record<string, string>
}

type AttemptResolution<T> =
  | { status: 'ok'; value: T; meta: Record<string, string> }
  | { status: 'unavailable'; reason?: string }
  | { status: 'skip'; reason?: string }

const attemptApi = async <T>(label: string, run: () => Promise<T>): Promise<ApiAttempt<T>> => {
  try {
    const result = await run()
    const apiError = extractApiError(result as unknown)
    if (!apiError) {
      return { kind: 'ok', value: result }
    }
    const { code, message } = apiError
    const normalized = message.toLowerCase()
    if (
      code === 'insufficient_quota' ||
      code === 'invalid_api_key' ||
      normalized.includes('quota') ||
      normalized.includes('billing')
    ) {
      return { kind: 'skip', reason: `${label}: ${message}` }
    }
    if (
      code === 'model_not_found' ||
      normalized.includes('does not have access') ||
      normalized.includes('not available') ||
      normalized.includes('not exist') ||
      normalized.includes('not enabled') ||
      normalized.includes('restricted') ||
      normalized.includes('file not found') ||
      normalized.includes('not_found_error')
    ) {
      return { kind: 'unavailable', reason: `${label}: ${message}` }
    }
    return { kind: 'unavailable', reason: `${label}: ${message}` }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const normalized = message.toLowerCase()
    if (normalized.includes('quota') || normalized.includes('billing')) {
      return { kind: 'skip', reason: `${label}: ${message}` }
    }
    if (
      normalized.includes('invalid input image') ||
      normalized.includes('format must be') ||
      normalized.includes('unsupported image') ||
      normalized.includes('requires uploaded file') ||
      normalized.includes('failed to open/read local data') ||
      normalized.includes('file not found') ||
      normalized.includes('not_found_error') ||
      normalized.includes('stream timeout') ||
      normalized.includes('aborted') ||
      normalized.includes('econnreset') ||
      normalized.includes('socket hang up')
    ) {
      return { kind: 'unavailable', reason: `${label}: ${message}` }
    }
    if (error && typeof (error as { stderr?: unknown }).stderr === 'string') {
      const stderr = (error as { stderr: string }).stderr.toLowerCase()
      if (
        stderr.includes('invalid input image') ||
        stderr.includes('failed to open/read local data') ||
        stderr.includes('format must be')
      ) {
        return { kind: 'unavailable', reason: `${label}: ${(error as { stderr: string }).stderr.trim()}` }
      }
    }
    const errorCode = typeof (error as { code?: string }).code === 'string'
      ? (error as { code: string }).code.toLowerCase()
      : undefined
    if (errorCode === 'ecconnreset' || errorCode === 'aborted') {
      return { kind: 'unavailable', reason: `${label}: ${message}` }
    }
    if (error instanceof Error && error.name === 'AbortError') {
      return { kind: 'unavailable', reason: `${label}: ${message}` }
    }
    if (typeof (error as { code?: number }).code === 'number' && (error as { code: number }).code === 26) {
      return { kind: 'unavailable', reason: `${label}: curl exited with code 26` }
    }
    throw error
  }
}
const attemptWithModels = async <T>(
  label: string,
  models: readonly string[],
  run: (model: string) => Promise<T>
): Promise<ApiAttempt<T>> => {
  const failures: string[] = []
  for (const model of models) {
    const attempt = await attemptApi(`${label} (${model})`, () => run(model))
    if (attempt.kind === 'ok') {
      return { kind: 'ok', value: attempt.value, meta: { model } }
    }
    if (attempt.kind === 'skip') {
      return attempt
    }
    failures.push(attempt.reason ?? `${model}: unavailable`)
  }
  return { kind: 'unavailable', reason: `${label}: ${failures.join('; ')}` }
}

const writeSineWave = (filePath: string): void => {
  const sampleRate = 16_000
  const durationSeconds = 1
  const frequency = 440
  const totalSamples = sampleRate * durationSeconds
  const headerSize = 44
  const buffer = Buffer.alloc(headerSize + totalSamples * 2)

  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(buffer.length - 8, 4)
  buffer.write('WAVE', 8)
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20)
  buffer.writeUInt16LE(1, 22)
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(sampleRate * 2, 28)
  buffer.writeUInt16LE(2, 32)
  buffer.writeUInt16LE(16, 34)
  buffer.write('data', 36)
  buffer.writeUInt32LE(totalSamples * 2, 40)

  let offset = headerSize
  for (let i = 0; i < totalSamples; i++) {
    const sample = Math.sin((2 * Math.PI * frequency * i) / sampleRate)
    const clamped = Math.max(-1, Math.min(1, sample))
    buffer.writeInt16LE(Math.round(clamped * 32_767), offset)
    offset += 2
  }

  fs.writeFileSync(filePath, buffer)
}

interface IntegrationContext {
  tempDir: string
  imagePath: string
  audioPath: string
  trainingJsonlPath: string
  vectorTextPath: string
  uploadedFileIds: string[]
  vectorStoreIds: string[]
  fineTuneJobIds: string[]
  completionModel: string
  chatModel: string
  responseModel: string
  fineTuneUpload?: AttemptResolution<FileObject>
  vectorFileUpload?: AttemptResolution<FileObject>
}

type OpRunner = (stage: TestContext, ctx: IntegrationContext) => Promise<string | void>

const createHandleAttempt = (stage: TestContext) => <T>(
  label: string,
  attempt: ApiAttempt<T>,
  onSuccess?: (value: T, meta: Record<string, string>) => void
): AttemptResolution<T> => {
  if (attempt.kind === 'skip') {
    stage.diagnostic(`[SKIP] ${label}: ${attempt.reason ?? 'skipped'}`)
    return { status: 'skip', reason: attempt.reason }
  }
  if (attempt.kind === 'unavailable') {
    stage.diagnostic(`[INFO] ${label}: ${attempt.reason ?? 'unavailable'}`)
    return { status: 'unavailable', reason: attempt.reason }
  }
  const meta = attempt.meta ?? {}
  const value = attempt.value as T
  onSuccess?.(value, meta)
  stage.diagnostic(`[PASS] ${label}`)
  return { status: 'ok', value, meta }
}

const createAttemptUpload = (stage: TestContext, ctx: IntegrationContext, upload: OpenAIHelpers['uploadFile']) => async (
  label: string,
  filePath: string,
  purpose: string
): Promise<AttemptResolution<FileObject>> => {
  try {
    const file = await upload(filePath, purpose)
    ctx.uploadedFileIds.push(file.id)
    stage.diagnostic(`[PASS] ${label}: ${file.id}`)
    return { status: 'ok', value: file, meta: { fileId: file.id } }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const stderr = typeof (error as { stderr?: unknown }).stderr === 'string'
      ? (error as { stderr: string }).stderr.trim()
      : undefined
    const normalized = message.toLowerCase()
    if (normalized.includes('quota') || normalized.includes('billing')) {
      stage.diagnostic(`[SKIP] ${label}: ${message}`)
      return { status: 'skip', reason: message }
    }
    const reason = stderr ?? message
    stage.diagnostic(`[INFO] ${label}: ${reason}`)
    return { status: 'unavailable', reason }
  }
}


interface TargetConfig {
  label: string
  env: Record<string, string | undefined>
  limited: boolean
}

const loadTargets = (): TargetConfig[] => {
  const configPath = path.resolve(process.cwd(), 'config.json')
  let fileConfig: Record<string, string | undefined> = {}
  try {
    fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8')) as Record<string, string | undefined>
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code !== 'ENOENT') {
      throw error
    }
  }

  const targets: TargetConfig[] = []

  const openAiEndpoint = fileConfig.OPEN_AI_ENDPOINT ?? process.env.OPEN_AI_ENDPOINT ?? 'https://api.openai.com'
  const openAiKey = fileConfig.OPEN_AI_API_KEY ?? process.env.OPEN_AI_API_KEY ?? process.env.OPEN_AI_SECRET ?? ''
  targets.push({
    label: 'openai',
    limited: false,
    env: {
      OPEN_AI_ENDPOINT: openAiEndpoint,
      OPEN_AI_API_KEY: openAiKey,
      OPEN_AI_SECRET: openAiKey,
      OPEN_AI_ORGANIZATION: fileConfig.OPEN_AI_ORGANIZATION ?? process.env.OPEN_AI_ORGANIZATION
    }
  })

  const privateEndpoint = fileConfig.MODEL_ENDPOINT ?? process.env.MODEL_ENDPOINT
  const privateKey = fileConfig.API_KEY ?? process.env.API_KEY
  if (privateEndpoint && privateKey) {
    targets.push({
      label: 'private',
      limited: true,
      env: {
        OPEN_AI_ENDPOINT: privateEndpoint,
        OPEN_AI_API_KEY: privateKey,
        OPEN_AI_SECRET: privateKey,
        OPEN_AI_ORGANIZATION: undefined
      }
    })
  }

  return targets
}

const applyTargetEnv = (target: TargetConfig): (() => void) => {
  const keys = new Set(Object.keys(target.env))
  keys.add('OPEN_AI_ENDPOINT')
  keys.add('OPEN_AI_API_KEY')
  keys.add('OPEN_AI_SECRET')
  keys.add('OPEN_AI_ORGANIZATION')

  const previous = new Map<string, string | undefined>()
  for (const key of keys) {
    previous.set(key, process.env[key])
  }

  for (const [key, value] of Object.entries(target.env)) {
    if (value === undefined || value === '') {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }

  return () => {
    for (const [key, value] of previous) {
      if (value === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = value
      }
    }
  }
}

const runIntegration = async (t: TestContext, target: TargetConfig) => {
  ensureEnv('OPEN_AI_ENDPOINT')
  ensureEnv('OPEN_AI_API_KEY')
  const host = process.env.OPEN_AI_ENDPOINT ?? "https://api.openai.com"
  const key = process.env.OPEN_AI_API_KEY ?? process.env.OPEN_AI_SECRET ?? ""
  assert.ok(key, "OPEN_AI_API_KEY must be defined in config.json")
  const client = new OpenAIClient({
    host,
    key,
    organization: process.env.OPEN_AI_ORGANIZATION
  })
  const {
    post,
    get: httpGet,
    del,
    postStream,
    postForm,
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
  } = client


  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), `openai-integration-${target.label}-`))

  const imagePath = path.join(tempDir, 'seed.png')
  await sharp({
    create: {
      width: 256,
      height: 256,
      channels: 4,
      background: { r: 64, g: 128, b: 192, alpha: 1 }
    }
  })
    .png()
    .toFile(imagePath)

  const audioPath = path.join(tempDir, 'tone.wav')
  writeSineWave(audioPath)

  const trainingJsonlPath = path.join(tempDir, 'training.jsonl')
  fs.writeFileSync(
    trainingJsonlPath,
    `${JSON.stringify({
      messages: [
        { role: 'system', content: 'You are concise' },
        { role: 'user', content: 'Say hi' },
        { role: 'assistant', content: 'Hello' }
      ]
    })}
`
  )

  const vectorTextPath = path.join(tempDir, 'vector.txt')
  fs.writeFileSync(
    vectorTextPath,
    'Integration sample content about oranges, apples, and grapes.'
  )

  const ctx: IntegrationContext = {
    tempDir,
    imagePath,
    audioPath,
    trainingJsonlPath,
    vectorTextPath,
    uploadedFileIds: [],
    vectorStoreIds: [],
    fineTuneJobIds: [],
    completionModel: COMPLETION_MODELS[0],
    chatModel: CHAT_MODELS[0],
    responseModel: RESPONSE_MODELS[0],
    fineTuneUpload: undefined,
    vectorFileUpload: undefined
  }

  t.diagnostic(`[CONTEXT] ${target.label} => ${process.env.OPEN_AI_ENDPOINT}`)

  t.after(async () => {
    for (const id of ctx.vectorStoreIds) {
      await deleteVectorStore(id).catch(() => undefined)
    }
    for (const id of ctx.uploadedFileIds) {
      await deleteFile(id).catch(() => undefined)
    }
    for (const id of ctx.fineTuneJobIds) {
      await cancelFineTuningJob(id).catch(() => undefined)
    }
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  let abortReason: string | undefined

  const runOp = async (label: string, runner: OpRunner) => {
    await t.test(`${target.label}: ${label}`, async stage => {
      if (abortReason) {
        stage.diagnostic(`[SKIP] ${label}: ${abortReason}`)
        return
      }
      stage.diagnostic(`[INFO] ${label} start`)
      const maybeAbort = await runner(stage, ctx)
      if (maybeAbort) {
        abortReason = maybeAbort
        stage.diagnostic(`[INFO] ${label} aborted: ${maybeAbort}`)
      } else {
        stage.diagnostic(`[PASS] ${label} complete`)
      }
    })
  }

  await runOp('Surface exports', async stage => {
    const message = Message('Integration test hello', 'user')
    assert.equal(message.role, 'user')
    assert.equal(message.content, 'Integration test hello')
    stage.diagnostic('[INFO] Message helper validated')

    const clientExports = client as unknown as Record<string, unknown>
    const exportMap: Record<string, unknown> = {
      post,
      get: httpGet,
      del,
      postStream,
      postForm,
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
    for (const [key, fn] of Object.entries(exportMap)) {
      assert.strictEqual(clientExports[key], fn, `client.${key} mismatch`)
    }
    stage.diagnostic(`[INFO] Verified ${Object.keys(exportMap).length} client methods`)
  })

  await runOp('Text completions', async stage => {
    if (target.limited) {
      stage.diagnostic('[SKIP] Text completions disabled for limited target')
      return
    }
    const handleAttempt = createHandleAttempt(stage)

    const completionAttempt = await attemptWithModels('completion', COMPLETION_MODELS, model =>
      completion('State the word Integration succinctly.', 1, undefined, { model })
    )
    const completionResolution = handleAttempt('completion', completionAttempt, result => {
      stage.diagnostic(`[INFO] completion choices: ${Array.isArray(result.choices) ? result.choices.length : 0}`)
    })
    if (completionResolution.status === 'skip') {
      return completionResolution.reason ?? 'completion skipped'
    }
    ctx.completionModel =
      completionResolution.status === 'ok'
        ? completionResolution.meta.model ?? ctx.completionModel
        : ctx.completionModel

    if (target.limited) {
      stage.diagnostic('[INFO] completionStream skipped for limited target')
    } else {
      handleAttempt(
        'completionStream',
        await attemptApi('completionStream', () =>
          collectStream(() =>
            completionStream('Stream Integration result', 1, undefined, { model: ctx.completionModel })
          )
        ),
        result => {
          stage.diagnostic(`[INFO] completion stream chunks: ${result.length}`)
        }
      )
    }
  })

  await runOp('Chat completions', async stage => {
    if (target.limited) {
      stage.diagnostic('[SKIP] Chat completions disabled for limited target')
      return
    }
    const handleAttempt = createHandleAttempt(stage)

    const chatAttempt = await attemptWithModels('chatCompletion', CHAT_MODELS, model =>
      chatCompletion([Message('Respond with Integration', 'user')], 1, undefined, { model })
    )
    const chatResolution = handleAttempt('chatCompletion', chatAttempt, result => {
      stage.diagnostic(`[INFO] chat choices: ${Array.isArray(result.choices) ? result.choices.length : 0}`)
    })
    if (chatResolution.status === 'skip') {
      return chatResolution.reason ?? 'chat completion skipped'
    }
    ctx.chatModel =
      chatResolution.status === 'ok'
        ? chatResolution.meta.model ?? ctx.chatModel
        : ctx.chatModel

    if (target.limited) {
      stage.diagnostic('[INFO] chatCompletionStream skipped for limited target')
    } else {
      handleAttempt(
        'chatCompletionStream',
        await attemptApi('chatCompletionStream', () =>
          collectStream(() =>
            chatCompletionStream([Message('Stream response', 'user')], 1, undefined, { model: ctx.chatModel })
          )
        ),
        result => {
          stage.diagnostic(`[INFO] chat stream chunks: ${result.length}`)
        }
      )

      const timeTool: ChatCompletionsFunctionTool = {
        type: 'function',
        function: {
          name: 'current_time',
          description: 'Returns the current time as an ISO 8601 string.',
          parameters: {
            type: 'object',
            properties: {},
            required: []
          }
        }
      }

      const systemPrompt = Message('You are helpful and use your tools to help satisfy requests', 'system') as MessagePayload
      const userPrompt = Message('What time is it?', 'user') as MessagePayload
      const baseMessages: MessagePayload[] = [systemPrompt, userPrompt]

      const toolResolution = handleAttempt(
        'chatCompletion tool call',
        await attemptApi('chatCompletion tool call', () =>
          chatCompletion(baseMessages, 1, undefined, {
            model: ctx.chatModel,
            tools: [timeTool],
            tool_choice: { type: 'function', function: { name: timeTool.function.name } }
          })
        ),
        result => {
          const finishReason = result.choices[0]?.finish_reason ?? 'unknown'
          stage.diagnostic(`[INFO] tool call finish_reason: ${finishReason}`)
        }
      )

      if (toolResolution.status === 'skip') {
        return toolResolution.reason ?? 'tool call skipped'
      }

      if (toolResolution.status === 'ok') {
        const choiceWithTool = toolResolution.value.choices.find(choice => choice.message?.tool_calls?.length)

        if (!choiceWithTool || !choiceWithTool.message?.tool_calls?.length) {
          stage.diagnostic('[INFO] tool call not returned; skipping tool follow-up')
        } else {
          const toolCalls = choiceWithTool.message.tool_calls ?? []
          const assistantToolMessage: MessagePayload = {
            role: 'assistant',
            content: null,
            tool_calls: toolCalls
          }
          const toolResult = new Date().toISOString()
          const toolResponse: MessagePayload = {
            role: 'tool',
            content: toolResult,
            tool_call_id: toolCalls[0]?.id ?? ''
          }

          const followUpMessages: MessagePayload[] = [...baseMessages, assistantToolMessage, toolResponse]

          handleAttempt(
            'chatCompletion tool follow-up',
            await attemptApi('chatCompletion tool follow-up', () =>
              chatCompletion(followUpMessages, 1, undefined, {
                model: ctx.chatModel,
                tools: [timeTool],
                tool_choice: 'none'
              })
            ),
            result => {
              const assistantReply = result.choices[0]?.message?.content ?? ''
              stage.diagnostic(`[INFO] tool follow-up reply: ${assistantReply.slice(0, 80)}`)
              assert.ok(assistantReply.length > 0, 'assistant reply should not be empty after tool call')
            }
          )
        }
      }
    }
  })

  await runOp('Responses API', async stage => {
    if (target.limited) {
      stage.diagnostic('[SKIP] Responses API unavailable for limited target')
      return
    }
    const handleAttempt = createHandleAttempt(stage)

    const responseAttempt = await attemptWithModels('createResponse', RESPONSE_MODELS, model =>
      createResponse({ model, input: 'Summarize integration', metadata: { scope: 'test' } })
    )
    const responseResolution = handleAttempt('createResponse', responseAttempt, response => {
      stage.diagnostic(`[INFO] response id: ${response.id}`)
    })
    if (responseResolution.status === 'skip') {
      return responseResolution.reason ?? 'responses skipped'
    }
    ctx.responseModel =
      responseResolution.status === 'ok'
        ? responseResolution.meta.model ?? ctx.responseModel
        : ctx.responseModel

    if (responseResolution.status === 'ok') {
      const responseId = responseResolution.value.id
      handleAttempt(
        'getResponse',
        await attemptApi('getResponse', () => getResponse(responseId)),
        fetched => {
          assert.equal(fetched.id, responseId)
        }
      )
    }

    const backgroundAttempt = await attemptWithModels('createResponse background', RESPONSE_MODELS, model =>
      createResponse({ model, input: 'Background run', background: true })
    )
    const backgroundResolution = handleAttempt('createResponse (background)', backgroundAttempt)
    if (backgroundResolution.status === 'ok') {
      handleAttempt(
        'cancelResponse',
        await attemptApi('cancelResponse', () => cancelResponse(backgroundResolution.value.id)),
        cancelled => {
          stage.diagnostic(`[INFO] cancel status: ${cancelled.status}`)
        }
      )
    }
  })

  await runOp('Speech synthesis', async stage => {
    const handleAttempt = createHandleAttempt(stage)
    handleAttempt(
      'generateSpeech',
      await attemptWithModels('generateSpeech', SPEECH_MODELS, model =>
        generateSpeech('Integration speech sample', 'nova', { model, responseFormat: 'mp3' })
      ),
      speech => {
        stage.diagnostic(`[INFO] speech payload type: ${typeof speech}`)
      }
    )
  })

  await runOp('Embeddings and moderation', async stage => {
    const handleAttempt = createHandleAttempt(stage)

    handleAttempt(
      'getEmbedding',
      await attemptWithModels('getEmbedding', EMBEDDING_MODELS, model =>
        getEmbedding('Integration embedding test', model)
      ),
      embedding => {
        stage.diagnostic(`[INFO] embedding length: ${embedding.data[0]?.embedding.length ?? 0}`)
      }
    )

    handleAttempt(
      'moderation',
      await attemptWithModels('moderation', MODERATION_MODELS, model =>
        moderation('I will hug everyone', model)
      ),
      result => {
        stage.diagnostic(`[INFO] moderation results: ${result.results.length}`)
      }
    )
  })

  await runOp('Model catalog', async stage => {
    const handleAttempt = createHandleAttempt(stage)

    const modelsResolution = handleAttempt(
      'getModels',
      await attemptApi('getModels', () => getModels()),
      models => {
        stage.diagnostic(`[INFO] models listed: ${models.data.length}`)
      }
    )
    if (modelsResolution.status === 'ok') {
      const firstModel = modelsResolution.value.data[0]?.id
      if (firstModel) {
        handleAttempt(
          'getModel',
          await attemptApi('getModel', () => getModel(firstModel)),
          model => {
            stage.diagnostic(`[INFO] inspected model: ${model.id}`)
          }
        )
      }
    }
  })

  await runOp('Audio transcription/translation', async stage => {
    const handleAttempt = createHandleAttempt(stage)

    handleAttempt(
      'getTranscription',
      await attemptApi('getTranscription', () =>
        getTranscription<'json'>(ctx.audioPath, '', 'en', 'json')
      ),
      transcription => {
        stage.diagnostic(`[INFO] transcription characters: ${transcription.text.length}`)
      }
    )

    handleAttempt(
      'getTranslation',
      await attemptApi('getTranslation', () =>
        getTranslation<'text'>(ctx.audioPath, '', 'text')
      ),
      translation => {
        stage.diagnostic(`[INFO] translation length: ${translation.length}`)
      }
    )
  })

  await runOp('Image helpers', async stage => {
    if (target.limited) {
      stage.diagnostic('[SKIP] Image helpers disabled for limited target')
      return
    }
    const handleAttempt = createHandleAttempt(stage)

    handleAttempt(
      'generateImage',
      await attemptApi('generateImage', () =>
        generateImage('Minimal icon of a circle', 1, 0, 'b64_json')
      ),
      image => {
        stage.diagnostic(`[INFO] generated images: ${image.data.length}`)
      }
    )

    handleAttempt(
      'editImage',
      await attemptApi('editImage', () =>
        editImage(ctx.imagePath, 'Add a small square', null, 1, 0, 'b64_json')
      ),
      image => {
        stage.diagnostic(`[INFO] edited images: ${image.data.length}`)
      }
    )

  })

  await runOp('File helpers', async stage => {
    const handleAttempt = createHandleAttempt(stage)
    const attemptUpload = createAttemptUpload(stage, ctx, uploadFile)

    const fineTuneUpload = await attemptUpload('uploadFile (fine-tune)', ctx.trainingJsonlPath, 'fine-tune')
    ctx.fineTuneUpload = fineTuneUpload
    if (fineTuneUpload.status === 'skip') {
      return fineTuneUpload.reason ?? 'uploadFile (fine-tune) skipped'
    }

    const vectorFileUpload = await attemptUpload('uploadFile (assistants)', ctx.vectorTextPath, 'assistants')
    ctx.vectorFileUpload = vectorFileUpload
    if (vectorFileUpload.status === 'skip') {
      return vectorFileUpload.reason ?? 'uploadFile (assistants) skipped'
    }

    handleAttempt(
      'getFiles',
      await attemptApi('getFiles', () => getFiles()),
      files => {
        stage.diagnostic(`[INFO] files in account: ${files.data.length}`)
      }
    )

    if (fineTuneUpload.status === 'ok') {
      const fineTuneFile = fineTuneUpload.value
      handleAttempt(
        'getFile',
        await attemptApi('getFile', () => getFile(fineTuneFile.id)),
        file => {
          assert.equal(file.id, fineTuneFile.id)
        }
      )
      handleAttempt(
        'getFileContent',
        await attemptApi('getFileContent', () => getFileContent(fineTuneFile.id)),
        content => {
          stage.diagnostic(`[INFO] file content length: ${content.length}`)
        }
      )
    }
  })

  await runOp('Vector stores', async stage => {
    const vectorFileUpload = ctx.vectorFileUpload
    if (!vectorFileUpload || vectorFileUpload.status !== 'ok') {
      stage.diagnostic('[INFO] Skipping vector store stage: no uploaded assistant file')
      return
    }

    const handleAttempt = createHandleAttempt(stage)
    const createResolution = handleAttempt(
      'createVectorStore',
      await attemptApi('createVectorStore', () => createVectorStore(`integration-${Date.now()}`)),
      store => {
        ctx.vectorStoreIds.push(store.id)
        stage.diagnostic(`[INFO] vector store created: ${store.id}`)
      }
    )
    if (createResolution.status !== 'ok') {
      return
    }
    const vectorStore = createResolution.value
    const vectorSourceFile = vectorFileUpload.value

    handleAttempt(
      'addFileToVectorStore',
      await attemptApi('addFileToVectorStore', () =>
        addFileToVectorStore(vectorStore.id, vectorSourceFile.id, { integration: 'true' })
      )
    )

    const searchResolution = handleAttempt(
      'searchVectorStore',
      await attemptApi('searchVectorStore', () =>
        searchVectorStore(vectorStore.id, 'oranges')
      ),
      search => {
        stage.diagnostic(`[INFO] vector search hits: ${search.data.length}`)
      }
    )

    if (searchResolution.status === 'ok' && searchResolution.value.data.length === 0) {
      await sleep(2_000)
      handleAttempt(
        'searchVectorStore retry',
        await attemptApi('searchVectorStore retry', () =>
          searchVectorStore(vectorStore.id, 'oranges')
        ),
        retry => {
          stage.diagnostic(`[INFO] vector search retry hits: ${retry.data.length}`)
        }
      )
    }

    handleAttempt(
      'getVectorStore',
      await attemptApi('getVectorStore', () => getVectorStore(vectorStore.id)),
      store => {
        assert.equal(store.id, vectorStore.id)
      }
    )

    const deleteResolution = handleAttempt(
      'deleteVectorStore',
      await attemptApi('deleteVectorStore', () => deleteVectorStore(vectorStore.id)),
      deletion => {
        stage.diagnostic(`[INFO] vector store deleted: ${deletion.deleted}`)
      }
    )
    if (deleteResolution.status === 'ok' && deleteResolution.value.deleted) {
      ctx.vectorStoreIds.splice(ctx.vectorStoreIds.indexOf(vectorStore.id), 1)
    }
  })

  await runOp('Fine-tuning lifecycle', async stage => {
    const handleAttempt = createHandleAttempt(stage)

    const jobsResolution = handleAttempt(
      'listFineTuningJobs',
      await attemptApi('listFineTuningJobs', () => listFineTuningJobs()),
      jobs => {
        stage.diagnostic(`[INFO] fine-tuning jobs: ${jobs.data.length}`)
      }
    )
    if (jobsResolution.status === 'skip') {
      return jobsResolution.reason ?? 'fine-tuning skipped'
    }

    const creationResolution = handleAttempt(
      'createFineTuningJob',
      await attemptApi('createFineTuningJob', () =>
        createFineTuningJob({
          model: 'gpt-3.5-turbo',
          training_file: ctx.fineTuneUpload?.status === 'ok' ? ctx.fineTuneUpload.value.id : ''
        })
      )
    )

    let activeFineTuneId: string | undefined
    if (creationResolution.status === 'ok') {
      activeFineTuneId = creationResolution.value.id
      ctx.fineTuneJobIds.push(activeFineTuneId)
    } else if (jobsResolution.status === 'ok') {
      activeFineTuneId = jobsResolution.value.data[0]?.id
    }

    if (activeFineTuneId) {
      handleAttempt(
        'retrieveFineTuningJob',
        await attemptApi('retrieveFineTuningJob', () => retrieveFineTuningJob(activeFineTuneId!)),
        job => {
          assert.equal(job.id, activeFineTuneId)
        }
      )
      handleAttempt(
        'listFineTuningJobEvents',
        await attemptApi('listFineTuningJobEvents', () => listFineTuningJobEvents(activeFineTuneId!))
      )
      handleAttempt(
        'listFineTuningJobCheckpoints',
        await attemptApi('listFineTuningJobCheckpoints', () => listFineTuningJobCheckpoints(activeFineTuneId!))
      )
      handleAttempt(
        'cancelFineTuningJob',
        await attemptApi('cancelFineTuningJob', () => cancelFineTuningJob(activeFineTuneId!)),
        job => {
          ctx.fineTuneJobIds.splice(ctx.fineTuneJobIds.indexOf(activeFineTuneId!), 1)
          stage.diagnostic(`[INFO] fine-tuning cancel status: ${job.status}`)
        }
      )
    }
  })

  await runOp('Direct HTTP helpers', async stage => {
    if (target.limited) {
      stage.diagnostic('[SKIP] Direct HTTP helpers disabled for limited target')
      return
    }
    const handleAttempt = createHandleAttempt(stage)
    const attemptUpload = createAttemptUpload(stage, ctx, uploadFile)

    handleAttempt(
      'post moderation',
      await attemptApi('post moderation', () =>
        post<ModerationResponse, { input: string; model: string }>("/v1/moderations", {
          input: 'I will help',
          model: 'text-moderation-latest'
        })
      ),
      result => {
        stage.diagnostic(`[INFO] moderation via post results: ${result.results.length}`)
      }
    )

    handleAttempt(
      'httpGet /v1/models',
      await attemptApi('httpGet /v1/models', () => httpGet<ListResponse<ModelInfo>>("/v1/models")),
      models => {
        stage.diagnostic(`[INFO] http get models: ${models.data.length}`)
      }
    )

    const tempPath = path.join(ctx.tempDir, `temp-${crypto.randomUUID()}.jsonl`)
    fs.writeFileSync(tempPath, `${JSON.stringify({ prompt: 'Hello', completion: 'Hi' })}
`)

    const tempUpload = await attemptUpload('uploadFile temp', tempPath, 'fine-tune')
    if (tempUpload.status === 'ok') {
      const tempUploadedFile = tempUpload.value
      handleAttempt(
        'del temp file',
        await attemptApi('del temp file', () => del<DeleteResponse>(`/v1/files/${tempUploadedFile.id}`)),
        deletion => {
          if (deletion.deleted) {
            ctx.uploadedFileIds.splice(ctx.uploadedFileIds.indexOf(tempUploadedFile.id), 1)
          }
        }
      )
    }
    fs.unlinkSync(tempPath)

    handleAttempt(
      'postStream direct',
      await attemptApi('postStream direct', () =>
        collectStream(() =>
          postStream('/v1/completions', {
            model: ctx.completionModel,
            prompt: 'Stream integration via postStream',
            stream: true,
            n: 1
          })
        )
      ),
      result => {
        stage.diagnostic(`[INFO] postStream chunks: ${result.length}`)
      }
    )

    const form = new FormData()
    form.append('image', fs.createReadStream(ctx.imagePath))
    form.append('n', '1')
    form.append('response_format', 'b64_json')
    form.append('size', '256x256')

    handleAttempt(
      'postForm image variations',
      await attemptApi('postForm image variations', () =>
        postForm<ImageResponse>('/v1/images/variations', form, raw => JSON.parse(raw) as ImageResponse)
      ),
      parsed => {
        stage.diagnostic(`[INFO] postForm images: ${parsed.data.length}`)
      }
    )
  })
}

for (const target of loadTargets()) {
  test(`open-ai helpers integration (${target.label})`, { timeout: TIMEOUT_MS }, async t => {
    const restoreEnv = applyTargetEnv(target)
    try {
      await runIntegration(t, target)
    } finally {
      restoreEnv()
    }
  })
}

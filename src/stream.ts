import { EventEmitter } from 'events'
import type { IncomingMessage } from 'http'

import type {
  CompletionStreamPayload,
  JsonObject,
  JsonValue,
  ResponseStreamError,
  ResponseStreamEvent,
  StreamErrorPayload
} from './types'

/**
 * Parses a JSON string and narrows it to JsonValue for downstream consumers.
 */
const parseJson = (data: string): JsonValue => JSON.parse(data) as JsonValue

/**
 * Type guard that checks whether a JsonValue is a JsonObject map.
 */
const isJsonObject = (value: JsonValue): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * Type guard that matches completion stream payload envelopes.
 */
const isCompletionStreamPayload = (value: JsonValue): value is CompletionStreamPayload => {
  if (!isJsonObject(value)) return false
  const possibleChoices = value.choices
  const possibleError = value.error
  const hasChoices = Array.isArray(possibleChoices)
  const hasError = typeof possibleError === 'object' && possibleError !== null
  return hasChoices || hasError
}

/**
 * Event-emitting wrapper around the `/v1/*` streaming SSE responses.
 */
class ResponseStream {
  readonly emitter: EventEmitter
  onData?: (chunk: ResponseStreamEvent) => void
  onComplete?: (result: ResponseStreamEvent) => void
  onError?: (error: ResponseStreamError) => void

  private readonly stream: IncomingMessage
  private buffer: string
  private readonly chunks: ResponseStreamEvent[]
  private errorPayload: StreamErrorPayload | null

  /**
   * Wraps a Node HTTP IncomingMessage that delivers SSE-style chunks.
   */
  constructor(stream: IncomingMessage) {
    this.stream = stream
    this.emitter = new EventEmitter()
    this.buffer = ''
    this.chunks = []
    this.errorPayload = null

    this.stream.on('error', (error: Error) => {
      const castError = error instanceof Error ? error : new Error(String(error))
      this.emitError(castError)
      this.stream.destroy(castError)
    })

    this.stream.on('aborted', () => {
      const abortError = new Error('Stream aborted')
      abortError.name = 'AbortError'
      this.emitError(abortError)
    })

    this.stream.on('data', (chunk: Buffer | string) => {
      try {
        this.handleChunk(typeof chunk === 'string' ? chunk : chunk.toString())
      } catch (error) {
        const castError = error instanceof Error ? error : new Error(String(error))
        this.emitError(castError)
        this.stream.destroy(castError)
      }
    })

    this.stream.on('end', () => {
      this.flushBuffer()
      if (this.errorPayload) {
        if (this.onError) this.onError(this.errorPayload)
        if (this.emitter.listenerCount('error') > 0) {
          const payloadError = new Error(this.errorPayload.message)
          payloadError.name = this.errorPayload.type ?? 'StreamError'
          this.emitter.emit('error', payloadError)
        }
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

  /**
   * Emits errors on callbacks and event emitters when streams fail.
   */
  private emitError(error: ResponseStreamError): void {
    if (this.onError) {
      this.onError(error)
    }
    if (this.emitter.listenerCount('error') > 0) {
      this.emitter.emit('error', error)
    }
  }

  /**
   * Processes buffered chunks from the SSE stream line-by-line.
   */
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

  /**
   * Consumes a single SSE data payload and propagates completions/errors.
   */
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

  /**
   * Flushes buffered content once the stream terminates.
   */
  private flushBuffer(): void {
    const bufferContent = this.buffer.trim()
    if (bufferContent) {
      this.consumePayload(bufferContent)
    }
    this.buffer = ''
  }
}

export { ResponseStream }

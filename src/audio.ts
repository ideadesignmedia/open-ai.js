import * as fs from 'fs'

import type { HttpClient } from './http'
import type {
  AudioSpeechResponse,
  SpeechGenerationOptions,
  WhisperResponseFormat,
  WhisperTranscriptionResult
} from './types'

/**
 * Payload accepted by `/v1/audio/speech` generation endpoint.
 */
type SpeechRequest = {
  input: string
  model: string
  voice: string
  response_format: string
  speed: number
}

/**
 * Creates helper methods for audio-related API surfaces (speech + Whisper).
 *
 * @param http - HTTP client used to issue form and JSON requests.
 */
const createAudioClient = (http: HttpClient) => {
  /**
   * Generates speech audio for the provided text using `/v1/audio/speech`.
   *
   * @param input - Text to synthesize.
   * @param voice - Voice preset to request (defaults to `nova`).
   * @param options - Extra configuration such as model id, output format, and speed.
   */
  const generateSpeech = (
    input: string,
    voice = 'nova',
    { model = 'tts-1', responseFormat = 'mp3', speed = 1.0 }: SpeechGenerationOptions = {}
  ): Promise<AudioSpeechResponse> => {
    const payload: SpeechRequest = {
      input,
      model,
      voice,
      response_format: responseFormat,
      speed
    }
    return http.post<AudioSpeechResponse, SpeechRequest>('/v1/audio/speech', payload)
  }

  /**
   * Transcribes an audio file via `/v1/audio/transcriptions` (Whisper API).
   *
   * @param file - Path to a local audio file.
   * @param prompt - Optional text prompt to prime the model.
   * @param language - Expected spoken language hint (defaults to `en`).
   * @param responseFormat - Desired Whisper response format (json, text, srt, ...).
   * @param temperature - Temperature for sampling (defaults to 0).
   */
  const getTranscription = async <TFormat extends WhisperResponseFormat = 'json'>(
    file: string,
    prompt = '',
    language = 'en',
    responseFormat?: TFormat,
    temperature = 0
  ): Promise<WhisperTranscriptionResult<TFormat>> => {
    const format = responseFormat ?? 'json'
    const form = http.createFormData()
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

    return http.postForm(`/v1/audio/transcriptions`, form, parser)
  }

  /**
   * Translates speech to English via `/v1/audio/translations` (Whisper API).
   *
   * @param file - Path to a local audio file.
   * @param prompt - Optional text prompt to prime the model.
   * @param responseFormat - Desired Whisper response format (json, text, srt, ...).
   * @param temperature - Temperature for sampling (defaults to 0).
   */
  const getTranslation = async <TFormat extends WhisperResponseFormat = 'json'>(
    file: string,
    prompt = '',
    responseFormat?: TFormat,
    temperature = 0
  ): Promise<WhisperTranscriptionResult<TFormat>> => {
    const format = responseFormat ?? 'json'
    const form = http.createFormData()
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

    return http.postForm(`/v1/audio/translations`, form, parser)
  }

  /**
   * Audio helper surface exposing speech synthesis and Whisper utilities.
   */
  return {
    generateSpeech,
    getTranscription,
    getTranslation
  }
}

export { createAudioClient }

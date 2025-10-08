import * as fs from 'fs'

import type { HttpClient } from './http'
import type {
  AudioSpeechResponse,
  SpeechGenerationOptions,
  WhisperResponseFormat,
  WhisperTranscriptionResult
} from './types'

type SpeechRequest = {
  input: string
  model: string
  voice: string
  response_format: string
  speed: number
}

const createAudioClient = (http: HttpClient) => {
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

  return {
    generateSpeech,
    getTranscription,
    getTranslation
  }
}

export { createAudioClient }

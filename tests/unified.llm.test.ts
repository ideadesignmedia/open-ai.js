import "@ideadesignmedia/config.js"

import assert from "node:assert/strict"
import { test } from "node:test"

import { UnifiedLLMClient } from "../src/unified"
import type { UnifiedLLMClientOptions } from "../src/unified"
import type { UnifiedChatRequest, UnifiedChatResponse, UnifiedModelInfo } from "../src/providers/types"
import { FetchError } from "../src/providers/base"

interface ProviderTestConfig {
  label: string
  provider: 'anthropic' | 'google' | 'cohere' | 'mistral'
  envKey: string
  fallbackModel: string
  pickModel?: (models: UnifiedModelInfo[]) => string | undefined
  buildRequest: (model: string) => UnifiedChatRequest
  optionsKey: 'anthropic' | 'google' | 'cohere' | 'mistral'
  options?: Record<string, unknown>
  preferredModels?: string[]
}

const sanitize = (value: string, max = 160): string =>
  value.replace(/\s+/g, ' ').trim().slice(0, max)

const resolveSkipReason = (provider: string, error: unknown): string | undefined => {
  if (error instanceof FetchError) {
    const body = error.responseBody ? sanitize(error.responseBody) : ''
    if ([401, 402, 403, 404, 409, 429].includes(error.status)) {
      return `${provider} HTTP ${error.status}: ${body || error.message}`
    }
    if (/quota|billing|disabled|not enabled|not available|insufficient/i.test(body)) {
      return `${provider} unavailable: ${body || error.message}`
    }
  }
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    if (
      message.includes('quota') ||
      message.includes('billing') ||
      message.includes('unauthorized') ||
      message.includes('forbidden') ||
      message.includes('not found') ||
      message.includes('not available') ||
      message.includes('not enabled') ||
      message.includes('permission')
    ) {
      return `${provider}: ${sanitize(error.message)}`
    }
  }
  return undefined
}

const PROVIDERS: ProviderTestConfig[] = [
  {
    label: 'Anthropic (Claude)',
    provider: 'anthropic',
    envKey: 'ANTHROPIC_API_KEY',
    fallbackModel: 'claude-3-haiku-20240307',
    pickModel: models => models.find(model => /haiku/i.test(model.name))?.name,
    buildRequest: model => ({
      model,
      messages: [
        { role: 'system', content: 'You are a concise assistant. Reply in <= 20 words.' },
        { role: 'user', content: 'Say hello from the unified integration harness.' }
      ],
      temperature: 0
    }),
    optionsKey: 'anthropic'
  },
  {
    label: 'Google Gemini',
    provider: 'google',
    envKey: 'GOOGLE_GEMINI_API_KEY',
    fallbackModel: 'models/gemini-1.5-flash-latest',
    preferredModels: [
      'models/gemini-2.0-flash',
      'models/gemini-2.0-flash-exp',
      'models/gemini-1.5-flash-latest',
      'models/gemini-1.5-flash',
      'models/gemini-1.5-pro',
      'models/gemini-pro'
    ],
    pickModel: models => {
      const preferred = [
        'models/gemini-2.0-flash',
        'models/gemini-2.0-flash-exp',
        'models/gemini-1.5-flash-latest',
        'models/gemini-1.5-flash',
        'models/gemini-1.5-pro',
        'models/gemini-pro'
      ]
      for (const candidate of preferred) {
        if (models.some(model => model.name === candidate)) {
          return candidate
        }
      }
      return models.find(model => model.name.includes('gemini'))?.name
    },
    buildRequest: model => ({
      model,
      messages: [
        { role: 'system', content: 'Respond with a short greeting mentioning Gemini.' },
        { role: 'user', content: 'What project is exercising you?' }
      ]
    }),
    optionsKey: 'google'
  },
  {
    label: 'Cohere Command',
    provider: 'cohere',
    envKey: 'COHERE_API_KEY',
    fallbackModel: 'command-r',
    pickModel: models => {
      const preferred = [
        'command-r-plus',
        'command-r-plus-latest',
        'command-r-plus-08-2024',
        'command-r',
        'command-r-08-2024',
        'command-r7b-latest',
        'command-r7b-08-2024'
      ]
      for (const candidate of preferred) {
        if (models.some(model => model.name === candidate)) {
          return candidate
        }
      }
      return models.find(model => model.name.startsWith('command-r') && !/arabic|chinese|japanese|korean/i.test(model.name))?.name
    },
    buildRequest: model => ({
      model,
      messages: [
        { role: 'system', content: 'You are cheerful and succinct.' },
        { role: 'user', content: 'Provide a one sentence status update about MCP compliance.' }
      ],
      temperature: 0.2
    }),
    optionsKey: 'cohere'
  },
  {
    label: 'Mistral',
    provider: 'mistral',
    envKey: 'MISTRAL_API_KEY',
    fallbackModel: 'mistral-small-latest',
    pickModel: models => models.find(model => /mistral-(small|7b)/i.test(model.name))?.name,
    buildRequest: model => ({
      model,
      messages: [
        { role: 'system', content: 'Respond briefly in English.' },
        { role: 'user', content: 'List one benefit of MCP in a short clause.' }
      ],
      temperature: 0
    }),
    optionsKey: 'mistral'
  }
]

const TEST_TIMEOUT_MS = 180_000

for (const target of PROVIDERS) {
  test(`UnifiedLLMClient integration: ${target.label}`, { timeout: TEST_TIMEOUT_MS }, async t => {
    const apiKey = process.env[target.envKey]
    if (!apiKey) {
      t.skip(`${target.envKey} is not configured`)
      return
    }

    const clientOptions: UnifiedLLMClientOptions = {
      provider: target.provider,
      apiKey
    } as UnifiedLLMClientOptions
    if (target.optionsKey) {
      ;((clientOptions as unknown) as Record<string, unknown>)[target.optionsKey] = target.options ?? {}
    }

    const client = new UnifiedLLMClient(clientOptions)
    const log = (message: string) => console.log(`[unified-${target.provider}] ${message}`)

    const fallbackModel = target.fallbackModel
    let model = fallbackModel
    const candidateModels: string[] = []
    let lastSkipReason: string | undefined
    let lastError: unknown

    try {
      const models = await client.listModels()
      log(`listModels returned ${models.length} models`)
      if (target.provider === 'google') {
        log(`sample google models: ${models.slice(0, 10).map(model => model.name).join(', ')}`)
      }
      if (Array.isArray(target.preferredModels)) {
        for (const preferred of target.preferredModels) {
          if (models.some(modelInfo => modelInfo.name === preferred) && !candidateModels.includes(preferred)) {
            candidateModels.push(preferred)
          }
        }
      }
      const candidate = target.pickModel?.(models)
      if (candidate) {
        model = candidate
        log(`selected model from listing: ${model}`)
        if (!candidateModels.includes(model)) {
          candidateModels.push(model)
        }
      } else {
        log(`using fallback model: ${model}`)
      }
    } catch (error) {
      const reason = resolveSkipReason(target.provider, error)
      if (reason) {
        t.skip(`listModels skipped: ${reason}`)
        return
      }
      throw error
    }

    if (!candidateModels.includes(fallbackModel)) {
      candidateModels.push(fallbackModel)
    }
    if (target.provider === 'google') {
      for (const backup of ['models/gemini-pro', 'models/gemini-1.5-pro']) {
        if (!candidateModels.includes(backup)) {
          candidateModels.push(backup)
        }
      }
    }

    let response: UnifiedChatResponse | undefined

    for (const candidate of candidateModels) {
      const request = target.buildRequest(candidate)
      log(`chat request for model: ${request.model}`)
      try {
        const result = await client.generateChat(request)
        log(`chat response: ${sanitize(result.content)}`)
        assert.equal(result.model, request.model)
        assert.ok(result.content.length > 0, 'response content should not be empty')
        response = result
        break
      } catch (error) {
        const reason = resolveSkipReason(target.provider, error)
        if (reason) {
          log(`chat attempt for model ${candidate} skipped: ${reason}`)
          lastSkipReason = reason
          continue
        }
        lastError = error
        break
      }
    }

    if (!response) {
      if (lastSkipReason) {
        t.skip(`chat skipped: ${lastSkipReason}`)
        return
      }
      if (lastError) {
        throw lastError
      }
      t.skip('chat skipped: no available models')
      return
    }

  })
}








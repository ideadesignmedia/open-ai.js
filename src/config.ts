import argsModule from '@ideadesignmedia/arguments.js'

import type { ArgumentsModule, OpenAIClientConfig, ResolvedOpenAIClientConfig } from './types'

/**
 * Resolved CLI/env arguments exposed by `@ideadesignmedia/arguments.js`.
 */
const args = argsModule as ArgumentsModule

/**
 * Resolves an OpenAI configuration by merging explicit options, CLI args, and env vars.
 *
 * @param config - Partial config supplied by the caller.
 * @returns Config with guaranteed `host` and `key`, throwing if no credential is found.
 */
const resolveConfig = (config: OpenAIClientConfig = {}): ResolvedOpenAIClientConfig => {
  const host = config.host ?? process.env.OPEN_AI_ENDPOINT ?? 'https://api.openai.com'
  const key =
    config.key ??
    args.OPEN_AI_SECRET ??
    args.OPEN_AI_API_KEY ??
    process.env.OPEN_AI_SECRET ??
    process.env.OPEN_AI_API_KEY
  const organization =
    config.organization ?? args.OPEN_AI_ORGANIZATION ?? process.env.OPEN_AI_ORGANIZATION ?? undefined

  if (!key) {
    throw new Error('OpenAI API key must be provided via config.key or environment variables')
  }

  return {
    host,
    key,
    organization
  }
}

export { resolveConfig }

import argsModule from '@ideadesignmedia/arguments.js'

import type { ArgumentsModule } from './types'

const args = argsModule as ArgumentsModule

const OPEN_AI_SECRET = args.OPEN_AI_SECRET ?? args.OPEN_AI_API_KEY ?? process.env.OPEN_AI_SECRET ?? process.env.OPEN_AI_API_KEY
const OPEN_AI_ORGANIZATION = args.OPEN_AI_ORGANIZATION ?? process.env.OPEN_AI_ORGANIZATION
const OPEN_AI_ENDPOINT = process.env.OPEN_AI_ENDPOINT ?? 'https://api.openai.com'

if (!OPEN_AI_SECRET) {
  throw new Error('OPEN_AI_SECRET or OPEN_AI_API_KEY must be defined')
}

const jsonHeaders = (): Record<string, string | undefined> => ({
  Authorization: `Bearer ${OPEN_AI_SECRET}`,
  'OpenAI-Organization': OPEN_AI_ORGANIZATION,
  'Content-Type': 'application/json'
})

export { OPEN_AI_SECRET, OPEN_AI_ORGANIZATION, OPEN_AI_ENDPOINT, jsonHeaders }

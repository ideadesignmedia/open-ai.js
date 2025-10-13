import { AnthropicProvider, type AnthropicProviderOptions } from './providers/anthropic'
import { CohereProvider, type CohereProviderOptions } from './providers/cohere'
import { GoogleProvider, type GoogleProviderOptions } from './providers/google'
import { MistralProvider, type MistralProviderOptions } from './providers/mistral'
import { OpenAIProvider, type OpenAIProviderOptions } from './providers/openai'
import type {
  LLMProvider,
  UnifiedChatRequest,
  UnifiedChatResponse,
  UnifiedChatStreamChunk,
  UnifiedModelInfo
} from './providers/types'

export type SupportedProvider = 'openai' | 'anthropic' | 'google' | 'cohere' | 'mistral'

export interface UnifiedLLMClientOptions {
  provider: SupportedProvider
  openai?: Omit<OpenAIProviderOptions, 'apiKey'>
  anthropic?: Omit<AnthropicProviderOptions, 'apiKey'>
  google?: Omit<GoogleProviderOptions, 'apiKey'>
  cohere?: Omit<CohereProviderOptions, 'apiKey'>
  mistral?: Omit<MistralProviderOptions, 'apiKey'>
  apiKey: string
}

export class UnifiedLLMClient {
  private readonly provider: LLMProvider

  constructor(options: UnifiedLLMClientOptions) {
    switch (options.provider) {
      case 'openai':
        this.provider = new OpenAIProvider({ apiKey: options.apiKey, ...(options.openai ?? {}) })
        break
      case 'anthropic':
        this.provider = new AnthropicProvider({ apiKey: options.apiKey, ...(options.anthropic ?? {}) })
        break
      case 'google':
        this.provider = new GoogleProvider({ apiKey: options.apiKey, ...(options.google ?? {}) })
        break
      case 'cohere':
        this.provider = new CohereProvider({ apiKey: options.apiKey, ...(options.cohere ?? {}) })
        break
      case 'mistral':
        this.provider = new MistralProvider({ apiKey: options.apiKey, ...(options.mistral ?? {}) })
        break
      default:
        throw new Error(`Unsupported provider: ${options.provider}`)
    }
  }

  public get providerName(): string {
    return this.provider.name
  }

  public supportsStreaming(): boolean {
    return this.provider.supportsStreaming
  }

  public supportsTools(): boolean {
    return this.provider.supportsTools
  }

  public async listModels(): Promise<UnifiedModelInfo[]> {
    return this.provider.listModels()
  }

  public async generateChat(request: UnifiedChatRequest): Promise<UnifiedChatResponse> {
    return this.provider.chat(request)
  }

  public streamChat(request: UnifiedChatRequest): AsyncIterable<UnifiedChatStreamChunk> {
    if (!this.provider.supportsStreaming) {
      throw new Error(`${this.provider.name} does not yet support streaming in this client`)
    }
    return this.provider.streamChat(request)
  }
}

export { UnifiedChatRequest, UnifiedChatResponse, UnifiedChatStreamChunk, UnifiedModelInfo } from './providers/types'

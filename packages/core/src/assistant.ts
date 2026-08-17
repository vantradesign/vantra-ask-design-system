import type { AssistantConfig, StreamCallbacks, TokenChunk } from './types.js'
import { AssistantError } from './types.js'
import { flattenTokens } from './schema-loader.js'
import {
  embedChunks,
  embedQuery,
  searchChunks,
  keywordSearch,
  resetEmbeddingPipeline,
} from './retrieval.js'
import type { EmbeddedChunk } from './retrieval.js'
import { buildSystemPrompt } from './prompt.js'
import type { LocalLLMEngine } from '@vantra-design/local-inference'

const DEFAULT_MODEL = 'Llama-3.2-1B-Instruct-q4f32_1-MLC'
const DEFAULT_TOP_K = 5

/**
 * Local-first AI assistant for design systems.
 *
 * Wires together schema loading, embedding-based retrieval,
 * and local LLM inference to answer questions about design tokens.
 */
export class DesignSystemAssistant {
  private readonly config: Required<
    Pick<AssistantConfig, 'schema' | 'topK'>
  > & AssistantConfig
  private engine: LocalLLMEngine | null = null
  private chunks: TokenChunk[] = []
  private embeddedChunks: EmbeddedChunk[] = []
  private initialized = false

  constructor(config: AssistantConfig) {
    this.config = {
      ...config,
      topK: config.topK ?? DEFAULT_TOP_K,
    }
  }

  /**
   * Initialize models and build embeddings. Must be called before ask().
   */
  async init(): Promise<void> {
    if (this.initialized) return

    // Flatten tokens
    this.chunks = flattenTokens(this.config.schema)

    // Embed chunks (may fall back to keyword search on failure)
    try {
      this.embeddedChunks = await embedChunks(this.chunks)
    } catch (error) {
      this.config.onError?.(
        error instanceof AssistantError
          ? error
          : new AssistantError(
              'embedding-failed',
              'Embedding failed, falling back to keyword search.',
              error,
            ),
      )
      this.embeddedChunks = []
    }

    // Initialize LLM engine
    try {
      const { LocalLLMEngine: LLMEngine } = await import('@vantra-design/local-inference')

      this.engine = new LLMEngine({
        model: this.config.model ?? DEFAULT_MODEL,
        onProgress: this.config.onModelProgress
          ? (progress) => this.config.onModelProgress?.(progress)
          : undefined,
      })

      await this.engine.init()
    } catch (error) {
      const assistantError = error instanceof AssistantError
        ? error
        : new AssistantError(
            'model-load-failed',
            `Failed to initialize LLM: ${error instanceof Error ? error.message : String(error)}`,
            error,
          )
      this.config.onError?.(assistantError)
      throw assistantError
    }

    this.initialized = true
    this.config.onReady?.()
  }

  /**
   * Check if WebGPU is available in this browser.
   */
  static isSupported(): boolean {
    return (
      typeof navigator !== 'undefined' &&
      typeof navigator.gpu !== 'undefined'
    )
  }

  /**
   * Check if models are already cached (no download needed).
   */
  static async isCached(model?: string): Promise<boolean> {
    try {
      const { LocalLLMEngine: LLMEngine } = await import('@vantra-design/local-inference')
      return LLMEngine.isCached(model ?? DEFAULT_MODEL)
    } catch {
      return false
    }
  }

  /**
   * Ask a text question. Returns the full answer.
   */
  async ask(question: string): Promise<string> {
    this.assertInitialized()

    const systemPrompt = await this.buildContextPrompt(question)
    const tokens: string[] = []

    for await (const token of this.engine!.generate(question, systemPrompt)) {
      tokens.push(token)
    }

    return tokens.join('')
  }

  /**
   * Ask a text question with streaming response.
   */
  async askStream(question: string, callbacks: StreamCallbacks): Promise<void> {
    this.assertInitialized()

    const systemPrompt = await this.buildContextPrompt(question)
    const tokens: string[] = []

    try {
      for await (const token of this.engine!.generate(question, systemPrompt)) {
        tokens.push(token)
        callbacks.onToken?.(token)
      }

      callbacks.onComplete?.(tokens.join(''))
    } catch (error) {
      const assistantError = error instanceof AssistantError
        ? error
        : new AssistantError(
            'inference-failed',
            `Streaming failed: ${error instanceof Error ? error.message : String(error)}`,
            error,
          )
      callbacks.onError?.(assistantError)
      throw assistantError
    }
  }

  /**
   * Abort the current generation.
   */
  abort(): void {
    this.engine?.abort()
  }

  /**
   * Update the token schema without reinitializing the LLM.
   * Re-flattens and re-embeds the new schema.
   */
  async updateSchema(schema: Record<string, unknown>): Promise<void> {
    this.config.schema = schema
    this.chunks = flattenTokens(schema)

    try {
      this.embeddedChunks = await embedChunks(this.chunks)
    } catch {
      this.embeddedChunks = []
    }
  }

  /**
   * Release all resources (model, workers, embeddings).
   */
  async destroy(): Promise<void> {
    this.abort()
    if (this.engine) {
      await this.engine.destroy()
      this.engine = null
    }
    this.chunks = []
    this.embeddedChunks = []
    this.initialized = false
    resetEmbeddingPipeline()
  }

  // --- Private helpers ---

  private assertInitialized(): void {
    if (!this.initialized || !this.engine) {
      throw new AssistantError(
        'inference-failed',
        'Assistant not initialized. Call init() first.',
      )
    }
  }

  private async buildContextPrompt(question: string): Promise<string> {
    let results

    if (this.embeddedChunks.length > 0) {
      try {
        const queryEmbedding = await embedQuery(question)
        results = searchChunks(queryEmbedding, this.embeddedChunks, this.config.topK)
      } catch {
        results = keywordSearch(question, this.chunks, this.config.topK)
      }
    } else {
      results = keywordSearch(question, this.chunks, this.config.topK)
    }

    return buildSystemPrompt(results, this.config.systemPrompt)
  }
}

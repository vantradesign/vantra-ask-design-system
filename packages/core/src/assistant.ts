import type { AssistantConfig, StreamCallbacks, TokenChunk } from './types.js'
import { AssistantError } from './types.js'
import { flattenTokens } from './schema-loader.js'
import {
  embedChunks,
  embedQuery,
  searchChunks,
  keywordSearchWithTotal,
  resetEmbeddingPipeline,
} from './retrieval.js'
import type { EmbeddedChunk, SearchResult } from './retrieval.js'
import { buildSystemPrompt, formatDirectAnswer } from './prompt.js'
import type { LocalLLMEngine } from '@vantra-design/local-inference'

const DEFAULT_MODEL = 'SmolLM2-360M-Instruct-q4f32_1-MLC'
const DEFAULT_TOP_K = 5
const DEFAULT_MAX_TOKENS = 256
const DIRECT_ANSWER_LIMIT = 10

/**
 * Local-first AI assistant for design systems.
 *
 * Architecture: keyword search → embedding search → direct answer.
 * The LLM is lazy-loaded only when both searches fail and generation
 * is truly needed — most queries never require it.
 */
export class DesignSystemAssistant {
  private readonly config: Required<
    Pick<AssistantConfig, 'schema' | 'topK' | 'maxTokens'>
  > & AssistantConfig
  private engine: LocalLLMEngine | null = null
  private engineLoading = false
  private chunks: TokenChunk[] = []
  private embeddedChunks: EmbeddedChunk[] = []
  private initialized = false

  constructor(config: AssistantConfig) {
    this.config = {
      ...config,
      topK: config.topK ?? DEFAULT_TOP_K,
      maxTokens: config.maxTokens ?? DEFAULT_MAX_TOKENS,
    }
  }

  /**
   * Initialize embeddings. Must be called before ask().
   * The LLM is NOT loaded here — it is lazy-loaded on first need.
   */
  async init(): Promise<void> {
    if (this.initialized) return

    // Flatten tokens
    this.chunks = flattenTokens(this.config.schema)

    // Embed chunks (may fall back to keyword search on failure)
    try {
      this.embeddedChunks = await embedChunks(this.chunks, (loaded, total) => {
        this.config.onModelProgress?.({
          phase: 'initialize',
          loaded,
          total,
          percentage: Math.round((loaded / total) * 100),
        })
      })
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

    // 1. Keyword search — direct answer when quality matches are specific
    const { results: keywordResults, totalMatches } = keywordSearchWithTotal(question, this.chunks, DIRECT_ANSWER_LIMIT)
    if (keywordResults.length > 0 && totalMatches <= DIRECT_ANSWER_LIMIT) {
      // eslint-disable-next-line no-console -- performance diagnostic
      console.log(`[ask-design-system] direct answer: ${keywordResults.length}/${totalMatches} chunks (keyword)`)
      return formatDirectAnswer(keywordResults, totalMatches)
    }

    // 2. Embedding search — semantic ranking via MiniLM (~100ms)
    const embeddingResults = await this.embeddingSearch(question, DIRECT_ANSWER_LIMIT)
    if (embeddingResults.length > 0) {
      // eslint-disable-next-line no-console -- performance diagnostic
      console.log(`[ask-design-system] direct answer: ${embeddingResults.length} chunks (embedding)`)
      return formatDirectAnswer(embeddingResults)
    }

    // 3. Keyword fallback — if embedding unavailable but keywords matched
    if (keywordResults.length > 0) {
      // eslint-disable-next-line no-console -- performance diagnostic
      console.log(`[ask-design-system] direct answer: ${keywordResults.length}/${totalMatches} chunks (keyword fallback)`)
      return formatDirectAnswer(keywordResults, totalMatches)
    }

    // 4. LLM generation — last resort (lazy-loads the model)
    const engine = await this.ensureEngine()
    const systemPrompt = buildSystemPrompt([], this.config.systemPrompt)
    const tokens: string[] = []
    const genOptions = { maxTokens: this.config.maxTokens, temperature: 0 }

    for await (const token of engine.generate(question, systemPrompt, genOptions)) {
      tokens.push(token)
    }

    return tokens.join('')
  }

  /**
   * Ask a text question with streaming response.
   */
  async askStream(question: string, callbacks: StreamCallbacks): Promise<void> {
    this.assertInitialized()

    // 1. Keyword search — direct answer when quality matches are specific
    const { results: keywordResults, totalMatches } = keywordSearchWithTotal(question, this.chunks, DIRECT_ANSWER_LIMIT)
    if (keywordResults.length > 0 && totalMatches <= DIRECT_ANSWER_LIMIT) {
      // eslint-disable-next-line no-console -- performance diagnostic
      console.log(`[ask-design-system] direct answer: ${keywordResults.length}/${totalMatches} chunks (keyword)`)
      const answer = formatDirectAnswer(keywordResults, totalMatches)
      callbacks.onToken?.(answer)
      callbacks.onComplete?.(answer)
      return
    }

    // 2. Embedding search — semantic ranking via MiniLM (~100ms)
    const embeddingResults = await this.embeddingSearch(question, DIRECT_ANSWER_LIMIT)
    if (embeddingResults.length > 0) {
      // eslint-disable-next-line no-console -- performance diagnostic
      console.log(`[ask-design-system] direct answer: ${embeddingResults.length} chunks (embedding)`)
      const answer = formatDirectAnswer(embeddingResults)
      callbacks.onToken?.(answer)
      callbacks.onComplete?.(answer)
      return
    }

    // 3. Keyword fallback — if embedding unavailable but keywords matched
    if (keywordResults.length > 0) {
      // eslint-disable-next-line no-console -- performance diagnostic
      console.log(`[ask-design-system] direct answer: ${keywordResults.length}/${totalMatches} chunks (keyword fallback)`)
      const answer = formatDirectAnswer(keywordResults, totalMatches)
      callbacks.onToken?.(answer)
      callbacks.onComplete?.(answer)
      return
    }

    // 4. LLM generation — last resort (lazy-loads the model)
    const engine = await this.ensureEngine()
    const systemPrompt = buildSystemPrompt([], this.config.systemPrompt)
    const tokens: string[] = []
    const genOptions = { maxTokens: this.config.maxTokens, temperature: 0 }

    const t0 = performance.now()
    let firstTokenTime: number | undefined

    try {
      for await (const token of engine.generate(question, systemPrompt, genOptions)) {
        if (!firstTokenTime) firstTokenTime = performance.now()
        tokens.push(token)
        callbacks.onToken?.(token)
      }

      const t1 = performance.now()
      // eslint-disable-next-line no-console -- performance diagnostic
      console.log(`[ask-design-system] LLM: prefill ${Math.round((firstTokenTime ?? t1) - t0)}ms, decode ${Math.round(t1 - (firstTokenTime ?? t0))}ms, ${tokens.length} tokens`)

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
    this.engineLoading = false
    resetEmbeddingPipeline()
  }

  // --- Private helpers ---

  private assertInitialized(): void {
    if (!this.initialized) {
      throw new AssistantError(
        'inference-failed',
        'Assistant not initialized. Call init() first.',
      )
    }
  }

  /**
   * Semantic search using precomputed embeddings.
   * Returns empty array if embeddings are unavailable.
   */
  private async embeddingSearch(question: string, limit = this.config.topK): Promise<SearchResult[]> {
    if (this.embeddedChunks.length === 0) return []

    try {
      const t0 = performance.now()
      const queryEmbedding = await embedQuery(question)
      const results = searchChunks(queryEmbedding, this.embeddedChunks, limit)
      const t1 = performance.now()
      // eslint-disable-next-line no-console -- performance diagnostic
      console.log(`[ask-design-system] embedding search: ${Math.round(t1 - t0)}ms`)
      return results
    } catch {
      return []
    }
  }

  /**
   * Lazy-load the LLM engine on first need.
   * Downloads and initialises the model only when keyword + embedding search
   * both fail to answer a query.
   */
  private async ensureEngine(): Promise<LocalLLMEngine> {
    if (this.engine) return this.engine

    if (this.engineLoading) {
      throw new AssistantError(
        'inference-failed',
        'LLM is already loading. Please wait.',
      )
    }

    this.engineLoading = true

    try {
      const { LocalLLMEngine: LLMEngine } = await import('@vantra-design/local-inference')

      this.engine = new LLMEngine({
        model: this.config.model ?? DEFAULT_MODEL,
        onProgress: this.config.onModelProgress
          ? (progress) => this.config.onModelProgress?.(progress)
          : undefined,
      })

      await this.engine.init()
      return this.engine
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
    } finally {
      this.engineLoading = false
    }
  }
}

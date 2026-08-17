/** Detected token format. */
export type TokenFormat = 'dtcg' | 'style-dictionary' | 'plain'

/** A flattened token chunk ready for embedding. */
export interface TokenChunk {
  /** Dot-separated path, e.g. "color.background.default" */
  path: string
  /** Human-readable representation of the token for LLM context */
  text: string
  /** Original value (primitive or object) */
  value: unknown
  /** Token type if detected (e.g. "color", "dimension") */
  type?: string
  /** Category derived from the top-level key */
  category: string
}

/** Configuration for the DesignSystemAssistant. */
export interface AssistantConfig {
  /** Design token JSON — DTCG, Style Dictionary, or plain nested format */
  schema: Record<string, unknown>

  /** Model to use. Default: 'Llama-3.2-1B-Instruct-q4f32_1-MLC' */
  model?: string

  /** Custom system prompt prefix. Default includes grounding instructions. */
  systemPrompt?: string

  /** Number of context chunks to retrieve per query. Default: 5 */
  topK?: number

  /** Maximum tokens to generate per answer. Default: 256 */
  maxTokens?: number

  /** Called during model download with progress info */
  onModelProgress?: (progress: ModelProgress) => void

  /** Called when the assistant is ready to accept queries */
  onReady?: () => void

  /** Called on errors */
  onError?: (error: AssistantError) => void
}

/** Progress report for model downloads and initialization. */
export interface ModelProgress {
  phase: 'download' | 'initialize'
  loaded: number
  total: number
  percentage: number
}

/** Error codes specific to the assistant. */
export type AssistantErrorCode =
  | 'webgpu-unavailable'
  | 'model-download-failed'
  | 'model-load-failed'
  | 'inference-failed'
  | 'embedding-failed'

/** Structured error thrown by the assistant. */
export class AssistantError extends Error {
  readonly code: AssistantErrorCode
  override readonly cause: unknown

  constructor(code: AssistantErrorCode, message: string, cause?: unknown) {
    super(message)
    this.name = 'AssistantError'
    this.code = code
    this.cause = cause
  }
}

/** Callbacks for streaming responses. */
export interface StreamCallbacks {
  onToken?: (token: string) => void
  onComplete?: (fullText: string) => void
  onError?: (error: AssistantError) => void
}

/** Configuration for VoiceInput. */
export interface VoiceInputConfig {
  /** BCP 47 language tag. Default: 'en-US' */
  language?: string
  /** Called with interim transcription results */
  onInterim?: (text: string) => void
  /** Called with final transcription result */
  onResult?: (text: string) => void
  /** Called on error */
  onError?: (error: VoiceInputError) => void
}

/** Error codes for voice input. */
export type VoiceInputErrorCode =
  | 'not-supported'
  | 'permission-denied'
  | 'recognition-failed'

/** Structured error for voice input. */
export class VoiceInputError extends Error {
  readonly code: VoiceInputErrorCode

  constructor(code: VoiceInputErrorCode, message: string) {
    super(message)
    this.name = 'VoiceInputError'
    this.code = code
  }
}

/** Configuration for VoiceOutput. */
export interface VoiceOutputConfig {
  /** Kokoro voice preset. Default: 'af_heart' */
  voice?: string
  /** Speaking rate multiplier. Default: 1.0 */
  rate?: number
  /** Called during model download */
  onModelProgress?: (progress: ModelProgress) => void
}

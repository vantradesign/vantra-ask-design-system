export { DesignSystemAssistant } from './assistant.js'
export { flattenTokens, detectFormat } from './schema-loader.js'
export {
  embedChunks,
  embedQuery,
  cosineSimilarity,
  searchChunks,
  keywordSearch,
} from './retrieval.js'
export { buildSystemPrompt, deriveSuggestedQuestions } from './prompt.js'

export type {
  TokenFormat,
  TokenChunk,
  AssistantConfig,
  ModelProgress,
  AssistantErrorCode,
  StreamCallbacks,
  VoiceInputConfig,
  VoiceInputErrorCode,
  VoiceOutputConfig,
} from './types.js'
export { AssistantError, VoiceInputError } from './types.js'

export type { EmbeddedChunk, SearchResult } from './retrieval.js'

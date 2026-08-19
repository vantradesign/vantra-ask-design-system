export { DesignSystemAssistant } from './assistant.js'
export { flattenTokens, detectFormat } from './schema-loader.js'
export {
  embedChunks,
  embedQuery,
  cosineSimilarity,
  searchChunks,
  keywordSearch,
  keywordSearchWithTotal,
  levenshteinDistance,
  buildVocabulary,
} from './retrieval.js'
export { buildSystemPrompt, formatDirectAnswer, deriveSuggestedQuestions } from './prompt.js'

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

export type { EmbeddedChunk, SearchResult, KeywordSearchResult } from './retrieval.js'

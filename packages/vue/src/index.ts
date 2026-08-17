export { default as AskDesignSystem } from './AskDesignSystem.vue'

export { useAssistant } from './composables/useAssistant'
export { useVoiceInput } from './composables/useVoiceInput'
export { useVoiceOutput } from './composables/useVoiceOutput'

export { default as ChatMessage } from './components/ChatMessage.vue'
export { default as ChatInput } from './components/ChatInput.vue'
export { default as ModelLoader } from './components/ModelLoader.vue'
export { default as SuggestedQuestions } from './components/SuggestedQuestions.vue'
export { default as ErrorBanner } from './components/ErrorBanner.vue'

export type { ChatMessage as ChatMessageType, UseAssistantOptions, UseAssistantReturn } from './composables/useAssistant'
export type { UseVoiceInputOptions } from './composables/useVoiceInput'
export type { UseVoiceOutputOptions } from './composables/useVoiceOutput'

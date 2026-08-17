<script setup lang="ts">
import { ref, watch, onMounted, nextTick, toRef } from 'vue'
import { useAssistant } from './composables/useAssistant'
import { useVoiceInput } from './composables/useVoiceInput'
import { useVoiceOutput } from './composables/useVoiceOutput'
import ChatMessage from './components/ChatMessage.vue'
import ChatInput from './components/ChatInput.vue'
import ModelLoader from './components/ModelLoader.vue'
import SuggestedQuestions from './components/SuggestedQuestions.vue'
import ErrorBanner from './components/ErrorBanner.vue'
import type { AssistantError } from '@vantra-design/ask-design-system'

const props = withDefaults(
  defineProps<{
    schema: Record<string, unknown>
    model?: string
    voiceInput?: boolean
    voiceOutput?: boolean
    locale?: 'en' | 'de'
  }>(),
  {
    voiceInput: true,
    voiceOutput: false,
    locale: 'en',
  },
)

const emit = defineEmits<{
  ready: []
  error: [error: AssistantError]
  message: [message: { role: 'user' | 'assistant'; content: string }]
}>()

const messagesContainer = ref<HTMLElement | null>(null)
const chatInputRef = ref<InstanceType<typeof ChatInput> | null>(null)

const {
  messages,
  isReady,
  isLoading,
  isStreaming,
  progress,
  error,
  suggestedQuestions,
  supported,
  send,
  abort,
  init,
} = useAssistant({
  schema: toRef(props, 'schema'),
  model: props.model,
})

const voice = useVoiceInput({
  language: props.locale === 'de' ? 'de-DE' : 'en-US',
  onResult: (text) => {
    chatInputRef.value?.setInput(text)
  },
})

const tts = useVoiceOutput()

// Auto-init on mount
onMounted(() => {
  init()
})

// Emit events
watch(isReady, (ready) => {
  if (ready) emit('ready')
})

watch(error, (err) => {
  if (err) emit('error', err)
})

watch(
  messages,
  (msgs) => {
    const last = msgs[msgs.length - 1]
    if (last && last.status === 'complete') {
      emit('message', { role: last.role, content: last.content })

      // Read aloud if voice output enabled
      if (last.role === 'assistant' && tts.enabled.value) {
        tts.speak(last.content)
      }
    }
  },
  { deep: true },
)

// Auto-scroll to bottom
watch(
  () => messages.value.length,
  async () => {
    await nextTick()
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  },
)

// Also scroll during streaming
watch(
  () => messages.value[messages.value.length - 1]?.content,
  async () => {
    await nextTick()
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  },
)

async function handleSend(question: string): Promise<void> {
  await send(question)
}

function handleSuggestion(question: string): void {
  send(question)
}

function handleRetry(): void {
  error.value = null
  if (!isReady.value) {
    init()
  }
}

function handleDismissError(): void {
  error.value = null
}

const showVoiceInput = props.voiceInput && voice.supported
const showVoiceOutput = props.voiceOutput && tts.supported
</script>

<template>
  <div
    class="ads"
    :class="{ 'ads--disabled': !supported }"
  >
    <div class="ads__header">
      <h2 class="ads__title">Ask your design system</h2>
      <p class="ads__privacy">Answers are generated locally — nothing leaves your browser.</p>
    </div>

    <ErrorBanner
      :error="error"
      @retry="handleRetry"
      @dismiss="handleDismissError"
    />

    <ModelLoader
      :progress="progress"
      :is-loading="isLoading"
    />

    <div
      ref="messagesContainer"
      class="ads__messages"
      aria-live="polite"
      aria-relevant="additions"
    >
      <SuggestedQuestions
        v-if="messages.length === 0 && isReady && suggestedQuestions.length > 0"
        :questions="suggestedQuestions"
        :disabled="isStreaming"
        @select="handleSuggestion"
      />

      <div class="ads__messages-list">
        <ChatMessage
          v-for="msg in messages"
          :key="msg.id"
          :message="msg"
        />
      </div>
    </div>

    <ChatInput
      ref="chatInputRef"
      :disabled="!isReady || !supported"
      :is-streaming="isStreaming"
      :voice-input-supported="showVoiceInput"
      :is-listening="voice.isListening.value"
      :voice-output-supported="showVoiceOutput"
      :voice-output-enabled="tts.enabled.value"
      @send="handleSend"
      @abort="abort"
      @toggle-voice-input="voice.toggle"
      @toggle-voice-output="tts.toggle"
    />
  </div>
</template>

<style scoped>
.ads {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 300px;
  max-height: 100vh;
  background: var(--ads-bg, #ffffff);
  color: var(--ads-text, #1a1a2e);
  font-family: var(--ads-font, system-ui, -apple-system, sans-serif);
  font-size: var(--ads-font-size, 16px);
  border: 1px solid var(--ads-border, #e5e7eb);
  border-radius: var(--ads-radius, 0.75rem);
  overflow: hidden;
}

.ads--disabled {
  opacity: 0.7;
}

.ads__header {
  padding: 1rem 1rem 0.5rem;
  border-bottom: 1px solid var(--ads-border, #e5e7eb);
}

.ads__title {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 0.25rem;
  color: var(--ads-text, #1a1a2e);
}

.ads__privacy {
  font-size: 0.75rem;
  color: var(--ads-text-muted, #6b7280);
  margin: 0;
}

.ads__messages {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem;
  scroll-behavior: smooth;
}

@media (prefers-reduced-motion: reduce) {
  .ads__messages {
    scroll-behavior: auto;
  }
}

.ads__messages-list {
  display: flex;
  flex-direction: column;
}
</style>

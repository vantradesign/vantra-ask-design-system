<script setup lang="ts">
import { ref, watch, onMounted, nextTick, toRef } from 'vue'
import { useAssistant } from './composables/useAssistant'
import { useChatSessions } from './composables/useChatSessions'
import { useVoiceInput } from './composables/useVoiceInput'
import { useVoiceOutput } from './composables/useVoiceOutput'
import ChatMessage from './components/ChatMessage.vue'
import ChatInput from './components/ChatInput.vue'
import ChatSidebar from './components/ChatSidebar.vue'
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
    sidebar?: boolean
  }>(),
  {
    voiceInput: true,
    voiceOutput: false,
    locale: 'en',
    sidebar: true,
  },
)

const emit = defineEmits<{
  ready: []
  error: [error: AssistantError]
  message: [message: { role: 'user' | 'assistant'; content: string }]
}>()

const messagesContainer = ref<HTMLElement | null>(null)
const chatInputRef = ref<InstanceType<typeof ChatInput> | null>(null)
const sidebarOpen = ref(true)

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
  clearHistory,
} = useAssistant({
  schema: toRef(props, 'schema'),
  model: props.model,
  storageKey: false,
})

const {
  sessions,
  activeSessionId,
  createSession,
  switchSession,
  deleteSession,
  updateMessages,
} = useChatSessions()

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

      // Persist to session
      if (activeSessionId.value) {
        updateMessages(msgs)
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
  // Auto-create session on first message
  if (!activeSessionId.value) {
    createSession()
  }
  await send(question)
}

function handleSuggestion(question: string): void {
  if (!activeSessionId.value) {
    createSession()
  }
  send(question)
}

function handleNewChat(): void {
  // Save current session before switching away
  if (activeSessionId.value && messages.value.length > 0) {
    updateMessages(messages.value)
  }
  // Clear in-memory messages and deselect active session → welcome screen
  clearHistory()
  switchSession('')
}

function handleSelectSession(id: string): void {
  // Save current messages before switching
  if (activeSessionId.value && messages.value.length > 0) {
    updateMessages(messages.value)
  }
  switchSession(id)
  const session = sessions.value.find((s) => s.id === id)
  messages.value = session ? [...session.messages] : []
}

function handleDeleteSession(id: string): void {
  const isActive = id === activeSessionId.value
  deleteSession(id)
  if (isActive) {
    const next = sessions.value[0]
    if (next) {
      messages.value = [...next.messages]
    } else {
      clearHistory()
    }
  }
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
    <!-- Sidebar -->
    <ChatSidebar
      v-if="sidebar"
      :sessions="sessions"
      :active-session-id="activeSessionId"
      :open="sidebarOpen"
      @new-chat="handleNewChat"
      @select-session="handleSelectSession"
      @delete-session="handleDeleteSession"
      @toggle="sidebarOpen = !sidebarOpen"
    />

    <!-- Main chat area -->
    <div class="ads__main">
      <!-- Sidebar toggle (when closed) -->
      <button
        v-if="sidebar && !sidebarOpen"
        type="button"
        class="ads__sidebar-toggle"
        aria-label="Open sidebar"
        @click="sidebarOpen = true"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="9" x2="9" y1="3" y2="21" />
        </svg>
      </button>

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
        class="ads__body"
        aria-live="polite"
        aria-relevant="additions"
      >
        <!-- Welcome state: centered hero + header info + suggestions -->
        <div
          v-if="messages.length === 0 && !isLoading"
          class="ads__welcome"
        >
          <div class="ads__welcome-content">
            <p class="ads__welcome-eyebrow">Vantra</p>
            <h2 class="ads__hero">
              Ask your<br>design system.
            </h2>
            <p class="ads__hero-sub">
              Local-first AI assistant for design systems.<br>
              Ask questions about your tokens — nothing leaves your browser.
            </p>

            <SuggestedQuestions
              v-if="isReady && suggestedQuestions.length > 0"
              :questions="suggestedQuestions"
              :disabled="isStreaming"
              @select="handleSuggestion"
            />
          </div>
        </div>

        <!-- Message thread -->
        <div v-else class="ads__thread">
          <ChatMessage
            v-for="msg in messages"
            :key="msg.id"
            :message="msg"
          />
        </div>
      </div>

      <div class="ads__input-wrapper">
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
    </div>
  </div>
</template>

<style scoped>
.ads {
  display: flex;
  flex-direction: row;
  height: 100%;
  min-height: 100vh;
  background: var(--ads-bg, #ffffff);
  color: var(--ads-text, #001619);
  font-family: var(--ads-font, 'Inclusive Sans', ui-sans-serif, system-ui, sans-serif);
  font-size: var(--ads-font-size, 1rem);
  line-height: 1.65;
  overflow: hidden;
  position: relative;
}

.ads--disabled {
  opacity: 0.5;
  pointer-events: none;
}

/* Main chat column */
.ads__main {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  position: relative;
  container-type: inline-size;
  container-name: ads-main;
}

/* Sidebar toggle button */
.ads__sidebar-toggle {
  position: absolute;
  top: 0.75rem;
  left: 0.75rem;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border: none;
  border-radius: 0.375rem;
  background: var(--ads-bg, #ffffff);
  color: var(--ads-text-muted, #4a585a);
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 22, 25, 0.08);
  transition: background 150ms, color 150ms;
}

.ads__sidebar-toggle:hover {
  background: rgba(0, 22, 25, 0.04);
  color: var(--ads-text, #001619);
}

/* Scrollable body */
.ads__body {
  flex: 1;
  overflow-y: auto;
  scroll-behavior: smooth;
}

@media (prefers-reduced-motion: reduce) {
  .ads__body {
    scroll-behavior: auto;
  }
}

/* Welcome / empty state */
.ads__welcome {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100%;
  padding: 3rem 2rem;
}

.ads__welcome-content {
  text-align: center;
  max-width: 32rem;
}

.ads__hero {
  font-family: var(--ads-font-display, 'Bricolage Grotesque', ui-sans-serif, system-ui, sans-serif);
  font-size: clamp(1.75rem, 4vw, 2.5rem);
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.1;
  margin: 0 0 0.75rem;
  color: var(--ads-text, #001619);
}

.ads__hero-sub {
  font-size: 0.9375rem;
  color: var(--ads-text-muted, #4a585a);
  margin: 0 0 2rem;
  line-height: 1.5;
}

/* Eyebrow label */
.ads__welcome-eyebrow {
  font-size: 0.6875rem;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ads-text-faint, #626e70);
  margin: 0 0 1rem;
}

/* Input wrapper: full-width border, centered content */
.ads__input-wrapper {
  max-width: 48rem;
  width: 100%;
  margin: 0 auto;
}

/* Message thread */
.ads__thread {
  max-width: 48rem;
  width: 100%;
  margin: 0 auto;
  padding: 1.5rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
</style>

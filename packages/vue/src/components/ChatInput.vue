<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  disabled?: boolean
  isStreaming?: boolean
  voiceInputSupported?: boolean
  isListening?: boolean
  voiceOutputSupported?: boolean
  voiceOutputEnabled?: boolean
  placeholder?: string
}>()

const emit = defineEmits<{
  send: [question: string]
  abort: []
  toggleVoiceInput: []
  toggleVoiceOutput: []
}>()

const input = ref('')

function handleSubmit(): void {
  const question = input.value.trim()
  if (!question || props.disabled) return
  emit('send', question)
  input.value = ''
  resetHeight()
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    handleSubmit()
  }
}

function autoGrow(event: Event): void {
  const el = event.target as HTMLTextAreaElement
  el.style.height = 'auto'
  el.style.height = el.scrollHeight + 'px'
}

function resetHeight(): void {
  const el = document.querySelector('.ads-input__field') as HTMLTextAreaElement | null
  if (el) {
    el.style.height = 'auto'
  }
}

defineExpose({
  setInput(text: string) {
    input.value = text
  },
  focus() {
    const el = document.querySelector('.ads-input__field') as HTMLTextAreaElement | null
    el?.focus()
  },
})
</script>

<template>
  <div class="ads-input">
    <div class="ads-input__row">
      <textarea
        v-model="input"
        class="ads-input__field"
        :placeholder="placeholder ?? 'Ask about your design system…'"
        :disabled="disabled"
        rows="1"
        aria-label="Question input"
        @keydown="handleKeydown"
        @input="autoGrow"
      />

      <div class="ads-input__actions">
        <button
          v-if="voiceInputSupported"
          type="button"
          class="ads-input__btn ads-input__btn--mic"
          :class="{ 'ads-input__btn--active': isListening }"
          :disabled="disabled"
          :aria-label="isListening ? 'Stop voice input' : 'Start voice input'"
          :aria-pressed="isListening"
          @click="emit('toggleVoiceInput')"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" x2="12" y1="19" y2="22" />
          </svg>
        </button>

        <button
          v-if="voiceOutputSupported"
          type="button"
          class="ads-input__btn ads-input__btn--speaker"
          :class="{ 'ads-input__btn--active': voiceOutputEnabled }"
          :disabled="disabled"
          :aria-label="voiceOutputEnabled ? 'Disable read aloud' : 'Enable read aloud'"
          :aria-pressed="voiceOutputEnabled"
          @click="emit('toggleVoiceOutput')"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path v-if="voiceOutputEnabled" d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path v-if="voiceOutputEnabled" d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            <line v-if="!voiceOutputEnabled" x1="23" x2="17" y1="9" y2="15" />
            <line v-if="!voiceOutputEnabled" x1="17" x2="23" y1="9" y2="15" />
          </svg>
        </button>

        <button
          v-if="isStreaming"
          type="button"
          class="ads-input__btn ads-input__btn--abort"
          aria-label="Stop generating"
          @click="emit('abort')"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        </button>

        <button
          v-else
          type="button"
          class="ads-input__btn ads-input__btn--send"
          :disabled="disabled || !input.trim()"
          aria-label="Send question"
          @click="handleSubmit"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="22" x2="11" y1="2" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
    <p class="ads-input__footer">
      Answers are generated locally — nothing leaves your browser.
    </p>
  </div>
</template>

<style scoped>
.ads-input {
  padding: 0.75rem 1.5rem 1rem;
  background: var(--ads-bg, #ffffff);
}

.ads-input__row {
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
  background: var(--ads-input-field-bg, #f4f4f4);
  border: 1px solid transparent;
  border-radius: 1.5rem;
  padding: 0.5rem 0.5rem 0.5rem 1rem;
  transition: border-color 200ms, box-shadow 200ms;
}

.ads-input__row:focus-within {
  border-color: var(--ads-border, rgba(0, 22, 25, 0.15));
  box-shadow: 0 1px 6px rgba(0, 22, 25, 0.06);
}

.ads-input__field {
  flex: 1;
  border: none;
  background: none;
  font: inherit;
  font-size: 0.9375rem;
  line-height: 1.5;
  resize: none;
  outline: none;
  color: var(--ads-text, #001619);
  min-height: 1.5em;
  max-height: 12em;
  overflow-y: auto;
  padding: 0.3125rem 0;
  margin: 0;
  caret-color: var(--ads-text, #001619);
}

.ads-input__field::placeholder {
  color: var(--ads-text-faint, #8e9899);
}

.ads-input__field:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ads-input__actions {
  display: flex;
  gap: 0.125rem;
  flex-shrink: 0;
}

.ads-input__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border: 1px solid transparent;
  border-radius: 50%;
  background: none;
  color: var(--ads-text-muted, #4a585a);
  cursor: pointer;
  transition:
    color 200ms,
    background-color 200ms,
    border-color 200ms;
}

.ads-input__btn:hover:not(:disabled) {
  background: rgba(0, 22, 25, 0.06);
  color: var(--ads-text, #001619);
}

.ads-input__btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.ads-input__btn:focus-visible {
  outline: 2px solid var(--ads-accent, #021f94);
  outline-offset: 2px;
}

.ads-input__btn--active {
  color: var(--ads-accent, #021f94);
  background: rgba(2, 31, 148, 0.06);
}

.ads-input__btn--active:hover:not(:disabled) {
  background: rgba(2, 31, 148, 0.1);
}

.ads-input__btn--mic.ads-input__btn--active {
  color: var(--ads-recording, #8f1d13);
  background: rgba(143, 29, 19, 0.06);
  animation: ads-pulse 2s ease-in-out infinite;
}

@keyframes ads-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(143, 29, 19, 0.15); }
  50% { box-shadow: 0 0 0 6px rgba(143, 29, 19, 0); }
}

@media (prefers-reduced-motion: reduce) {
  .ads-input__btn--mic.ads-input__btn--active {
    animation: none;
  }
}

.ads-input__btn--send {
  background: var(--ads-text, #001619);
  color: #ffffff;
}

.ads-input__btn--send:hover:not(:disabled) {
  background: var(--ads-text-muted, #4a585a);
  color: #ffffff;
}

.ads-input__btn--send:disabled {
  background: var(--ads-text-faint, #8e9899);
  color: #ffffff;
  opacity: 0.4;
}

.ads-input__btn--abort {
  color: var(--ads-error-color, #8f1d13);
}

.ads-input__footer {
  font-size: 0.6875rem;
  color: var(--ads-text-faint, #8e9899);
  text-align: center;
  margin: 0.375rem 0 0;
}
</style>

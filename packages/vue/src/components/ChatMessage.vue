<script setup lang="ts">
import type { ChatMessage } from '../composables/useAssistant'

defineProps<{
  message: ChatMessage
}>()
</script>

<template>
  <div
    class="ads-message"
    :class="[
      `ads-message--${message.role}`,
      { 'ads-message--error': message.status === 'error' },
    ]"
    :role="message.role === 'assistant' ? 'status' : undefined"
    :aria-live="message.role === 'assistant' ? 'polite' : undefined"
  >
    <div class="ads-message__avatar" aria-hidden="true">
      {{ message.role === 'user' ? '👤' : '✦' }}
    </div>
    <div class="ads-message__content">
      <div
        class="ads-message__bubble"
        :class="{ 'ads-message__bubble--streaming': message.status === 'streaming' }"
      >
        <span v-if="message.content">{{ message.content }}</span>
        <span
          v-if="message.status === 'streaming' && !message.content"
          class="ads-message__typing"
          aria-label="Generating response…"
        >
          <span class="ads-message__dot" />
          <span class="ads-message__dot" />
          <span class="ads-message__dot" />
        </span>
      </div>
      <div v-if="message.status === 'error'" class="ads-message__error">
        Generation failed.
      </div>
    </div>
  </div>
</template>

<style scoped>
.ads-message {
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem 0;
  animation: ads-fade-in 0.15s ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .ads-message {
    animation: none;
  }
}

@keyframes ads-fade-in {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

.ads-message__avatar {
  flex-shrink: 0;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  background: var(--ads-avatar-bg, #f0f0f0);
}

.ads-message--assistant .ads-message__avatar {
  background: var(--ads-avatar-assistant-bg, #e8f0fe);
}

.ads-message__content {
  flex: 1;
  min-width: 0;
}

.ads-message__bubble {
  background: var(--ads-bubble-bg, #f5f5f5);
  border-radius: 0.75rem;
  padding: 0.75rem 1rem;
  font-size: 0.9375rem;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

.ads-message--user .ads-message__bubble {
  background: var(--ads-bubble-user-bg, #0066cc);
  color: var(--ads-bubble-user-color, #ffffff);
}

.ads-message--assistant .ads-message__bubble {
  background: var(--ads-bubble-assistant-bg, #f0f4f8);
  color: var(--ads-bubble-assistant-color, #1a1a2e);
}

.ads-message--error .ads-message__bubble {
  border: 1px solid var(--ads-error-border, #fca5a5);
}

.ads-message__error {
  font-size: 0.8125rem;
  color: var(--ads-error-color, #dc2626);
  margin-top: 0.25rem;
  padding-left: 1rem;
}

.ads-message__typing {
  display: inline-flex;
  gap: 0.25rem;
  align-items: center;
  height: 1.25rem;
}

.ads-message__dot {
  width: 0.375rem;
  height: 0.375rem;
  border-radius: 50%;
  background: var(--ads-typing-dot, #9ca3af);
  animation: ads-dot-pulse 1.4s ease-in-out infinite;
}

.ads-message__dot:nth-child(2) { animation-delay: 0.2s; }
.ads-message__dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes ads-dot-pulse {
  0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
  40% { opacity: 1; transform: scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .ads-message__dot {
    animation: none;
    opacity: 0.6;
  }
}
</style>

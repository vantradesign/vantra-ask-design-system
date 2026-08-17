<script setup lang="ts">
import type { AssistantError } from '@vantra-design/ask-design-system'

defineProps<{
  error: AssistantError | null
}>()

const emit = defineEmits<{
  retry: []
  dismiss: []
}>()

const browserHints: Record<string, string> = {
  'webgpu-unavailable': 'Your browser doesn\'t support WebGPU, which is required for local AI. Try Chrome 113+ or Edge 113+.',
  'model-download-failed': 'Model download was interrupted. Check your connection and try again.',
  'model-load-failed': 'Failed to load the language model. Check your connection and try again.',
  'inference-failed': 'Something went wrong generating the answer.',
  'embedding-failed': 'Token embedding failed. Keyword search is being used as a fallback.',
}
</script>

<template>
  <div
    v-if="error"
    class="ads-error"
    role="alert"
    aria-live="assertive"
  >
    <div class="ads-error__icon" aria-hidden="true">⚠️</div>
    <div class="ads-error__content">
      <p class="ads-error__message">
        {{ browserHints[error.code] ?? error.message }}
      </p>
      <p v-if="browserHints[error.code] && error.message" class="ads-error__detail">
        {{ error.message }}
      </p>
      <div class="ads-error__actions">
        <button
          v-if="error.code !== 'webgpu-unavailable'"
          type="button"
          class="ads-error__btn ads-error__btn--retry"
          @click="emit('retry')"
        >
          Try again
        </button>
        <button
          type="button"
          class="ads-error__btn ads-error__btn--dismiss"
          aria-label="Dismiss error"
          @click="emit('dismiss')"
        >
          ✕
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ads-error {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  padding: 1rem 1.25rem;
  margin: 0.75rem 1.5rem;
  background: var(--ads-error-bg, rgba(143, 29, 19, 0.04));
  border: 1px solid var(--ads-error-border, rgba(143, 29, 19, 0.15));
  animation: ads-fade-in 0.15s ease-out;
}

@keyframes ads-fade-in {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (prefers-reduced-motion: reduce) {
  .ads-error {
    animation: none;
  }
}

.ads-error__icon {
  flex-shrink: 0;
  font-size: 1rem;
  line-height: 1.5;
}

.ads-error__content {
  flex: 1;
  min-width: 0;
}

.ads-error__message {
  font-size: 0.875rem;
  color: var(--ads-error-color, #8f1d13);
  margin: 0;
  line-height: 1.5;
}

.ads-error__detail {
  font-size: 0.75rem;
  color: var(--ads-text-muted, #4a585a);
  margin: 0.375rem 0 0;
  line-height: 1.4;
  font-family: ui-monospace, 'SF Mono', 'Cascadia Code', monospace;
  word-break: break-word;
}

.ads-error__actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.ads-error__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2rem;
  border: 1px solid transparent;
  background: none;
  font: inherit;
  font-size: 0.8125rem;
  cursor: pointer;
  transition:
    color 200ms,
    background-color 200ms,
    border-color 200ms;
}

.ads-error__btn:focus-visible {
  outline: 2px solid var(--ads-accent, #021f94);
  outline-offset: 2px;
}

.ads-error__btn--retry {
  padding: 0.375rem 1rem;
  color: var(--ads-error-color, #8f1d13);
  border-color: rgba(143, 29, 19, 0.25);
  background: transparent;
  font-weight: 500;
}

.ads-error__btn--retry:hover {
  background: rgba(143, 29, 19, 0.08);
  border-color: var(--ads-error-color, #8f1d13);
}

.ads-error__btn--dismiss {
  width: 2rem;
  height: 2rem;
  padding: 0;
  color: var(--ads-text-muted, #4a585a);
  border: none;
}

.ads-error__btn--dismiss:hover {
  color: var(--ads-text, #001619);
}
</style>

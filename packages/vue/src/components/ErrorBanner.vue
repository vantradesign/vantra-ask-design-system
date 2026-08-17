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
  'model-load-failed': 'Failed to load the language model. Try reloading the page.',
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
  padding: 0.75rem 1rem;
  margin: 0.5rem 0.75rem;
  background: var(--ads-error-bg, #fef2f2);
  border: 1px solid var(--ads-error-border, #fca5a5);
  border-radius: 0.75rem;
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
  font-size: 1.125rem;
  line-height: 1.5;
}

.ads-error__content {
  flex: 1;
  min-width: 0;
}

.ads-error__message {
  font-size: 0.875rem;
  color: var(--ads-error-color, #991b1b);
  margin: 0;
  line-height: 1.5;
}

.ads-error__actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.ads-error__btn {
  display: inline-flex;
  align-items: center;
  border: none;
  background: none;
  font: inherit;
  cursor: pointer;
  border-radius: 0.375rem;
  padding: 0.25rem 0.625rem;
  font-size: 0.8125rem;
  transition: background 0.15s;
}

.ads-error__btn--retry {
  color: var(--ads-error-color, #991b1b);
  background: var(--ads-error-btn-bg, rgba(153, 27, 27, 0.08));
  font-weight: 500;
}

.ads-error__btn--retry:hover {
  background: var(--ads-error-btn-bg-hover, rgba(153, 27, 27, 0.15));
}

.ads-error__btn--dismiss {
  color: var(--ads-text-muted, #6b7280);
  padding: 0.25rem;
}

.ads-error__btn--dismiss:hover {
  color: var(--ads-text, #1a1a2e);
}
</style>

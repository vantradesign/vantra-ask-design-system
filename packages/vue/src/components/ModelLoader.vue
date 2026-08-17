<script setup lang="ts">
import type { ModelProgress } from '@vantra-design/ask-design-system'

defineProps<{
  progress: ModelProgress | null
  isLoading: boolean
}>()

defineEmits<{
  cancel: []
}>()

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}
</script>

<template>
  <div v-if="isLoading" class="ads-loader" role="status" aria-live="polite">
    <div class="ads-loader__content">
      <div class="ads-loader__icon" aria-hidden="true">⚙️</div>
      <div class="ads-loader__text">
        <p class="ads-loader__title">
          {{ progress?.phase === 'download'
            ? 'Downloading language model (~500 MB, one-time only)'
            : 'Initializing model…'
          }}
        </p>
        <p class="ads-loader__subtitle">
          The model is cached in your browser. Future loads take under 3 seconds.
        </p>
      </div>

      <div v-if="progress" class="ads-loader__progress">
        <div class="ads-loader__bar-container">
          <div
            class="ads-loader__bar"
            :style="{ width: `${progress.percentage}%` }"
            role="progressbar"
            :aria-valuenow="progress.percentage"
            aria-valuemin="0"
            aria-valuemax="100"
            :aria-label="`Model loading: ${progress.percentage}%`"
          />
        </div>
        <div class="ads-loader__stats">
          <span>{{ progress.percentage }}%</span>
          <span v-if="progress.total > 0">
            {{ formatBytes(progress.loaded) }} / {{ formatBytes(progress.total) }}
          </span>
        </div>
      </div>

      <div v-else class="ads-loader__spinner">
        <div class="ads-loader__spinner-ring" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.ads-loader {
  padding: 1.5rem;
}

.ads-loader__content {
  background: var(--ads-loader-bg, #f8fafc);
  border: 1px solid var(--ads-border, #e5e7eb);
  border-radius: 0.75rem;
  padding: 1.25rem;
}

.ads-loader__icon {
  font-size: 1.5rem;
  margin-bottom: 0.75rem;
}

.ads-loader__text {
  margin-bottom: 1rem;
}

.ads-loader__title {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--ads-text, #1a1a2e);
  margin: 0 0 0.25rem;
}

.ads-loader__subtitle {
  font-size: 0.8125rem;
  color: var(--ads-text-muted, #6b7280);
  margin: 0;
}

.ads-loader__progress {
  margin-top: 0.5rem;
}

.ads-loader__bar-container {
  width: 100%;
  height: 0.5rem;
  background: var(--ads-bar-bg, #e5e7eb);
  border-radius: 0.25rem;
  overflow: hidden;
}

.ads-loader__bar {
  height: 100%;
  background: var(--ads-accent, #0066cc);
  border-radius: 0.25rem;
  transition: width 0.3s ease-out;
}

.ads-loader__stats {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: var(--ads-text-muted, #6b7280);
  margin-top: 0.375rem;
}

.ads-loader__spinner {
  display: flex;
  justify-content: center;
  padding: 0.5rem 0;
}

.ads-loader__spinner-ring {
  width: 1.5rem;
  height: 1.5rem;
  border: 2px solid var(--ads-border, #e5e7eb);
  border-top-color: var(--ads-accent, #0066cc);
  border-radius: 50%;
  animation: ads-spin 0.8s linear infinite;
}

@keyframes ads-spin {
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .ads-loader__spinner-ring {
    animation: none;
    border-top-color: var(--ads-accent, #0066cc);
    opacity: 0.6;
  }
  .ads-loader__bar {
    transition: none;
  }
}
</style>

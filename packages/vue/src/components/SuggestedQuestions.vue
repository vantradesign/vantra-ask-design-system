<script setup lang="ts">
defineProps<{
  questions: string[]
  disabled?: boolean
}>()

const emit = defineEmits<{
  select: [question: string]
}>()
</script>

<template>
  <div v-if="questions.length > 0" class="ads-suggestions" role="group" aria-label="Suggested questions">
    <p class="ads-suggestions__label">Try asking:</p>
    <div class="ads-suggestions__list">
      <button
        v-for="question in questions"
        :key="question"
        type="button"
        class="ads-suggestions__btn"
        :disabled="disabled"
        @click="emit('select', question)"
      >
        {{ question }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.ads-suggestions {
  padding: 0 1rem 0.75rem;
}

.ads-suggestions__label {
  font-size: 0.8125rem;
  color: var(--ads-text-muted, #6b7280);
  margin: 0 0 0.5rem;
}

.ads-suggestions__list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.ads-suggestions__btn {
  display: inline-flex;
  align-items: center;
  padding: 0.5rem 0.875rem;
  font: inherit;
  font-size: 0.8125rem;
  line-height: 1.4;
  color: var(--ads-accent, #0066cc);
  background: var(--ads-suggestion-bg, #f0f4f8);
  border: 1px solid var(--ads-suggestion-border, #d2e3fc);
  border-radius: 2rem;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.ads-suggestions__btn:hover:not(:disabled) {
  background: var(--ads-suggestion-bg-hover, #d2e3fc);
  border-color: var(--ads-accent, #0066cc);
}

.ads-suggestions__btn:focus-visible {
  outline: 2px solid var(--ads-focus, #0066cc);
  outline-offset: 2px;
}

.ads-suggestions__btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>

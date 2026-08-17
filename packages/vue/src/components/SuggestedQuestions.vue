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
  padding: 0;
}

.ads-suggestions__label {
  font-size: 0.6875rem;
  font-weight: 500;
  color: var(--ads-text-muted, #4a585a);
  margin: 0 0 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.ads-suggestions__list {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem;
}

.ads-suggestions__btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 1rem;
  font: inherit;
  font-size: 0.8125rem;
  line-height: 1.4;
  color: var(--ads-text, #001619);
  background: var(--ads-suggestion-bg, #ffffff);
  border: 1px solid var(--ads-border, rgba(0, 22, 25, 0.12));
  cursor: pointer;
  transition:
    color 200ms,
    background-color 200ms,
    border-color 200ms,
    box-shadow 200ms;
}

.ads-suggestions__btn:hover:not(:disabled) {
  border-color: var(--ads-accent, #021f94);
  color: var(--ads-accent, #021f94);
  box-shadow: 0 2px 8px rgba(0, 22, 25, 0.06);
}

.ads-suggestions__btn:focus-visible {
  outline: 2px solid var(--ads-accent, #021f94);
  outline-offset: 2px;
}

.ads-suggestions__btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>

<script setup lang="ts">
import { computed } from 'vue'
import type { ChatMessage } from '../composables/useAssistant'
import { parseTokenPreviews, renderPreviewsHtml } from '../utils/token-preview'

const props = defineProps<{
  message: ChatMessage
}>()

/**
 * Lightweight markdown → HTML for LLM output.
 * Handles: fenced code blocks, inline `code`, **bold**, and unordered lists.
 * Safe: content comes from our own local LLM, not external user input.
 */
function renderMarkdown(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  const lines = escaped.split('\n')
  const result: string[] = []
  let inList = false
  let inCodeBlock = false
  let codeLang = ''
  let codeLines: string[] = []

  for (const line of lines) {
    // Fenced code block open/close
    const fenceMatch = line.match(/^```(\w*)\s*$/)
    if (fenceMatch) {
      if (!inCodeBlock) {
        if (inList) { result.push('</ul>'); inList = false }
        inCodeBlock = true
        codeLang = fenceMatch[1] ?? ''
        codeLines = []
      } else {
        const langLabel = codeLang || 'code'
        const codeContent = codeLines.join('\n')
        result.push(
          `<div class="ads-message__codeblock" data-lang="${langLabel}">` +
          `<div class="ads-message__codeblock-header">` +
          `<span class="ads-message__codeblock-lang">${langLabel}</span>` +
          `<button type="button" class="ads-message__codeblock-copy" onclick="navigator.clipboard.writeText(this.closest('.ads-message__codeblock').querySelector('code').textContent)" aria-label="Copy code">` +
          `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>` +
          `</button>` +
          `</div>` +
          `<pre class="ads-message__pre"><code class="ads-message__codeblock-code">${codeContent}</code></pre>` +
          `</div>`
        )
        if (codeLang === 'css') {
          const previews = parseTokenPreviews(codeContent)
          if (previews.length > 0) {
            result.push(renderPreviewsHtml(previews))
          }
        }
        inCodeBlock = false
        codeLang = ''
        codeLines = []
      }
      continue
    }

    if (inCodeBlock) {
      codeLines.push(line)
      continue
    }

    const listMatch = line.match(/^\s*[*-]\s+(.+)$/)

    if (listMatch) {
      if (!inList) {
        result.push('<ul class="ads-message__list">')
        inList = true
      }
      result.push(`<li>${inlineFormat(listMatch[1]!)}</li>`)
    } else {
      if (inList) {
        result.push('</ul>')
        inList = false
      }
      result.push(inlineFormat(line))
    }
  }

  if (inList) result.push('</ul>')
  // Handle unclosed code block
  if (inCodeBlock && codeLines.length > 0) {
    const langLabel = codeLang || 'code'
    const codeContent = codeLines.join('\n')
    result.push(
      `<div class="ads-message__codeblock" data-lang="${langLabel}">` +
      `<div class="ads-message__codeblock-header">` +
      `<span class="ads-message__codeblock-lang">${langLabel}</span>` +
      `</div>` +
      `<pre class="ads-message__pre"><code class="ads-message__codeblock-code">${codeContent}</code></pre>` +
      `</div>`
    )
    if (codeLang === 'css') {
      const previews = parseTokenPreviews(codeContent)
      if (previews.length > 0) {
        result.push(renderPreviewsHtml(previews))
      }
    }
  }

  return result.join('\n')
}

function inlineFormat(text: string): string {
  return text
    .replace(/`([^`]+)`/g, '<code class="ads-message__code">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
}

const renderedContent = computed(() => renderMarkdown(props.message.content))
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
    <!-- User: right-aligned dark pill -->
    <div v-if="message.role === 'user'" class="ads-message__user-pill">
      {{ message.content }}
    </div>

    <!-- Assistant: left-aligned card -->
    <div v-else class="ads-message__assistant-card">
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div v-if="message.content" class="ads-message__body" v-html="renderedContent" />
      <div v-else class="ads-message__body">
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
  padding: 0.375rem 0;
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

/* User: right-aligned dark pill */
.ads-message--user {
  display: flex;
  justify-content: flex-end;
}

.ads-message__user-pill {
  max-width: 80%;
  padding: 0.75rem 1.25rem;
  background: var(--ads-user-bg, #001619);
  color: var(--ads-user-color, #f5f2f3);
  border-radius: 1.25rem 1.25rem 0.25rem 1.25rem;
  font-size: 0.9375rem;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

/* Assistant: left-aligned card */
.ads-message--assistant {
  display: flex;
  justify-content: flex-start;
}

.ads-message__assistant-card {
  max-width: 100%;
  padding: 0.25rem 0;
}

.ads-message__body {
  font-size: 0.9375rem;
  line-height: 1.65;
  white-space: pre-line;
  word-break: break-word;
  color: var(--ads-text, #001619);
}

.ads-message__body :deep(.ads-message__code) {
  font-family: var(--ads-font-mono, 'JetBrains Mono', 'Fira Code', ui-monospace, monospace);
  font-size: 0.8125em;
  padding: 0.15em 0.4em;
  background: var(--ads-code-bg, rgba(0, 22, 25, 0.06));
  border-radius: 0.25rem;
  word-break: break-all;
}

/* Fenced code blocks */
.ads-message__body :deep(.ads-message__codeblock) {
  margin: 0.75em 0;
  border-radius: 0.5rem;
  overflow: hidden;
  background: var(--ads-codeblock-bg, #1e1e1e);
  color: var(--ads-codeblock-text, #d4d4d4);
}

.ads-message__body :deep(.ads-message__codeblock-header) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 1rem;
  background: var(--ads-codeblock-header-bg, #2d2d2d);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.ads-message__body :deep(.ads-message__codeblock-lang) {
  font-family: var(--ads-font-mono, 'JetBrains Mono', 'Fira Code', ui-monospace, monospace);
  font-size: 0.6875rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.5);
  text-transform: lowercase;
}

.ads-message__body :deep(.ads-message__codeblock-copy) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: none;
  color: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  padding: 0.125rem;
  border-radius: 0.25rem;
  transition: color 150ms, background 150ms;
}

.ads-message__body :deep(.ads-message__codeblock-copy:hover) {
  color: rgba(255, 255, 255, 0.8);
  background: rgba(255, 255, 255, 0.08);
}

.ads-message__body :deep(.ads-message__pre) {
  margin: 0;
  padding: 1rem;
  overflow-x: auto;
  font-family: var(--ads-font-mono, 'JetBrains Mono', 'Fira Code', ui-monospace, monospace);
  font-size: 0.8125rem;
  line-height: 1.6;
  white-space: pre;
  tab-size: 2;
}

.ads-message__body :deep(.ads-message__codeblock-code) {
  font: inherit;
  background: none;
  padding: 0;
  border-radius: 0;
}

.ads-message__body :deep(.ads-message__list) {
  margin: 0.5em 0;
  padding-left: 1.25em;
  list-style: disc;
}

.ads-message__body :deep(.ads-message__list li) {
  margin: 0.25em 0;
}

.ads-message--error .ads-message__assistant-card {
  border-color: var(--ads-error-border, rgba(143, 29, 19, 0.15));
}

.ads-message__error {
  font-size: 0.8125rem;
  color: var(--ads-error-color, #8f1d13);
  margin-top: 0.5rem;
}

.ads-message__typing {
  display: inline-flex;
  gap: 0.25rem;
  align-items: center;
  height: 1.25rem;
}

.ads-message__dot {
  width: 0.3125rem;
  height: 0.3125rem;
  border-radius: 50%;
  background: var(--ads-typing-dot, #021f94);
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

/* Token previews */
.ads-message__body :deep(.ads-previews) {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.625rem 0 0.25rem;
}

.ads-message__body :deep(.ads-preview) {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4375rem 0.75rem;
  background: var(--ads-preview-bg, rgba(0, 22, 25, 0.03));
  border: 1px solid var(--ads-preview-border, rgba(0, 22, 25, 0.08));
  border-radius: 0.375rem;
  min-width: 0;
}

.ads-message__body :deep(.ads-preview__label) {
  font-family: var(--ads-font-mono, 'JetBrains Mono', 'Fira Code', ui-monospace, monospace);
  font-size: 0.6875rem;
  color: var(--ads-text-muted, #4a585a);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ads-message__body :deep(.ads-preview__value) {
  font-family: var(--ads-font-mono, 'JetBrains Mono', 'Fira Code', ui-monospace, monospace);
  font-size: 0.6875rem;
  color: var(--ads-text, #001619);
  white-space: nowrap;
}

/* Color swatch */
.ads-message__body :deep(.ads-preview__swatch) {
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 0.25rem;
  border: 1px solid rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
  /* Checkerboard for transparency */
  background-image:
    linear-gradient(45deg, #ccc 25%, transparent 25%),
    linear-gradient(-45deg, #ccc 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #ccc 75%),
    linear-gradient(-45deg, transparent 75%, #ccc 75%);
  background-size: 8px 8px;
  background-position: 0 0, 0 4px, 4px -4px, -4px 0;
}

.ads-message__body :deep(.ads-preview--color .ads-preview__swatch) {
  background-image: none;
}

/* Font family sample */
.ads-message__body :deep(.ads-preview--font) {
  flex-direction: column;
  align-items: flex-start;
  gap: 0.25rem;
  flex-basis: 100%;
}

.ads-message__body :deep(.ads-preview__font-sample) {
  font-size: 1.0625rem;
  line-height: 1.4;
  color: var(--ads-text, #001619);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Font size sample */
.ads-message__body :deep(.ads-preview__size-sample) {
  line-height: 1;
  color: var(--ads-text, #001619);
  white-space: nowrap;
  font-weight: 600;
}

/* Font weight sample */
.ads-message__body :deep(.ads-preview__weight-sample) {
  font-size: 1.25rem;
  line-height: 1;
  color: var(--ads-text, #001619);
}

/* Shadow sample */
.ads-message__body :deep(.ads-preview__shadow-sample) {
  width: 2.5rem;
  height: 1.5rem;
  background: var(--ads-preview-shadow-surface, #ffffff);
  border-radius: 0.25rem;
  flex-shrink: 0;
}

/* Dimension bar */
.ads-message__body :deep(.ads-preview__dim-bar) {
  height: 0.5rem;
  background: var(--ads-accent, #021f94);
  border-radius: 2px;
  min-width: 2px;
  max-width: 8rem;
  flex-shrink: 0;
}

/* Border radius sample */
.ads-message__body :deep(.ads-preview__radius-sample) {
  width: 1.75rem;
  height: 1.75rem;
  background: var(--ads-preview-radius-fill, rgba(2, 31, 148, 0.12));
  border: 1px solid var(--ads-preview-radius-stroke, rgba(2, 31, 148, 0.3));
  flex-shrink: 0;
}

/* Opacity sample */
.ads-message__body :deep(.ads-preview__opacity-sample) {
  width: 1.75rem;
  height: 1.25rem;
  background: var(--ads-preview-opacity-bg, #e2dfe0);
  border-radius: 0.25rem;
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
}

.ads-message__body :deep(.ads-preview__opacity-sample > span) {
  position: absolute;
  inset: 0;
  background: var(--ads-accent, #021f94);
}
</style>

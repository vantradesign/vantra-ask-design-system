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
        result.push(buildCodeBlockHtml(langLabel, codeContent, codeLines.length))
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
    result.push(buildCodeBlockHtml(langLabel, codeContent, codeLines.length))
    if (codeLang === 'css') {
      const previews = parseTokenPreviews(codeContent)
      if (previews.length > 0) {
        result.push(renderPreviewsHtml(previews))
      }
    }
  }

  return result.join('\n')
}

const COLLAPSE_THRESHOLD = 5

function buildCodeBlockHtml(langLabel: string, codeContent: string, lineCount: number): string {
  const collapsible = lineCount > COLLAPSE_THRESHOLD
  const blockClass = collapsible
    ? 'ads-message__codeblock ads-message__codeblock--collapsible'
    : 'ads-message__codeblock'
  const toggleBtn = collapsible
    ? `<button type="button" class="ads-message__codeblock-toggle" aria-expanded="false">` +
      `<span class="ads-message__codeblock-toggle-text">Show more</span>` +
      `<svg class="ads-message__codeblock-toggle-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>` +
      `</button>`
    : ''
  return (
    `<div class="${blockClass}" data-lang="${langLabel}">` +
    `<div class="ads-message__codeblock-header">` +
    `<span class="ads-message__codeblock-lang">${langLabel}</span>` +
    `<button type="button" class="ads-message__codeblock-copy" aria-label="Copy code">` +
    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>` +
    `</button>` +
    `</div>` +
    `<pre class="ads-message__pre"><code class="ads-message__codeblock-code">${codeContent}</code></pre>` +
    toggleBtn +
    `</div>`
  )
}

function inlineFormat(text: string): string {
  return text
    .replace(/`([^`]+)`/g, '<code class="ads-message__code">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
}

const renderedContent = computed(() => renderMarkdown(props.message.content))

function onBodyClick(e: MouseEvent) {
  const target = e.target as HTMLElement

  // Toggle expand/collapse
  const toggleBtn = target.closest('.ads-message__codeblock-toggle') as HTMLElement | null
  if (toggleBtn) {
    const block = toggleBtn.closest('.ads-message__codeblock')!
    block.classList.toggle('ads-message__codeblock--expanded')
    const exp = block.classList.contains('ads-message__codeblock--expanded')
    const label = toggleBtn.querySelector('.ads-message__codeblock-toggle-text') as HTMLElement
    if (label) label.textContent = exp ? 'Show less' : 'Show more'
    toggleBtn.setAttribute('aria-expanded', String(exp))
    return
  }

  // Copy code
  const copyBtn = target.closest('.ads-message__codeblock-copy') as HTMLElement | null
  if (copyBtn) {
    const code = copyBtn.closest('.ads-message__codeblock')?.querySelector('code')
    if (code) navigator.clipboard.writeText(code.textContent ?? '')
  }
}
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
      <div v-if="message.content" class="ads-message__body" v-html="renderedContent" @click="onBodyClick" />
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

/* Collapsible code blocks */
.ads-message__body :deep(.ads-message__codeblock--collapsible) {
  position: relative;
}

.ads-message__body :deep(.ads-message__codeblock--collapsible .ads-message__pre) {
  max-height: calc(1.6em * 5 + 2rem); /* 5 lines × line-height + padding */
  overflow-y: hidden;
  position: relative;
  transition: max-height 0.3s ease-in-out;
}

.ads-message__body :deep(.ads-message__codeblock--collapsible .ads-message__pre)::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 3rem;
  background: linear-gradient(to bottom, transparent, var(--ads-codeblock-bg, #1e1e1e));
  pointer-events: none;
  opacity: 1;
  transition: opacity 0.3s ease-in-out;
}

.ads-message__body :deep(.ads-message__codeblock--expanded .ads-message__pre) {
  max-height: 200rem; /* large enough for any code block; enables CSS transition */
}

.ads-message__body :deep(.ads-message__codeblock--expanded .ads-message__pre)::after {
  opacity: 0;
}


.ads-message__body :deep(.ads-message__codeblock-toggle) {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  width: 100%;
  border: none;
  background: var(--ads-codeblock-header-bg, #2d2d2d);
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.5);
  font-family: inherit;
  font-size: 0.75rem;
  font-weight: 500;
  padding: 0.4375rem 1rem;
  cursor: pointer;
  transition: color 150ms, background 150ms;
}

.ads-message__body :deep(.ads-message__codeblock-toggle:hover) {
  color: rgba(255, 255, 255, 0.8);
  background: rgba(255, 255, 255, 0.04);
}

.ads-message__body :deep(.ads-message__codeblock-toggle-icon) {
  transition: transform 0.25s ease;
}

.ads-message__body :deep(.ads-message__codeblock--expanded .ads-message__codeblock-toggle-icon) {
  transform: rotate(180deg);
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

/* Token previews — horizontal scroll rail, full width of .ads__main */
.ads-message__body :deep(.ads-previews) {
  display: flex;
  flex-wrap: nowrap;
  gap: 0.75rem;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;          /* Firefox */
  /* Negative margins pull the rail out to .ads__main edges */
  margin-left: calc(-1 * max(2rem, (100cqw - 48rem) / 2 + 2rem));
  margin-right: calc(-1 * max(2rem, (100cqw - 48rem) / 2 + 2rem));
  /* Padding pushes first/last card to align with text content */
  padding-top: 0.75rem;
  padding-bottom: 0.75rem;
  padding-left: max(2rem, calc((100cqw - 48rem) / 2 + 2rem));
  padding-right: max(2rem, calc((100cqw - 48rem) / 2));
}

.ads-message__body :deep(.ads-previews::-webkit-scrollbar) {
  display: none;                  /* Chrome / Safari */
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
  flex-shrink: 0;
}

.ads-message__body :deep(.ads-preview__label) {
  font-family: var(--ads-font-mono, 'JetBrains Mono', 'Fira Code', ui-monospace, monospace);
  font-size: 0.75rem;
  color: var(--ads-text-muted, #4a585a);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ads-message__body :deep(.ads-preview__value) {
  font-family: var(--ads-font-mono, 'JetBrains Mono', 'Fira Code', ui-monospace, monospace);
  font-size: 0.75rem;
  color: var(--ads-text, #001619);
  white-space: nowrap;
}

/* Color card */
.ads-message__body :deep(.ads-preview--color-card) {
  flex-direction: column;
  align-items: stretch;
  gap: 0;
  padding: 0;
  overflow: hidden;
  min-width: 11rem;
  width: 13rem;
}

.ads-message__body :deep(.ads-preview__color-block) {
  display: flex;
  align-items: flex-end;
  justify-content: flex-start;
  min-height: 4.5rem;
  padding: 0.5rem 0.625rem;
}

.ads-message__body :deep(.ads-preview__level) {
  font-family: var(--ads-font-mono, 'JetBrains Mono', 'Fira Code', ui-monospace, monospace);
  font-size: 0.6875rem;
  font-weight: 700;
  opacity: 0.85;
}

.ads-message__body :deep(.ads-preview__color-info) {
  display: flex;
  flex-direction: column;
  gap: 0.1875rem;
  padding: 0.5rem 0.625rem 0.375rem;
}

.ads-message__body :deep(.ads-preview__hsl) {
  font-family: var(--ads-font-mono, 'JetBrains Mono', 'Fira Code', ui-monospace, monospace);
  font-size: 0.6875rem;
  color: var(--ads-text-muted, #4a585a);
}

.ads-message__body :deep(.ads-preview__checks) {
  display: flex;
  flex-direction: column;
  gap: 0.1875rem;
  padding: 0.5rem 0.625rem 0.625rem;
  border-top: 1px solid var(--ads-preview-border, rgba(0, 22, 25, 0.08));
}

.ads-message__body :deep(.ads-preview__check) {
  font-family: var(--ads-font-mono, 'JetBrains Mono', 'Fira Code', ui-monospace, monospace);
  font-size: 0.6875rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.ads-message__body :deep(.ads-preview__check--pass) {
  color: var(--ads-check-pass, #14584c);
}

.ads-message__body :deep(.ads-preview__check--fail) {
  color: var(--ads-check-fail, #8f1d13);
}

/* Typography composite card */
.ads-message__body :deep(.ads-preview--typography-card) {
  flex-direction: column;
  align-items: stretch;
  gap: 0;
  padding: 0;
  overflow: hidden;
  min-width: 11rem;
  width: 13rem;
}

.ads-message__body :deep(.ads-preview__type-sample) {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 5rem;
  padding: 0.75rem;
  color: var(--ads-text, #001619);
  background: var(--ads-preview-skeleton-bg, rgba(0, 22, 25, 0.02));
  overflow: hidden;
  white-space: nowrap;
}

.ads-message__body :deep(.ads-preview__type-info) {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  padding: 0.5rem 0.75rem 0.625rem;
  border-top: 1px solid var(--ads-preview-border, rgba(0, 22, 25, 0.08));
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

/* Shadow card */
.ads-message__body :deep(.ads-preview--shadow-card) {
  flex-direction: column;
  align-items: stretch;
  gap: 0;
  padding: 0;
  overflow: hidden;
  min-width: 11rem;
  width: 13rem;
}

.ads-message__body :deep(.ads-preview__shadow-stage) {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 6rem;
  padding: 1.25rem;
  background: var(--ads-preview-skeleton-bg, rgba(0, 22, 25, 0.04));
}

.ads-message__body :deep(.ads-preview__shadow-surface) {
  width: 100%;
  height: 3rem;
  background: var(--ads-preview-shadow-surface, #ffffff);
  border-radius: 0.375rem;
}

.ads-message__body :deep(.ads-preview__shadow-info) {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  padding: 0.5rem 0.75rem 0.625rem;
  border-top: 1px solid var(--ads-preview-border, rgba(0, 22, 25, 0.08));
}

/* Dimension / spacing card */
.ads-message__body :deep(.ads-preview--dimension-card) {
  flex-direction: column;
  align-items: stretch;
  gap: 0;
  padding: 0;
  overflow: hidden;
  min-width: 11rem;
  width: 13rem;
}

.ads-message__body :deep(.ads-preview__spacing-skeleton) {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0.75rem 0.75rem 0;
  background: var(--ads-preview-skeleton-bg, rgba(0, 22, 25, 0.02));
  min-height: 5rem;
}

.ads-message__body :deep(.ads-preview__skeleton-block) {
  height: 0.5rem;
  border-radius: 2px;
  background: var(--ads-preview-skeleton-line, rgba(0, 22, 25, 0.10));
  width: 100%;
}

.ads-message__body :deep(.ads-preview__skeleton-block--short) {
  width: 55%;
  margin-top: 0.375rem;
}

.ads-message__body :deep(.ads-preview__skeleton-block--medium) {
  width: 75%;
  margin-top: 0.375rem;
}

.ads-message__body :deep(.ads-preview__spacing-gap) {
  position: relative;
  min-height: 4px;
  max-height: 6rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ads-message__body :deep(.ads-preview__spacing-indicator) {
  position: absolute;
  inset: 0;
  background: var(--ads-accent, #021f94);
  opacity: 0.25;
  border-top: 2px solid var(--ads-accent, #021f94);
  border-bottom: 2px solid var(--ads-accent, #021f94);
}

.ads-message__body :deep(.ads-preview__spacing-info) {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  padding: 0.5rem 0.75rem 0.625rem;
  border-top: 1px solid var(--ads-preview-border, rgba(0, 22, 25, 0.08));
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

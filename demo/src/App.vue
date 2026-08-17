<script setup lang="ts">
import { AskDesignSystem } from '@vantra-design/ask-design-system-vue'
import type { AssistantError } from '@vantra-design/ask-design-system'
import sampleTokens from './sample-tokens.json'

function onReady(): void {
  // eslint-disable-next-line no-console
  console.log('[ask-design-system] Ready')
}

function onError(error: AssistantError): void {
  console.error('[ask-design-system] Error:', error.code, error.message)
}

function onMessage(message: { role: string; content: string }): void {
  // eslint-disable-next-line no-console
  console.log(`[ask-design-system] ${message.role}:`, message.content.slice(0, 100))
}

// Detect iframe mode via URL params
const params = new URLSearchParams(window.location.search)
const isIframe = params.has('iframe') || window.self !== window.top
</script>

<template>
  <div :class="['demo', { 'demo--iframe': isIframe }]">
    <header v-if="!isIframe" class="demo__header">
      <div class="demo__header-inner">
        <h1 class="demo__title">
          <span class="demo__logo" aria-hidden="true">✦</span>
          Ask Design System
        </h1>
        <p class="demo__subtitle">
          Local-first AI assistant for design systems. Ask questions about your tokens — nothing leaves your browser.
        </p>
      </div>
    </header>

    <main :class="['demo__main', { 'demo__main--iframe': isIframe }]">
      <AskDesignSystem
        :schema="(sampleTokens as Record<string, unknown>)"
        voice-input
        :voice-output="false"
        locale="en"
        @ready="onReady"
        @error="onError"
        @message="onMessage"
      />
    </main>

    <footer v-if="!isIframe" class="demo__footer">
      <p>
        Part of the <a href="https://vantra.design" target="_blank" rel="noopener">Vantra</a> design system toolkit.
        <span class="demo__privacy">100% local — no data leaves your browser.</span>
      </p>
    </footer>
  </div>
</template>

<style>
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body, #app {
  height: 100%;
}

body {
  font-family: system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #1a1a2e;
  background: #f8f9fa;
}
</style>

<style scoped>
.demo {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 100vh;
}

.demo--iframe {
  min-height: 100%;
}

.demo__header {
  background: linear-gradient(135deg, #0066cc 0%, #4338ca 100%);
  color: #ffffff;
  padding: 2rem 1.5rem;
}

.demo__header-inner {
  max-width: 48rem;
  margin: 0 auto;
}

.demo__title {
  font-size: 1.75rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.demo__logo {
  font-size: 1.5rem;
  opacity: 0.9;
}

.demo__subtitle {
  margin-top: 0.5rem;
  font-size: 1rem;
  opacity: 0.85;
  line-height: 1.5;
}

.demo__main {
  flex: 1;
  max-width: 48rem;
  width: 100%;
  margin: 0 auto;
  padding: 1.5rem;
}

.demo__main--iframe {
  max-width: 100%;
  padding: 0;
  height: 100%;
}

.demo__footer {
  padding: 1rem 1.5rem;
  text-align: center;
  font-size: 0.8125rem;
  color: #6b7280;
  border-top: 1px solid #e5e7eb;
}

.demo__footer a {
  color: #0066cc;
  text-decoration: none;
  font-weight: 500;
}

.demo__footer a:hover {
  text-decoration: underline;
}

.demo__privacy {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: #9ca3af;
}

/* Make the AskDesignSystem component fill the main area */
.demo__main :deep(.ads) {
  height: 100%;
  min-height: 500px;
}

.demo__main--iframe :deep(.ads) {
  border: none;
  border-radius: 0;
  min-height: 100%;
}
</style>

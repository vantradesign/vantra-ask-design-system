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

</script>

<template>
  <AskDesignSystem
    :schema="(sampleTokens as Record<string, unknown>)"
    voice-input
    :voice-output="false"
    locale="en"
    @ready="onReady"
    @error="onError"
    @message="onMessage"
  />
</template>

<style>
html, body, #app {
  height: 100%;
  margin: 0;
}
</style>

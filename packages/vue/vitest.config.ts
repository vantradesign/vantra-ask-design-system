import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@vantra-design/ask-design-system/voice-input': resolve(__dirname, '../core/src/voice-input.ts'),
      '@vantra-design/ask-design-system/voice-output': resolve(__dirname, '../core/src/voice-output.ts'),
      '@vantra-design/ask-design-system': resolve(__dirname, '../core/src/index.ts'),
    },
  },
  test: {
    environment: 'jsdom',
  },
})

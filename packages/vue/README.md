# @vantra-design/ask-design-system-vue

[![npm](https://img.shields.io/npm/v/@vantra-design/ask-design-system-vue)](https://www.npmjs.com/package/@vantra-design/ask-design-system-vue)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue)](https://github.com/vantradesign/vantra-ask-design-system/blob/main/LICENSE)

Drop-in Vue 3 component for [`@vantra-design/ask-design-system`](https://www.npmjs.com/package/@vantra-design/ask-design-system). Add a local-first AI assistant to your design system docs — with chat UI, voice I/O, session history, and visual token previews. **Nothing leaves the browser.**

## Install

```bash
npm install @vantra-design/ask-design-system-vue @vantra-design/ask-design-system vue
# or
pnpm add @vantra-design/ask-design-system-vue @vantra-design/ask-design-system vue
```

## Quick start

```vue
<script setup>
import { AskDesignSystem } from '@vantra-design/ask-design-system-vue'
import '@vantra-design/ask-design-system-vue/style.css'
import tokens from './tokens.json'
</script>

<template>
  <AskDesignSystem
    :schema="tokens"
    voice-input
    locale="en"
    @ready="() => console.log('Ready!')"
  />
</template>
```

That's it. The component handles model loading, chat history, suggested questions, and streaming responses.

## Features

- **Instant answers** — keyword + embedding search answers most queries without the LLM
- **Token previews** — color swatches, font samples, size/weight demos, shadows, spacing bars, border radius, and opacity rendered visually below code blocks
- **Chat sessions** — sidebar with session management, persisted to localStorage
- **Voice input** — speech-to-text via the Web Speech API (optional)
- **Voice output** — text-to-speech via Kokoro TTS (optional)
- **Fully themeable** — all styles use `--ads-*` CSS custom properties
- **Accessible** — ARIA roles, live regions, keyboard navigation, reduced-motion support

## `<AskDesignSystem>` props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `schema` | `Record<string, unknown>` | — | **Required.** Design token JSON (DTCG, Style Dictionary, or plain). |
| `model` | `string` | `'SmolLM2-360M-Instruct-q4f32_1-MLC'` | WebLLM model ID. |
| `voice-input` | `boolean` | `true` | Enable microphone input. |
| `voice-output` | `boolean` | `false` | Enable Kokoro TTS read-aloud. |
| `locale` | `'en' \| 'de'` | `'en'` | UI language / speech recognition locale. |
| `sidebar` | `boolean` | `true` | Show the session sidebar. |

## Events

| Event | Payload | Description |
| --- | --- | --- |
| `ready` | — | Assistant is initialised and ready for queries. |
| `error` | `AssistantError` | An error occurred. |
| `message` | `{ role: 'user' \| 'assistant'; content: string }` | A message completed. |

## Composables

For full control, use the composables directly instead of the all-in-one component:

### `useAssistant(options)`

```ts
import { useAssistant } from '@vantra-design/ask-design-system-vue'

const {
  messages,           // Ref<ChatMessage[]>
  isReady,            // Ref<boolean>
  isLoading,          // Ref<boolean>
  isStreaming,         // Ref<boolean>
  progress,           // Ref<ModelProgress | null>
  error,              // Ref<AssistantError | null>
  suggestedQuestions,  // Ref<string[]>
  supported,           // boolean
  send,               // (question: string) => Promise<void>
  abort,              // () => void
  init,               // () => Promise<void>
  destroy,            // () => Promise<void>
  clearHistory,       // () => void
} = useAssistant({
  schema: tokens,     // plain object or Ref
  model: '...',       // optional
  topK: 5,            // optional
  storageKey: 'my-chat', // localStorage key, false to disable
})
```

### `useVoiceInput(options)`

```ts
import { useVoiceInput } from '@vantra-design/ask-design-system-vue'

const { isListening, transcript, interimTranscript, start, stop, toggle, supported }
  = useVoiceInput({ language: 'en-US', onResult: (text) => send(text) })
```

### `useVoiceOutput(options)`

```ts
import { useVoiceOutput } from '@vantra-design/ask-design-system-vue'

const { isSpeaking, enabled, speak, pause, resume, stop, toggle, destroy, supported }
  = useVoiceOutput()
```

## Individual components

All sub-components are exported for custom layouts:

```ts
import {
  ChatMessage,
  ChatInput,
  ChatSidebar,
  ModelLoader,
  SuggestedQuestions,
  ErrorBanner,
} from '@vantra-design/ask-design-system-vue'
```

## Theming

Every visual is controlled by CSS custom properties. Override them on a parent element or `:root`:

```css
:root {
  /* Surfaces */
  --ads-bg: #ffffff;
  --ads-text: #001619;
  --ads-text-muted: #4a585a;
  --ads-text-faint: #626e70;

  /* Accents */
  --ads-accent: #021f94;
  --ads-user-bg: #001619;
  --ads-user-color: #f5f2f3;

  /* Code blocks */
  --ads-codeblock-bg: #1e1e1e;
  --ads-codeblock-text: #d4d4d4;
  --ads-codeblock-header-bg: #2d2d2d;
  --ads-code-bg: rgba(0, 22, 25, 0.06);

  /* Token previews */
  --ads-preview-bg: rgba(0, 22, 25, 0.03);
  --ads-preview-border: rgba(0, 22, 25, 0.08);

  /* Typography */
  --ads-font: 'Inclusive Sans', ui-sans-serif, system-ui, sans-serif;
  --ads-font-display: 'Bricolage Grotesque', ui-sans-serif, system-ui, sans-serif;
  --ads-font-mono: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;

  /* Errors */
  --ads-error-color: #8f1d13;
  --ads-error-border: rgba(143, 29, 19, 0.15);
}
```

## Token previews

When the assistant returns token values, visual previews appear automatically below code blocks:

| Token type | Preview |
| --- | --- |
| Color (`#hex`, `rgb()`, `hsl()`, `oklch()`) | Color swatch |
| Font family | "The quick brown fox…" in that font |
| Font size | "Aa" rendered at that size |
| Font weight | "Aa" rendered at that weight |
| Shadow | Box with the shadow applied |
| Spacing / dimension | Proportional bar |
| Border radius | Box with the radius |
| Opacity | Layered opacity box |

## Embedding in an iframe

The component auto-detects iframe context (`window.self !== window.top`) and also responds to the `?iframe` URL parameter. Use this to embed it in Storybook, documentation sites, or internal tools.

## Browser support

Requires WebGPU. Supported in Chrome/Edge 113+, Firefox 141+ (behind flag), Safari 18.2+.

## License

[Apache-2.0](https://github.com/vantradesign/vantra-ask-design-system/blob/main/LICENSE) © Vantra Design

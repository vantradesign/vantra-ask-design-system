# @vantra-design/ask-design-system

[![npm](https://img.shields.io/npm/v/@vantra-design/ask-design-system)](https://www.npmjs.com/package/@vantra-design/ask-design-system)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue)](https://github.com/vantradesign/vantra-ask-design-system/blob/main/LICENSE)

A local-first AI assistant for design systems. Ask questions about your tokens in natural language — everything runs in the browser. **Nothing leaves your machine.**

> **Privacy guarantee:** The language model runs entirely in your browser via WebGPU. Your design tokens are never sent to any server. The only network request is the one-time model download, which is cached locally.

## Install

```bash
npm install @vantra-design/ask-design-system
# or
pnpm add @vantra-design/ask-design-system
```

> Looking for a drop-in Vue 3 component? See [`@vantra-design/ask-design-system-vue`](https://www.npmjs.com/package/@vantra-design/ask-design-system-vue).

## Quick start

```ts
import { DesignSystemAssistant } from '@vantra-design/ask-design-system'
import tokens from './tokens.json'

const assistant = new DesignSystemAssistant({
  schema: tokens,
  onReady: () => console.log('Ready!'),
})

await assistant.init()

const answer = await assistant.ask('What colour tokens are available?')
console.log(answer)
```

## How it works

Most queries are answered **instantly** without touching the LLM:

1. **Keyword search** — instant, stop-word filtered, plural stemming, exact segment scoring
2. **Embedding search** — ~100 ms semantic search via MiniLM-L6-v2
3. **Direct answer** — both search results are formatted as readable markdown
4. **LLM generation** — only if both searches return nothing. The model is lazy-loaded on first need.

This means the first model download (~500 MB) only happens if a user asks a question that can't be answered from tokens alone — which is rare.

## Token formats

The schema loader auto-detects three formats:

| Format | Detection | Example |
| --- | --- | --- |
| **DTCG** (W3C) | `$value` + `$type` | `{ "color": { "primary": { "$value": "#0066cc", "$type": "color" } } }` |
| **Style Dictionary** | `value` + `type` | `{ "color": { "primary": { "value": "#0066cc", "type": "color" } } }` |
| **Plain JSON** | Nested objects with primitive leaves | `{ "color": { "primary": "#0066cc" } }` |

DTCG `$type` inheritance (group-level `$type` propagating to children) is fully supported.

## API

### `DesignSystemAssistant`

```ts
import { DesignSystemAssistant } from '@vantra-design/ask-design-system'
```

#### `constructor(config: AssistantConfig)`

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `schema` | `Record<string, unknown>` | — | **Required.** Design token JSON in any supported format. |
| `model` | `string` | `'SmolLM2-360M-Instruct-q4f32_1-MLC'` | WebLLM model ID. |
| `systemPrompt` | `string` | Built-in prompt | Custom system prompt prefix. |
| `topK` | `number` | `3` | Number of context chunks per query. |
| `maxTokens` | `number` | `256` | Max tokens to generate per answer. |
| `onModelProgress` | `(progress: ModelProgress) => void` | — | Called during model download. |
| `onReady` | `() => void` | — | Called when init completes. |
| `onError` | `(error: AssistantError) => void` | — | Called on errors. |

#### Methods

| Method | Returns | Description |
| --- | --- | --- |
| `init()` | `Promise<void>` | Flatten tokens + embed chunks. Must be called before `ask()`. |
| `ask(question)` | `Promise<string>` | Ask a question, get the full answer. |
| `askStream(question, callbacks)` | `Promise<void>` | Stream an answer token by token. |
| `abort()` | `void` | Cancel the current generation. |
| `updateSchema(schema)` | `Promise<void>` | Hot-swap tokens without reinitialising the LLM. |
| `destroy()` | `Promise<void>` | Release all resources. |

#### Static methods

| Method | Returns | Description |
| --- | --- | --- |
| `isSupported()` | `boolean` | `true` if WebGPU is available. |
| `isCached(model?)` | `Promise<boolean>` | `true` if the model is already in the browser cache. |

#### `StreamCallbacks`

```ts
interface StreamCallbacks {
  onToken?: (token: string) => void
  onComplete?: (fullText: string) => void
  onError?: (error: AssistantError) => void
}
```

### Voice input

Optional. Uses the Web Speech API (no model download).

```ts
import { VoiceInput } from '@vantra-design/ask-design-system/voice-input'

const mic = new VoiceInput({
  language: 'en-US',
  onResult: (text) => assistant.ask(text),
  onInterim: (text) => console.log('Hearing:', text),
})

mic.start()
// ... later
mic.stop()
```

| Method | Description |
| --- | --- |
| `start()` | Begin listening. |
| `stop()` | Stop listening. |
| `isListening` | `boolean` getter. |
| `VoiceInput.isSupported()` | Static — `true` if Web Speech API exists. |

### Voice output

Optional. Uses Kokoro TTS via `@vantra-design/local-inference` (~82 MB model, cached).

```ts
import { VoiceOutput } from '@vantra-design/ask-design-system/voice-output'

const speaker = new VoiceOutput({ voice: 'af_heart', rate: 1.0 })

await speaker.speak('Here are your colour tokens.')
speaker.stop()
await speaker.destroy()
```

| Method | Description |
| --- | --- |
| `speak(text)` | Speak aloud (lazy-loads the TTS model on first call). |
| `pause()` / `resume()` | Pause and resume playback. |
| `stop()` | Stop and discard remaining speech. |
| `destroy()` | Release TTS resources. |
| `isSpeaking` | `boolean` getter. |
| `VoiceOutput.isSupported()` | Static — `true` if AudioContext is available. |

### Utilities

```ts
import {
  flattenTokens,   // schema → TokenChunk[]
  detectFormat,     // schema → 'dtcg' | 'style-dictionary' | 'plain'
  keywordSearch,    // (query, chunks, topK) → SearchResult[]
  embedChunks,      // chunks → EmbeddedChunk[]
  searchChunks,     // (queryEmbedding, embeddedChunks, topK) → SearchResult[]
  deriveSuggestedQuestions, // categories → string[]
} from '@vantra-design/ask-design-system'
```

## Size budget

| Component | Size | Cached? |
| --- | --- | --- |
| This package (JS, gzipped) | ~5.6 KB | — |
| MiniLM-L6-v2 embeddings | ~23 MB | ✓ Cache API |
| SmolLM2-360M-Instruct (lazy) | ~580 MB | ✓ Cache API |
| Kokoro TTS (lazy, optional) | ~82 MB | ✓ Cache API |

Models are downloaded once and cached via the Cache API. If [`@vantra-design/screenreader-empathy`](https://www.npmjs.com/package/@vantra-design/screenreader-empathy) is also installed, both tools share the LLM cache.

## Content Security Policy

```txt
default-src 'self';
connect-src 'self' https://huggingface.co https://*.huggingface.co https://cdn-lfs.hf.co https://cdn-lfs-us-1.hf.co https://cdn-lfs-us-1.huggingface.co;
script-src 'self' 'wasm-unsafe-eval';
style-src 'self' 'unsafe-inline';
worker-src 'self' blob:;
```

After the one-time model download, **zero network calls** are made.

## Browser support

Requires WebGPU. Supported in Chrome/Edge 113+, Firefox 141+ (behind flag), Safari 18.2+.

Use `DesignSystemAssistant.isSupported()` to check at runtime.

## License

[Apache-2.0](https://github.com/vantradesign/vantra-ask-design-system/blob/main/LICENSE) © Vantra Design

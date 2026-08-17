# @vantra-design/ask-design-system — Package Specification

**Date:** 2026-08-17
**Author:** Kai Kauper, Design Systems Lead
**Status:** Pre-implementation specification

---

## 1. Product Manager Perspective

### Problem

Design system maintainers field the same questions daily: "Which token do I use for a card background?", "What's the spacing scale?", "Is there a component for this?" The answers live in scattered docs, Figma files, and JSON token files. Teams with design-ops tooling budgets use Zeroheight or Supernova — both cloud-first, both require accounts, both send your system's data to third-party servers.

Solo designers, small teams, and privacy-conscious organisations have no equivalent. They either answer every question manually or accept that knowledge stays trapped in files nobody reads.

### Target user

- **Primary:** Design system maintainers at small-to-medium orgs (1–5 person teams) who maintain token JSON files but lack a dedicated docs platform.
- **Secondary:** Solo designers/developers who build their own component libraries and want a searchable interface over their tokens without standing up infrastructure.
- **Tertiary:** Enterprise teams in regulated industries (healthcare, finance, government) where sending design system data to a cloud API is a compliance blocker.

### What "done" means for v1

A genuinely installable npm package that:

1. Accepts a design token JSON (DTCG, Style Dictionary, or plain nested format) at initialisation.
2. Answers natural-language questions about that token set using a small quantized LLM running entirely in the browser — no cloud calls, no API keys, no accounts.
3. Provides voice input (mic button) and optional voice output (TTS read-aloud) as modalities within the same chat interface.
4. Downloads the inference model once, caches it in the browser, and loads near-instantly on subsequent visits.
5. Ships as a framework-agnostic core class and a ready-to-use Vue component.
6. Can be installed via `npm install`, pointed at a token file, and producing value within 2 minutes of reading the quickstart.

This is not a general-purpose chatbot. It answers questions about *your* design system using *your* data as the only context. The privacy guarantee is not a feature — it is the product.

### What v1 explicitly excludes

- Multi-file repository scanning (that's what `@vantra-design/core` does).
- Component API questions (requires AST parsing — out of scope).
- Fine-tuning or model training.
- Persistent chat history across sessions.
- Any network call after the initial model download.

---

## 2. Staff UX Designer Perspective

### Interaction model: install → value in under 2 minutes

```
1. npm install @vantra-design/ask-design-system
2. Import component, pass token JSON as prop
3. Component renders → shows empty state with sample questions
4. First use: model download prompt (one-time, ~500MB)
5. Model cached → chat ready in <3s on subsequent loads
6. Type or speak a question → streamed answer grounded in your tokens
```

### States

#### Empty state (no conversation yet)
- Chat container with a brief headline: "Ask your design system"
- 3–4 suggested starter questions derived from the token categories present in the schema (e.g. "What spacing tokens are available?", "Show me the colour palette", "Which font is used for headings?")
- Subtle note: "Answers are generated locally — nothing leaves your browser."
- Mic button visible but not prominent (discoverable, not distracting)

#### Model loading state (first use only)
- Full-width progress bar with percentage and MB downloaded/total
- Estimated time remaining (calculated from download speed)
- Clear label: "Downloading language model (~500 MB, one-time only)"
- Cancel button that aborts the download cleanly
- Explanation: "The model is cached in your browser. Future loads take under 3 seconds."
- The UI is *not* blocked — the user can read the empty state content while waiting

#### Ready state (model loaded, no active query)
- Input field with placeholder "Ask about your design system…"
- Mic button (toggleable) — shows recording indicator when active
- Speaker button (toggleable) — enables TTS for answers
- Previous messages in the conversation (session-only, not persisted)

#### Streaming state (answer being generated)
- User message appears immediately
- Assistant message streams token-by-token with a typing indicator
- Token/component names in answers are rendered as inline code spans
- "Stop generating" button to abort mid-stream

#### Error states
- **WebGPU not available:** "Your browser doesn't support WebGPU, which is required for local AI. Try Chrome 113+ or Edge 113+. [Learn more]" — the chat UI still renders, input is disabled, suggested questions are hidden.
- **Model download failed:** "Download interrupted. [Retry] [Use smaller model]" — retry resumes from cache if partial download exists.
- **Voice not available:** Mic button shows a tooltip "Voice input requires Chrome or Edge" — button is visible but disabled, not hidden (so the user knows the feature exists).
- **Inference error:** "Something went wrong generating the answer. [Try again]" — the failed message is marked, previous conversation is preserved.

#### Voice input flow
1. User taps mic button → button pulses, browser permission prompt appears (first time only)
2. Transcription appears in the input field in real-time (Web Speech API interim results)
3. User taps mic again (or silence timeout) → transcribed text is sent as a normal message
4. No separate "voice mode" screen — voice is just another way to fill the input field

#### Voice output flow
1. User toggles speaker button → all subsequent assistant messages are read aloud via Kokoro TTS
2. A small speaker icon per message allows replaying individual answers
3. Currently-read sentence is subtly highlighted in the message bubble
4. Pause/resume control appears during playback

### Accessibility

- All interactive elements are keyboard-navigable (Tab, Enter, Escape)
- Screen reader announcements for: model loading progress, new messages, errors
- `aria-live="polite"` on the message container
- High-contrast mode support via CSS custom properties
- Reduced-motion preference respected (no streaming animation, messages appear complete)
- Focus management: focus moves to the latest assistant message after generation completes

---

## 3. Staff Software Engineer Perspective

### Package architecture

```
vantra-ask-design-system/
├── packages/
│   ├── core/                          # @vantra-design/ask-design-system
│   │   ├── src/
│   │   │   ├── assistant.ts           # DesignSystemAssistant class
│   │   │   ├── retrieval.ts           # embedding + similarity search
│   │   │   ├── schema-loader.ts       # normalize DTCG/SD/plain JSON
│   │   │   ├── prompt.ts              # system prompt construction
│   │   │   ├── voice-input.ts         # Web Speech API wrapper
│   │   │   ├── voice-output.ts        # Kokoro TTS wrapper
│   │   │   ├── types.ts               # public type exports
│   │   │   └── index.ts               # barrel
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── tsup.config.ts
│   │
│   └── vue/                           # @vantra-design/ask-design-system-vue
│       ├── src/
│       │   ├── AskDesignSystem.vue     # main component
│       │   ├── composables/
│       │   │   ├── useAssistant.ts
│       │   │   ├── useVoiceInput.ts
│       │   │   └── useVoiceOutput.ts
│       │   ├── components/
│       │   │   ├── ChatMessage.vue
│       │   │   ├── ChatInput.vue
│       │   │   ├── ModelLoader.vue
│       │   │   ├── SuggestedQuestions.vue
│       │   │   └── ErrorBanner.vue
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
│
├── demo/                              # standalone Vite app for vantra.design embedding
│   ├── src/
│   │   ├── App.vue
│   │   ├── sample-tokens.json
│   │   └── main.ts
│   ├── index.html
│   └── vite.config.ts
│
├── .github/workflows/
│   ├── ci.yml
│   └── publish.yml
├── .changeset/config.json
├── pnpm-workspace.yaml
├── package.json                       # workspace root
├── tsconfig.base.json
├── eslint.config.js
├── vitest.workspace.ts
├── CONTRIBUTING.md
├── LICENSE                            # Apache-2.0
└── README.md
```

### Build & publish

- **Build tool:** tsup (ESM + CJS + .d.ts), consistent with `@vantra-design/core`
- **Monorepo:** pnpm workspace with two publishable packages
- **Versioning:** changesets, same flow as vantra-core
- **Publish:** GitHub Actions on version tags, npm provenance enabled
- **Tree-shaking:** `"sideEffects": false`, granular exports map

### Exports map (core package)

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    },
    "./voice-input": {
      "types": "./dist/voice-input.d.ts",
      "import": "./dist/voice-input.js",
      "require": "./dist/voice-input.cjs"
    },
    "./voice-output": {
      "types": "./dist/voice-output.d.ts",
      "import": "./dist/voice-output.js",
      "require": "./dist/voice-output.cjs"
    },
    "./package.json": "./package.json"
  }
}
```

Voice modules are secondary entry points so consumers who don't need voice can tree-shake them out entirely (Kokoro TTS is ~82M — no reason to force it into every bundle).

### Dependencies (core)

| Dependency | Purpose | Size impact |
| --- | --- | --- |
| `@mlc-ai/web-llm` | In-browser LLM inference via WebGPU | ~150KB (JS), models loaded at runtime |
| `@huggingface/transformers` | Client-side embeddings for retrieval | ~2MB (JS), model ~23MB loaded at runtime |
| `kokoro-js` | Local TTS (optional, in voice-output entry point) | ~200KB (JS), model ~82MB loaded at runtime |

### Dependencies (vue)

| Dependency | Purpose |
| --- | --- |
| `@vantra-design/ask-design-system` | Core (peer dependency) |
| `vue` | Peer dependency (^3.4) |

---

## 4. Staff AI Specialist Perspective

### Model selection

| Role | Model | Format | Size (quantized) | Why this one |
| --- | --- | --- | --- | --- |
| Chat/reasoning | Llama-3.2-1B-Instruct | MLC q4f32_1 | ~500MB | Smallest instruction-tuned model that follows system prompts reliably. Fits in 2GB VRAM — runs on integrated GPUs. |
| Embeddings | all-MiniLM-L6-v2 | ONNX (via transformers.js) | ~23MB | 384-dim embeddings, 22M params. Fast enough to embed ~500 tokens in <1s client-side. Well-tested with transformers.js. |
| TTS (optional) | Kokoro v1.0 | ONNX/WASM via kokoro-js | ~82MB | High-quality, multi-language, fully local. Apache-2.0 licensed. |

**Why not Phi-3.5-mini?** At ~2GB quantized it requires 4GB+ VRAM and takes 15–30s to load even from cache. For a design system Q&A tool where answers are short and schema-grounded, the quality difference vs. Llama-3.2-1B doesn't justify the 4× load time. Offer as an optional override for power users.

### Quantization

4-bit quantization (q4f32_1) via MLC format. This is the sweet spot:
- 8-bit is 2× larger with negligible quality gain for this use case
- 2-bit degrades instruction-following below acceptable thresholds
- MLC format is WebGPU-native — no WASM fallback needed for the LLM itself

### Loading strategy

```
1. Check WebGPU availability (navigator.gpu)
   ├── Not available → show error state, stop
   └── Available → continue

2. Check Cache API for model weights
   ├── Cached → load from cache (~2-3s)
   └── Not cached → prompt user, download with progress
       ├── Download succeeds → store in Cache API
       └── Download fails → offer retry, keep partial cache

3. Initialize WebLLM engine with cached weights
4. Load embedding model (smaller, loads in parallel during step 3)
5. Ready state
```

**Cache API vs. IndexedDB:** Cache API is used because:
- WebLLM already uses it natively — no custom storage layer needed
- It handles large binary blobs (hundreds of MB) better than IndexedDB
- It's accessible from service workers if we ever need offline support
- Cache eviction is browser-managed but predictable enough for models this size

### Retrieval strategy (local RAG)

The token JSON is small enough (typically 50–500 tokens, <100KB) to embed entirely on load. No vector database is needed.

```
1. On schema load:
   a. Flatten token JSON into chunks (one chunk per token group/category)
   b. Embed each chunk with MiniLM → Float32Array[384]
   c. Store embeddings in memory (simple array, not IndexedDB)

2. On query:
   a. Embed the user's question
   b. Cosine similarity against all chunk embeddings
   c. Take top-k (k=5) most relevant chunks
   d. Inject into LLM system prompt as context

3. System prompt structure:
   "You are a design system assistant. Answer questions using ONLY
    the following design token data. If the answer is not in the
    data, say so. Do not invent tokens that don't exist.

    CONTEXT:
    {top-k token chunks, formatted as readable key-value pairs}

    USER QUESTION: {query}"
```

This is retrieval-augmented generation at the simplest possible scale. The entire "vector database" is an array of Float32Arrays held in memory. For the data volumes involved (design tokens, not Wikipedia), this is correct and sufficient.

### Fallback behavior

| Scenario | Behavior |
| --- | --- |
| No WebGPU (Safari, Firefox <141, older devices) | UI renders, chat disabled, clear message with browser recommendations |
| WebGPU but <2GB VRAM | Attempt load; if OOM, suggest closing other GPU-heavy tabs |
| No SpeechRecognition (Firefox, Safari) | Mic button disabled with tooltip, text input works normally |
| Kokoro TTS fails to load | Speaker button disabled, text answers still work |
| Embedding model fails | Fall back to keyword search over token names (no semantic matching) |

### Privacy guarantees (structural, not promissory)

- No `fetch()` calls after model download — enforceable via CSP `connect-src` in the demo
- Token JSON never serialized or transmitted — it's processed in-memory
- No analytics, telemetry, or error reporting to external services
- Model weights are fetched from Hugging Face CDN (the only network call) and cached locally
- The model runs in a Web Worker to avoid blocking the main thread

---

## 5. Public API Surface

### Core package: `@vantra-design/ask-design-system`

```ts
// --- Main class ---

interface AssistantConfig {
  /** Design token JSON — DTCG, Style Dictionary, or plain nested format */
  schema: Record<string, unknown>

  /** Model to use. Default: 'Llama-3.2-1B-Instruct-q4f32_1-MLC' */
  model?: string

  /** Custom system prompt prefix. Default includes grounding instructions. */
  systemPrompt?: string

  /** Number of context chunks to retrieve per query. Default: 5 */
  topK?: number

  /** Called during model download with progress info */
  onModelProgress?: (progress: ModelProgress) => void

  /** Called when the assistant is ready to accept queries */
  onReady?: () => void

  /** Called on errors */
  onError?: (error: AssistantError) => void
}

interface ModelProgress {
  phase: 'download' | 'initialize'
  loaded: number    // bytes
  total: number     // bytes
  percentage: number
}

interface AssistantError {
  code: 'webgpu-unavailable' | 'model-download-failed' | 'model-load-failed'
      | 'inference-failed' | 'embedding-failed'
  message: string
  cause?: unknown
}

interface StreamCallbacks {
  onToken?: (token: string) => void
  onComplete?: (fullText: string) => void
  onError?: (error: AssistantError) => void
}

declare class DesignSystemAssistant {
  constructor(config: AssistantConfig)

  /** Initialize models and embeddings. Must be called before ask(). */
  init(): Promise<void>

  /** Check if WebGPU is available in this browser. */
  static isSupported(): boolean

  /** Check if models are already cached (no download needed). */
  static isCached(model?: string): Promise<boolean>

  /** Ask a text question. Returns the full answer. */
  ask(question: string): Promise<string>

  /** Ask a text question with streaming response. */
  askStream(question: string, callbacks: StreamCallbacks): Promise<void>

  /** Abort the current generation. */
  abort(): void

  /** Update the token schema without reinitializing the LLM. */
  updateSchema(schema: Record<string, unknown>): Promise<void>

  /** Release all resources (model, workers, embeddings). */
  destroy(): Promise<void>
}
```

### Voice input: `@vantra-design/ask-design-system/voice-input`

```ts
interface VoiceInputConfig {
  /** BCP 47 language tag. Default: 'en-US' */
  language?: string
  /** Called with interim transcription results */
  onInterim?: (text: string) => void
  /** Called with final transcription result */
  onResult?: (text: string) => void
  /** Called on error */
  onError?: (error: VoiceInputError) => void
}

declare class VoiceInput {
  constructor(config?: VoiceInputConfig)
  static isSupported(): boolean
  start(): void
  stop(): void
  readonly isListening: boolean
}
```

### Voice output: `@vantra-design/ask-design-system/voice-output`

```ts
interface VoiceOutputConfig {
  /** Kokoro voice preset. Default: 'af_heart' */
  voice?: string
  /** Speaking rate multiplier. Default: 1.0 */
  rate?: number
  /** Called during model download */
  onModelProgress?: (progress: ModelProgress) => void
}

declare class VoiceOutput {
  constructor(config?: VoiceOutputConfig)
  static isSupported(): boolean
  speak(text: string): Promise<void>
  pause(): void
  resume(): void
  stop(): void
  readonly isSpeaking: boolean
}
```

### Vue package: `@vantra-design/ask-design-system-vue`

```vue
<script setup lang="ts">
interface Props {
  /** Design token JSON */
  schema: Record<string, unknown>
  /** Model override */
  model?: string
  /** Enable voice input. Default: true (auto-detects support) */
  voiceInput?: boolean
  /** Enable voice output. Default: false */
  voiceOutput?: boolean
  /** UI language for labels. Default: 'en' */
  locale?: 'en' | 'de'
  /** CSS class for the root container */
  class?: string
}

const emit = defineEmits<{
  ready: []
  error: [error: AssistantError]
  message: [message: { role: 'user' | 'assistant'; content: string }]
}>()
</script>

<!-- Usage -->
<template>
  <AskDesignSystem
    :schema="myTokens"
    voice-input
    :voice-output="false"
    locale="en"
    @ready="onReady"
    @error="onError"
  />
</template>
```

---

## 6. README (as published)

---

# @vantra-design/ask-design-system

[![npm](https://img.shields.io/npm/v/@vantra-design/ask-design-system)](https://www.npmjs.com/package/@vantra-design/ask-design-system)
[![CI](https://github.com/vantradesign/vantra-ask-design-system/actions/workflows/ci.yml/badge.svg)](https://github.com/vantradesign/vantra-ask-design-system/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue)](./LICENSE)

A local-first AI assistant for your design system. Ask questions about your tokens and patterns in natural language — with optional voice input and output — and get answers grounded in your actual data. **Nothing leaves your browser.**

> **Privacy guarantee:** The language model runs entirely in your browser via WebGPU. Your design tokens are never sent to any server. The only network request is the one-time model download (~500 MB), which is cached locally for instant subsequent loads.

---

## Why this exists

Design system documentation gets outdated. Token files are comprehensive but not searchable in natural language. Cloud-based design system tools (Zeroheight, Supernova, Specify) require accounts and send your data to third-party servers.

This package gives you a chat interface over your own design tokens that runs 100% locally. No API keys, no accounts, no cloud dependencies.

---

## Quick start

```bash
npm install @vantra-design/ask-design-system
```

```ts
import { DesignSystemAssistant } from '@vantra-design/ask-design-system'
import tokens from './tokens.json'

const assistant = new DesignSystemAssistant({
  schema: tokens,
  onModelProgress: (p) => console.log(`Loading model: ${p.percentage}%`),
})

await assistant.init()

const answer = await assistant.ask('What colour tokens are available for backgrounds?')
console.log(answer)
// "Your design system defines three background tokens:
//  - color.background.default: #ffffff
//  - color.background.subtle: #f8f9fa
//  - color.background.inverse: #1a1a2e"
```

Time from install to first answer: **under 2 minutes** (plus a one-time model download).

---

## Vue component

```bash
npm install @vantra-design/ask-design-system-vue
```

```vue
<script setup>
import { AskDesignSystem } from '@vantra-design/ask-design-system-vue'
import tokens from './tokens.json'
</script>

<template>
  <AskDesignSystem :schema="tokens" voice-input locale="en" />
</template>
```

The component renders a complete chat interface — input field, message history, model loading UI, error states, and voice controls. Style it via CSS custom properties or override the default styles entirely.

---

## Voice mode

Voice is an input/output modality within the same chat, not a separate mode.

### Voice input (mic button)

Uses the Web Speech API for browser-native speech recognition. Available in Chrome and Edge. The mic button transcribes speech into the text input field — you see your words appear as you speak, then send the message normally.

```ts
import { VoiceInput } from '@vantra-design/ask-design-system/voice-input'

const mic = new VoiceInput({
  language: 'en-US',
  onResult: (text) => assistant.ask(text),
})

mic.start()
```

### Voice output (read aloud)

Uses [Kokoro TTS](https://github.com/niconielsen32/kokoro-js) for high-quality local text-to-speech (~82 MB model, cached after first use). Toggle it on to have answers read aloud.

```ts
import { VoiceOutput } from '@vantra-design/ask-design-system/voice-output'

const speaker = new VoiceOutput({ voice: 'af_heart' })
const answer = await assistant.ask('What is the primary brand colour?')
await speaker.speak(answer)
```

---

## Supported token formats

The `schema` prop accepts any of these formats — they're auto-detected:

| Format | Example |
| --- | --- |
| [DTCG](https://design-tokens.github.io/community-group/format/) | `{ "color": { "primary": { "$value": "#f00", "$type": "color" } } }` |
| [Style Dictionary](https://amzn.github.io/style-dictionary/) | `{ "color": { "primary": { "value": "#f00", "type": "color" } } }` |
| Plain nested JSON | `{ "color": { "primary": "#f00" } }` |

---

## Browser requirements

| Feature | Minimum browser | Fallback |
| --- | --- | --- |
| WebGPU (required for LLM) | Chrome 113+, Edge 113+ | Error message; chat disabled |
| SpeechRecognition (voice input) | Chrome, Edge | Mic button disabled; text input works |
| Kokoro TTS (voice output) | Chrome, Edge, Firefox | Speaker button disabled; text answers work |

Safari does not yet support WebGPU in stable releases. When it does, this package will work there without changes.

---

## Bundle size

| Export | JS size (gzipped) | Runtime model download |
| --- | --- | --- |
| Core (`ask-design-system`) | ~160 KB | ~500 MB LLM + ~23 MB embeddings (cached) |
| Voice input | ~3 KB | None (uses browser API) |
| Voice output | ~15 KB | ~82 MB TTS model (cached) |
| Vue component | ~25 KB | Same as core (peer dep) |

The large download is the language model, which downloads once and is cached in the browser's Cache API. Subsequent loads take 2–3 seconds.

---

## API reference

### `DesignSystemAssistant`

| Method | Description |
| --- | --- |
| `constructor(config)` | Create an assistant with a token schema |
| `init()` | Load models and build embeddings. Resolves when ready. |
| `ask(question)` | Ask a question, get a full text answer |
| `askStream(question, callbacks)` | Ask with token-by-token streaming |
| `abort()` | Cancel the current generation |
| `updateSchema(schema)` | Swap token data without reloading the LLM |
| `destroy()` | Release all GPU/worker resources |
| `static isSupported()` | Check WebGPU availability |
| `static isCached(model?)` | Check if the model is already downloaded |

### `VoiceInput`

| Method | Description |
| --- | --- |
| `start()` | Begin listening |
| `stop()` | Stop listening |
| `static isSupported()` | Check SpeechRecognition availability |

### `VoiceOutput`

| Method | Description |
| --- | --- |
| `speak(text)` | Read text aloud via Kokoro TTS |
| `pause()` / `resume()` | Playback control |
| `stop()` | Stop and discard remaining speech |
| `static isSupported()` | Check audio/WASM availability |

---

## How it works

1. Your token JSON is split into semantic chunks (one per token group).
2. Each chunk is embedded into a 384-dimensional vector using [MiniLM](https://huggingface.co/Xenova/all-MiniLM-L6-v2) (~23 MB, runs via transformers.js).
3. When you ask a question, it's embedded and compared against the token chunks via cosine similarity.
4. The top 5 most relevant chunks are injected into the LLM's system prompt as context.
5. [Llama 3.2 1B Instruct](https://huggingface.co/mlc-ai/Llama-3.2-1B-Instruct-q4f32_1-MLC) (~500 MB, 4-bit quantized) generates an answer grounded in that context.

This is retrieval-augmented generation (RAG) at the smallest useful scale. The entire "vector database" is an in-memory array. For design token data (typically <100 KB), this is the right architecture.

---

## Development

```bash
git clone https://github.com/vantradesign/vantra-ask-design-system.git
cd vantra-ask-design-system
pnpm install
pnpm run dev          # watch mode
pnpm run verify       # lint + typecheck + test + build
pnpm run demo         # run demo app at localhost:5173
```

Releases are managed with [changesets](https://github.com/changesets/changesets):

```bash
pnpm run changeset    # describe your change
```

Merging to `main` opens a version PR; merging that PR publishes to npm with provenance.

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## License

[Apache-2.0](./LICENSE) © Vantra Design

Apache-2.0 was chosen over MIT because this package includes AI model loading code where patent protection matters, and over AGPL because this is a library meant to be embedded in other projects without license infection. See the [license decision](#license-rationale) for full reasoning.

### License rationale

| Option | Rejected because |
| --- | --- |
| MIT | No patent grant. For a package that loads and runs AI models, explicit patent protection is prudent. |
| AGPL-3.0 | Copyleft would prevent embedding in proprietary design system dashboards — the primary use case. `@vantra-design/core` uses AGPL because it's a governance tool; this is a utility library with a different adoption profile. |
| MPL-2.0 | File-level copyleft is reasonable but unfamiliar to most JS developers and adds friction to adoption. |
| Apache-2.0 ✓ | Permissive, patent grant included, widely understood, compatible with embedding in any project. |

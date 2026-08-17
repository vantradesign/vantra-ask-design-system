# @vantra-design/ask-design-system

[![npm](https://img.shields.io/npm/v/@vantra-design/ask-design-system)](https://www.npmjs.com/package/@vantra-design/ask-design-system)
[![CI](https://github.com/vantradesign/vantra-ask-design-system/actions/workflows/ci.yml/badge.svg)](https://github.com/vantradesign/vantra-ask-design-system/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue)](./LICENSE)

A local-first AI assistant for your design system. Ask questions about your tokens and patterns in natural language — with optional voice input and output — and get answers grounded in your actual data. **Nothing leaves your browser.**

> **Privacy guarantee:** The language model runs entirely in your browser via WebGPU. Your design tokens are never sent to any server. The only network request is the one-time model download (~500 MB), which is cached locally for instant subsequent loads.

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
```

## Packages

| Package | Description | Bundle (gzip) |
| --- | --- | --- |
| [`@vantra-design/ask-design-system`](./packages/core) | Framework-agnostic core — schema loader, retrieval, LLM assistant | 5.6 KB |
| [`@vantra-design/ask-design-system-vue`](./packages/vue) | Vue 3 component + composables | 6.2 KB + 2.1 KB CSS |

## Size budget

| Component | Size | Cached? |
| --- | --- | --- |
| Core package (JS, gzipped) | 5.6 KB | — |
| Vue package (JS + CSS, gzipped) | 8.3 KB | — |
| Llama-3.2-1B-Instruct (q4f32_1) | ~500 MB | ✓ Cache API |
| MiniLM-L6-v2 embeddings | ~23 MB | ✓ Cache API |

> Models are downloaded once and cached in the browser via the Cache API. If `@vantra-design/screenreader-empathy` is also installed, both tools share the LLM cache — download once, both tools use it.

## Content Security Policy

```txt
default-src 'self';
connect-src 'self' https://huggingface.co https://*.huggingface.co https://cdn-lfs.hf.co https://cdn-lfs-us-1.hf.co https://cdn-lfs-us-1.huggingface.co;
script-src 'self' 'wasm-unsafe-eval';
style-src 'self' 'unsafe-inline';
worker-src 'self' blob:;
```

After the one-time model download, **zero network calls** are made.

## Development

```bash
git clone https://github.com/vantradesign/vantra-ask-design-system.git
cd vantra-ask-design-system
pnpm install
pnpm run dev          # watch mode
pnpm run demo         # demo app
pnpm run verify       # lint + typecheck + test + build
```

## License

[Apache-2.0](./LICENSE) © Vantra Design

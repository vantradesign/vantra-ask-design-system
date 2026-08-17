import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'voice-input': 'src/voice-input.ts',
    'voice-output': 'src/voice-output.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  target: 'es2022',
  platform: 'browser',
  outExtension({ format }) {
    return { js: format === 'cjs' ? '.cjs' : '.js' }
  },
  external: [
    '@mlc-ai/web-llm',
    '@huggingface/transformers',
    '@vantra-design/local-inference',
    'kokoro-js',
  ],
})

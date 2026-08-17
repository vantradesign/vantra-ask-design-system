import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [
    vue(),
    dts({ rollupTypes: true, tsconfigPath: './tsconfig.json' }),
  ],
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format === 'cjs' ? 'cjs' : 'js'}`,
    },
    sourcemap: true,
    target: 'es2022',
    rollupOptions: {
      external: [
        'vue',
        '@vantra-design/ask-design-system',
        '@vantra-design/ask-design-system/voice-input',
        '@vantra-design/ask-design-system/voice-output',
      ],
      output: {
        globals: {
          vue: 'Vue',
        },
      },
    },
  },
})

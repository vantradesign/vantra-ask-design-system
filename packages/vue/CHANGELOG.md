# @vantra-design/ask-design-system-vue

## 0.2.0

### Minor Changes

- 22d5413: Initial release of the Vue 3 component package.

  - Composables: `useAssistant`, `useVoiceInput`, `useVoiceOutput` — reactive wrappers around core classes
  - Components: `ChatMessage`, `ChatInput`, `ModelLoader`, `SuggestedQuestions`, `ErrorBanner`
  - Main component: `<AskDesignSystem>` assembling all sub-components into a complete chat UI
  - CSS custom properties for full theme customisation
  - Accessible: keyboard navigation, aria-live regions, reduced-motion support
  - Built with Vite library mode (ESM + CJS + .d.ts + extracted CSS)

### Patch Changes

- Updated dependencies [22d5413]
  - @vantra-design/ask-design-system@1.0.0

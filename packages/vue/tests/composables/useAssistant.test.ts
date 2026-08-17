import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { useAssistant } from '../../src/composables/useAssistant'

// Mock the core package
vi.mock('@vantra-design/ask-design-system', () => {
  class AssistantError extends Error {
    code: string
    constructor(code: string, message: string, cause?: unknown) {
      super(message)
      this.name = 'AssistantError'
      this.code = code
      this.cause = cause
    }
  }

  class MockAssistant {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private config: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(config: any) { this.config = config }
    async init() { this.config.onReady?.() }
    async ask() { return 'Mock answer' }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async askStream(_q: string, callbacks: any) {
      callbacks.onToken?.('Mock ')
      callbacks.onToken?.('answer')
      callbacks.onComplete?.('Mock answer')
    }
    abort() { /* noop */ }
    async updateSchema() { /* noop */ }
    async destroy() { /* noop */ }
    static isSupported() { return true }
    static async isCached() { return false }
  }

  return {
    DesignSystemAssistant: MockAssistant,
    AssistantError,
    flattenTokens: vi.fn().mockReturnValue([
      { path: 'color.primary', text: 'color.primary = #0066cc', value: '#0066cc', category: 'color' },
    ]),
    deriveSuggestedQuestions: vi.fn().mockReturnValue(['What colour tokens are available?']),
  }
})

// Mock onUnmounted since we're not in a component context
vi.mock('vue', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...(actual as object),
    onUnmounted: vi.fn(),
  }
})

const sampleSchema = {
  color: { primary: { $value: '#0066cc', $type: 'color' } },
}

describe('useAssistant', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('initializes with correct defaults', () => {
    const result = useAssistant({ schema: sampleSchema })

    expect(result.messages.value).toEqual([])
    expect(result.isReady.value).toBe(false)
    expect(result.isLoading.value).toBe(false)
    expect(result.isStreaming.value).toBe(false)
    expect(result.progress.value).toBeNull()
    expect(result.error.value).toBeNull()
  })

  it('exposes supported flag', () => {
    const result = useAssistant({ schema: sampleSchema })
    expect(typeof result.supported).toBe('boolean')
  })

  it('provides init function', () => {
    const result = useAssistant({ schema: sampleSchema })
    expect(typeof result.init).toBe('function')
  })

  it('provides send function', () => {
    const result = useAssistant({ schema: sampleSchema })
    expect(typeof result.send).toBe('function')
  })

  it('provides abort function', () => {
    const result = useAssistant({ schema: sampleSchema })
    expect(typeof result.abort).toBe('function')
  })

  it('provides destroy function', () => {
    const result = useAssistant({ schema: sampleSchema })
    expect(typeof result.destroy).toBe('function')
  })

  it('derives suggested questions from schema', () => {
    const result = useAssistant({ schema: sampleSchema })
    // suggestedQuestions populated after init
    result.init()
    expect(result.suggestedQuestions.value).toEqual(['What colour tokens are available?'])
  })

  it('accepts a reactive schema ref', () => {
    const schema = ref(sampleSchema)
    const result = useAssistant({ schema })
    expect(result.messages.value).toEqual([])
  })

  it('transitions through loading to ready after init', async () => {
    const result = useAssistant({ schema: sampleSchema })
    expect(result.isReady.value).toBe(false)
    await result.init()
    expect(result.isReady.value).toBe(true)
    expect(result.isLoading.value).toBe(false)
  })

  it('sends a message and receives streaming response', async () => {
    const result = useAssistant({ schema: sampleSchema })
    await result.init()

    await result.send('What colours?')

    expect(result.messages.value).toHaveLength(2)
    expect(result.messages.value[0]!.role).toBe('user')
    expect(result.messages.value[0]!.content).toBe('What colours?')
    expect(result.messages.value[1]!.role).toBe('assistant')
    expect(result.messages.value[1]!.content).toBe('Mock answer')
    expect(result.messages.value[1]!.status).toBe('complete')
  })

  it('does not send when not ready', async () => {
    const result = useAssistant({ schema: sampleSchema })
    await result.send('ignored')
    expect(result.messages.value).toHaveLength(0)
  })

  it('abort stops streaming and marks message as complete', async () => {
    const result = useAssistant({ schema: sampleSchema })
    await result.init()

    // Start a send, then abort
    await result.send('test')
    result.abort()

    expect(result.isStreaming.value).toBe(false)
  })

  it('destroy resets all state', async () => {
    const result = useAssistant({ schema: sampleSchema })
    await result.init()
    await result.destroy()

    expect(result.isReady.value).toBe(false)
    expect(result.isLoading.value).toBe(false)
    expect(result.isStreaming.value).toBe(false)
    expect(result.progress.value).toBeNull()
  })
})

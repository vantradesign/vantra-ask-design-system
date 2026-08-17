import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { DesignSystemAssistant } from '../src/assistant.js'
import { AssistantError } from '../src/types.js'

const mockInit = vi.fn().mockResolvedValue(undefined)
const mockAbort = vi.fn()
const mockUnload = vi.fn().mockResolvedValue(undefined)
const mockDestroy = vi.fn().mockResolvedValue(undefined)
const mockGenerate = vi.fn()
const mockIsCached = vi.fn().mockResolvedValue(false)

vi.mock('@vantra-design/local-inference', () => ({
  LocalLLMEngine: vi.fn().mockImplementation(function () {
    return {
      init: mockInit,
      generate: mockGenerate,
      abort: mockAbort,
      unload: mockUnload,
      destroy: mockDestroy,
    }
  }),
}))

// Mock the embedding pipeline to avoid loading the real model
vi.mock('@huggingface/transformers', () => ({
  pipeline: vi.fn().mockResolvedValue(
    vi.fn().mockResolvedValue([
      { data: new Float32Array(384).fill(0.1) },
    ]),
  ),
}))

// Access the mocked LocalLLMEngine constructor
const getLocalLLMEngine = async () => {
  const mod = await import('@vantra-design/local-inference')
  return mod.LocalLLMEngine
}

const sampleSchema = {
  color: {
    primary: { $value: '#0066cc', $type: 'color' },
    secondary: { $value: '#6b7280', $type: 'color' },
  },
  spacing: {
    sm: { $value: '8px', $type: 'dimension' },
  },
}

describe('DesignSystemAssistant', () => {
  beforeEach(() => {
    mockInit.mockReset().mockResolvedValue(undefined)
    mockGenerate.mockReset()
    mockAbort.mockReset()
    mockDestroy.mockReset().mockResolvedValue(undefined)
    mockIsCached.mockReset().mockResolvedValue(false)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('constructor', () => {
    it('creates an assistant with a schema', () => {
      const assistant = new DesignSystemAssistant({ schema: sampleSchema })
      expect(assistant).toBeInstanceOf(DesignSystemAssistant)
    })
  })

  describe('isSupported', () => {
    const originalNavigator = globalThis.navigator

    afterEach(() => {
      Object.defineProperty(globalThis, 'navigator', {
        value: originalNavigator,
        writable: true,
        configurable: true,
      })
    })

    it('returns true when WebGPU is available', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { gpu: {} },
        writable: true,
        configurable: true,
      })
      expect(DesignSystemAssistant.isSupported()).toBe(true)
    })

    it('returns false when WebGPU is unavailable', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {},
        writable: true,
        configurable: true,
      })
      expect(DesignSystemAssistant.isSupported()).toBe(false)
    })
  })

  describe('init', () => {
    it('initializes successfully without loading LLM', async () => {
      const onReady = vi.fn()
      const assistant = new DesignSystemAssistant({
        schema: sampleSchema,
        onReady,
      })

      await assistant.init()

      // LLM is NOT loaded at init — it is lazy-loaded
      expect(mockInit).not.toHaveBeenCalled()
      expect(onReady).toHaveBeenCalledOnce()
    })

    it('does not reinitialize when already initialized', async () => {
      const onReady = vi.fn()
      const assistant = new DesignSystemAssistant({ schema: sampleSchema, onReady })

      await assistant.init()
      await assistant.init()

      expect(onReady).toHaveBeenCalledOnce()
    })

    it('lazy-loads engine and calls onError when engine init fails', async () => {
      mockInit.mockRejectedValue(new Error('GPU not available'))
      const onError = vi.fn()
      const assistant = new DesignSystemAssistant({
        schema: sampleSchema,
        onError,
      })

      await assistant.init()

      // Engine failure happens on first query that needs LLM
      async function* fakeGenerate() { yield 'x' }
      mockGenerate.mockReturnValue(fakeGenerate())
      await expect(assistant.ask('xyznonexistent')).rejects.toThrow()
      expect(onError).toHaveBeenCalled()
    })

    it('passes model config to engine on lazy load', async () => {
      async function* fakeGenerate() { yield 'ok' }
      mockGenerate.mockReturnValue(fakeGenerate())

      const assistant = new DesignSystemAssistant({
        schema: sampleSchema,
        model: 'custom-model',
      })

      await assistant.init()
      // Trigger LLM path with a query that won't keyword-match
      await assistant.ask('xyznonexistent')

      const Engine = await getLocalLLMEngine()
      expect(Engine).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'custom-model' }),
      )
    })
  })

  describe('ask', () => {
    it('throws when not initialized', async () => {
      const assistant = new DesignSystemAssistant({ schema: sampleSchema })

      await expect(assistant.ask('test')).rejects.toThrow(AssistantError)
    })

    it('returns concatenated tokens via LLM when no search match', async () => {
      async function* fakeGenerate() {
        yield 'Hello'
        yield ' world'
      }
      mockGenerate.mockReturnValue(fakeGenerate())

      const assistant = new DesignSystemAssistant({ schema: sampleSchema })
      await assistant.init()

      const answer = await assistant.ask('xyznonexistent')
      expect(answer).toBe('Hello world')
    })

    it('returns direct formatted answer when keywords match', async () => {
      const assistant = new DesignSystemAssistant({ schema: sampleSchema })
      await assistant.init()

      const answer = await assistant.ask('What colors are available?')
      expect(answer).toContain('color.primary')
      expect(answer).toContain('#0066cc')
      expect(mockGenerate).not.toHaveBeenCalled()
    })

    it('passes system prompt to engine on LLM fallback', async () => {
      async function* fakeGenerate() {
        yield 'ok'
      }
      mockGenerate.mockReturnValue(fakeGenerate())

      const assistant = new DesignSystemAssistant({ schema: sampleSchema })
      await assistant.init()

      await assistant.ask('xyznonexistent')

      expect(mockGenerate).toHaveBeenCalledWith(
        'xyznonexistent',
        expect.stringContaining('CONTEXT'),
        expect.anything(),
      )
    })
  })

  describe('askStream', () => {
    it('throws when not initialized', async () => {
      const assistant = new DesignSystemAssistant({ schema: sampleSchema })

      await expect(
        assistant.askStream('test', {}),
      ).rejects.toThrow(AssistantError)
    })

    it('calls onToken for each token via LLM fallback', async () => {
      async function* fakeGenerate() {
        yield 'Hello'
        yield ' world'
      }
      mockGenerate.mockReturnValue(fakeGenerate())

      const assistant = new DesignSystemAssistant({ schema: sampleSchema })
      await assistant.init()

      const onToken = vi.fn()
      const onComplete = vi.fn()
      await assistant.askStream('xyznonexistent', { onToken, onComplete })

      expect(onToken).toHaveBeenCalledTimes(2)
      expect(onToken).toHaveBeenCalledWith('Hello')
      expect(onToken).toHaveBeenCalledWith(' world')
      expect(onComplete).toHaveBeenCalledWith('Hello world')
    })

    it('returns direct answer instantly when keywords match', async () => {
      const assistant = new DesignSystemAssistant({ schema: sampleSchema })
      await assistant.init()

      const onToken = vi.fn()
      const onComplete = vi.fn()
      await assistant.askStream('What spacing values exist?', { onToken, onComplete })

      expect(onToken).toHaveBeenCalledOnce()
      expect(onComplete).toHaveBeenCalledOnce()
      expect(onComplete.mock.calls[0]![0]).toContain('spacing.sm')
      expect(mockGenerate).not.toHaveBeenCalled()
    })

    it('calls onError when generation fails', async () => {
      async function* failingGenerate() {
        yield 'ok'
        throw new Error('stream broke')
      }
      mockGenerate.mockReturnValue(failingGenerate())

      const assistant = new DesignSystemAssistant({ schema: sampleSchema })
      await assistant.init()

      const onError = vi.fn()
      await expect(
        assistant.askStream('xyznonexistent', { onError }),
      ).rejects.toThrow()
      expect(onError).toHaveBeenCalledOnce()
    })
  })

  describe('abort', () => {
    it('does not throw when not initialized', () => {
      const assistant = new DesignSystemAssistant({ schema: sampleSchema })
      expect(() => assistant.abort()).not.toThrow()
    })

    it('calls engine abort after engine is loaded', async () => {
      async function* fakeGenerate() { yield 'ok' }
      mockGenerate.mockReturnValue(fakeGenerate())

      const assistant = new DesignSystemAssistant({ schema: sampleSchema })
      await assistant.init()
      // Trigger lazy engine load
      await assistant.ask('xyznonexistent')
      assistant.abort()

      expect(mockAbort).toHaveBeenCalledOnce()
    })
  })

  describe('updateSchema', () => {
    it('re-flattens tokens with new schema', async () => {
      const assistant = new DesignSystemAssistant({ schema: sampleSchema })
      await assistant.init()

      const newSchema = {
        color: {
          brand: { $value: '#ff0000', $type: 'color' },
        },
      }

      await assistant.updateSchema(newSchema)

      // Verify by asking — the direct answer should contain the new token
      const answer = await assistant.ask('What brand colors exist?')
      expect(answer).toContain('#ff0000')
    })
  })

  describe('destroy', () => {
    it('does not throw when not initialized', async () => {
      const assistant = new DesignSystemAssistant({ schema: sampleSchema })
      await expect(assistant.destroy()).resolves.toBeUndefined()
    })

    it('destroys engine when it has been loaded', async () => {
      async function* fakeGenerate() { yield 'ok' }
      mockGenerate.mockReturnValue(fakeGenerate())

      const assistant = new DesignSystemAssistant({ schema: sampleSchema })
      await assistant.init()
      // Trigger lazy engine load
      await assistant.ask('xyznonexistent')
      await assistant.destroy()

      expect(mockDestroy).toHaveBeenCalledOnce()
    })

    it('resets state after destroy', async () => {
      const assistant = new DesignSystemAssistant({ schema: sampleSchema })
      await assistant.init()
      await assistant.destroy()

      await expect(assistant.ask('test')).rejects.toThrow(AssistantError)
    })
  })
})

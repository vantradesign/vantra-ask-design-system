import { describe, it, expect, vi, afterEach } from 'vitest'
import { VoiceInput } from '../src/voice-input.js'
import { VoiceInputError } from '../src/types.js'

describe('VoiceInput', () => {
  const originalWindow = globalThis.window

  afterEach(() => {
    Object.defineProperty(globalThis, 'window', {
      value: originalWindow,
      writable: true,
      configurable: true,
    })
    vi.restoreAllMocks()
  })

  describe('isSupported', () => {
    it('returns false when window is undefined', () => {
      Object.defineProperty(globalThis, 'window', {
        value: undefined,
        writable: true,
        configurable: true,
      })
      expect(VoiceInput.isSupported()).toBe(false)
    })

    it('returns false when SpeechRecognition is missing', () => {
      Object.defineProperty(globalThis, 'window', {
        value: {},
        writable: true,
        configurable: true,
      })
      expect(VoiceInput.isSupported()).toBe(false)
    })

    it('returns true when SpeechRecognition exists', () => {
      Object.defineProperty(globalThis, 'window', {
        value: { SpeechRecognition: vi.fn() },
        writable: true,
        configurable: true,
      })
      expect(VoiceInput.isSupported()).toBe(true)
    })

    it('returns true when webkitSpeechRecognition exists', () => {
      Object.defineProperty(globalThis, 'window', {
        value: { webkitSpeechRecognition: vi.fn() },
        writable: true,
        configurable: true,
      })
      expect(VoiceInput.isSupported()).toBe(true)
    })
  })

  describe('constructor', () => {
    it('creates with default config', () => {
      const vi2 = new VoiceInput()
      expect(vi2).toBeInstanceOf(VoiceInput)
      expect(vi2.isListening).toBe(false)
    })
  })

  describe('start', () => {
    it('calls onError when not supported', () => {
      Object.defineProperty(globalThis, 'window', {
        value: {},
        writable: true,
        configurable: true,
      })

      const onError = vi.fn()
      const input = new VoiceInput({ onError })
      input.start()

      expect(onError).toHaveBeenCalledOnce()
      expect(onError.mock.calls[0]?.[0]).toBeInstanceOf(VoiceInputError)
    })
  })

  describe('stop', () => {
    it('does nothing when not listening', () => {
      const input = new VoiceInput()
      expect(() => input.stop()).not.toThrow()
      expect(input.isListening).toBe(false)
    })
  })
})

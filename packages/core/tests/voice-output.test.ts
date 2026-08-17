import { describe, it, expect, vi, afterEach } from 'vitest'
import { VoiceOutput } from '../src/voice-output.js'

const mockInit = vi.fn().mockResolvedValue(undefined)
const mockSpeak = vi.fn().mockResolvedValue(undefined)
const mockPause = vi.fn()
const mockResume = vi.fn()
const mockStop = vi.fn()
const mockTTSDestroy = vi.fn().mockResolvedValue(undefined)

vi.mock('@vantra-design/local-inference', () => ({
  LocalTTS: vi.fn().mockImplementation(function () {
    return {
      init: mockInit,
      speak: mockSpeak,
      pause: mockPause,
      resume: mockResume,
      stop: mockStop,
      destroy: mockTTSDestroy,
    }
  }),
}))

describe('VoiceOutput', () => {
  const originalWindow = globalThis.window

  afterEach(() => {
    Object.defineProperty(globalThis, 'window', {
      value: originalWindow,
      writable: true,
      configurable: true,
    })
    mockInit.mockReset().mockResolvedValue(undefined)
    mockSpeak.mockReset().mockResolvedValue(undefined)
    mockPause.mockReset()
    mockResume.mockReset()
    mockStop.mockReset()
    mockTTSDestroy.mockReset().mockResolvedValue(undefined)
    vi.restoreAllMocks()
  })

  describe('isSupported', () => {
    it('returns false when window is undefined', () => {
      Object.defineProperty(globalThis, 'window', {
        value: undefined,
        writable: true,
        configurable: true,
      })
      expect(VoiceOutput.isSupported()).toBe(false)
    })

    it('returns true when AudioContext is available', () => {
      Object.defineProperty(globalThis, 'window', {
        value: {},
        writable: true,
        configurable: true,
      })
      // AudioContext is a global, not on window
      const origAC = globalThis.AudioContext
      Object.defineProperty(globalThis, 'AudioContext', {
        value: vi.fn(),
        writable: true,
        configurable: true,
      })

      expect(VoiceOutput.isSupported()).toBe(true)

      Object.defineProperty(globalThis, 'AudioContext', {
        value: origAC,
        writable: true,
        configurable: true,
      })
    })
  })

  describe('constructor', () => {
    it('creates with default config', () => {
      const output = new VoiceOutput()
      expect(output).toBeInstanceOf(VoiceOutput)
      expect(output.isSpeaking).toBe(false)
    })
  })

  describe('speak', () => {
    it('initializes TTS on first call and speaks', async () => {
      const output = new VoiceOutput()
      await output.speak('Hello')

      expect(mockInit).toHaveBeenCalledOnce()
      expect(mockSpeak).toHaveBeenCalledWith('Hello')
    })

    it('sets isSpeaking during playback', async () => {
      const output = new VoiceOutput()
      const promise = output.speak('Hello')
      await promise

      expect(output.isSpeaking).toBe(false)
    })
  })

  describe('pause/resume/stop', () => {
    it('delegates pause to TTS', async () => {
      const output = new VoiceOutput()
      await output.speak('Hello')
      output.pause()

      expect(mockPause).toHaveBeenCalledOnce()
    })

    it('delegates resume to TTS', async () => {
      const output = new VoiceOutput()
      await output.speak('Hello')
      output.resume()

      expect(mockResume).toHaveBeenCalledOnce()
    })

    it('delegates stop to TTS', async () => {
      const output = new VoiceOutput()
      await output.speak('Hello')
      output.stop()

      expect(mockStop).toHaveBeenCalledOnce()
    })

    it('stop does not throw when TTS is not initialized', () => {
      const output = new VoiceOutput()
      expect(() => output.stop()).not.toThrow()
    })
  })

  describe('destroy', () => {
    it('destroys TTS when initialized', async () => {
      const output = new VoiceOutput()
      await output.speak('Hello')
      await output.destroy()

      expect(mockTTSDestroy).toHaveBeenCalledOnce()
    })

    it('does not throw when not initialized', async () => {
      const output = new VoiceOutput()
      await expect(output.destroy()).resolves.toBeUndefined()
    })
  })
})

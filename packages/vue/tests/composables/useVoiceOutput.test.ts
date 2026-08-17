import { describe, it, expect, vi } from 'vitest'
import { useVoiceOutput } from '../../src/composables/useVoiceOutput'

vi.mock('@vantra-design/ask-design-system/voice-output', () => ({
  VoiceOutput: Object.assign(vi.fn().mockImplementation(() => ({
    speak: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    resume: vi.fn(),
    stop: vi.fn(),
    destroy: vi.fn().mockResolvedValue(undefined),
    isSpeaking: false,
  })), { isSupported: vi.fn().mockReturnValue(false) }),
}))

vi.mock('@vantra-design/ask-design-system', () => ({}))

vi.mock('vue', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...(actual as object), onUnmounted: vi.fn() }
})

describe('useVoiceOutput', () => {
  it('initializes with correct defaults', () => {
    const result = useVoiceOutput()

    expect(result.isSpeaking.value).toBe(false)
    expect(result.isLoadingModel.value).toBe(false)
    expect(result.progress.value).toBeNull()
    expect(result.enabled.value).toBe(false)
    expect(result.error.value).toBeNull()
  })

  it('exposes supported flag', () => {
    const result = useVoiceOutput()
    expect(typeof result.supported).toBe('boolean')
  })

  it('provides speak, pause, resume, stop, toggle, destroy functions', () => {
    const result = useVoiceOutput()
    expect(typeof result.speak).toBe('function')
    expect(typeof result.pause).toBe('function')
    expect(typeof result.resume).toBe('function')
    expect(typeof result.stop).toBe('function')
    expect(typeof result.toggle).toBe('function')
    expect(typeof result.destroy).toBe('function')
  })

  it('toggle switches enabled state', () => {
    const result = useVoiceOutput()
    expect(result.enabled.value).toBe(false)
    result.toggle()
    expect(result.enabled.value).toBe(true)
    result.toggle()
    expect(result.enabled.value).toBe(false)
  })

  it('accepts voice and rate options', () => {
    const result = useVoiceOutput({ voice: 'bf_emma', rate: 1.5 })
    expect(result.isSpeaking.value).toBe(false)
  })
})

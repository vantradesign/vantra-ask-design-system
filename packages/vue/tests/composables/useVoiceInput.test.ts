import { describe, it, expect, vi } from 'vitest'
import { useVoiceInput } from '../../src/composables/useVoiceInput'

vi.mock('@vantra-design/ask-design-system/voice-input', () => ({
  VoiceInput: Object.assign(vi.fn().mockImplementation(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    isListening: false,
  })), { isSupported: vi.fn().mockReturnValue(false) }),
}))

vi.mock('vue', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...(actual as object), onUnmounted: vi.fn() }
})

describe('useVoiceInput', () => {
  it('initializes with correct defaults', () => {
    const result = useVoiceInput()

    expect(result.isListening.value).toBe(false)
    expect(result.transcript.value).toBe('')
    expect(result.interimTranscript.value).toBe('')
    expect(result.error.value).toBeNull()
  })

  it('exposes supported flag', () => {
    const result = useVoiceInput()
    expect(typeof result.supported).toBe('boolean')
  })

  it('provides start, stop, toggle functions', () => {
    const result = useVoiceInput()
    expect(typeof result.start).toBe('function')
    expect(typeof result.stop).toBe('function')
    expect(typeof result.toggle).toBe('function')
  })

  it('accepts language option', () => {
    const result = useVoiceInput({ language: 'de-DE' })
    expect(result.isListening.value).toBe(false)
  })

  it('accepts onResult callback', () => {
    const onResult = vi.fn()
    const result = useVoiceInput({ onResult })
    expect(result.isListening.value).toBe(false)
  })
})

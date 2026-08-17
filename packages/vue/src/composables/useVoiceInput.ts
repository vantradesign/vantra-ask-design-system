import { ref, onUnmounted } from 'vue'
import { VoiceInput, type VoiceInputConfig } from '@vantra-design/ask-design-system/voice-input'

export interface UseVoiceInputOptions {
  language?: string
  onResult?: (text: string) => void
}

export function useVoiceInput(options?: UseVoiceInputOptions) {
  const isListening = ref(false)
  const transcript = ref('')
  const interimTranscript = ref('')
  const supported = VoiceInput.isSupported()
  const error = ref<string | null>(null)

  let instance: VoiceInput | null = null

  function start(): void {
    if (isListening.value || !supported) return

    error.value = null
    interimTranscript.value = ''

    const config: VoiceInputConfig = {
      language: options?.language ?? 'en-US',
      onInterim: (text) => {
        interimTranscript.value = text
      },
      onResult: (text) => {
        transcript.value = text
        interimTranscript.value = ''
        options?.onResult?.(text)
      },
      onError: (err) => {
        error.value = err.message
        isListening.value = false
      },
    }

    instance = new VoiceInput(config)
    instance.start()
    isListening.value = true
  }

  function stop(): void {
    if (!isListening.value || !instance) return
    instance.stop()
    isListening.value = false
    instance = null
  }

  function toggle(): void {
    if (isListening.value) {
      stop()
    } else {
      start()
    }
  }

  onUnmounted(() => {
    stop()
  })

  return {
    isListening,
    transcript,
    interimTranscript,
    supported,
    error,
    start,
    stop,
    toggle,
  }
}

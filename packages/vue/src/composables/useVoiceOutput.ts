import { ref, onUnmounted } from 'vue'
import { VoiceOutput, type VoiceOutputConfig } from '@vantra-design/ask-design-system/voice-output'
import type { ModelProgress } from '@vantra-design/ask-design-system'

export interface UseVoiceOutputOptions {
  voice?: string
  rate?: number
}

export function useVoiceOutput(options?: UseVoiceOutputOptions) {
  const isSpeaking = ref(false)
  const isLoadingModel = ref(false)
  const progress = ref<ModelProgress | null>(null)
  const supported = VoiceOutput.isSupported()
  const enabled = ref(false)
  const error = ref<string | null>(null)

  let instance: VoiceOutput | null = null

  function getInstance(): VoiceOutput {
    if (!instance) {
      const config: VoiceOutputConfig = {
        voice: options?.voice ?? 'af_heart',
        rate: options?.rate ?? 1.0,
        onModelProgress: (p) => {
          isLoadingModel.value = true
          progress.value = { ...p }
        },
      }
      instance = new VoiceOutput(config)
    }
    return instance
  }

  async function speak(text: string): Promise<void> {
    if (!supported) return

    error.value = null
    isSpeaking.value = true

    try {
      await getInstance().speak(text)
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
    } finally {
      isSpeaking.value = false
      isLoadingModel.value = false
      progress.value = null
    }
  }

  function pause(): void {
    instance?.pause()
  }

  function resume(): void {
    instance?.resume()
  }

  function stop(): void {
    instance?.stop()
    isSpeaking.value = false
  }

  function toggle(): void {
    enabled.value = !enabled.value
    if (!enabled.value) {
      stop()
    }
  }

  async function destroy(): Promise<void> {
    stop()
    if (instance) {
      await instance.destroy()
      instance = null
    }
  }

  onUnmounted(() => {
    destroy()
  })

  return {
    isSpeaking,
    isLoadingModel,
    progress,
    supported,
    enabled,
    error,
    speak,
    pause,
    resume,
    stop,
    toggle,
    destroy,
  }
}

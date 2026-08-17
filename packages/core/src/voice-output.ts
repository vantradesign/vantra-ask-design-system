import type { VoiceOutputConfig, ModelProgress } from './types.js'
import type { LocalTTS } from '@vantra-design/local-inference'

/**
 * Voice output wrapper that delegates to LocalTTS from @vantra-design/local-inference.
 * The TTS model (~82MB) is loaded lazily on first use and cached in the browser.
 */
export class VoiceOutput {
  private readonly voice: string
  private readonly rate: number
  private readonly onModelProgress?: (progress: ModelProgress) => void
  private tts: LocalTTS | null = null
  private _isSpeaking = false

  constructor(config?: VoiceOutputConfig) {
    this.voice = config?.voice ?? 'af_heart'
    this.rate = config?.rate ?? 1.0
    this.onModelProgress = config?.onModelProgress
  }

  /**
   * Check if TTS is supported (requires AudioContext and WASM).
   */
  static isSupported(): boolean {
    if (typeof window === 'undefined') return false
    return typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined'
  }

  /**
   * Speak the given text aloud via Kokoro TTS.
   * Initializes the TTS engine on first call.
   */
  async speak(text: string): Promise<void> {
    if (!this.tts) {
      await this.initTTS()
    }

    this._isSpeaking = true
    try {
      await this.tts!.speak(text)
    } finally {
      this._isSpeaking = false
    }
  }

  /** Pause playback. */
  pause(): void {
    this.tts?.pause()
  }

  /** Resume playback from where it was paused. */
  resume(): void {
    this.tts?.resume()
  }

  /** Stop and discard remaining speech. */
  stop(): void {
    this.tts?.stop()
    this._isSpeaking = false
  }

  /** Whether TTS is currently speaking. */
  get isSpeaking(): boolean {
    return this._isSpeaking
  }

  /** Release TTS resources. */
  async destroy(): Promise<void> {
    this.stop()
    if (this.tts) {
      await this.tts.destroy()
      this.tts = null
    }
  }

  private async initTTS(): Promise<void> {
    const { LocalTTS: TTSEngine } = await import('@vantra-design/local-inference')

    this.tts = new TTSEngine({
      voice: this.voice,
      rate: this.rate,
      onProgress: this.onModelProgress,
    })

    await this.tts.init()
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const webkitAudioContext: any

export type { VoiceOutputConfig } from './types.js'

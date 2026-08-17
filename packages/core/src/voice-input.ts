import type { VoiceInputConfig } from './types.js'
import { VoiceInputError } from './types.js'

// Web Speech API types (not in standard lib.dom.d.ts)
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message?: string
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
}

const DEFAULT_LANGUAGE = 'en-US'

/**
 * Wrapper around the Web Speech API for voice input.
 * Transcribes speech into text, suitable for feeding into the assistant.
 */
export class VoiceInput {
  private readonly language: string
  private readonly onInterim?: (text: string) => void
  private readonly onResult?: (text: string) => void
  private readonly onError?: (error: VoiceInputError) => void
  private recognition: SpeechRecognitionInstance | null = null
  private _isListening = false

  constructor(config?: VoiceInputConfig) {
    this.language = config?.language ?? DEFAULT_LANGUAGE
    this.onInterim = config?.onInterim
    this.onResult = config?.onResult
    this.onError = config?.onError
  }

  /**
   * Check if the Web Speech API is available.
   */
  static isSupported(): boolean {
    if (typeof window === 'undefined') return false
    return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
  }

  /**
   * Start listening for speech input.
   */
  start(): void {
    if (this._isListening) return

    if (!VoiceInput.isSupported()) {
      this.onError?.(
        new VoiceInputError('not-supported', 'Speech recognition is not supported in this browser.'),
      )
      return
    }

    const SpeechRecognition = getSpeechRecognitionConstructor()
    if (!SpeechRecognition) return

    this.recognition = new SpeechRecognition()
    this.recognition.continuous = true
    this.recognition.interimResults = true
    this.recognition.lang = this.language

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = ''
      let finalTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (!result?.[0]) continue

        const transcript = result[0].transcript
        if (result.isFinal) {
          finalTranscript += transcript
        } else {
          interimTranscript += transcript
        }
      }

      if (interimTranscript) {
        this.onInterim?.(interimTranscript)
      }
      if (finalTranscript) {
        this.onResult?.(finalTranscript)
      }
    }

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const code = event.error === 'not-allowed' ? 'permission-denied' : 'recognition-failed'
      this.onError?.(
        new VoiceInputError(code, `Speech recognition error: ${event.error}`),
      )
    }

    this.recognition.onend = () => {
      this._isListening = false
    }

    try {
      this.recognition.start()
      this._isListening = true
    } catch (error) {
      this.onError?.(
        new VoiceInputError(
          'recognition-failed',
          `Failed to start: ${error instanceof Error ? error.message : String(error)}`,
        ),
      )
    }
  }

  /**
   * Stop listening.
   */
  stop(): void {
    if (!this._isListening || !this.recognition) return

    try {
      this.recognition.stop()
    } catch {
      // Already stopped
    }
    this._isListening = false
    this.recognition = null
  }

  /**
   * Whether the recognizer is currently listening.
   */
  get isListening(): boolean {
    return this._isListening
  }
}

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const win = window as any
  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null
}

export type { VoiceInputConfig, VoiceInputError } from './types.js'

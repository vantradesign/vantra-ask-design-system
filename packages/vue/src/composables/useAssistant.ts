import { ref, shallowRef, watch, onUnmounted, type Ref } from 'vue'
import {
  DesignSystemAssistant,
  AssistantError,
  flattenTokens,
  deriveSuggestedQuestions,
  type AssistantConfig,
  type ModelProgress,
} from '@vantra-design/ask-design-system'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  status: 'complete' | 'streaming' | 'error'
}

export interface UseAssistantOptions {
  schema: Ref<Record<string, unknown>> | Record<string, unknown>
  model?: string
  systemPrompt?: string
  topK?: number
  /** localStorage key for persisting chat history. Set to false to disable. */
  storageKey?: string | false
}

const DEFAULT_STORAGE_KEY = 'ads-chat-history'

function loadHistory(key: string): ChatMessage[] {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (m: unknown): m is ChatMessage =>
        typeof m === 'object' && m !== null &&
        'id' in m && 'role' in m && 'content' in m && 'status' in m,
    )
  } catch {
    return []
  }
}

function saveHistory(key: string, msgs: ChatMessage[]): void {
  try {
    const completed = msgs.filter((m) => m.status === 'complete')
    localStorage.setItem(key, JSON.stringify(completed))
  } catch {
    // storage full or unavailable — silently ignore
  }
}

export interface UseAssistantReturn {
  messages: Ref<ChatMessage[]>
  isReady: Ref<boolean>
  isLoading: Ref<boolean>
  isStreaming: Ref<boolean>
  progress: Ref<ModelProgress | null>
  error: Ref<AssistantError | null>
  suggestedQuestions: Ref<string[]>
  supported: boolean
  send: (question: string) => Promise<void>
  abort: () => void
  init: () => Promise<void>
  destroy: () => Promise<void>
  clearHistory: () => void
}

let messageCounter = 0
function nextId(): string {
  return `msg-${++messageCounter}-${Date.now()}`
}

export function useAssistant(options: UseAssistantOptions): UseAssistantReturn {
  const storageKey = options.storageKey !== false
    ? (options.storageKey ?? DEFAULT_STORAGE_KEY)
    : null

  const messages = ref<ChatMessage[]>(storageKey ? loadHistory(storageKey) : [])
  const isReady = ref(false)
  const isLoading = ref(false)
  const isStreaming = ref(false)
  const progress = ref<ModelProgress | null>(null)
  const error = ref<AssistantError | null>(null)
  const suggestedQuestions = ref<string[]>([])
  const supported = DesignSystemAssistant.isSupported()

  const assistant = shallowRef<DesignSystemAssistant | null>(null)

  function deriveQuestions(schema: Record<string, unknown>): void {
    const chunks = flattenTokens(schema)
    const categories = chunks.map((c) => c.category)
    suggestedQuestions.value = deriveSuggestedQuestions(categories)
  }

  function resolveSchema(): Record<string, unknown> {
    const s = options.schema
    return 'value' in s && typeof (s as Ref).value === 'object'
      ? (s as Ref<Record<string, unknown>>).value
      : (s as Record<string, unknown>)
  }

  async function init(): Promise<void> {
    if (isLoading.value || isReady.value) return

    if (!supported) {
      error.value = new AssistantError(
        'webgpu-unavailable',
        'WebGPU is not available in this browser.',
      )
      return
    }

    isLoading.value = true
    error.value = null

    const schema = resolveSchema()
    deriveQuestions(schema)

    const config: AssistantConfig = {
      schema,
      model: options.model,
      systemPrompt: options.systemPrompt,
      topK: options.topK,
      onModelProgress: (p) => {
        progress.value = { ...p }
      },
      onReady: () => {
        isReady.value = true
        isLoading.value = false
        progress.value = null
      },
      onError: (err) => {
        error.value = err
      },
    }

    try {
      assistant.value = new DesignSystemAssistant(config)
      await assistant.value.init()
    } catch (err) {
      isLoading.value = false
      if (!error.value) {
        error.value = err instanceof AssistantError
          ? err
          : new AssistantError('model-load-failed', String(err), err)
      }
    }
  }

  async function send(question: string): Promise<void> {
    if (!assistant.value || !isReady.value || isStreaming.value) return

    const userMsg: ChatMessage = {
      id: nextId(),
      role: 'user',
      content: question,
      status: 'complete',
    }

    const assistantId = nextId()
    let streamedContent = ''

    messages.value = [
      ...messages.value,
      userMsg,
      { id: assistantId, role: 'assistant', content: '', status: 'streaming' },
    ]

    isStreaming.value = true
    error.value = null

    function replaceLastMessage(patch: Partial<ChatMessage>): void {
      const msgs = messages.value
      const last = msgs[msgs.length - 1]!
      messages.value = [
        ...msgs.slice(0, -1),
        { ...last, ...patch },
      ]
    }

    try {
      await assistant.value.askStream(question, {
        onToken: (token) => {
          streamedContent += token
          replaceLastMessage({ content: streamedContent })
        },
        onComplete: (fullText) => {
          replaceLastMessage({ content: fullText, status: 'complete' })
          isStreaming.value = false
          if (storageKey) saveHistory(storageKey, messages.value)
        },
        onError: (err) => {
          replaceLastMessage({ status: 'error' })
          error.value = err
          isStreaming.value = false
        },
      })
    } catch {
      if (isStreaming.value) {
        replaceLastMessage({ status: 'error' })
        isStreaming.value = false
      }
    }
  }

  function abort(): void {
    assistant.value?.abort()
    isStreaming.value = false

    const msgs = messages.value
    const last = msgs[msgs.length - 1]
    if (last && last.status === 'streaming') {
      messages.value = [
        ...msgs.slice(0, -1),
        { ...last, status: 'complete' as const },
      ]
    }
  }

  async function destroy(): Promise<void> {
    if (assistant.value) {
      await assistant.value.destroy()
      assistant.value = null
    }
    isReady.value = false
    isLoading.value = false
    isStreaming.value = false
    progress.value = null
  }

  // Watch for schema changes (if reactive)
  if ('value' in options.schema && typeof (options.schema as Ref).value === 'object') {
    watch(options.schema as Ref<Record<string, unknown>>, async (newSchema) => {
      deriveQuestions(newSchema)
      if (assistant.value && isReady.value) {
        await assistant.value.updateSchema(newSchema)
      }
    })
  }

  function clearHistory(): void {
    messages.value = []
    if (storageKey) {
      try { localStorage.removeItem(storageKey) } catch { /* noop */ }
    }
  }

  onUnmounted(() => {
    destroy()
  })

  return {
    messages,
    isReady,
    isLoading,
    isStreaming,
    progress,
    error,
    suggestedQuestions,
    supported,
    send,
    abort,
    init,
    destroy,
    clearHistory,
  }
}

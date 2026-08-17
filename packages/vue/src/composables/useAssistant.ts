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
}

let messageCounter = 0
function nextId(): string {
  return `msg-${++messageCounter}-${Date.now()}`
}

export function useAssistant(options: UseAssistantOptions): UseAssistantReturn {
  const messages = ref<ChatMessage[]>([])
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
    messages.value = [...messages.value, userMsg]

    const assistantMsg: ChatMessage = {
      id: nextId(),
      role: 'assistant',
      content: '',
      status: 'streaming',
    }
    messages.value = [...messages.value, assistantMsg]

    isStreaming.value = true
    error.value = null

    try {
      await assistant.value.askStream(question, {
        onToken: (token) => {
          assistantMsg.content += token
          messages.value = [...messages.value]
        },
        onComplete: (fullText) => {
          assistantMsg.content = fullText
          assistantMsg.status = 'complete'
          messages.value = [...messages.value]
          isStreaming.value = false
        },
        onError: (err) => {
          assistantMsg.status = 'error'
          messages.value = [...messages.value]
          error.value = err
          isStreaming.value = false
        },
      })
    } catch {
      if (isStreaming.value) {
        assistantMsg.status = 'error'
        messages.value = [...messages.value]
        isStreaming.value = false
      }
    }
  }

  function abort(): void {
    assistant.value?.abort()
    isStreaming.value = false

    const last = messages.value[messages.value.length - 1]
    if (last && last.status === 'streaming') {
      last.status = 'complete'
      messages.value = [...messages.value]
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
  }
}

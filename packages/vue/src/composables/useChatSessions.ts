import { ref, computed, type Ref, type ComputedRef } from 'vue'
import type { ChatMessage } from './useAssistant'

export interface ChatSession {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: number
  updatedAt: number
}

export interface UseChatSessionsReturn {
  sessions: Ref<ChatSession[]>
  activeSessionId: Ref<string | null>
  activeSession: ComputedRef<ChatSession | null>
  createSession: () => string
  switchSession: (id: string) => void
  deleteSession: (id: string) => void
  updateMessages: (messages: ChatMessage[]) => void
  clearAll: () => void
}

const STORAGE_KEY = 'ads-chat-sessions'
const ACTIVE_KEY = 'ads-active-session'

function generateId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function deriveTitle(messages: ChatMessage[]): string {
  const firstUser = messages.find((m) => m.role === 'user')
  if (!firstUser) return 'New chat'
  const text = firstUser.content.trim()
  return text.length > 40 ? `${text.slice(0, 40)}…` : text
}

function loadSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveSessions(sessions: ChatSession[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
  } catch {
    // storage full — silently ignore
  }
}

function loadActiveId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_KEY)
  } catch {
    return null
  }
}

function saveActiveId(id: string | null): void {
  try {
    if (id) {
      localStorage.setItem(ACTIVE_KEY, id)
    } else {
      localStorage.removeItem(ACTIVE_KEY)
    }
  } catch {
    // noop
  }
}

export function useChatSessions(): UseChatSessionsReturn {
  const sessions = ref<ChatSession[]>(loadSessions())
  const activeSessionId = ref<string | null>(loadActiveId())

  // If stored active ID doesn't exist in sessions, reset
  if (activeSessionId.value && !sessions.value.find((s) => s.id === activeSessionId.value)) {
    activeSessionId.value = null
  }

  const activeSession = computed<ChatSession | null>(() => {
    if (!activeSessionId.value) return null
    return sessions.value.find((s) => s.id === activeSessionId.value) ?? null
  })

  function persist(): void {
    saveSessions(sessions.value)
    saveActiveId(activeSessionId.value)
  }

  function createSession(): string {
    const id = generateId()
    const session: ChatSession = {
      id,
      title: 'New chat',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    sessions.value = [session, ...sessions.value]
    activeSessionId.value = id
    persist()
    return id
  }

  function switchSession(id: string): void {
    if (!id) {
      activeSessionId.value = null
      saveActiveId(null)
      return
    }
    const session = sessions.value.find((s) => s.id === id)
    if (session) {
      activeSessionId.value = id
      saveActiveId(id)
    }
  }

  function deleteSession(id: string): void {
    sessions.value = sessions.value.filter((s) => s.id !== id)
    if (activeSessionId.value === id) {
      activeSessionId.value = sessions.value[0]?.id ?? null
    }
    persist()
  }

  function updateMessages(messages: ChatMessage[]): void {
    if (!activeSessionId.value) return
    const session = sessions.value.find((s) => s.id === activeSessionId.value)
    if (!session) return

    const completed = messages.filter((m) => m.status === 'complete')
    session.messages = completed
    session.title = deriveTitle(completed)
    session.updatedAt = Date.now()
    sessions.value = [...sessions.value]
    persist()
  }

  function clearAll(): void {
    sessions.value = []
    activeSessionId.value = null
    persist()
  }

  return {
    sessions,
    activeSessionId,
    activeSession,
    createSession,
    switchSession,
    deleteSession,
    updateMessages,
    clearAll,
  }
}

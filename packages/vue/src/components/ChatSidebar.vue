<script setup lang="ts">
import type { ChatSession } from '../composables/useChatSessions'

defineProps<{
  sessions: ChatSession[]
  activeSessionId: string | null
  open: boolean
}>()

const emit = defineEmits<{
  'new-chat': []
  'select-session': [id: string]
  'delete-session': [id: string]
  'toggle': []
}>()

function formatDate(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const oneDay = 86_400_000

  if (diff < oneDay && d.getDate() === now.getDate()) return 'Today'
  if (diff < 2 * oneDay) return 'Yesterday'
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function groupByDate(sessions: ChatSession[]): { label: string; sessions: ChatSession[] }[] {
  const groups = new Map<string, ChatSession[]>()
  for (const s of sessions) {
    const label = formatDate(s.updatedAt)
    const list = groups.get(label) ?? []
    list.push(s)
    groups.set(label, list)
  }
  return Array.from(groups, ([label, sessions]) => ({ label, sessions }))
}
</script>

<template>
  <aside class="ads-sidebar" :class="{ 'ads-sidebar--open': open }">
    <div class="ads-sidebar__header">
      <!-- Vantra logo -->
      <svg class="ads-sidebar__logo" viewBox="0 0 149.61 39.73" aria-label="Vantra" role="img">
        <path d="M0,12.65h2.08l9.05,24.99,8.79-24.99h1.97l-9.58,27.08h-2.5L0,12.65Z" fill="currentColor"/>
        <path d="M31.44,12.65h2.8l9.73,27.08h-2.12l-2.99-8.29h-12.19l-2.95,8.29h-2.01l9.73-27.08ZM27.27,29.73h10.98l-5.49-15.34-5.49,15.34Z" fill="currentColor"/>
        <path d="M48.42,12.65h2.88l15.15,24.16V12.65h2.01v27.08h-2.5l-15.49-24.73v24.73h-2.04V12.65Z" fill="currentColor"/>
        <path d="M81.26,14.4h-8.41v-1.74h18.9v1.74h-8.41v25.34h-2.08V14.4Z" fill="currentColor"/>
        <path d="M96.12,12.65h7.42c5.26,0,9.2,2.04,9.2,7.27v.15c0,4.51-2.95,6.59-7.01,7.16l8.6,12.5h-2.35l-8.48-12.35h-5.26v12.35h-2.12V12.65ZM103.66,25.68c4.35,0,6.97-1.67,6.97-5.6v-.15c0-4.17-2.76-5.53-6.97-5.53h-5.42v11.29h5.42Z" fill="currentColor"/>
        <path d="M127.51,12.65h2.8l9.73,27.08h-2.12l-2.99-8.29h-12.19l-2.95,8.29h-2.01l9.73-27.08ZM123.35,29.73h10.98l-5.49-15.34-5.49,15.34Z" fill="currentColor"/>
        <polygon points="149.61 8.05 142.52 15.14 142.04 7.57 134.47 7.1 141.57 0 149.14 .47 149.61 8.05" fill="#021f94"/>
      </svg>

      <div class="ads-sidebar__header-actions">
        <!-- New chat (compose icon) -->
        <button
          type="button"
          class="ads-sidebar__icon-btn"
          aria-label="New chat"
          @click="emit('new-chat')"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 20h9" />
            <path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" />
          </svg>
        </button>

        <!-- Sidebar toggle (panel icon) -->
        <button
          type="button"
          class="ads-sidebar__icon-btn"
          aria-label="Close sidebar"
          @click="emit('toggle')"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="9" x2="9" y1="3" y2="21" />
          </svg>
        </button>
      </div>
    </div>

    <nav class="ads-sidebar__sessions" aria-label="Chat history">
      <div
        v-for="group in groupByDate(sessions)"
        :key="group.label"
        class="ads-sidebar__group"
      >
        <p class="ads-sidebar__group-label">{{ group.label }}</p>
        <button
          v-for="session in group.sessions"
          :key="session.id"
          type="button"
          class="ads-sidebar__session"
          :class="{ 'ads-sidebar__session--active': session.id === activeSessionId }"
          :title="session.title"
          @click="emit('select-session', session.id)"
        >
          <span class="ads-sidebar__session-title">{{ session.title }}</span>
          <button
            type="button"
            class="ads-sidebar__session-delete"
            aria-label="Delete chat"
            @click.stop="emit('delete-session', session.id)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="18" x2="6" y1="6" y2="18" />
              <line x1="6" x2="18" y1="6" y2="18" />
            </svg>
          </button>
        </button>
      </div>

      <p v-if="sessions.length === 0" class="ads-sidebar__empty">
        No conversations yet.
      </p>
    </nav>
  </aside>

  <!-- Mobile overlay -->
  <div
    v-if="open"
    class="ads-sidebar-overlay"
    @click="emit('toggle')"
  />
</template>

<style scoped>
.ads-sidebar {
  display: flex;
  flex-direction: column;
  width: 0;
  min-width: 0;
  background: var(--ads-sidebar-bg, #f5f2f3);
  border-right: none;
  overflow: hidden;
  height: 100%;
  transition: width 200ms ease, min-width 200ms ease, border-right-color 200ms ease;
}

.ads-sidebar--open {
  width: 16rem;
  min-width: 16rem;
  border-right: 1px solid var(--ads-border, rgba(0, 22, 25, 0.12));
  overflow-y: auto;
}

.ads-sidebar__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.875rem 0.75rem;
}

.ads-sidebar__logo {
  height: 1.125rem;
  width: auto;
  color: var(--ads-text, #001619);
}

.ads-sidebar__header-actions {
  display: flex;
  align-items: center;
  gap: 0.125rem;
}

.ads-sidebar__icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: none;
  border-radius: 0.375rem;
  background: none;
  color: var(--ads-text-muted, #4a585a);
  cursor: pointer;
  transition: background 150ms, color 150ms;
}

.ads-sidebar__icon-btn:hover {
  background: rgba(0, 22, 25, 0.06);
  color: var(--ads-text, #001619);
}

.ads-sidebar__sessions {
  flex: 1;
  overflow-y: auto;
  padding: 0 0.75rem 1rem;
}

.ads-sidebar__group {
  margin-bottom: 0.5rem;
}

.ads-sidebar__group-label {
  font-size: 0.6875rem;
  font-weight: 500;
  color: var(--ads-text-faint, #626e70);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  margin: 0.75rem 0 0.375rem 0.5rem;
}

.ads-sidebar__session {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.4375rem 0.5rem;
  border: none;
  border-radius: 0.375rem;
  background: none;
  color: var(--ads-text, #001619);
  font: inherit;
  font-size: 0.8125rem;
  line-height: 1.4;
  cursor: pointer;
  text-align: left;
  transition: background 150ms;
}

.ads-sidebar__session:hover {
  background: rgba(0, 22, 25, 0.04);
}

.ads-sidebar__session--active {
  background: rgba(2, 31, 148, 0.06);
  color: var(--ads-accent, #021f94);
  font-weight: 500;
}

.ads-sidebar__session-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.ads-sidebar__session-delete {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 1.5rem;
  height: 1.5rem;
  border: none;
  border-radius: 0.25rem;
  background: none;
  color: var(--ads-text-faint, #626e70);
  cursor: pointer;
  opacity: 0;
  transition: opacity 150ms, color 150ms, background 150ms;
}

.ads-sidebar__session:hover .ads-sidebar__session-delete {
  opacity: 1;
}

.ads-sidebar__session-delete:hover {
  color: var(--ads-error-color, #8f1d13);
  background: rgba(143, 29, 19, 0.06);
}

.ads-sidebar__empty {
  font-size: 0.8125rem;
  color: var(--ads-text-faint, #626e70);
  text-align: center;
  padding: 2rem 1rem;
  margin: 0;
}

/* Mobile overlay */
.ads-sidebar-overlay {
  display: none;
}

/* Mobile: sidebar overlays as a drawer */
@media (max-width: 48rem) {
  .ads-sidebar {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 10;
    height: 100%;
    width: 0;
    min-width: 0;
    box-shadow: none;
  }

  .ads-sidebar--open {
    width: 16rem;
    min-width: 16rem;
    box-shadow: 4px 0 16px rgba(0, 22, 25, 0.1);
  }

  .ads-sidebar-overlay {
    display: block;
    position: absolute;
    inset: 0;
    z-index: 9;
    background: rgba(0, 22, 25, 0.25);
  }
}
</style>

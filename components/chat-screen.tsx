'use client'

import { Search, MessageSquarePlus, MessageSquare, Settings, FolderOpen } from 'lucide-react'
import ArtifactsList from './artifacts-list'

interface ContentPart {
  type: 'text' | 'image_url'
  text?: string
  image_url?: { url: string }
}

interface Message {
  role: 'user' | 'assistant'
  content: string | ContentPart[]
}

interface ChatSession {
  id: string
  title: string
  messages: Message[]
  timestamp: number
  pinned?: boolean
  favorite?: boolean
  projectName?: string
}

interface ArtifactData {
  type: 'html' | 'react' | 'code'
  language?: string
  title: string
  content: string
}

interface SidebarProps {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  searchQuery: string
  setSearchQuery: (q: string) => void
  sortedSessions: ChatSession[]
  currentSessionId: string
  renamingId: string | null
  setRenamingId: (id: string | null) => void
  renameValue: string
  setRenameValue: (v: string) => void
  contextMenu: { sessionId: string; x: number; y: number } | null
  setContextMenu: (menu: { sessionId: string; x: number; y: number } | null) => void
  displayName: string
  initials: string
  chatSessions: ChatSession[]
  activeMenuItem: string | null
  setActiveMenuItem: (item: string | null) => void
  allArtifacts: ArtifactData[]
  showArtifactsList: boolean
  onNewChat: () => void
  onLoadSession: (session: ChatSession) => void
  onStartRename: (session: ChatSession) => void
  onConfirmRename: () => void
  onPin: (sessionId: string) => void
  onFavorite: (sessionId: string) => void
  onDelete: (sessionId: string) => void
  onLongPressStart: (e: React.TouchEvent | React.MouseEvent, sessionId: string) => void
  onLongPressEnd: () => void
  onOpenSettings: () => void
  onProjectsClick: () => void
  onArtifactsClick: () => void
  onOpenArtifact: (art: ArtifactData) => void
}

export default function Sidebar({
  sidebarOpen, setSidebarOpen, searchQuery, setSearchQuery,
  sortedSessions, currentSessionId, renamingId, setRenamingId,
  renameValue, setRenameValue, contextMenu, setContextMenu,
  displayName, initials, chatSessions,
  activeMenuItem, setActiveMenuItem, allArtifacts, showArtifactsList,
  onNewChat, onLoadSession, onStartRename, onConfirmRename,
  onPin, onFavorite, onDelete,
  onLongPressStart, onLongPressEnd,
  onOpenSettings, onProjectsClick, onArtifactsClick, onOpenArtifact,
}: SidebarProps) {
  return (
    <>
      {/* Sidebar panel with GPU acceleration fix */}
      <div 
        className={`
          fixed left-0 top-0 z-50 flex h-full w-72 flex-col
          border-r border-gray-200 dark:border-white/[0.07]
          bg-white dark:bg-[#141414] shadow-xl
          transition-transform duration-300
          will-change-transform backface-visibility-hidden [transform:translate3d(0,0,0)]
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Scrollable content */}
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-6 pb-2">

          {/* Search */}
          <div className="relative mb-5">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-white/30" />
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.05] py-2.5 pl-9 pr-3 text-sm text-gray-800 dark:text-[#ececec] outline-none focus:border-indigo-300 dark:focus:border-indigo-500/50 placeholder:text-gray-400 dark:placeholder:text-white/28"
            />
          </div>

          {/* New Chat */}
          <button
            onClick={() => { setActiveMenuItem(activeMenuItem === 'newchat' ? null : 'newchat'); onNewChat() }}
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-[15px] font-medium transition-all ${
              activeMenuItem === 'newchat'
                ? 'border-[#4D6BFE]/60 bg-gradient-to-r from-[#EEF2FF] to-[#F0F4FF] dark:bg-none dark:from-[#4D6BFE]/20 dark:to-[#4D6BFE]/15 text-[#4D6BFE] shadow-sm'
                : 'border-gray-200 dark:border-white/[0.07] bg-white dark:bg-transparent text-gray-600 dark:text-[#ececec] hover:border-gray-300 dark:hover:border-white/[0.14] hover:bg-gray-50 dark:hover:bg-white/[0.05]'
            }`}
          >
            <MessageSquarePlus className={`h-5 w-5 ${activeMenuItem === 'newchat' ? 'text-[#4D6BFE]' : 'text-gray-400 dark:text-white/30'}`} />
            New Chat
          </button>

          {/* Projects */}
          <button
            onClick={onProjectsClick}
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-[15px] font-medium transition-all ${
              activeMenuItem === 'projects'
                ? 'border-[#4D6BFE]/60 bg-gradient-to-r from-[#EEF2FF] to-[#F0F4FF] dark:bg-none dark:from-[#4D6BFE]/20 dark:to-[#4D6BFE]/15 text-[#4D6BFE] shadow-sm'
                : 'border-gray-200 dark:border-white/[0.07] bg-white dark:bg-transparent text-gray-600 dark:text-[#ececec] hover:border-gray-300 dark:hover:border-white/[0.14] hover:bg-gray-50 dark:hover:bg-white/[0.05]'
            }`}
          >
            <FolderOpen className={`h-5 w-5 ${activeMenuItem === 'projects' ? 'text-[#4D6BFE]' : 'text-gray-400 dark:text-white/30'}`} />
            Projects
          </button>

          {/* Artifacts */}
          <button
            onClick={onArtifactsClick}
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-[15px] font-medium transition-all ${
              activeMenuItem === 'artifacts'
                ? 'border-[#4D6BFE]/60 bg-gradient-to-r from-[#EEF2FF] to-[#F0F4FF] dark:bg-none dark:from-[#4D6BFE]/20 dark:to-[#4D6BFE]/15 text-[#4D6BFE] shadow-sm'
                : 'border-gray-200 dark:border-white/[0.07] bg-white dark:bg-transparent text-gray-600 dark:text-[#ececec] hover:border-gray-300 dark:hover:border-white/[0.14] hover:bg-gray-50 dark:hover:bg-white/[0.05]'
            }`}
          >
            <svg className={`h-5 w-5 ${activeMenuItem === 'artifacts' ? 'text-[#4D6BFE]' : 'text-gray-400 dark:text-white/30'}`}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
            >
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <circle cx="17.5" cy="17.5" r="3.5" />
            </svg>
            Artifacts
            {allArtifacts.length > 0 && (
              <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                activeMenuItem === 'artifacts' ? 'bg-[#4D6BFE]/20 text-[#4D6BFE]' : 'bg-gray-100 dark:bg-white/[0.08] text-gray-500 dark:text-white/40'
              }`}>
                {allArtifacts.length}
              </span>
            )}
          </button>

          {/* Artifacts dropdown */}
          {showArtifactsList && (
            <ArtifactsList
              artifacts={allArtifacts}
              onOpen={(art) => { onOpenArtifact(art); setSidebarOpen(false) }}
            />
          )}

          {/* Chat history grouping */}
          {(() => {
            const projectSessions = sortedSessions.filter(s => s.projectName)
            const regularSessions = sortedSessions.filter(s => !s.projectName)

            const SessionItem = ({ session }: { session: ChatSession }) => (
              <div key={session.id} className="relative">
                {renamingId === session.id ? (
                  <div className="flex items-center gap-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/20 px-3 py-2">
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') onConfirmRename(); if (e.key === 'Escape') setRenamingId(null) }}
                      onBlur={onConfirmRename}
                      className="flex-1 bg-transparent text-[14px] text-indigo-700 dark:text-indigo-300 outline-none"
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => onLoadSession(session)}
                    onMouseDown={e => onLongPressStart(e, session.id)}
                    onMouseUp={onLongPressEnd}
                    onMouseLeave={onLongPressEnd}
                    onTouchStart={e => onLongPressStart(e, session.id)}
                    onTouchEnd={onLongPressEnd}
                    onContextMenu={e => {
                      e.preventDefault()
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                      setContextMenu({ sessionId: session.id, x: rect.left, y: rect.bottom + 4 })
                    }}
                    className={`flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-left text-[14px] text-gray-600 dark:text-white/60 transition hover:bg-indigo-50 dark:hover:bg-white/[0.05] hover:text-indigo-600 dark:hover:text-white/80 ${session.id === currentSessionId ? 'bg-indigo-50 dark:bg-white/[0.07] text-indigo-600 dark:text-white/80' : ''}`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {session.pinned ? (
                        <svg className="h-4 w-4 text-[#4D6BFE]" viewBox="0 0 24 24" fill="currentColor"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>
                      ) : session.favorite ? (
                        <svg className="h-4 w-4 text-amber-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                      ) : (
                        <MessageSquare className="h-4 w-4 text-gray-400 dark:text-white/28" />
                      )}
                    </div>
                    <span className="line-clamp-2 leading-snug">{session.title}</span>
                  </button>
                )}
              </div>
            )

            return (
              <>
                {projectSessions.length > 0 && (
                  <>
                    <span className="ml-1 mt-4 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-white/28">Projects</span>
                    {Object.entries(
                      projectSessions.reduce((acc, s) => {
                        const key = s.projectName!
                        if (!acc[key]) acc[key] = []
                        acc[key].push(s)
                        return acc
                      }, {} as Record<string, ChatSession[]>)
                    ).map(([projectName, sessions]) => (
                      <div key={projectName} className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5 px-2 py-1">
                          <FolderOpen className="h-3.5 w-3.5 text-[#4D6BFE]" />
                          <span className="text-[12px] font-semibold text-[#4D6BFE] truncate">{projectName}</span>
                        </div>
                        {sessions.map(s => <SessionItem key={s.id} session={s} />)}
                      </div>
                    ))}
                  </>
                )}
                {regularSessions.length > 0 && (
                  <>
                    <span className="ml-1 mt-4 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-white/28">Recent Chats</span>
                    <div className="flex flex-col gap-1">
                      {regularSessions.map(s => <SessionItem key={s.id} session={s} />)}
                    </div>
                  </>
                )}
                {sortedSessions.length === 0 && (
                  <p className="px-2 py-3 text-[13px] italic text-gray-400 dark:text-white/28">
                    {searchQuery ? 'No matching chats' : 'No recent chats yet'}
                  </p>
                )}
              </>
            )
          })()}
        </div>

        {/* Context Menu */}
        {contextMenu && (
          <>
            <div className="fixed inset-0 z-[60]" onClick={() => setContextMenu(null)} />
            <div
              className="fixed z-[70] w-44 overflow-hidden rounded-2xl border border-gray-100 dark:border-white/[0.08] bg-white dark:bg-[#212121] shadow-2xl"
              style={{ top: Math.min(contextMenu.y, window.innerHeight - 230), left: Math.min(contextMenu.x, window.innerWidth - 185) }}
            >
              {[
                { label: chatSessions.find(s => s.id === contextMenu.sessionId)?.pinned ? 'Unpin' : 'Pin', action: () => onPin(contextMenu.sessionId) },
                { label: chatSessions.find(s => s.id === contextMenu.sessionId)?.favorite ? 'Unfavorite' : 'Favorite', action: () => onFavorite(contextMenu.sessionId) },
                { label: 'Rename', action: () => { const s = chatSessions.find(x => x.id === contextMenu.sessionId); if (s) onStartRename(s) } },
              ].map((item, i) => (
                <button key={i} onClick={item.action} className="flex w-full items-center gap-3 border-b border-gray-100 dark:border-white/[0.07] px-4 py-3 text-[14px] font-medium text-gray-700 dark:text-[#ececec] transition hover:bg-indigo-50 dark:hover:bg-white/[0.07] hover:text-indigo-600 dark:hover:text-indigo-400">
                  {item.label}
                </button>
              ))}
              <button onClick={() => onDelete(contextMenu.sessionId)} className="flex w-full items-center gap-3 px-4 py-3 text-[14px] font-medium text-rose-500 transition hover:bg-red-50 dark:hover:bg-red-500/10">
                Delete
              </button>
            </div>
          </>
        )}

        {/* Bottom user bar */}
        <div className="flex items-center justify-between border-t border-gray-100 dark:border-white/[0.07] px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-900 dark:bg-white/[0.12] text-[13px] font-bold text-white">
              {initials}
            </div>
            <span className="truncate text-[15px] font-medium text-gray-800 dark:text-[#ececec]">{displayName}</span>
          </div>
          <button
            onClick={onOpenSettings}
            className="ml-3 shrink-0 rounded-xl p-2 text-gray-400 dark:text-white/40 transition hover:bg-gray-100 dark:hover:bg-white/[0.08] hover:text-gray-700 dark:hover:text-white/70"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/20 dark:bg-black/50" onClick={() => setSidebarOpen(false)} />
      )}
    </>
  )
  }
```

---

📄 Updated chat-screen.tsx (Full)

Note: Main sirf relevant changes kar raha hoon – poora file yahan paste kar raha hoon. Copy-paste directly kar sakta hai.

```tsx
'use client'

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import {
  Menu, Plus, Loader2, Code2, ExternalLink, X, FolderOpen,
} from 'lucide-react'
import ArtifactPanel from './artifact-panel'
import ProjectsPanel from './projects-panel'
import SettingsScreen from './settings/settings-screen'
import { profileKey, sessionsKey, loadSettings, loadPersonalization } from './settings/settings-store'
import InputBox from './input-box'
import MessageList from './message-list'
import Sidebar from './sidebar'

interface ContentPart {
  type: 'text' | 'image_url'
  text?: string
  image_url?: { url: string }
}

interface Message {
  role: 'user' | 'assistant'
  content: string | ContentPart[]
}

interface ChatSession {
  id: string
  title: string
  messages: Message[]
  timestamp: number
  pinned?: boolean
  favorite?: boolean
  projectName?: string
}

interface ChatScreenProps {
  user: User | null
  onLogout?: () => void
}

interface ArtifactData {
  type: 'html' | 'react' | 'code'
  language?: string
  title: string
  content: string
}

interface UserProfile {
  fullName: string
  nickname: string
}

export default function ChatScreen({ user, onLogout }: ChatScreenProps) {
  // ── Core state ───────────────────────────────────────────────────────
  const [sidebarOpen, setSidebarOpen]       = useState(false)
  const [inputValue, setInputValue]         = useState('')
  const [activeChips, setActiveChips]       = useState<Set<string>>(new Set())
  const [activeMenuItem, setActiveMenuItem] = useState<string | null>(null)
  const [showAttachMenu, setShowAttachMenu] = useState(false)
  const [isRecording, setIsRecording]       = useState(false)
  const [messages, setMessages]             = useState<Message[]>([])
  const [isLoading, setIsLoading]           = useState(false)
  const [isStreaming, setIsStreaming]        = useState(false)
  const [attachedFiles, setAttachedFiles]   = useState<File[]>([])
  const [isFocused, setIsFocused]           = useState(false)
  const [activeArtifact, setActiveArtifact] = useState<ArtifactData | null>(null)
  const [showArtifactModal, setShowArtifactModal] = useState(false)

  // ── User profile ─────────────────────────────────────────────────────
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)

  // ── Chat history state ───────────────────────────────────────────────
  const [chatSessions, setChatSessions]         = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string>(() => crypto.randomUUID())
  const [sessionsLoaded, setSessionsLoaded]     = useState(false)
  const [searchQuery, setSearchQuery]           = useState('')

  // ── Right panels ─────────────────────────────────────────────────────
  const [showArtifactsList, setShowArtifactsList] = useState(false)
  const [showProjectsPanel, setShowProjectsPanel] = useState(false)
  const [showSettings, setShowSettings]           = useState(false)
  const [allArtifacts, setAllArtifacts]           = useState<ArtifactData[]>([])
  const [activeProjectName, setActiveProjectName] = useState<string | null>(null)
  const [activeProject, setActiveProject] = useState<{ name: string; knowledge: string; customInstructions: string } | null>(null)

  // ── Context menu state ───────────────────────────────────────────────
  const [contextMenu, setContextMenu] = useState<{ sessionId: string; x: number; y: number } | null>(null)
  const [renamingId, setRenamingId]   = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  // ── Refs ─────────────────────────────────────────────────────────────
  const textareaRef    = useRef<HTMLTextAreaElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const photoInputRef  = useRef<HTMLInputElement>(null)
  const fileInputRef   = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef   = useRef<SpeechRecognition | null>(null)
  const longPressTimer   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const memoryCallCount  = useRef(0)

  const supabase = createClient()

  // ── App settings ─────────────────────────────────────────────────────
  const [appSettings, setAppSettings] = useState(() => loadSettings())

  const SESSIONS_KEY = sessionsKey(user?.id)
  const PROFILE_KEY  = profileKey(user?.id)

  // ── Load user profile ────────────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem(PROFILE_KEY)
    if (stored) {
      try { setUserProfile(JSON.parse(stored)) } catch { /* ignore */ }
    }
  }, [PROFILE_KEY])

  // ── Apply font size on mount ──────────────────────────────────────────
  useEffect(() => {
    const s = loadSettings()
    setAppSettings(s)
    document.documentElement.style.setProperty('--chat-font-size', `${s.fontSize}px`)
  }, [])

  // ── Collect all artifacts across sessions ────────────────────────────
  useEffect(() => {
    const found: ArtifactData[] = []
    const seen = new Set<string>()

    const extractFrom = (text: string) => {
      const re = /<artifact\s+type="([^"]+)"(?:\s+language="([^"]+)")?(?:\s+title="([^"]+)")?[^>]*>([\s\S]*?)<\/artifact>/g
      let m
      while ((m = re.exec(text)) !== null) {
        const title = m[3] || 'Artifact'
        if (!seen.has(title + m[1])) {
          seen.add(title + m[1])
          found.push({ type: m[1] as 'html' | 'react' | 'code', language: m[2], title, content: m[4].trim() })
        }
      }
    }

    for (const msg of messages) {
      if (msg.role === 'assistant' && typeof msg.content === 'string') extractFrom(msg.content)
    }
    for (const session of chatSessions) {
      for (const msg of session.messages) {
        if (msg.role === 'assistant' && typeof msg.content === 'string') extractFrom(msg.content)
      }
    }

    setAllArtifacts(found)
  }, [messages, chatSessions])

  // ── Load sessions — STRICT separation ────────────────────────────────
  useEffect(() => {
    const loadSessions = async () => {
      if (user) {
        try {
          const res = await fetch('/api/chat/sessions')
          const { sessions } = await res.json()
          if (sessions?.length) {
            const mapped: ChatSession[] = sessions.map((s: {
              id: string; title: string; messages: Message[];
              pinned: boolean; favorite: boolean; updated_at: string
            }) => ({
              id:        s.id,
              title:     s.title,
              messages:  s.messages,
              pinned:    s.pinned,
              favorite:  s.favorite,
              timestamp: new Date(s.updated_at).getTime(),
            }))
            setChatSessions(mapped)
          }
        } catch { /* ignore */ }
      } else {
        const stored = localStorage.getItem(SESSIONS_KEY)
        if (stored) { try { setChatSessions(JSON.parse(stored)) } catch { /* ignore */ } }
      }
      setSessionsLoaded(true)
    }
    loadSessions()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!isLoading && messages.length >= 2 && sessionsLoaded) {
      saveSession(messages, currentSessionId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading])

  // ── Session helpers — STRICT separation ──────────────────────────────
  const saveSession = useCallback(async (msgs: Message[], sessionId: string) => {
    const firstUser  = msgs.find(m => m.role === 'user')
    const rawContent = firstUser?.content
    const rawTitle   =
      typeof rawContent === 'string'
        ? rawContent
        : Array.isArray(rawContent)
          ? (rawContent.find(p => p.type === 'text')?.text || 'Chat')
          : 'Chat'
    const title = rawTitle.slice(0, 45) + (rawTitle.length > 45 ? '...' : '')
    const session: ChatSession = { id: sessionId, title, messages: msgs, timestamp: Date.now(), projectName: activeProject?.name }

    if (user) {
      setChatSessions(prev => {
        const existing = prev.find(s => s.id === sessionId)
        const merged   = { ...session, pinned: existing?.pinned, favorite: existing?.favorite }
        const filtered = prev.filter(s => s.id !== sessionId)
        return [merged, ...filtered].slice(0, 50)
      })
      try {
        const existing = chatSessions.find(s => s.id === sessionId)
        await fetch('/api/chat/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: sessionId, title, messages: msgs,
            pinned: existing?.pinned ?? false, favorite: existing?.favorite ?? false,
          }),
        })
      } catch { /* ignore */ }
    } else {
      setChatSessions(prev => {
        const existing = prev.find(s => s.id === sessionId)
        const merged   = { ...session, pinned: existing?.pinned, favorite: existing?.favorite }
        const filtered = prev.filter(s => s.id !== sessionId)
        const updated  = [merged, ...filtered].slice(0, 50)
        localStorage.setItem(SESSIONS_KEY, JSON.stringify(updated))
        return updated
      })
    }
  }, [user, chatSessions, activeProject?.name, SESSIONS_KEY])

  const updateSessions = useCallback((updater: (sessions: ChatSession[]) => ChatSession[]) => {
    setChatSessions(prev => {
      const updated = updater(prev)
      if (!user) {
        localStorage.setItem(SESSIONS_KEY, JSON.stringify(updated))
      }
      return updated
    })
  }, [user, SESSIONS_KEY])

  // Memoized sortedSessions to avoid unnecessary re-renders
  const sortedSessions = useMemo(() => [...chatSessions]
    .filter(s => !searchQuery || s.title.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      return b.timestamp - a.timestamp
    }), [chatSessions, searchQuery])

  const loadSession = useCallback((session: ChatSession) => {
    setMessages(session.messages)
    setCurrentSessionId(session.id)
    setSidebarOpen(false)
    setInputValue('')
    setAttachedFiles([])
    setActiveArtifact(null)
    setShowArtifactModal(false)
    setShowArtifactsList(false)
    setShowProjectsPanel(false)
    // Reset project context when loading a session
    if (session.projectName) {
      setActiveProjectName(session.projectName)
      // Note: You may need to fetch project details from your projects store
      // For now, we keep existing activeProject or null
    } else {
      setActiveProjectName(null)
      setActiveProject(null)
    }
  }, [])

  const newChat = useCallback(() => {
    if (messages.length >= 2) saveSession(messages, currentSessionId)
    setMessages([])
    setInputValue('')
    setAttachedFiles([])
    setActiveChips(new Set())
    setSidebarOpen(false)
    setShowAttachMenu(false)
    setIsFocused(false)
    setActiveArtifact(null)
    setShowArtifactModal(false)
    setShowArtifactsList(false)
    setShowProjectsPanel(false)
    setCurrentSessionId(crypto.randomUUID())
    setActiveProjectName(null)
    setActiveProject(null)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }, [messages, currentSessionId, saveSession])

  const handleClearChats = useCallback(async () => {
    setChatSessions([])
    setMessages([])
    if (user) {
      try {
        const supabaseClient = createClient()
        const { data: { user: authUser } } = await supabaseClient.auth.getUser()
        if (authUser) {
          await supabaseClient.from('chat_sessions').delete().eq('user_id', authUser.id)
        }
      } catch { /* ignore */ }
    } else {
      localStorage.removeItem(SESSIONS_KEY)
    }
  }, [user, SESSIONS_KEY])

  // ── Context menu callbacks (memoized) ────────────────────────────────
  const handleLongPressStart = useCallback((e: React.TouchEvent | React.MouseEvent, sessionId: string) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
    longPressTimer.current = setTimeout(() => {
      setContextMenu({ sessionId, x: rect.left, y: rect.bottom + 4 })
    }, 500)
  }, [])

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  const handlePin = useCallback(async (sessionId: string) => {
    const session = chatSessions.find(s => s.id === sessionId)
    const newPinned = !session?.pinned
    updateSessions(prev => prev.map(s => s.id === sessionId ? { ...s, pinned: newPinned } : s))
    setContextMenu(null)
    if (user && session) {
      try { await fetch('/api/chat/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...session, pinned: newPinned }) }) } catch { /* ignore */ }
    }
  }, [user, chatSessions, updateSessions])

  const handleFavorite = useCallback(async (sessionId: string) => {
    const session = chatSessions.find(s => s.id === sessionId)
    const newFav  = !session?.favorite
    updateSessions(prev => prev.map(s => s.id === sessionId ? { ...s, favorite: newFav } : s))
    setContextMenu(null)
    if (user && session) {
      try { await fetch('/api/chat/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...session, favorite: newFav }) }) } catch { /* ignore */ }
    }
  }, [user, chatSessions, updateSessions])

  const handleDelete = useCallback(async (sessionId: string) => {
    updateSessions(prev => prev.filter(s => s.id !== sessionId))
    if (currentSessionId === sessionId) newChat()
    setContextMenu(null)
    if (user) {
      try { await fetch('/api/chat/sessions', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: sessionId }) }) } catch { /* ignore */ }
    }
  }, [user, currentSessionId, updateSessions, newChat])

  const startRename = useCallback((session: ChatSession) => {
    setRenamingId(session.id)
    setRenameValue(session.title)
    setContextMenu(null)
  }, [])

  const confirmRename = useCallback(async () => {
    if (!renamingId) return
    const newTitle = renameValue.trim()
    updateSessions(prev => prev.map(s => s.id === renamingId ? { ...s, title: newTitle || s.title } : s))
    if (user && newTitle) {
      const session = chatSessions.find(s => s.id === renamingId)
      if (session) {
        try { await fetch('/api/chat/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...session, title: newTitle }) }) } catch { /* ignore */ }
      }
    }
    setRenamingId(null)
    setRenameValue('')
  }, [renamingId, renameValue, user, chatSessions, updateSessions])

  // ── Other helpers ────────────────────────────────────────────────────
  const toggleChip = (chip: string) => {
    setActiveChips(prev => { const next = new Set(prev); next.has(chip) ? next.delete(chip) : next.add(chip); return next })
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length) setAttachedFiles(prev => [...prev, ...files])
    e.target.value = ''
  }

  const removeFile = (index: number) => setAttachedFiles(prev => prev.filter((_, i) => i !== index))

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload  = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

  const handleMicClick = () => {
    if (isRecording) { recognitionRef.current?.stop(); setIsRecording(false); return }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognitionAPI) { alert('Speech recognition not supported. Use Chrome or Edge.'); return }
    const recognition = new SpeechRecognitionAPI()
    recognition.lang = loadSettings().voiceLanguage || 'hi-IN'; recognition.continuous = false; recognition.interimResults = true
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = Array.from(event.results).map((r: SpeechRecognitionResult) => r[0].transcript).join('')
      setInputValue(transcript)
      if (textareaRef.current) { textareaRef.current.style.height = 'auto'; textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px' }
    }
    recognition.onend   = () => setIsRecording(false)
    recognition.onerror = (e: SpeechRecognitionErrorEvent) => { setIsRecording(false); if (e.error === 'not-allowed') alert('Microphone permission denied.') }
    recognitionRef.current = recognition; recognition.start(); setIsRecording(true)
  }

  const handleSend = async () => {
    const text = inputValue.trim()
    if ((!text && attachedFiles.length === 0) || isLoading) return

    let userContent: string | ContentPart[]
    if (attachedFiles.length > 0) {
      const parts: ContentPart[] = []
      if (text) parts.push({ type: 'text', text })
      for (const file of attachedFiles) {
        if (file.type.startsWith('image/')) {
          parts.push({ type: 'image_url', image_url: { url: await fileToBase64(file) } })
        } else {
          try { parts.push({ type: 'text', text: `[File: ${file.name}]\n${await file.text()}` }) }
          catch { parts.push({ type: 'text', text: `[Attached file: ${file.name}]` }) }
        }
      }
      userContent = parts
    } else {
      userContent = text
    }

    const userMessage: Message = { role: 'user', content: userContent }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages); setInputValue(''); setAttachedFiles([]); setIsFocused(false)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setIsLoading(true); setIsStreaming(true)
    setMessages([...newMessages, { role: 'assistant', content: '' }])

    try {
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
          messages: newMessages,
          model: loadSettings().defaultModel,
          language: loadSettings().language,
          personalization: loadPersonalization(user?.id),
          think: activeChips.has('think'),
          search: activeChips.has('search'),
          projectContext: activeProject ?? undefined,
        }) })
      if (!res.ok) {
        const err = await res.json()
        setMessages([...newMessages, { role: 'assistant', content: err.error || 'Something went wrong.' }])
        return
      }
      const reader = res.body?.getReader(); const decoder = new TextDecoder(); let assistantText = ''
      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          assistantText += decoder.decode(value, { stream: true })
          setMessages([...newMessages, { role: 'assistant', content: assistantText }])
        }
      }
    } catch {
      setMessages([...newMessages, { role: 'assistant', content: 'Network error. Please check your connection.' }])
    } finally {
      setIsLoading(false); setIsStreaming(false)
      if (user) {
        memoryCallCount.current += 1
        if (memoryCallCount.current === 1 || memoryCallCount.current % 5 === 0) {
          fetch('/api/memory/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: newMessages }) }).catch(() => { /* ignore */ })
        }
      }
    }
  }

  const parseArtifact = (text: string): ArtifactData | null => {
    const regex = /<artifact\s+type="([^"]+)"(?:\s+language="([^"]+)")?(?:\s+title="([^"]+)")?[^>]*>([\s\S]*?)<\/artifact>/
    const match = text.match(regex)
    if (!match) return null
    return { type: match[1] as 'html' | 'react' | 'code', language: match[2], title: match[3] || 'Artifact', content: match[4].trim() }
  }

  const stripArtifactTags = (text: string) => text.replace(/<artifact[\s\S]*?<\/artifact>/g, '').trim()

  const renderContent = (content: string | ContentPart[], isAssistant: boolean, isLast: boolean) => {
    if (content === '' && isAssistant) {
      if (activeChips.has('think')) {
        return (
          <div className="flex items-center gap-1.5 py-0.5">
            <span className="text-[13px] font-medium text-indigo-400">Thinking</span>
            <span className="flex gap-[3px]">
              {[0, 1, 2].map(i => (
                <span key={i} className="h-1.5 w-1.5 rounded-full bg-indigo-400" style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
              ))}
            </span>
            <style>{`@keyframes bounce { 0%, 80%, 100% { transform: translateY(0); opacity: 0.5; } 40% { transform: translateY(-5px); opacity: 1; } }`}</style>
          </div>
        )
      }
      return <Loader2 className="h-4 w-4 animate-spin text-gray-400 dark:text-white/30" />
    }

    if (typeof content === 'string') {
      const artifact  = isAssistant ? parseArtifact(content) : null
      const cleanText = artifact ? stripArtifactTags(content) : content
      return (
        <div className="flex flex-col gap-3">
          {cleanText !== '' && (
            <span style={{ whiteSpace: 'pre-wrap', fontSize: 'var(--chat-font-size, 15px)' }}>
              {cleanText}
              {isAssistant && isLast && isStreaming && cleanText !== '' && (
                <span className="ml-0.5 inline-block animate-pulse font-light text-gray-400 dark:text-white/30">▌</span>
              )}
            </span>
          )}
          {isAssistant && isLast && isStreaming && !artifact && content.includes('<artifact') && (
            <div className="flex items-center gap-2 rounded-xl border border-indigo-100 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/15 px-4 py-2.5 text-[13px] text-indigo-500 dark:text-indigo-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Building artifact...
            </div>
          )}
          {artifact && !isStreaming && (
            <button
              onClick={() => { setActiveArtifact(artifact); setShowArtifactModal(true); setShowProjectsPanel(false) }}
              className="flex items-center gap-2.5 rounded-xl border border-indigo-200 dark:border-indigo-500/30 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-500/10 dark:to-blue-500/10 px-4 py-3 text-left text-[13px] font-medium text-indigo-700 dark:text-indigo-300 transition hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:shadow-sm"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-500/20">
                <Code2 className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{artifact.title}</div>
                <div className="text-[11px] font-normal capitalize text-indigo-400">
                  {artifact.type === 'code' ? artifact.language : artifact.type} · Tap to open
                </div>
              </div>
              <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-60" />
            </button>
          )}
        </div>
      )
    }

    return (
      <div className="flex flex-col gap-2">
        {content.map((part, i) => {
          if (part.type === 'text' && part.text) return <span key={i} style={{ whiteSpace: 'pre-wrap' }}>{part.text}</span>
          if (part.type === 'image_url' && part.image_url?.url) return <img key={i} src={part.image_url.url} alt="Attached image" className="max-h-[200px] max-w-full rounded-xl object-contain" />
          return null
        })}
      </div>
    )
  }

  const displayName = userProfile?.nickname || user?.email?.split('@')[0] || 'You'
  const initials    = userProfile?.fullName
    ? userProfile.fullName.split(' ').filter(Boolean).slice(0, 2).map((w: string) => w[0].toUpperCase()).join('')
    : displayName.slice(0, 2).toUpperCase()

  const hasMessages     = messages.length > 0
  const rightPanelOpen  = (activeArtifact && showArtifactModal) || showProjectsPanel

  const handleProjectsClick = useCallback(() => {
    const isOpen = activeMenuItem === 'projects'
    setActiveMenuItem(isOpen ? null : 'projects')
    setShowProjectsPanel(!isOpen)
    setShowArtifactsList(false)
    setActiveArtifact(null)
    setShowArtifactModal(false)
    setSidebarOpen(false)
  }, [activeMenuItem])

  const handleArtifactsClick = useCallback(() => {
    const isOpen = activeMenuItem === 'artifacts'
    setActiveMenuItem(isOpen ? null : 'artifacts')
    setShowArtifactsList(prev => !prev)
    setShowProjectsPanel(false)
  }, [activeMenuItem])

  const handleOpenArtifact = useCallback((art: ArtifactData) => {
    setActiveArtifact(art)
    setShowArtifactModal(true)
    setShowProjectsPanel(false)
  }, [])

  // Memoized Sidebar component to prevent re-renders on streaming
  const MemoizedSidebar = React.memo(Sidebar)

  return (
    <div className="flex h-dvh overflow-hidden bg-transparent">

      {/* Chat column */}
      <div className={`flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${rightPanelOpen ? 'flex-1 min-w-0' : 'w-full'}`}>

        <MemoizedSidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          sortedSessions={sortedSessions}
          currentSessionId={currentSessionId}
          renamingId={renamingId}
          setRenamingId={setRenamingId}
          renameValue={renameValue}
          setRenameValue={setRenameValue}
          contextMenu={contextMenu}
          setContextMenu={setContextMenu}
          displayName={displayName}
          initials={initials}
          chatSessions={chatSessions}
          activeMenuItem={activeMenuItem}
          setActiveMenuItem={setActiveMenuItem}
          allArtifacts={allArtifacts}
          showArtifactsList={showArtifactsList}
          onNewChat={newChat}
          onLoadSession={loadSession}
          onStartRename={startRename}
          onConfirmRename={confirmRename}
          onPin={handlePin}
          onFavorite={handleFavorite}
          onDelete={handleDelete}
          onLongPressStart={handleLongPressStart}
          onLongPressEnd={handleLongPressEnd}
          onOpenSettings={() => setShowSettings(true)}
          onProjectsClick={handleProjectsClick}
          onArtifactsClick={handleArtifactsClick}
          onOpenArtifact={handleOpenArtifact}
        />

        {/* Header */}
        <header className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between p-4">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-500 dark:text-white/50 transition hover:text-gray-700 dark:hover:text-white/70">
            <Menu className="h-6 w-6" />
          </button>
          {activeProjectName && (
            <button
              onClick={() => { setShowProjectsPanel(true); setActiveMenuItem('projects') }}
              className="flex items-center gap-1.5 rounded-full border border-[#4D6BFE]/40 bg-[#4D6BFE]/10 px-3 py-1 text-[12px] font-medium text-[#4D6BFE] transition active:opacity-70"
            >
              <FolderOpen className="h-3.5 w-3.5" />
              <span className="max-w-[120px] truncate">{activeProjectName}</span>
            </button>
          )}
          <button onClick={newChat} className="text-gray-500 dark:text-white/50 transition hover:text-gray-700 dark:hover:text-white/70">
            <Plus className="h-6 w-6" />
          </button>
        </header>

        {/* Main Content */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {!hasMessages ? (
            <div className="flex flex-1 flex-col items-center justify-center px-4 pb-8">
              <div className="flex w-full max-w-[650px] flex-col items-center">
                <div className="mb-5 h-[90px] w-[90px]">
                  <img src="/logo.png" alt="Grozl" className="h-full w-full object-contain" />
                </div>
                <h1 className="mb-7 bg-gradient-to-b from-gray-900 to-gray-700 bg-clip-text text-center text-[28px] font-semibold tracking-tight text-transparent dark:from-white dark:to-white/60">
                  {activeProjectName ? `How can I help with ${activeProjectName}?` : 'Your Mind, Amplified By Grozl'}
                </h1>
                <InputBox
                  inputValue={inputValue}
                  isRecording={isRecording}
                  isLoading={isLoading}
                  attachedFiles={attachedFiles}
                  activeChips={activeChips}
                  isFocused={isFocused}
                  showAttachMenu={showAttachMenu}
                  textareaRef={textareaRef}
                  cameraInputRef={cameraInputRef}
                  photoInputRef={photoInputRef}
                  fileInputRef={fileInputRef}
                  onInput={handleInput}
                  onSend={handleSend}
                  onMicClick={handleMicClick}
                  onFileChange={handleFileChange}
                  onRemoveFile={removeFile}
                  onToggleChip={toggleChip}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  onToggleAttachMenu={() => setShowAttachMenu(!showAttachMenu)}
                  onCloseAttachMenu={() => setShowAttachMenu(false)}
                />
              </div>
            </div>
          ) : (
            <MessageList
              messages={messages}
              messagesEndRef={messagesEndRef}
              renderContent={renderContent}
            />
          )}

          {hasMessages && (
            <div className="w-full px-4 pb-4">
              <div className="mx-auto w-full max-w-[650px]">
                <InputBox
                  inputValue={inputValue}
                  isRecording={isRecording}
                  isLoading={isLoading}
                  attachedFiles={attachedFiles}
                  activeChips={activeChips}
                  isFocused={isFocused}
                  showAttachMenu={showAttachMenu}
                  textareaRef={textareaRef}
                  cameraInputRef={cameraInputRef}
                  photoInputRef={photoInputRef}
                  fileInputRef={fileInputRef}
                  onInput={handleInput}
                  onSend={handleSend}
                  onMicClick={handleMicClick}
                  onFileChange={handleFileChange}
                  onRemoveFile={removeFile}
                  onToggleChip={toggleChip}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  onToggleAttachMenu={() => setShowAttachMenu(!showAttachMenu)}
                  onCloseAttachMenu={() => setShowAttachMenu(false)}
                />
              </div>
            </div>
          )}
        </main>
      </div>
{/* Artifact Right Panel */}
      {activeArtifact && showArtifactModal && (
        <>
          <div className="hidden md:flex md:w-[46%] shrink-0 flex-col border-l border-white/10">
            <ArtifactPanel
              artifact={activeArtifact}
              onClose={() => { setActiveArtifact(null); setShowArtifactModal(false) }}
            />
          </div>
          <div className="fixed inset-0 z-50 flex flex-col md:hidden bg-[#0f1117]">
            <ArtifactPanel
              artifact={activeArtifact}
              onClose={() => { setActiveArtifact(null); setShowArtifactModal(false) }}
            />
          </div>
        </>
      )}

      {/* Projects Right Panel */}
      {showProjectsPanel && (
        <>
          <div className="hidden md:flex md:w-[380px] shrink-0 flex-col border-l border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/80 backdrop-blur-xl shadow-xl">
            <ProjectsPanel
              currentSessionId={currentSessionId}
              onClose={() => { setShowProjectsPanel(false); setActiveMenuItem(null) }}
              onStartNewChatInProject={(project) => { newChat(); setActiveProjectName(project.name); setActiveProject({ name: project.name, knowledge: project.knowledge, customInstructions: project.customInstructions }); setShowProjectsPanel(false); setActiveMenuItem(null) }}
            />
          </div>
          <div className="fixed inset-0 z-50 flex flex-col md:hidden bg-white/80 dark:bg-black/80 backdrop-blur-xl">
            <ProjectsPanel
              currentSessionId={currentSessionId}
              onClose={() => { setShowProjectsPanel(false); setActiveMenuItem(null); setSidebarOpen(false) }}
              onStartNewChatInProject={(project) => { newChat(); setActiveProjectName(project.name); setActiveProject({ name: project.name, knowledge: project.knowledge, customInstructions: project.customInstructions }); setShowProjectsPanel(false); setActiveMenuItem(null); setSidebarOpen(false) }}
            />
          </div>
        </>
      )}

      {/* Settings Screen */}
      {showSettings && (
        <SettingsScreen
          user={user}
          chatCount={chatSessions.length}
          onClose={() => setShowSettings(false)}
          onClearChats={handleClearChats}
          onLogout={() => { setShowSettings(false); onLogout?.() }}
        />
      )}
    </div>
  )
      }

                      

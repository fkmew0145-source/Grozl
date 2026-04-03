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
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [activeChips, setActiveChips] = useState<Set<string>>(new Set())
  const [activeMenuItem, setActiveMenuItem] = useState<string | null>(null)
  const [showAttachMenu, setShowAttachMenu] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const [isFocused, setIsFocused] = useState(false)
  const [activeArtifact, setActiveArtifact] = useState<ArtifactData | null>(null)
  const [showArtifactModal, setShowArtifactModal] = useState(false)

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)

  const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string>(() => crypto.randomUUID())
  const [sessionsLoaded, setSessionsLoaded] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const [showArtifactsList, setShowArtifactsList] = useState(false)
  const [showProjectsPanel, setShowProjectsPanel] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [allArtifacts, setAllArtifacts] = useState<ArtifactData[]>([])
  const [activeProjectName, setActiveProjectName] = useState<string | null>(null)
  const [activeProject, setActiveProject] = useState<{ name: string; knowledge: string; customInstructions: string } | null>(null)

  const [contextMenu, setContextMenu] = useState<{ sessionId: string; x: number; y: number } | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const memoryCallCount = useRef(0)

  const supabase = createClient()
  const [appSettings, setAppSettings] = useState(() => loadSettings())
  const SESSIONS_KEY = sessionsKey(user?.id)
  const PROFILE_KEY = profileKey(user?.id)

  useEffect(() => {
    const stored = localStorage.getItem(PROFILE_KEY)
    if (stored) {
      try { setUserProfile(JSON.parse(stored)) } catch { }
    }
  }, [PROFILE_KEY])

  useEffect(() => {
    const s = loadSettings()
    setAppSettings(s)
    document.documentElement.style.setProperty('--chat-font-size', `${s.fontSize}px`)
  }, [])

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
              id: s.id, title: s.title, messages: s.messages,
              pinned: s.pinned, favorite: s.favorite,
              timestamp: new Date(s.updated_at).getTime(),
            }))
            setChatSessions(mapped)
          }
        } catch { }
      } else {
        const stored = localStorage.getItem(SESSIONS_KEY)
        if (stored) { try { setChatSessions(JSON.parse(stored)) } catch { } }
      }
      setSessionsLoaded(true)
    }
    loadSessions()
  }, [user, SESSIONS_KEY])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!isLoading && messages.length >= 2 && sessionsLoaded) {
      saveSession(messages, currentSessionId)
    }
  }, [isLoading])

  const saveSession = useCallback(async (msgs: Message[], sessionId: string) => {
    const firstUser = msgs.find(m => m.role === 'user')
    const rawContent = firstUser?.content
    const rawTitle = typeof rawContent === 'string' ? rawContent
      : Array.isArray(rawContent) ? (rawContent.find(p => p.type === 'text')?.text || 'Chat') : 'Chat'
    const title = rawTitle.slice(0, 45) + (rawTitle.length > 45 ? '...' : '')
    const session: ChatSession = { id: sessionId, title, messages: msgs, timestamp: Date.now(), projectName: activeProject?.name }

    if (user) {
      setChatSessions(prev => {
        const existing = prev.find(s => s.id === sessionId)
        const merged = { ...session, pinned: existing?.pinned, favorite: existing?.favorite }
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
      } catch { }
    } else {
      setChatSessions(prev => {
        const existing = prev.find(s => s.id === sessionId)
        const merged = { ...session, pinned: existing?.pinned, favorite: existing?.favorite }
        const filtered = prev.filter(s => s.id !== sessionId)
        const updated = [merged, ...filtered].slice(0, 50)
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
    if (session.projectName) {
      setActiveProjectName(session.projectName)
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
      } catch { }
    } else {
      localStorage.removeItem(SESSIONS_KEY)
    }
  }, [user, SESSIONS_KEY])

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
      try { await fetch('/api/chat/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...session, pinned: newPinned }) }) } catch { }
    }
  }, [user, chatSessions, updateSessions])

  const handleFavorite = useCallback(async (sessionId: string) => {
    const session = chatSessions.find(s => s.id === sessionId)
    const newFav = !session?.favorite
    updateSessions(prev => prev.map(s => s.id === sessionId ? { ...s, favorite: newFav } : s))
    setContextMenu(null)
    if (user && session) {
      try { await fetch('/api/chat/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...session, favorite: newFav }) }) } catch { }
    }
  }, [user, chatSessions, updateSessions])

  const handleDelete = useCallback(async (sessionId: string) => {
    updateSessions(prev => prev.filter(s => s.id !== sessionId))
    if (currentSessionId === sessionId) newChat()
    setContextMenu(null)
    if (user) {
      try { await fetch('/api/chat/sessions', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: sessionId }) }) } catch { }
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
        try { await fetch('/api/chat/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...session, title: newTitle }) }) } catch { }
      }
    }
    setRenamingId(null)
    setRenameValue('')
  }, [renamingId, renameValue, user, chatSessions, updateSessions])

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
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

  const handleMicClick = () => {
    if (isRecording) { recognitionRef.current?.stop(); setIsRecording(false); return }
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognitionAPI) { alert('Speech recognition not supported. Use Chrome or Edge.'); return }
    const recognition = new SpeechRecognitionAPI()
    recognition.lang = loadSettings().voiceLanguage || 'hi-IN'
    recognition.continuous = false
    recognition.interimResults = true
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = Array.from(event.results).map((r: SpeechRecognitionResult) => r[0].transcript).join('')
      setInputValue(transcript)
      if (textareaRef.current) { textareaRef.current.style.height = 'auto'; textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px' }
    }
    recognition.onend = () => setIsRecording(false)
    recognition.onerror = (e: SpeechRecognitionErrorEvent) => { setIsRecording(false); if (e.error === 'not-allowed') alert('Microphone permission denied.') }
    recognitionRef.current = recognition
    recognition.start()
    setIsRecording(true)
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
    setMessages(newMessages)
    setInputValue('')
    setAttachedFiles([])
    setIsFocused(false)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setIsLoading(true)
    setIsStreaming(true)
    setMessages([...newMessages, { role: 'assistant', content: '' }])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          model: loadSettings().defaultModel,
          language: loadSettings().language,
          personalization: loadPersonalization(user?.id),
          think: activeChips.has('think'),
          search: activeChips.has('search'),
          projectContext: activeProject ?? undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        setMessages([...newMessages, { role: 'assistant', content: err.error || 'Something went wrong.' }])
        return
      }
      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let assistantText = ''
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
      setIsLoading(false)
      setIsStreaming(false)
      if (user) {
        memoryCallCount.current += 1
        if (memoryCallCount.current === 1 || memoryCallCount.current % 5 === 0) {
          fetch('/api/memory/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: newMessages }) }).catch(() => { })
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
      const artifact = isAssistant ? parseArtifact(content) : null
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
  const initials = userProfile?.fullName
    ? userProfile.fullName.split(' ').filter(Boolean).slice(0, 2).map((w: string) => w[0].toUpperCase()).join('')
    : displayName.slice(0, 2).toUpperCase()

  const hasMessages = messages.length > 0
  const rightPanelOpen = (activeArtifact && showArtifactModal) || showProjectsPanel

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

  const MemoizedSidebar = React.memo(Sidebar)

  return (
    <div className="flex h-dvh overflow-hidden bg-transparent">
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
      {activeArtifact && showArtifactModal && (
        <>
          <div className="hidden md:flex md:w-[46%] shrink-0 flex-col border-l border-white/10">
            <ArtifactPanel artifact={activeArtifact} onClose={() => { setActiveArtifact(null); setShowArtifactModal(false) }} />
          </div>
          <div className="fixed inset-0 z-50 flex flex-col md:hidden bg-[#0f1117]">
            <ArtifactPanel artifact={activeArtifact} onClose={() => { setActiveArtifact(null); setShowArtifactModal(false) }} />
          </div>
        </>
      )}
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
          

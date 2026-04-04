'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
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
import LimitBanner from './limit-banner'

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

  // ── Limit state ───────────────────────────────────────────────────────
  const [limitInfo, setLimitInfo] = useState<{
    plan: string; daily_used?: number; daily_limit?: number | null
    weekly_used?: number; weekly_limit?: number
  } | null>(null)

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
        // Logged-in: DB ONLY — no localStorage
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
        // Guest: localStorage ONLY — no API
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
      // Logged-in: API ONLY — no localStorage
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
      // Guest: localStorage ONLY — no API
      setChatSessions(prev => {
        const existing = prev.find(s => s.id === sessionId)
        const merged   = { ...session, pinned: existing?.pinned, favorite: existing?.favorite }
        const filtered = prev.filter(s => s.id !== sessionId)
        const updated  = [merged, ...filtered].slice(0, 50)
        localStorage.setItem(SESSIONS_KEY, JSON.stringify(updated))
        return updated
      })
    }
  }, [user, chatSessions, SESSIONS_KEY])

  // updateSessions — writes localStorage only for guests
  const updateSessions = (updater: (sessions: ChatSession[]) => ChatSession[]) => {
    setChatSessions(prev => {
      const updated = updater(prev)
      if (!user) {
        localStorage.setItem(SESSIONS_KEY, JSON.stringify(updated))
      }
      return updated
    })
  }

  const loadSession = (session: ChatSession) => {
    setSidebarOpen(false)
    setTimeout(() => {
      setMessages(session.messages)
      setCurrentSessionId(session.id)
      setInputValue('')
      setAttachedFiles([])
      setActiveArtifact(null)
      setShowArtifactModal(false)
      setShowArtifactsList(false)
      setShowProjectsPanel(false)
    }, 0)
  }

  const newChat = useCallback(() => {
    // FIRST: close sidebar alone so its CSS animation gets a clean GPU frame
    setSidebarOpen(false)
    // THEN: all heavy state changes in next tick — no GPU conflict
    setTimeout(() => {
      if (messages.length >= 2) saveSession(messages, currentSessionId)
      setMessages([])
      setInputValue('')
      setAttachedFiles([])
      setActiveChips(new Set())
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
    }, 0)
  }, [messages, currentSessionId, saveSession])

  const handleClearChats = useCallback(async () => {
    setChatSessions([])
    setMessages([])
    if (user) {
      // Logged-in: DB ONLY
      try {
        const supabaseClient = createClient()
        const { data: { user: authUser } } = await supabaseClient.auth.getUser()
        if (authUser) {
          await supabaseClient.from('chat_sessions').delete().eq('user_id', authUser.id)
        }
      } catch { /* ignore */ }
    } else {
      // Guest: localStorage ONLY
      localStorage.removeItem(SESSIONS_KEY)
    }
  }, [user, SESSIONS_KEY])

  const sortedSessions = [...chatSessions]
    .filter(s => !searchQuery || s.title.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      return b.timestamp - a.timestamp
    })

  // ── Context menu ─────────────────────────────────────────────────────
  const handleLongPressStart = (e: React.TouchEvent | React.MouseEvent, sessionId: string) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    longPressTimer.current = setTimeout(() => {
      setContextMenu({ sessionId, x: rect.left, y: rect.bottom + 4 })
    }, 500)
  }
  const handleLongPressEnd = () => { if (longPressTimer.current) clearTimeout(longPressTimer.current) }

  const handlePin = async (sessionId: string) => {
    const session = chatSessions.find(s => s.id === sessionId)
    const newPinned = !session?.pinned
    updateSessions(prev => prev.map(s => s.id === sessionId ? { ...s, pinned: newPinned } : s))
    setContextMenu(null)
    if (user && session) {
      try { await fetch('/api/chat/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...session, pinned: newPinned }) }) } catch { /* ignore */ }
    }
  }

  const handleFavorite = async (sessionId: string) => {
    const session = chatSessions.find(s => s.id === sessionId)
    const newFav  = !session?.favorite
    updateSessions(prev => prev.map(s => s.id === sessionId ? { ...s, favorite: newFav } : s))
    setContextMenu(null)
    if (user && session) {
      try { await fetch('/api/chat/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...session, favorite: newFav }) }) } catch { /* ignore */ }
    }
  }

  const handleDelete = async (sessionId: string) => {
    updateSessions(prev => prev.filter(s => s.id !== sessionId))
    if (currentSessionId === sessionId) newChat()
    setContextMenu(null)
    if (user) {
      try { await fetch('/api/chat/sessions', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: sessionId }) }) } catch { /* ignore */ }
    }
  }

  const startRename = (session: ChatSession) => { setRenamingId(session.id); setRenameValue(session.title); setContextMenu(null) }

  const confirmRename = async () => {
    if (!renamingId) return
    const newTitle = renameValue.trim()
    updateSessions(prev => prev.map(s => s.id === renamingId ? { ...s, title: newTitle || s.title } : s))
    if (user && newTitle) {
      const session = chatSessions.find(s => s.id === renamingId)
      if (session) {
        try { await fetch('/api/chat/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...session, title: newTitle }) }) } catch { /* ignore */ }
      }
    }
    setRenamingId(null); setRenameValue('')
  }

  const toggleChip = (chip: string) => {
    setActiveChips(prev => { const next = new Set(prev); next.has(chip) ? next.delete(chip) : next.add(chip); return next })
  }

  // ── Input helpers ────────────────────────────────────────────────────
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

  // ── Mic ──────────────────────────────────────────────────────────────
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

  // ── Send ─────────────────────────────────────────────────────────────
  const handleSend = async () => {
    const text = inputValue.trim()
    if ((!text && attachedFiles.length === 0) || isLoading) return

    let userContent: string | ContentPart[]
    if (attachedFiles.length > 0) {
      const parts: ContentPart[] = []
      if (text) parts.push({ type: 'text', text })
      for (const file of attachedFiles) {
        if (file.type.startsWith('image/') || file.type === 'application/pdf') {
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
        // Limit exceeded — show paywall banner instead of error in chat
        if (err.error === 'limit_exceeded') {
          setMessages(newMessages) // remove the blank assistant message
          setLimitInfo({
            plan:         err.plan,
            daily_used:   err.daily_used,
            daily_limit:  err.daily_limit,
            weekly_used:  err.weekly_used,
            weekly_limit: err.weekly_limit,
          })
          return
        }
        setMessages([...newMessages, { role: 'assistant', content: err.error || 'Something went wrong.' }])
        return
      }
      const reader = res.body?.getReader(); const decoder = new TextDecoder(); let assistantText = ''
      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          

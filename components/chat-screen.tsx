'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { Menu, Plus, Loader2, Code2, ExternalLink, X, FolderOpen, MoreVertical, Download, Copy, Share2 } from 'lucide-react'
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
  type: 'webapp' | 'html' | 'react' | 'code' | 'script' | 'notes' | 'prompt' | 'config' | 'story'
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
  const [artifactMenuOpen, setArtifactMenuOpen] = useState<string | null>(null)
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
  const [lastProvider, setLastProvider]           = useState<string | undefined>(undefined)

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
          found.push({ type: m[1] as ArtifactData['type'], language: m[2], title, content: m[4].trim() })
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
    requestAnimationFrame(() => requestAnimationFrame(() => {
      setMessages(session.messages)
      setCurrentSessionId(session.id)
      setInputValue('')
      setAttachedFiles([])
      setActiveArtifact(null)
      setShowArtifactModal(false)
      setShowArtifactsList(false)
      setShowProjectsPanel(false)
    }))
  }

  // ── Regenerate ───────────────────────────────────────────────────────
  const handleRegenerate = useCallback((index: number) => {
    // Remove the assistant message at index and all after it, then resend
    const messagesUpToUser = messages.slice(0, index)
    if (messagesUpToUser.length === 0) return
    setMessages(messagesUpToUser)
    // Trigger send with existing messages
    const lastUser = [...messagesUpToUser].reverse().find(m => m.role === 'user')
    if (!lastUser) return
    setIsLoading(true); setIsStreaming(true)
    setMessages([...messagesUpToUser, { role: 'assistant', content: '' }])
    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: messagesUpToUser,
        model: loadSettings().defaultModel,
        language: loadSettings().language,
        personalization: loadPersonalization(user?.id),
        think: activeChips.has('think'),
        search: activeChips.has('search'),
        projectContext: activeProject ?? undefined,
      })
    }).then(async res => {
      const provider = res.headers.get('X-Provider') ?? undefined
      if (provider) setLastProvider(provider)
      const reader = res.body?.getReader(); const decoder = new TextDecoder(); let text = ''
      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          text += decoder.decode(value, { stream: true })
          setMessages([...messagesUpToUser, { role: 'assistant', content: text, provider }])
        }
      }
    }).catch(() => {
      setMessages([...messagesUpToUser, { role: 'assistant', content: 'Network error. Please try again.' }])
    }).finally(() => {
      setIsLoading(false); setIsStreaming(false)
    })
  }, [messages, activeChips, activeProject, user])

  const newChat = useCallback((keepProject = false) => {
    // FIRST: close sidebar alone so its CSS animation gets a clean GPU frame
    setSidebarOpen(false)
    // THEN: all heavy state changes in next tick — no GPU conflict
    requestAnimationFrame(() => requestAnimationFrame(() => {
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
      if (!keepProject) { setActiveProjectName(null); setActiveProject(null) }
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
    }))
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
      const provider = res.headers.get('X-Provider') ?? undefined
      if (provider) setLastProvider(provider)
      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          assistantText += decoder.decode(value, { stream: true })
          setMessages([...newMessages, { role: 'assistant', content: assistantText, provider }])
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
function getArtifactExt(type: string, language?: string): string {
  const langMap: Record<string, string> = {
    python: 'py', typescript: 'ts', javascript: 'js', tsx: 'tsx', jsx: 'jsx',
    bash: 'sh', shell: 'sh', json: 'json', yaml: 'yaml', yml: 'yml', css: 'css',
    sql: 'sql', rust: 'rs', go: 'go', cpp: 'cpp', java: 'java', md: 'md',
  }
  const lang = language?.toLowerCase() || ''
  if (lang && langMap[lang]) return langMap[lang]
  const typeMap: Record<string, string> = {
    webapp: 'html', html: 'html', react: 'jsx', script: 'sh',
    notes: 'md', prompt: 'txt', config: 'json', story: 'md', code: 'txt',
  }
  return typeMap[type] || 'txt'
}

function downloadArt(art: ArtifactData) {
  const ext  = getArtifactExt(art.type, art.language)
  const blob = new Blob([art.content], { type: 'text/plain' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url
  a.download = `${art.title.replace(/[^a-z0-9\-_. ]/gi, '_')}.${ext}`
  document.body.appendChild(a); a.click()
  document.body.removeChild(a); URL.revokeObjectURL(url)
}

async function shareArt(art: ArtifactData) {
  const ext = getArtifactExt(art.type, art.language)
  if (navigator.share) {
    const blob = new Blob([art.content], { type: 'text/plain' })
    const file = new File([blob], `${art.title}.${ext}`, { type: 'text/plain' })
    try { await navigator.share({ files: [file], title: art.title }); return } catch {}
  }
  navigator.clipboard.writeText(art.content)
}
  
  // ── Artifact helpers ─────────────────────────────────────────────────
  const parseArtifact = (text: string): ArtifactData | null => {
    const regex = /<artifact\s+type="([^"]+)"(?:\s+language="([^"]+)")?(?:\s+title="([^"]+)")?[^>]*>([\s\S]*?)<\/artifact>/
    const match = text.match(regex)
    if (!match) return null
    return { type: match[1] as ArtifactData['type'], language: match[2], title: match[3] || 'Artifact', content: match[4].trim() }
  }

  const stripArtifactTags = (text: string) => text.replace(/<artifact[\s\S]*?<\/artifact>/g, '').trim()

    // ── Render message content ───────────────────────────────────────────
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
      const artifact    = isAssistant ? parseArtifact(content) : null
      const cleanText   = artifact ? stripArtifactTags(content) : content
      const genImgMatch = cleanText.match(/\[GROZL_IMAGE:(https?:\/\/[^\]]+)\]/)
      const genImageUrl = genImgMatch?.[1]
      const displayText = genImageUrl ? cleanText.replace(/\[GROZL_IMAGE:[^\]]+\]\n?/, '') : cleanText
      return (
        <div className="flex flex-col gap-3">
          {genImageUrl && (
            <div className="flex flex-col gap-2">
              <img
                src={genImageUrl}
                alt="Generated image"
                className="max-w-full rounded-2xl border border-white/10"
                onError={e => { (e.target as HTMLImageElement).alt = '⚠️ Image load karne mein time lag sakta hai, link open karo.' }}
              />
              <a href={genImageUrl} target="_blank" rel="noopener noreferrer"
                className="text-[12px] text-indigo-400 hover:text-indigo-300 hover:underline">
                ⬇ Download / Full Size Open Karo
              </a>
            </div>
          )}
          {displayText !== '' && (
            <span style={{ whiteSpace: 'pre-wrap', fontSize: 'var(--chat-font-size, 15px)' }}>
              {displayText}
              {isAssistant && isLast && isStreaming && displayText !== '' && (
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
  <div className="relative">
    <div className="flex items-center gap-2.5 rounded-xl border border-indigo-200 dark:border-indigo-500/30 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-500/10 dark:to-blue-500/10 px-4 py-3 text-[13px] overflow-hidden">
      {/* Clickable main area */}
      <button
        onClick={() => { setActiveArtifact(artifact); setShowArtifactModal(true); setShowProjectsPanel(false) }}
        className="flex flex-1 items-center gap-2.5 text-left min-w-0"
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-500/20">
          <Code2 className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold text-indigo-700 dark:text-indigo-300">{artifact.title}</div>
          <div className="text-[11px] font-normal capitalize text-indigo-400">
            {artifact.type === 'code' ? artifact.language : artifact.type} · {getArtifactExt(artifact.type, artifact.language).toUpperCase()}
          </div>
        </div>
      </button>

      {/* 3-dot menu button */}
      <button
        onClick={(e) => { e.stopPropagation(); setArtifactMenuOpen(artifactMenuOpen === artifact.title ? null : artifact.title) }}
        className="shrink-0 rounded-lg p-1.5 text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
    </div>

    {/* Dropdown menu */}
    {artifactMenuOpen === artifact.title && (
      <div
        className="absolute right-0 top-full z-50 mt-1 w-44 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1d27] shadow-xl overflow-hidden"
        onMouseLeave={() => setArtifactMenuOpen(null)}
      >
        <button
          onClick={() => { navigator.clipboard.writeText(artifact.content); setArtifactMenuOpen(null) }}
          className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[13px] text-gray-700 dark:text-white/80 hover:bg-gray-50 dark:hover:bg-white/[0.06] transition"
        >
          <Copy className="h-4 w-4 text-gray-400 dark:text-white/40" /> Copy
        </button>
        <button
          onClick={() => { downloadArt(artifact); setArtifactMenuOpen(null) }}
          className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[13px] text-gray-700 dark:text-white/80 hover:bg-gray-50 dark:hover:bg-white/[0.06] transition"
        >
          <Download className="h-4 w-4 text-gray-400 dark:text-white/40" /> Download .{getArtifactExt(artifact.type, artifact.language)}
        </button>
        <button
          onClick={() => { shareArt(artifact); setArtifactMenuOpen(null) }}
          className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[13px] text-gray-700 dark:text-white/80 hover:bg-gray-50 dark:hover:bg-white/[0.06] transition"
        >
          <Share2 className="h-4 w-4 text-gray-400 dark:text-white/40" /> Share
        </button>
        <button
          onClick={() => { setActiveArtifact(artifact); setShowArtifactModal(true); setShowProjectsPanel(false); setArtifactMenuOpen(null) }}
          className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[13px] text-gray-700 dark:text-white/80 hover:bg-gray-50 dark:hover:bg-white/[0.06] transition"
        >
          <ExternalLink className="h-4 w-4 text-gray-400 dark:text-white/40" /> Open
        </button>
      </div>
    )}
  </div>
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

  // ── User profile helpers ─────────────────────────────────────────────
  const displayName = userProfile?.nickname || user?.email?.split('@')[0] || 'You'
  const initials    = userProfile?.fullName
    ? userProfile.fullName.split(' ').filter(Boolean).slice(0, 2).map((w: string) => w[0].toUpperCase()).join('')
    : displayName.slice(0, 2).toUpperCase()

  // ── Derived flags ────────────────────────────────────────────────────
  const hasMessages     = messages.length > 0
  const rightPanelOpen  = (activeArtifact && showArtifactModal) || showProjectsPanel

  // ── Sidebar callbacks ─────────────────────────────────────────────────
  const handleProjectsClick = () => {
    const isOpen = activeMenuItem === 'projects'
    setSidebarOpen(false)
    requestAnimationFrame(() => requestAnimationFrame(() => {
      setActiveMenuItem(isOpen ? null : 'projects')
      setShowProjectsPanel(!isOpen)
      setShowArtifactsList(false)
      setActiveArtifact(null)
      setShowArtifactModal(false)
    }))
  }

  const handleArtifactsClick = () => {
    const isOpen = activeMenuItem === 'artifacts'
    setSidebarOpen(false)
    requestAnimationFrame(() => requestAnimationFrame(() => {
      setActiveMenuItem(isOpen ? null : 'artifacts')
      setShowArtifactsList(prev => !prev)
      setShowProjectsPanel(false)
    }))
  }

  const handleOpenArtifact = (art: ArtifactData) => {
    setActiveArtifact(art)
    setShowArtifactModal(true)
    setShowProjectsPanel(false)
  }

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className="flex h-dvh overflow-hidden bg-transparent">

  {/* ── Chat column ──────────────────────────────────────────────── */}
      <div className={`flex flex-col overflow-hidden transition-[flex] duration-300 ease-in-out ${rightPanelOpen ? 'flex-1 min-w-0' : 'w-full'}`}>
        {/* ── Sidebar ──────────────────────────────────────────────────── */}
        <Sidebar
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
      {/* ── Header ───────────────────────────────────────────────────── */}
        <header className="fixed left-0 right-0 top-0 z-10 flex items-center justify-between p-4 bg-white dark:bg-[#0d0f14]">
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

        {/* ── Main Content ─────────────────────────────────────────────── */}
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
              isStreaming={isStreaming}
              onRegenerate={handleRegenerate}
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
              onStartNewChatInProject={(project) => { setActiveProjectName(project.name); setActiveProject({ name: project.name, knowledge: project.knowledge, customInstructions: project.customInstructions }); newChat(true); setShowProjectsPanel(false); setActiveMenuItem(null) }}
            />
          </div>
          <div className="fixed inset-0 z-50 flex flex-col md:hidden bg-white dark:bg-[#0d0f14]">
            <ProjectsPanel
              currentSessionId={currentSessionId}
              onClose={() => { setShowProjectsPanel(false); setActiveMenuItem(null); setSidebarOpen(false) }}
              onStartNewChatInProject={(project) => { setActiveProjectName(project.name); setActiveProject({ name: project.name, knowledge: project.knowledge, customInstructions: project.customInstructions }); newChat(true); setShowProjectsPanel(false); setActiveMenuItem(null); setSidebarOpen(false) }}
            />
          </div>
        </>
      )}

      {/* ── Settings Screen ───────────────────────────────────────────── */}
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

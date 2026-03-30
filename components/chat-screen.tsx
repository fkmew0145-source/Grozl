'use client'
import SettingsScreen from './settings/settings-screen'
import { useState, useRef, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import {
  Menu, Plus, Search, FolderOpen, MessageSquarePlus,
  Mic, MicOff, Send, Camera, Image, FileText, Loader2, MessageSquare,
  Code2, ExternalLink, X, Settings,
} from 'lucide-react'
import ArtifactPanel from './artifact-panel'

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
}

interface ChatScreenProps {
  user: User | null
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

export default function ChatScreen({ user }: ChatScreenProps) {
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

  // ── Artifacts sidebar panel ──────────────────────────────────────────
  const [showArtifactsList, setShowArtifactsList] = useState(false)
  const [allArtifacts, setAllArtifacts]           = useState<ArtifactData[]>([])

  // ── Context menu state ───────────────────────────────────────────────
  const [contextMenu, setContextMenu] = useState<{ sessionId: string; x: number; y: number } | null>(null)
  const [renamingId, setRenamingId]   = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  // ── Settings modal state ─────────────────────────────────────────────
  const [showSettings, setShowSettings] = useState(false)
  // ── Refs ─────────────────────────────────────────────────────────────
  const textareaRef    = useRef<HTMLTextAreaElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const photoInputRef  = useRef<HTMLInputElement>(null)
  const fileInputRef   = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const supabase = createClient()

  // ── Load user profile ────────────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem('grozl_user_profile')
    if (stored) {
      try { setUserProfile(JSON.parse(stored)) } catch { /* ignore */ }
    }
  }, [])

  // ── Load settings from localStorage ─────────────────────────────────
  useEffect(() => {
    const s = localStorage.getItem('grozl_settings')
    if (s) {
      try {
        const parsed = JSON.parse(s)
        if (parsed.appearance)    setSettingsAppearance(parsed.appearance)
        if (parsed.fontSize)      setSettingsFontSize(parsed.fontSize)
        if (parsed.language)      setSettingsLanguage(parsed.language)
        if (parsed.defaultModel)  setSettingsDefaultModel(parsed.defaultModel)
        if (typeof parsed.saveHistory === 'boolean') setSettingsSaveHistory(parsed.saveHistory)
      } catch { /* ignore */ }
    }
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

  // ── Load sessions ────────────────────────────────────────────────────
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
        } catch {
          const stored = localStorage.getItem('grozl_chat_sessions')
          if (stored) { try { setChatSessions(JSON.parse(stored)) } catch { /* ignore */ } }
        }
      } else {
        const stored = localStorage.getItem('grozl_chat_sessions')
        if (stored) { try { setChatSessions(JSON.parse(stored)) } catch { /* ignore */ } }
      }
      setSessionsLoaded(true)
    }
    loadSessions()
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

  // ── Session helpers ──────────────────────────────────────────────────
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
    const session: ChatSession = { id: sessionId, title, messages: msgs, timestamp: Date.now() }

    setChatSessions(prev => {
      const existing = prev.find(s => s.id === sessionId)
      const merged   = { ...session, pinned: existing?.pinned, favorite: existing?.favorite }
      const filtered = prev.filter(s => s.id !== sessionId)
      const updated  = [merged, ...filtered].slice(0, 50)
      localStorage.setItem('grozl_chat_sessions', JSON.stringify(updated))
      return updated
    })

    if (user) {
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
    }
  }, [user, chatSessions])

  const updateSessions = (updater: (sessions: ChatSession[]) => ChatSession[]) => {
    setChatSessions(prev => {
      const updated = updater(prev)
      localStorage.setItem('grozl_chat_sessions', JSON.stringify(updated))
      return updated
    })
  }

  const loadSession = (session: ChatSession) => {
    setMessages(session.messages)
    setCurrentSessionId(session.id)
    setSidebarOpen(false)
    setInputValue('')
    setAttachedFiles([])
    setActiveArtifact(null)
    setShowArtifactModal(false)
    setShowArtifactsList(false)
  }

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
    setCurrentSessionId(crypto.randomUUID())
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }, [messages, currentSessionId, saveSession])

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
    recognition.lang = 'hi-IN'; recognition.continuous = false; recognition.interimResults = true
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
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: newMessages }) })
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
      if (user) { fetch('/api/memory/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: newMessages }) }).catch(() => { /* ignore */ }) }
    }
  }

  // ── Artifact helpers ─────────────────────────────────────────────────
  const parseArtifact = (text: string): ArtifactData | null => {
    const regex = /<artifact\s+type="([^"]+)"(?:\s+language="([^"]+)")?(?:\s+title="([^"]+)")?[^>]*>([\s\S]*?)<\/artifact>/
    const match = text.match(regex)
    if (!match) return null
    return { type: match[1] as 'html' | 'react' | 'code', language: match[2], title: match[3] || 'Artifact', content: match[4].trim() }
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
      return <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
    }

    if (typeof content === 'string') {
      const artifact  = isAssistant ? parseArtifact(content) : null
      const cleanText = artifact ? stripArtifactTags(content) : content
      return (
        <div className="flex flex-col gap-3">
          {cleanText !== '' && (
            <span style={{ whiteSpace: 'pre-wrap' }}>
              {cleanText}
              {isAssistant && isLast && isStreaming && cleanText !== '' && (
                <span className="ml-0.5 inline-block animate-pulse font-light text-gray-400">▌</span>
              )}
            </span>
          )}
          {isAssistant && isLast && isStreaming && !artifact && content.includes('<artifact') && (
            <div className="flex items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-2.5 text-[13px] text-indigo-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Building artifact...
            </div>
          )}
          {artifact && !isStreaming && (
            <button
              onClick={() => { setActiveArtifact(artifact); setShowArtifactModal(true) }}
              className="flex items-center gap-2.5 rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-blue-50 px-4 py-3 text-left text-[13px] font-medium text-indigo-700 transition hover:border-indigo-300 hover:shadow-sm"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-100">
                <Code2 className="h-3.5 w-3.5 text-indigo-500" />
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

  // ── User profile helpers ─────────────────────────────────────────────
  const displayName = userProfile?.nickname || user?.email?.split('@')[0] || 'You'
  const initials    = userProfile?.fullName
    ? userProfile.fullName.split(' ').filter(Boolean).slice(0, 2).map((w: string) => w[0].toUpperCase()).join('')
    : displayName.slice(0, 2).toUpperCase()

  // ── Derived flags ────────────────────────────────────────────────────
  const hasText     = inputValue.trim().length > 0
  const hasMessages = messages.length > 0
  const isActive    = isFocused || hasText || attachedFiles.length > 0

  // ── Input box ────────────────────────────────────────────────────────
  const InputBox = (
    <div className={`w-full rounded-3xl border p-4 shadow-sm transition-all duration-200 ${
      isActive
        ? 'border-[#4D6BFE]/60 bg-gradient-to-b from-[#EEF2FF] to-[#F0F4FF] shadow-lg shadow-[#4D6BFE]/10'
        : 'border-gray-200 bg-white'
    }`}>
      {attachedFiles.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachedFiles.map((file, i) => (
            <div key={i} className="flex items-center gap-1.5 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-[13px] text-indigo-700">
              {file.type.startsWith('image/') ? <Image className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
              <span className="max-w-[120px] truncate">{file.name}</span>
              <button onClick={() => removeFile(i)} className="ml-1 opacity-50 hover:opacity-100">✕</button>
            </div>
          ))}
        </div>
      )}
      <textarea
        ref={textareaRef}
        placeholder={isRecording ? 'Grozl Is Listening...' : 'Ask Grozl anything...'}
        rows={1} value={inputValue} onChange={handleInput}
        onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)}
        disabled={isLoading}
        className="w-full resize-none bg-transparent text-base text-gray-800 outline-none placeholder:text-gray-400 disabled:opacity-50"
      />
      <div className="mt-3.5 flex items-center justify-between">
        <div className="flex gap-2.5">
          {['think', 'search'].map(chip => (
            <button key={chip} onClick={() => toggleChip(chip)}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-medium transition-all duration-250 ease-out capitalize ${
                activeChips.has(chip)
                  ? 'border-[#4D6BFE]/60 bg-gradient-to-r from-[#EEF2FF] to-[#F0F4FF] text-[#4D6BFE] shadow-sm shadow-[#4D6BFE]/10'
                  : 'border-gray-200 bg-white/80 text-gray-500 hover:border-gray-300 hover:bg-white hover:text-gray-600 hover:shadow-sm'
              }`}
            >
              {chip === 'think' ? (
                <svg className="h-[15px] w-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z" />
                  <path d="M9 21h6" /><path d="M12 6v1" /><path d="M9.5 9h5" />
                </svg>
              ) : (
                <svg className="h-[15px] w-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  <path d="M2 12h20" />
                </svg>
              )}
              {chip}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            {showAttachMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowAttachMenu(false)} />
                <div className="absolute bottom-9 right-0 z-50 w-[160px] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl">
                  {[
                    { label: 'Camera', ref: cameraInputRef, icon: <Camera className="h-5 w-5" /> },
                    { label: 'Photos', ref: photoInputRef,  icon: <Image className="h-5 w-5" /> },
                    { label: 'Files',  ref: fileInputRef,   icon: <FileText className="h-5 w-5" /> },
                  ].map((item, idx, arr) => (
                    <button key={item.label} onClick={() => { item.ref.current?.click(); setShowAttachMenu(false) }}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-[14px] font-medium text-gray-700 transition hover:bg-indigo-50 hover:text-indigo-600 ${idx < arr.length - 1 ? 'border-b border-gray-100' : ''}`}
                    >
                      {item.icon} {item.label}
                    </button>
                  ))}
                </div>
              </>
            )}
            <button onClick={() => setShowAttachMenu(!showAttachMenu)} className="text-gray-500 transition hover:text-gray-700">
              <Plus className="h-5 w-5" />
            </button>
          </div>
          {!hasText && attachedFiles.length === 0 ? (
            <button onClick={handleMicClick} className={`transition ${isRecording ? 'animate-pulse text-red-500' : 'text-gray-500 hover:text-gray-700'}`}>
              {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>
          ) : (
            <button onClick={handleSend} disabled={isLoading} className="text-indigo-600 transition hover:text-indigo-700 disabled:opacity-50">
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </button>
          )}
        </div>
      </div>
    </div>
  )

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className="flex h-dvh overflow-hidden bg-gradient-to-b from-slate-50 to-indigo-50">
      <div className="flex w-full flex-col overflow-hidden">

        {/* Hidden file inputs */}
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
        <input ref={photoInputRef}  type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
        <input ref={fileInputRef}   type="file" multiple className="hidden" onChange={handleFileChange} />

        {/* ── Sidebar ──────────────────────────────────────────────────── */}
        <div className={`fixed left-0 top-0 z-50 flex h-full w-72 -translate-x-full flex-col border-r border-gray-200 bg-white shadow-xl transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : ''}`}>

          {/* Scrollable content */}
          <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-6 pb-2">
            {/* Search */}
            <div className="relative mb-5">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search chats..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-sm text-gray-800 outline-none focus:border-indigo-300 placeholder:text-gray-400"
              />
            </div>

            {/* New Chat */}
            <button onClick={() => { setActiveMenuItem(activeMenuItem === 'newchat' ? null : 'newchat'); newChat() }}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-[15px] font-medium transition-all ${
                activeMenuItem === 'newchat'
                  ? 'border-[#4D6BFE]/60 bg-gradient-to-r from-[#EEF2FF] to-[#F0F4FF] text-[#4D6BFE] shadow-sm'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <MessageSquarePlus className={`h-5 w-5 ${activeMenuItem === 'newchat' ? 'text-[#4D6BFE]' : 'text-gray-400'}`} />
              New Chat
            </button>

            {/* Projects */}
            <button onClick={() => setActiveMenuItem(activeMenuItem === 'projects' ? null : 'projects')}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-[15px] font-medium transition-all ${
                activeMenuItem === 'projects'
                  ? 'border-[#4D6BFE]/60 bg-gradient-to-r from-[#EEF2FF] to-[#F0F4FF] text-[#4D6BFE] shadow-sm'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <FolderOpen className={`h-5 w-5 ${activeMenuItem === 'projects' ? 'text-[#4D6BFE]' : 'text-gray-400'}`} />
              Projects
            </button>

            {/* Artifacts */}
            <button
              onClick={() => { setActiveMenuItem(activeMenuItem === 'artifacts' ? null : 'artifacts'); setShowArtifactsList(prev => !prev) }}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-[15px] font-medium transition-all ${
                activeMenuItem === 'artifacts'
                  ? 'border-[#4D6BFE]/60 bg-gradient-to-r from-[#EEF2FF] to-[#F0F4FF] text-[#4D6BFE] shadow-sm'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <svg className={`h-5 w-5 ${activeMenuItem === 'artifacts' ? 'text-[#4D6BFE]' : 'text-gray-400'}`}
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
                  activeMenuItem === 'artifacts' ? 'bg-[#4D6BFE]/20 text-[#4D6BFE]' : 'bg-gray-100 text-gray-500'
                }`}>
                  {allArtifacts.length}
                </span>
              )}
            </button>

            {/* Artifacts dropdown */}
            {showArtifactsList && (
              <div className="ml-2 flex flex-col gap-1 border-l-2 border-indigo-100 pl-3">
                {allArtifacts.length === 0 ? (
                  <p className="py-2 text-[12px] italic text-gray-400">No artifacts yet</p>
                ) : (
                  allArtifacts.map((art, i) => (
                    <button key={i}
                      onClick={() => { setActiveArtifact(art); setShowArtifactModal(true); setSidebarOpen(false) }}
                      className="flex items-center gap-2 rounded-lg px-2 py-2 text-left text-[13px] text-gray-600 transition hover:bg-indigo-50 hover:text-indigo-600"
                    >
                      <Code2 className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
                      <span className="truncate">{art.title}</span>
                      <span className="ml-auto shrink-0 text-[10px] capitalize text-gray-400">{art.type}</span>
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Recent Chats */}
            <span className="ml-1 mt-4 text-xs font-semibold uppercase tracking-wide text-gray-400">Recent Chats</span>
            <div className="flex flex-col gap-1">
              {sortedSessions.length === 0 ? (
                <p className="px-2 py-3 text-[13px] italic text-gray-400">
                  {searchQuery ? 'No matching chats' : 'No recent chats yet'}
                </p>
              ) : (
                sortedSessions.map(session => (
                  <div key={session.id} className="relative">
                    {renamingId === session.id ? (
                      <div className="flex items-center gap-1.5 rounded-xl bg-indigo-50 px-3 py-2">
                        <input autoFocus value={renameValue} onChange={e => setRenameValue(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') confirmRename(); if (e.key === 'Escape') setRenamingId(null) }}
                          onBlur={confirmRename}
                          className="flex-1 bg-transparent text-[14px] text-indigo-700 outline-none"
                        />
                      </div>
                    ) : (
                      <button
                        onClick={() => loadSession(session)}
                        onMouseDown={e => handleLongPressStart(e, session.id)}
                        onMouseUp={handleLongPressEnd} onMouseLeave={handleLongPressEnd}
                        onTouchStart={e => handleLongPressStart(e, session.id)} onTouchEnd={handleLongPressEnd}
                        onContextMenu={e => {
                          e.preventDefault()
                          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                          setContextMenu({ sessionId: session.id, x: rect.left, y: rect.bottom + 4 })
                        }}
                        className={`flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-left text-[14px] text-gray-600 transition hover:bg-indigo-50 hover:text-indigo-600 ${session.id === currentSessionId ? 'bg-indigo-50 text-indigo-600' : ''}`}
                      >
                        <div className="mt-0.5 shrink-0">
                          {session.pinned ? (
                            <svg className="h-4 w-4 text-[#4D6BFE]" viewBox="0 0 24 24" fill="currentColor"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>
                          ) : session.favorite ? (
                            <svg className="h-4 w-4 text-amber-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                          ) : (
                            <MessageSquare className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                        <span className="line-clamp-2 leading-snug">{session.title}</span>
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Context Menu */}
          {contextMenu && (
            <>
              <div className="fixed inset-0 z-[60]" onClick={() => setContextMenu(null)} />
              <div className="fixed z-[70] w-44 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl"
                style={{ top: Math.min(contextMenu.y, window.innerHeight - 230), left: Math.min(contextMenu.x, window.innerWidth - 185) }}
              >
                {[
                  { label: chatSessions.find(s => s.id === contextMenu.sessionId)?.pinned ? 'Unpin' : 'Pin', action: () => handlePin(contextMenu.sessionId) },
                  { label: chatSessions.find(s => s.id === contextMenu.sessionId)?.favorite ? 'Unfavorite' : 'Favorite', action: () => handleFavorite(contextMenu.sessionId) },
                    { label: 'Rename', action: () => { const s = chatSessions.find(x => x.id === contextMenu.sessionId); if (s) startRename(s) } },
                ].map((item, i) => (
                  <button key={i} onClick={item.action} className="flex w-full items-center gap-3 border-b border-gray-100 px-4 py-3 text-[14px] font-medium text-gray-700 transition hover:bg-indigo-50 hover:text-indigo-600">
                    {item.label}
                  </button>
                ))}
                <button onClick={() => handleDelete(contextMenu.sessionId)} className="flex w-full items-center gap-3 px-4 py-3 text-[14px] font-medium text-rose-500 transition hover:bg-red-50">
                  Delete
                </button>
              </div>
            </>
          )}

          {/* ── Bottom user bar ─────────────────────────────────────────── */}
<div className="flex items-center justify-between border-t border-gray-100 px-5 py-4">
  <div className="flex min-w-0 items-center gap-3">
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-900 text-[13px] font-bold text-white">
      {initials}
    </div>
    <span className="truncate text-[15px] font-medium text-gray-800">{displayName}</span>
  </div>
  <button
    onClick={() => { setSidebarOpen(false); setShowSettings(true) }}
    className="ml-3 shrink-0 rounded-xl p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
  >
    <Settings className="h-5 w-5" />
  </button>
</div>
</div>

{sidebarOpen && <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setSidebarOpen(false)} />}

{/* ── Header ───────────────────────────────────────────────────── */}
<header className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between p-4">
  <button onClick={() => setSidebarOpen(true)} className="text-gray-500 transition hover:text-gray-700">
    <Menu className="h-6 w-6" />
  </button>
  <button onClick={newChat} className="text-gray-500 transition hover:text-gray-700">
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
        <h1 className="mb-7 text-center text-[28px] font-semibold tracking-tight text-gray-900">
          Your Mind, Amplified By Grozl
        </h1>
        {InputBox}
      </div>
    </div>
  ) : (
    <div className="flex-1 overflow-y-auto px-4 pb-4 pt-16">
      <div className="mx-auto flex w-full max-w-[700px] flex-col gap-5">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="mr-2.5 mt-1 h-7 w-7 shrink-0 overflow-hidden rounded-full">
                <img src="/logo.png" alt="Grozl" className="h-full w-full object-contain" />
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[#4D6BFE] text-white'
                  : 'border border-gray-100 bg-white text-gray-800 shadow-sm'
              }`}
            >
              {renderContent(msg.content, msg.role === 'assistant', i === messages.length - 1)}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  )}

  {hasMessages && (
    <div className="w-full px-4 pb-4">
      <div className="mx-auto w-full max-w-[650px]">{InputBox}</div>
    </div>
  )}
</main>
</div>

{/* ── Artifact Modal ───────────────────────────────────────────────── */}
{activeArtifact && showArtifactModal && (
  <>
    <div className="hidden md:block md:w-1/2 shrink-0">
      <ArtifactPanel
        artifact={activeArtifact}
        onClose={() => {
          setActiveArtifact(null)
          setShowArtifactModal(false)
        }}
      />
    </div>

    <div className="fixed inset-0 z-50 flex flex-col md:hidden">
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <Code2 className="h-4 w-4 text-indigo-500" />
          <span className="text-sm font-semibold text-gray-800">{activeArtifact.title}</span>
        </div>
        <button
          onClick={() => {
            setActiveArtifact(null)
            setShowArtifactModal(false)
          }}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
<div className="flex-1 overflow-hidden">
  <ArtifactPanel
    artifact={activeArtifact}
    onClose={() => {
      setActiveArtifact(null)
      setShowArtifactModal(false)
    }}
  />
</div>
</div>
</>
)}

      {/* ── Settings Screen ───────────────────────────────────────── */}
      {showSettings && (
        <SettingsScreen
          user={user}
          chatCount={chatSessions.length}
          onClose={() => setShowSettings(false)}
          onClearChats={() => {
            setChatSessions([])
            localStorage.removeItem('grozl_chat_sessions')
            newChat()
          }}
          onLogout={() => {
            localStorage.removeItem('grozl_user_profile')
            window.location.reload()
          }}
        />
      )}
      </div>
    </div>
  )
                        }

'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import {
  Menu, Plus, Search, FolderOpen, MessageSquarePlus,
  Mic, MicOff, Send, Camera, Image, FileText, Loader2, MessageSquare,
  Code2, ExternalLink, X, Settings, User as UserIcon, Moon, Sun, Monitor,
  Languages, Brain, Cpu, Type, History, Info, HelpCircle, LogOut, Trash2, Check, ChevronRight
} from 'lucide-react'
import { useTheme } from 'next-themes'
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
  const [showSettings, setShowSettings]     = useState(false)

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

  // ── Settings state ──────────────────────────────────────────────────
  const { theme, setTheme } = useTheme()
  const [language, setLanguage] = useState('English')
  const [model, setModel] = useState('Auto')
  const [fontSize, setFontSize] = useState(16)
  const [historyEnabled, setHistoryEnabled] = useState(true)
  const [userMemory, setUserMemory] = useState<string | null>(null)
  const [isClearingMemory, setIsClearingMemory] = useState(false)

  // ── Refs ─────────────────────────────────────────────────────────────
  const textareaRef    = useRef<HTMLTextAreaElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const photoInputRef  = useRef<HTMLInputElement>(null)
  const fileInputRef   = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any | null>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const supabase = createClient()

  // ── Load user profile & settings ─────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem('grozl_user_profile')
    if (stored) {
      try { setUserProfile(JSON.parse(stored)) } catch { /* ignore */ }
    }

    // Load other settings
    const storedLang = localStorage.getItem('grozl_language')
    if (storedLang) setLanguage(storedLang)

    const storedModel = localStorage.getItem('grozl_model')
    if (storedModel) setModel(storedModel)

    const storedFontSize = localStorage.getItem('grozl_font_size')
    if (storedFontSize) {
      const size = parseInt(storedFontSize)
      setFontSize(size)
      document.documentElement.style.setProperty('--grozl-font-size', `${size}px`)
    }

    const storedHistory = localStorage.getItem('grozl_history_enabled')
    if (storedHistory !== null) setHistoryEnabled(storedHistory === 'true')

    if (user) {
      fetchMemory()
    }
  }, [user])

  const fetchMemory = async () => {
    try {
      const { data, error } = await supabase.from('user_memories').select('memory_text').single()
      if (data) setUserMemory(data.memory_text)
    } catch { /* ignore */ }
  }

  const clearMemory = async () => {
    if (!user) return
    setIsClearingMemory(true)
    try {
      await supabase.from('user_memories').delete().eq('user_id', user.id)
      setUserMemory(null)
    } catch { /* ignore */ }
    setIsClearingMemory(false)
  }

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang)
    localStorage.setItem('grozl_language', lang)
  }

  const handleModelChange = (m: string) => {
    setModel(m)
    localStorage.setItem('grozl_model', m)
  }

  const handleFontSizeChange = (size: number) => {
    setFontSize(size)
    localStorage.setItem('grozl_font_size', size.toString())
    document.documentElement.style.setProperty('--grozl-font-size', `${size}px`)
  }

  const handleHistoryToggle = (enabled: boolean) => {
    setHistoryEnabled(enabled)
    localStorage.setItem('grozl_history_enabled', enabled.toString())
  }

  const clearGuestData = () => {
    if (confirm('Are you sure you want to clear all local chat history and profile?')) {
      localStorage.removeItem('grozl_chat_sessions')
      localStorage.removeItem('grozl_user_profile')
      window.location.reload()
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.reload()
  }

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
    if (!isLoading && messages.length >= 2 && sessionsLoaded && historyEnabled) {
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
    if (messages.length >= 2 && historyEnabled) saveSession(messages, currentSessionId)
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
  }, [messages, currentSessionId, saveSession, historyEnabled])

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
    const newFav = !session?.favorite
    updateSessions(prev => prev.map(s => s.id === sessionId ? { ...s, favorite: newFav } : s))
    setContextMenu(null)
    if (user && session) {
      try { await fetch('/api/chat/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...session, favorite: newFav }) }) } catch { /* ignore */ }
    }
  }

  const handleDelete = async (sessionId: string) => {
    updateSessions(prev => prev.filter(s => s.id !== sessionId))
    setContextMenu(null)
    if (sessionId === currentSessionId) setMessages([])
    if (user) {
      try { await fetch('/api/chat/sessions', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: sessionId }) }) } catch { /* ignore */ }
    }
  }

  const startRename = (sessionId: string, currentTitle: string) => {
    setRenamingId(sessionId)
    setRenameValue(currentTitle)
    setContextMenu(null)
  }

  const confirmRename = async () => {
    if (!renamingId) return
    const newTitle = renameValue.trim() || 'Untitled Chat'
    updateSessions(prev => prev.map(s => s.id === renamingId ? { ...s, title: newTitle } : s))
    const session = chatSessions.find(s => s.id === renamingId)
    setRenamingId(null)
    if (user && session) {
      try { await fetch('/api/chat/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...session, title: newTitle }) }) } catch { /* ignore */ }
    }
  }

  // ── Input & Send ─────────────────────────────────────────────────────
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setAttachedFiles(prev => [...prev, ...Array.from(e.target.files!)])
  }

  const removeFile = (index: number) => setAttachedFiles(prev => prev.filter((_, i) => i !== index))

  const handleSend = async () => {
    if ((!inputValue.trim() && attachedFiles.length === 0) || isLoading) return

    const userMessage: Message = {
      role: 'user',
      content: attachedFiles.length > 0
        ? [
            { type: 'text', text: inputValue.trim() },
            ...attachedFiles.map(f => ({ type: 'image_url' as const, image_url: { url: URL.createObjectURL(f) } }))
          ]
        : inputValue.trim()
    }

    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInputValue('')
    setAttachedFiles([])
    setIsLoading(true)
    setIsStreaming(true)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: newMessages, 
          useReasoning: activeChips.has('think'), 
          useSearch: activeChips.has('search'),
          language,
          model
        }),
      })

      if (!response.ok) throw new Error('Failed to fetch')

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ''

      setMessages(prev => [...prev, { role: 'assistant', content: '' }])

      while (true) {
        const { done, value } = await reader!.read()
        if (done) break
        const chunk = decoder.decode(value)
        assistantContent += chunk
        setMessages(prev => {
          const last = prev[prev.length - 1]
          if (last.role === 'assistant') {
            return [...prev.slice(0, -1), { ...last, content: assistantContent }]
          }
          return prev
        })
      }
    } catch (err) {
      console.error(err)
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }])
    } finally {
      setIsLoading(false)
      setIsStreaming(false)
    }
  }

  const toggleChip = (chip: string) => {
    setActiveChips(prev => {
      const next = new Set(prev)
      if (next.has(chip)) next.delete(chip)
      else next.add(chip)
      return next
    })
  }

  const handleMicClick = () => {
    if (isRecording) {
      recognitionRef.current?.stop()
      setIsRecording(false)
    } else {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition()
        recognition.lang = 'en-US'
        recognition.interimResults = true
        recognition.onresult = (e: any) => {
          const transcript = Array.from(e.results).map((r: any) => r[0].transcript).join('')
          setInputValue(transcript)
        }
        recognition.onend = () => setIsRecording(false)
        recognition.start()
        recognitionRef.current = recognition
        setIsRecording(true)
      }
    }
  }

  const hasText = inputValue.trim().length > 0
  const isActive = isFocused || hasText || attachedFiles.length > 0

  // ── Render Helpers ───────────────────────────────────────────────────
  const renderMessageContent = (content: string | ContentPart[]) => {
    if (typeof content === 'string') {
      // Basic markdown-like formatting (bold, code blocks)
      const parts = content.split(/(<artifact[\s\S]*?<\/artifact>)/g)
      return parts.map((part, i) => {
        if (part.startsWith('<artifact')) {
          const match = part.match(/title="([^"]+)"/)
          const title = match ? match[1] : 'Artifact'
          return (
            <div key={i} className="my-4 flex items-center justify-between rounded-xl border border-indigo-100 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                  <Code2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{title}</p>
                  <p className="text-xs text-gray-500">Grozl Artifact</p>
                </div>
              </div>
              <button
                onClick={() => {
                  const m = part.match(/type="([^"]+)"(?:\s+language="([^"]+)")?(?:\s+title="([^"]+)")?[^>]*>([\s\S]*?)<\/artifact>/)
                  if (m) {
                    setActiveArtifact({ type: m[1] as any, language: m[2], title: m[3] || 'Artifact', content: m[4].trim() })
                    setShowArtifactModal(true)
                  }
                }}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-700"
              >
                Open Preview
              </button>
            </div>
          )
        }
        return (
          <div key={i} className="whitespace-pre-wrap text-[15px] leading-relaxed dark:text-gray-200">
            {part.split('\n').map((line, j) => (
              <p key={j} className={line.trim() === '' ? 'h-2' : ''}>{line}</p>
            ))}
          </div>
        )
      })
    }
    return content.map((part, i) => {
      if (part.type === 'text') return <p key={i} className="text-[15px] dark:text-gray-200">{part.text}</p>
      if (part.type === 'image_url') return <img key={i} src={part.image_url?.url} alt="Uploaded" className="mt-2 max-w-full rounded-xl border dark:border-gray-700" />
      return null
    })
          }
        const InputArea = (
    <div className={`w-full rounded-3xl border p-4 shadow-sm transition-all duration-200 ${
      isActive
        ? 'border-indigo-400/60 bg-white dark:bg-gray-800 dark:border-indigo-500/40 shadow-lg shadow-indigo-500/10'
        : 'border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700'
    }`}>
      {attachedFiles.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachedFiles.map((file, i) => (
            <div key={i} className="flex items-center gap-1.5 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-[13px] text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-300">
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
        className="w-full resize-none bg-transparent text-base text-gray-800 dark:text-gray-100 outline-none placeholder:text-gray-400 disabled:opacity-50"
      />
      <div className="mt-3.5 flex items-center justify-between">
        <div className="flex gap-2.5">
          {['think', 'search'].map(chip => (
            <button key={chip} onClick={() => toggleChip(chip)}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-medium transition-all duration-250 ease-out capitalize ${
                activeChips.has(chip)
                  ? 'border-indigo-400/60 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300 shadow-sm shadow-indigo-500/10'
                  : 'border-gray-200 bg-white/80 text-gray-500 hover:border-gray-300 hover:bg-white hover:text-gray-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400'
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
                <div className="absolute bottom-9 right-0 z-50 w-[160px] overflow-hidden rounded-2xl border border-gray-100 bg-white dark:bg-gray-800 dark:border-gray-700 shadow-2xl">
                  {[
                    { label: 'Camera', ref: cameraInputRef, icon: <Camera className="h-5 w-5" /> },
                    { label: 'Photos', ref: photoInputRef,  icon: <Image className="h-5 w-5" /> },
                    { label: 'Files',  ref: fileInputRef,   icon: <FileText className="h-5 w-5" /> },
                  ].map((item, idx, arr) => (
                    <button key={item.label} onClick={() => { item.ref.current?.click(); setShowAttachMenu(false) }}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-[14px] font-medium text-gray-700 dark:text-gray-300 transition hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 ${idx < arr.length - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''}`}
                    >
                      {item.icon} {item.label}
                    </button>
                  ))}
                </div>
              </>
            )}
            <button onClick={() => setShowAttachMenu(!showAttachMenu)} className="text-gray-500 transition hover:text-gray-700 dark:hover:text-gray-300">
              <Plus className="h-5 w-5" />
            </button>
          </div>
          {!hasText && attachedFiles.length === 0 ? (
            <button onClick={handleMicClick} className={`transition ${isRecording ? 'animate-pulse text-red-500' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
              {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>
          ) : (
            <button onClick={handleSend} disabled={isLoading} className="text-indigo-600 transition hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 disabled:opacity-50">
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </button>
          )}
        </div>
      </div>
    </div>
  )

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className="flex h-dvh overflow-hidden bg-white dark:bg-gray-950 transition-colors duration-300">
      <div className="flex w-full flex-col overflow-hidden">

        {/* Hidden file inputs */}
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
        <input ref={photoInputRef}  type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
        <input ref={fileInputRef}   type="file" multiple className="hidden" onChange={handleFileChange} />

        {/* ── Sidebar ──────────────────────────────────────────────────── */}
        <div className={`fixed left-0 top-0 z-50 flex h-full w-72 -translate-x-full flex-col border-r border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-800 shadow-xl transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : ''}`}>

          {/* Scrollable content */}
          <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-6 pb-2">
            {/* Search */}
            <div className="relative mb-5">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search chats..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 dark:bg-gray-800 dark:border-gray-700 py-2.5 pl-9 pr-3 text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-indigo-300 placeholder:text-gray-400"
              />
            </div>

            {/* New Chat */}
            <button onClick={() => { setActiveMenuItem(activeMenuItem === 'newchat' ? null : 'newchat'); newChat() }}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-[15px] font-medium transition-all ${
                activeMenuItem === 'newchat'
                  ? 'border-indigo-400/60 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800 shadow-sm'
                  : 'border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <MessageSquarePlus className={`h-5 w-5 ${activeMenuItem === 'newchat' ? 'text-indigo-600' : 'text-gray-400'}`} />
              New Chat
            </button>

            {/* Artifacts */}
            <button
              onClick={() => { setActiveMenuItem(activeMenuItem === 'artifacts' ? null : 'artifacts'); setShowArtifactsList(prev => !prev) }}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-[15px] font-medium transition-all ${
                activeMenuItem === 'artifacts'
                  ? 'border-indigo-400/60 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800 shadow-sm'
                  : 'border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <Code2 className={`h-5 w-5 ${activeMenuItem === 'artifacts' ? 'text-indigo-600' : 'text-gray-400'}`} />
              Artifacts
              {allArtifacts.length > 0 && (
                <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  activeMenuItem === 'artifacts' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500'
                }`}>
                  {allArtifacts.length}
                </span>
              )}
            </button>

            {/* Artifacts dropdown */}
            {showArtifactsList && (
              <div className="ml-2 flex flex-col gap-1 border-l-2 border-indigo-100 dark:border-indigo-900 pl-3">
                {allArtifacts.length === 0 ? (
                  <p className="py-2 text-[12px] italic text-gray-400">No artifacts yet</p>
                ) : (
                  allArtifacts.map((art, i) => (
                    <button key={i}
                      onClick={() => { setActiveArtifact(art); setShowArtifactModal(true); setSidebarOpen(false) }}
                      className="flex items-center gap-2 rounded-lg px-2 py-2 text-left text-[13px] text-gray-600 dark:text-gray-400 transition hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400"
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
            <span className="ml-1 mt-4 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Recent Chats</span>
            <div className="flex flex-col gap-1">
              {sortedSessions.length === 0 ? (
                <p className="px-2 py-3 text-[13px] italic text-gray-400">
                  {searchQuery ? 'No matching chats' : 'No recent chats yet'}
                </p>
              ) : (
                sortedSessions.map(session => (
                  <div key={session.id} className="relative">
                    {renamingId === session.id ? (
                      <div className="flex items-center gap-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 px-3 py-2">
                        <input autoFocus value={renameValue} onChange={e => setRenameValue(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') confirmRename(); if (e.key === 'Escape') setRenamingId(null) }}
                          onBlur={confirmRename}
                          className="flex-1 bg-transparent text-[14px] text-indigo-700 dark:text-indigo-300 outline-none"
                        />
                      </div>
                    ) : (
                      <button
                        onClick={() => loadSession(session)}
                        onContextMenu={e => { e.preventDefault(); setContextMenu({ sessionId: session.id, x: e.clientX, y: e.clientY }) }}
                        onTouchStart={e => handleLongPressStart(e, session.id)} onTouchEnd={handleLongPressEnd}
                        className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all ${
                          currentSessionId === session.id
                            ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                      >
                        <MessageSquare className={`h-4 w-4 shrink-0 ${currentSessionId === session.id ? 'text-indigo-500' : 'text-gray-400'}`} />
                        <span className="flex-1 truncate text-[14px]">{session.title}</span>
                        {session.pinned && <div className="h-1.5 w-1.5 rounded-full bg-indigo-500" />}
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Sidebar Footer */}
          <div className="border-t border-gray-100 dark:border-gray-800 p-4">
            <button
              onClick={() => { setShowSettings(true); setSidebarOpen(false) }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14px] font-medium text-gray-600 dark:text-gray-400 transition hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <Settings className="h-5 w-5 text-gray-400" />
              Settings
            </button>
            <div className="mt-2 flex items-center gap-3 px-3 py-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-400 text-sm font-bold">
                {user?.user_metadata?.full_name?.[0] || userProfile?.fullName?.[0] || 'G'}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-xs font-semibold text-gray-900 dark:text-gray-100">
                  {user?.user_metadata?.full_name || userProfile?.fullName || 'Guest User'}
                </p>
                <p className="truncate text-[10px] text-gray-500 dark:text-gray-500">
                  {user?.email || (userProfile?.nickname ? `@${userProfile.nickname}` : 'Free Plan')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar overlay */}
        {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]" onClick={() => setSidebarOpen(false)} />}

        {/* ── Header ───────────────────────────────────────────────────── */}
        <header className="flex h-16 items-center justify-between border-b border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 px-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-100 dark:hover:bg-gray-800">
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 shadow-sm">
                <span className="text-lg font-black text-white">G</span>
              </div>
              <span className="text-lg font-bold tracking-tight text-gray-900 dark:text-gray-100">Grozl</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={newChat} className="hidden items-center gap-2 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 transition hover:bg-gray-50 dark:hover:bg-gray-700 sm:flex">
              <Plus className="h-4 w-4" /> New Chat
            </button>
          </div>
        </header>
           {/* ── Main Chat Area ───────────────────────────────────────────── */}
        <main className="relative flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="mx-auto max-w-3xl space-y-8 pb-32 pt-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center pt-20 text-center">
                  <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-600 shadow-xl shadow-indigo-200 dark:shadow-none">
                    <span className="text-4xl font-black text-white">G</span>
                  </div>
                  <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
                    Hello, {userProfile?.nickname || user?.user_metadata?.full_name?.split(' ')[0] || 'there'}!
                  </h1>
                  <p className="mb-10 text-gray-500 dark:text-gray-400">How can Grozl help you today?</p>
                  <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
                    {[
                      { icon: <Code2 />, title: 'Write a React component', desc: 'Generate clean, modern code' },
                      { icon: <Languages />, title: 'Explain quantum physics', desc: 'In simple Hinglish terms' },
                      { icon: <Brain />, title: 'Debug my SQL query', desc: 'Find and fix bottlenecks' },
                      { icon: <MessageSquare />, title: 'Brainstorm blog ideas', desc: 'Creative and viral topics' },
                    ].map((item, i) => (
                      <button key={i} onClick={() => setInputValue(item.title)}
                        className="flex flex-col items-start rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 text-left transition hover:border-indigo-200 dark:hover:border-indigo-800 hover:shadow-md dark:hover:shadow-none"
                      >
                        <div className="mb-2 text-indigo-600 dark:text-indigo-400">{item.icon}</div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{item.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-500">{item.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm border border-gray-100 dark:border-gray-700'
                    }`}>
                      {renderMessageContent(msg.content)}
                    </div>
                  </div>
                ))
              )}
              {isStreaming && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-2xl bg-white dark:bg-gray-800 px-4 py-3 text-gray-400 shadow-sm border border-gray-100 dark:border-gray-700">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm italic">Grozl is thinking...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* ── Input Area ─────────────────────────────────────────────── */}
          <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-white dark:from-gray-950 via-white/90 dark:via-gray-950/90 to-transparent px-4 pb-6 pt-10">
            <div className="mx-auto max-w-3xl">
              {InputArea}
              <p className="mt-3 text-center text-[11px] text-gray-400 dark:text-gray-600">
                Grozl can make mistakes. Check important info.
              </p>
            </div>
          </div>
        </main>

        {/* ── Artifact Modal ───────────────────────────────────────────── */}
        {showArtifactModal && activeArtifact && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 sm:p-8">
            <div className="h-full w-full max-w-6xl overflow-hidden rounded-3xl bg-white dark:bg-gray-900 shadow-2xl">
              <ArtifactPanel artifact={activeArtifact} onClose={() => setShowArtifactModal(false)} />
            </div>
          </div>
        )}

        {/* ── Settings Modal ───────────────────────────────────────────── */}
        {showSettings && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-md p-4">
            <div className="flex h-[85dvh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white dark:bg-gray-900 shadow-2xl">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Settings className="h-6 w-6 text-indigo-600" /> Settings
                </h2>
                <button onClick={() => setShowSettings(false)} className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 dark:hover:bg-gray-800">
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Account Section */}
                <section>
                  <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Account & Profile</h3>
                  <div className="flex items-center gap-4 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 bg-gray-50/50 dark:bg-gray-800/50">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-white text-xl font-bold">
                      {user?.user_metadata?.full_name?.[0] || userProfile?.fullName?.[0] || 'G'}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="font-bold text-gray-900 dark:text-gray-100">{user?.user_metadata?.full_name || userProfile?.fullName || 'Guest User'}</p>
                      <p className="text-sm text-gray-500 truncate">{user?.email || (userProfile?.nickname ? `@${userProfile.nickname}` : 'No email provided')}</p>
                    </div>
                    {user ? (
                      <button onClick={handleLogout} className="flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-900/20 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 transition hover:bg-red-100 dark:hover:bg-red-900/40">
                        <LogOut className="h-4 w-4" /> Log Out
                      </button>
                    ) : (
                      <button onClick={() => window.location.reload()} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700">
                        Sign In
                      </button>
                    )}
                  </div>
                </section>

                {/* Appearance Section */}
                <section>
                  <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Appearance</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'light', icon: <Sun />, label: 'Light' },
                      { id: 'dark', icon: <Moon />, label: 'Dark' },
                      { id: 'system', icon: <Monitor />, label: 'System' },
                    ].map(item => (
                      <button key={item.id} onClick={() => setTheme(item.id)}
                        className={`flex flex-col items-center gap-2 rounded-2xl border p-4 transition ${
                          theme === item.id 
                            ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' 
                            : 'border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700'
                        }`}
                      >
                        {item.icon}
                        <span className="text-sm font-medium">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </section>

                {/* Language & AI Section */}
                <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Language</h3>
                    <div className="space-y-2">
                      {['English', 'Hinglish', 'Hindi'].map(lang => (
                        <button key={lang} onClick={() => handleLanguageChange(lang)}
                          className={`flex w-full items-center justify-between rounded-xl border p-3 text-sm font-medium transition ${
                            language === lang 
                              ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' 
                              : 'border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800'
                          }`}
                        >
                          {lang} {language === lang && <Check className="h-4 w-4" />}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400">AI Model</h3>
                    <div className="space-y-2">
                      {['Auto', 'DeepSeek', 'Groq'].map(m => (
                        <button key={m} onClick={() => handleModelChange(m)}
                          className={`flex w-full items-center justify-between rounded-xl border p-3 text-sm font-medium transition ${
                            model === m 
                              ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' 
                              : 'border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800'
                          }`}
                        >
                          {m} {model === m && <Check className="h-4 w-4" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </section>

                {/* Font Size Section */}
                <section>
                  <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Font Size</h3>
                  <div className="flex items-center gap-6 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
                    <span className="text-sm text-gray-500">A</span>
                    <input type="range" min="12" max="24" step="1" value={fontSize} onChange={(e) => handleFontSizeChange(parseInt(e.target.value))}
                      className="flex-1 accent-indigo-600"
                    />
                    <span className="text-xl font-bold text-gray-900 dark:text-gray-100">A</span>
                    <span className="min-w-[40px] text-right text-sm font-medium text-indigo-600">{fontSize}px</span>
                  </div>
                </section>

                {/* Data & Privacy Section */}
                <section className="space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Data & Privacy</h3>
                  
                  {/* History Toggle */}
                  <div className="flex items-center justify-between rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-gray-100 dark:bg-gray-800 p-2"><History className="h-5 w-5 text-gray-500" /></div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Chat History</p>
                        <p className="text-xs text-gray-500">Save your conversations to the cloud</p>
                      </div>
                    </div>
                    <button onClick={() => handleHistoryToggle(!historyEnabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${historyEnabled ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${historyEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>

                  {/* Memory View */}
                  <div className="rounded-2xl border border-gray-100 dark:border-gray-800 p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-gray-100 dark:bg-gray-800 p-2"><Brain className="h-5 w-5 text-gray-500" /></div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Grozl Memory</p>
                          <p className="text-xs text-gray-500">What Grozl remembers about you</p>
                        </div>
                      </div>
                      {userMemory && (
                        <button onClick={clearMemory} disabled={isClearingMemory} className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-50">
                          Clear Memory
                        </button>
                      )}
                    </div>
                    <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-3 text-xs text-gray-600 dark:text-gray-400 italic">
                      {user ? (userMemory || 'Grozl hasn\'t learned anything about you yet. Start chatting!') : 'Sign in to enable long-term memory.'}
                    </div>
                  </div>

                  {/* Clear Guest Data */}
                  {!user && (
                    <button onClick={clearGuestData} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-100 dark:border-red-900/30 bg-red-50/30 dark:bg-red-900/10 p-4 text-sm font-bold text-red-600 dark:text-red-400 transition hover:bg-red-50 dark:hover:bg-red-900/20">
                      <Trash2 className="h-4 w-4" /> Clear Local Guest Data
                    </button>
                  )}
                </section>

                {/* Support & About */}
                <section className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Support & About</h3>
                  <a href="mailto:support@grozl.ai" className="flex items-center justify-between rounded-2xl border border-gray-100 dark:border-gray-800 p-4 transition hover:bg-gray-50 dark:hover:bg-gray-800">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-gray-100 dark:bg-gray-800 p-2"><HelpCircle className="h-5 w-5 text-gray-500" /></div>
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Help & Feedback</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </a>
                  <div className="flex items-center justify-between rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-gray-100 dark:bg-gray-800 p-2"><Info className="h-5 w-5 text-gray-500" /></div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Version</p>
                        <p className="text-xs text-gray-500">Grozl Pro v1.2.0</p>
                      </div>
                    </div>
                    <div className="flex gap-4 text-xs font-semibold text-indigo-600">
                      <a href="#" className="hover:underline">Terms</a>
                      <a href="#" className="hover:underline">Privacy</a>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        )}

        {/* ── Context Menu ─────────────────────────────────────────────── */}
        {contextMenu && (
          <>
            <div className="fixed inset-0 z-[100]" onClick={() => setContextMenu(null)} />
            <div className="fixed z-[101] w-48 overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xl"
              style={{ top: contextMenu.y, left: contextMenu.x }}
            >
              {[
                { label: 'Rename', icon: <Type className="h-4 w-4" />, onClick: () => startRename(contextMenu.sessionId, chatSessions.find(s => s.id === contextMenu.sessionId)?.title || '') },
                { label: 'Pin Chat', icon: <Plus className="h-4 w-4" />, onClick: () => handlePin(contextMenu.sessionId) },
                { label: 'Favorite', icon: <Plus className="h-4 w-4" />, onClick: () => handleFavorite(contextMenu.sessionId) },
                { label: 'Delete', icon: <Trash2 className="h-4 w-4" />, onClick: () => handleDelete(contextMenu.sessionId), danger: true },
              ].map((item, i) => (
                <button key={i} onClick={item.onClick}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium transition hover:bg-gray-50 dark:hover:bg-gray-800 ${item.danger ? 'text-red-600' : 'text-gray-700 dark:text-gray-300'}`}
                >
                  {item.icon} {item.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
                        }

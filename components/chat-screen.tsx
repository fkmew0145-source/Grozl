'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import {
  Menu, Plus, Search, FolderOpen, MessageSquarePlus,
  LogOut, Mic, MicOff, Send, Camera, Image, FileText, Loader2, MessageSquare,
} from 'lucide-react'

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

export default function ChatScreen({ user }: ChatScreenProps) {
  // ── Core state ───────────────────────────────────────────────────────
  const [sidebarOpen, setSidebarOpen]     = useState(false)
  const [inputValue, setInputValue]       = useState('')
  const [activeChips, setActiveChips]     = useState<Set<string>>(new Set())
  const [activeMenuItem, setActiveMenuItem] = useState<string | null>(null)
  const [showAttachMenu, setShowAttachMenu] = useState(false)
  const [isRecording, setIsRecording]     = useState(false)
  const [messages, setMessages]           = useState<Message[]>([])
  const [isLoading, setIsLoading]         = useState(false)
  const [isStreaming, setIsStreaming]      = useState(false)
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const [isFocused, setIsFocused]         = useState(false)

  // ── Chat history state ───────────────────────────────────────────────
  const [chatSessions, setChatSessions]       = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string>(() => crypto.randomUUID())

  // ── Context menu state ───────────────────────────────────────────────
  const [contextMenu, setContextMenu] = useState<{ sessionId: string; x: number; y: number } | null>(null)
  const [renamingId, setRenamingId]   = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  // ── Refs ─────────────────────────────────────────────────────────────
  const textareaRef      = useRef<HTMLTextAreaElement>(null)
  const cameraInputRef   = useRef<HTMLInputElement>(null)
  const photoInputRef    = useRef<HTMLInputElement>(null)
  const fileInputRef     = useRef<HTMLInputElement>(null)
  const messagesEndRef   = useRef<HTMLDivElement>(null)
  const recognitionRef   = useRef<SpeechRecognition | null>(null)
  const longPressTimer   = useRef<ReturnType<typeof setTimeout> | null>(null)

  const supabase = createClient()

  // ── Load sessions from localStorage ─────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem('grozl_chat_sessions')
    if (stored) {
      try { setChatSessions(JSON.parse(stored)) } catch { /* ignore */ }
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Save after each response completes
  useEffect(() => {
    if (!isLoading && messages.length >= 2) {
      saveSession(messages, currentSessionId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading])

  // ── Session helpers ──────────────────────────────────────────────────
  const saveSession = useCallback((msgs: Message[], sessionId: string) => {
    const firstUser = msgs.find(m => m.role === 'user')
    const rawContent = firstUser?.content
    const rawTitle =
      typeof rawContent === 'string'
        ? rawContent
        : Array.isArray(rawContent)
          ? (rawContent.find(p => p.type === 'text')?.text || 'Chat')
          : 'Chat'
    const title = rawTitle.slice(0, 45) + (rawTitle.length > 45 ? '...' : '')

    const session: ChatSession = { id: sessionId, title, messages: msgs, timestamp: Date.now() }

    setChatSessions(prev => {
      // Preserve existing pinned/favorite flags
      const existing = prev.find(s => s.id === sessionId)
      const merged = { ...session, pinned: existing?.pinned, favorite: existing?.favorite }
      const filtered = prev.filter(s => s.id !== sessionId)
      const updated = [merged, ...filtered].slice(0, 25)
      localStorage.setItem('grozl_chat_sessions', JSON.stringify(updated))
      return updated
    })
  }, [])

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
    setCurrentSessionId(crypto.randomUUID())
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }, [messages, currentSessionId, saveSession])

  // Pinned first, then by timestamp
  const sortedSessions = [...chatSessions].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    return b.timestamp - a.timestamp
  })

  // ── Context menu handlers ────────────────────────────────────────────
  const handleLongPressStart = (e: React.TouchEvent | React.MouseEvent, sessionId: string) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    longPressTimer.current = setTimeout(() => {
      setContextMenu({ sessionId, x: rect.left, y: rect.bottom + 4 })
    }, 500)
  }

  const handleLongPressEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
  }

  const handlePin = (sessionId: string) => {
    updateSessions(prev => prev.map(s => s.id === sessionId ? { ...s, pinned: !s.pinned } : s))
    setContextMenu(null)
  }

  const handleFavorite = (sessionId: string) => {
    updateSessions(prev => prev.map(s => s.id === sessionId ? { ...s, favorite: !s.favorite } : s))
    setContextMenu(null)
  }

  const handleDelete = (sessionId: string) => {
    updateSessions(prev => prev.filter(s => s.id !== sessionId))
    if (currentSessionId === sessionId) newChat()
    setContextMenu(null)
  }

  const startRename = (session: ChatSession) => {
    setRenamingId(session.id)
    setRenameValue(session.title)
    setContextMenu(null)
  }

  const confirmRename = () => {
    if (!renamingId) return
    updateSessions(prev =>
      prev.map(s => s.id === renamingId ? { ...s, title: renameValue.trim() || s.title } : s)
    )
    setRenamingId(null)
    setRenameValue('')
  }

  // ── Auth ─────────────────────────────────────────────────────────────
  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const toggleChip = (chip: string) => {
    setActiveChips(prev => {
      const next = new Set(prev)
      next.has(chip) ? next.delete(chip) : next.add(chip)
      return next
    })
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

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload  = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

  // ── Mic: Web Speech API ──────────────────────────────────────────────
  const handleMicClick = () => {
    if (isRecording) {
      recognitionRef.current?.stop()
      setIsRecording(false)
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognitionAPI) {
      alert('Speech recognition is not supported. Please use Chrome or Edge.')
      return
    }

    const recognition = new SpeechRecognitionAPI()
    recognition.lang            = 'hi-IN'   // Hindi + English support
    recognition.continuous      = false
    recognition.interimResults  = true

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = Array.from(event.results)
        .map((r: SpeechRecognitionResult) => r[0].transcript)
        .join('')
      setInputValue(transcript)
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
        textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
      }
    }

    recognition.onend  = () => setIsRecording(false)
    recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
      setIsRecording(false)
      if (e.error === 'not-allowed') alert('Microphone permission denied. Please allow mic access.')
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsRecording(true)
  }

  // ── Send ─────────────────────────────────────────────────────────────
  const handleSend = async () => {
    const text = inputValue.trim()
    if ((!text && attachedFiles.length === 0) || isLoading) return

    // Build multimodal content if files are attached
    let userContent: string | ContentPart[]

    if (attachedFiles.length > 0) {
      const parts: ContentPart[] = []
      if (text) parts.push({ type: 'text', text })

      for (const file of attachedFiles) {
        if (file.type.startsWith('image/')) {
          const base64 = await fileToBase64(file)
          parts.push({ type: 'image_url', image_url: { url: base64 } })
        } else {
          try {
            const fileContent = await file.text()
            parts.push({ type: 'text', text: `[File: ${file.name}]\n${fileContent}` })
          } catch {
            parts.push({ type: 'text', text: `[Attached file: ${file.name}]` })
          }
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

    // Placeholder — empty string triggers loader / thinking UI
    setMessages([...newMessages, { role: 'assistant', content: '' }])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })

      if (!res.ok) {
        const err = await res.json()
        setMessages([...newMessages, { role: 'assistant', content: err.error || 'Something went wrong.' }])
        return
      }

      const reader  = res.body?.getReader()
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
    }
  }

  // ── Render message content ───────────────────────────────────────────
  const renderContent = (
    content: string | ContentPart[],
    isAssistant: boolean,
    isLast: boolean
  ) => {
    // Empty placeholder — show Thinking... or spinner
    if (content === '' && isAssistant) {
      if (activeChips.has('think')) {
        // Thinking animation (3 bouncing dots)
        return (
          <div className="flex items-center gap-1.5 py-0.5">
            <span className="text-[13px] font-medium text-indigo-400">Thinking</span>
            <span className="flex gap-[3px]">
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-indigo-400"
                  style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
                />
              ))}
            </span>
            <style>{`
              @keyframes bounce {
                0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
                40% { transform: translateY(-5px); opacity: 1; }
              }
            `}</style>
          </div>
        )
      }
      return <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
    }

    if (typeof content === 'string') {
      return (
        <span style={{ whiteSpace: 'pre-wrap' }}>
          {content}
          {/* Typewriter cursor while streaming */}
          {isAssistant && isLast && isStreaming && content !== '' && (
            <span className="ml-0.5 inline-block animate-pulse font-light text-gray-400">▌</span>
          )}
        </span>
      )
    }

    // Multimodal (text + images)
    return (
      <div className="flex flex-col gap-2">
        {content.map((part, i) => {
          if (part.type === 'text' && part.text)
            return <span key={i} style={{ whiteSpace: 'pre-wrap' }}>{part.text}</span>
          if (part.type === 'image_url' && part.image_url?.url)
            return (
              <img
                key={i}
                src={part.image_url.url}
                alt="Attached image"
                className="max-h-[200px] max-w-full rounded-xl object-contain"
              />
            )
          return null
        })}
      </div>
    )
  }

  // ── Derived flags ────────────────────────────────────────────────────
  const hasText     = inputValue.trim().length > 0
  const hasMessages = messages.length > 0
  const isActive    = isFocused || hasText || attachedFiles.length > 0

  // ── Input box (reused in both empty + chat state) ────────────────────
  const InputBox = (
    <div className={`w-full rounded-3xl border p-4 shadow-sm transition-all duration-200 ${
      isActive
        ? 'border-[#4D6BFE]/60 bg-gradient-to-b from-[#EEF2FF] to-[#F0F4FF] shadow-lg shadow-[#4D6BFE]/10'
        : 'border-gray-200 bg-white'
    }`}>
      {/* Attached files preview */}
      {attachedFiles.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachedFiles.map((file, i) => (
            <div key={i} className="flex items-center gap-1.5 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-[13px] text-indigo-700">
              {file.type.startsWith('image/') ? <Image className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
              <span className="max-w-[120px] truncate">{file.name}</span>
              <button onClick={() => removeFile(i)} className="ml-1 text-indigo-400 hover:text-indigo-600">✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Textarea — Enter = newline, send only via button */}
      <textarea
        ref={textareaRef}
        placeholder={isRecording ? '🎙️ Bol raha hoon...' : 'Ask Grozl anything...'}
        rows={1}
        value={inputValue}
        onChange={handleInput}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        disabled={isLoading}
        className="w-full resize-none bg-transparent text-base text-gray-800 outline-none placeholder:text-gray-400 disabled:opacity-50"
      />

      <div className="mt-3.5 flex items-center justify-between">
        {/* Think + Search chips */}
        <div className="flex gap-2.5">
          <button
            onClick={() => toggleChip('think')}
            className={`flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-medium transition-all duration-250 ease-out ${
              activeChips.has('think')
                ? 'border-[#4D6BFE]/60 bg-gradient-to-r from-[#EEF2FF] to-[#F0F4FF] text-[#4D6BFE] shadow-sm shadow-[#4D6BFE]/10'
                : 'border-gray-200 bg-white/80 text-gray-500 hover:border-gray-300 hover:bg-white hover:text-gray-600 hover:shadow-sm'
            }`}
          >
            <svg className="h-[15px] w-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z" />
              <path d="M9 21h6" /><path d="M12 6v1" /><path d="M9.5 9h5" />
            </svg>
            Think
          </button>

          <button
            onClick={() => toggleChip('search')}
            className={`flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-medium transition-all duration-250 ease-out ${
              activeChips.has('search')
                ? 'border-[#4D6BFE]/60 bg-gradient-to-r from-[#EEF2FF] to-[#F0F4FF] text-[#4D6BFE] shadow-sm shadow-[#4D6BFE]/10'
                : 'border-gray-200 bg-white/80 text-gray-500 hover:border-gray-300 hover:bg-white hover:text-gray-600 hover:shadow-sm'
            }`}
          >
            <svg className="h-[15px] w-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              <path d="M2 12h20" />
            </svg>
            Search
          </button>
        </div>

        {/* Attach + Mic/Send */}
        <div className="flex items-center gap-4">
          {/* Attach menu */}
          <div className="relative">
            {showAttachMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowAttachMenu(false)} />
                <div className="absolute bottom-9 right-0 z-50 w-[160px] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl">
                  <button onClick={() => { cameraInputRef.current?.click(); setShowAttachMenu(false) }} className="flex w-full items-center gap-3 border-b border-gray-100 px-4 py-3 text-[14px] font-medium text-gray-700 transition hover:bg-indigo-50 hover:text-indigo-600">
                    <Camera className="h-5 w-5" /> Camera
                  </button>
                  <button onClick={() => { photoInputRef.current?.click(); setShowAttachMenu(false) }} className="flex w-full items-center gap-3 border-b border-gray-100 px-4 py-3 text-[14px] font-medium text-gray-700 transition hover:bg-indigo-50 hover:text-indigo-600">
                    <Image className="h-5 w-5" /> Photos
                  </button>
                  <button onClick={() => { fileInputRef.current?.click(); setShowAttachMenu(false) }} className="flex w-full items-center gap-3 px-4 py-3 text-[14px] font-medium text-gray-700 transition hover:bg-indigo-50 hover:text-indigo-600">
                    <FileText className="h-5 w-5" /> Files
                  </button>
                </div>
              </>
            )}
            <button onClick={() => setShowAttachMenu(!showAttachMenu)} className="text-gray-500 transition hover:text-gray-700">
              <Plus className="h-5 w-5" />
            </button>
          </div>

          {/* Mic (no text/files) → Send (has text/files) */}
          {!hasText && attachedFiles.length === 0 ? (
            <button
              onClick={handleMicClick}
              title={isRecording ? 'Recording band karo' : 'Voice input shuru karo'}
              className={`transition ${isRecording ? 'animate-pulse text-red-500' : 'text-gray-500 hover:text-gray-700'}`}
            >
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
    <div className="flex h-dvh flex-col overflow-hidden bg-gradient-to-b from-slate-50 to-indigo-50">

      {/* Hidden file inputs */}
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
      <input ref={photoInputRef}  type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
      <input ref={fileInputRef}   type="file" multiple className="hidden" onChange={handleFileChange} />

      {/* ── Sidebar ────────────────────────────────────────────────────── */}
      <div className={`fixed left-0 top-0 z-50 flex h-full w-72 -translate-x-full flex-col gap-2 border-r border-gray-200 bg-white p-6 shadow-xl transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : ''}`}>
        {/* Search */}
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search chats..." className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-300" />
        </div>

        {/* New Chat */}
        <button
          onClick={() => { setActiveMenuItem(activeMenuItem === 'newchat' ? null : 'newchat'); newChat() }}
          className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-[15px] font-medium transition-all duration-200 ease-out ${activeMenuItem === 'newchat' ? 'border-[#4D6BFE]/60 bg-gradient-to-r from-[#EEF2FF] to-[#F0F4FF] text-[#4D6BFE] shadow-sm shadow-[#4D6BFE]/10' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700'}`}
        >
          <MessageSquarePlus className={`h-5 w-5 ${activeMenuItem === 'newchat' ? 'text-[#4D6BFE]' : 'text-gray-400'}`} />
          New Chat
        </button>

        {/* Projects */}
        <button
          onClick={() => setActiveMenuItem(activeMenuItem === 'projects' ? null : 'projects')}
          className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-[15px] font-medium transition-all duration-200 ease-out ${activeMenuItem === 'projects' ? 'border-[#4D6BFE]/60 bg-gradient-to-r from-[#EEF2FF] to-[#F0F4FF] text-[#4D6BFE] shadow-sm shadow-[#4D6BFE]/10' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700'}`}
        >
          <FolderOpen className={`h-5 w-5 ${activeMenuItem === 'projects' ? 'text-[#4D6BFE]' : 'text-gray-400'}`} />
          Projects
        </button>

        {/* Recent Chats */}
        <span className="ml-1 mt-5 text-xs font-semibold uppercase tracking-wide text-gray-400">Recent Chats</span>
        <div className="flex flex-1 flex-col gap-1 overflow-y-auto">
          {sortedSessions.length === 0 ? (
            <p className="px-2 py-3 text-[13px] italic text-gray-400">No recent chats yet</p>
          ) : (
            sortedSessions.map(session => (
              <div key={session.id} className="relative">
                {renamingId === session.id ? (
                  /* Inline rename input */
                  <div className="flex items-center gap-1.5 rounded-xl bg-indigo-50 px-3 py-2">
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') confirmRename()
                        if (e.key === 'Escape') setRenamingId(null)
                      }}
                      onBlur={confirmRename}
                      className="flex-1 bg-transparent text-[14px] text-indigo-700 outline-none"
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => loadSession(session)}
                    onMouseDown={e => handleLongPressStart(e, session.id)}
                    onMouseUp={handleLongPressEnd}
                    onMouseLeave={handleLongPressEnd}
                    onTouchStart={e => handleLongPressStart(e, session.id)}
                    onTouchEnd={handleLongPressEnd}
                    onContextMenu={e => {
                      e.preventDefault()
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                      setContextMenu({ sessionId: session.id, x: rect.left, y: rect.bottom + 4 })
                    }}
                    className={`flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-left text-[14px] text-gray-600 transition hover:bg-indigo-50 hover:text-indigo-600 ${session.id === currentSessionId ? 'bg-indigo-50 text-indigo-600' : ''}`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {session.pinned ? (
                        /* Pin icon */
                        <svg className="h-4 w-4 text-[#4D6BFE]" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
                        </svg>
                      ) : session.favorite ? (
                        /* Star icon */
                        <svg className="h-4 w-4 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                        </svg>
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

        {/* Context Menu (long-press popup) */}
        {contextMenu && (
          <>
            <div className="fixed inset-0 z-[60]" onClick={() => setContextMenu(null)} />
            <div
              className="fixed z-[70] w-44 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl"
              style={{
                top:  Math.min(contextMenu.y, window.innerHeight - 230),
                left: Math.min(contextMenu.x, window.innerWidth - 185),
              }}
            >
              {/* Pin / Unpin */}
              <button onClick={() => handlePin(contextMenu.sessionId)} className="flex w-full items-center gap-3 border-b border-gray-100 px-4 py-3 text-[14px] font-medium text-gray-700 transition hover:bg-indigo-50 hover:text-indigo-600">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>
                {chatSessions.find(s => s.id === contextMenu.sessionId)?.pinned ? 'Unpin' : 'Pin'}
              </button>
              {/* Favorite / Unfavorite */}
              <button onClick={() => handleFavorite(contextMenu.sessionId)} className="flex w-full items-center gap-3 border-b border-gray-100 px-4 py-3 text-[14px] font-medium text-gray-700 transition hover:bg-amber-50 hover:text-amber-600">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                {chatSessions.find(s => s.id === contextMenu.sessionId)?.favorite ? 'Unfavorite' : 'Favorite'}
              </button>
              {/* Rename */}
              <button onClick={() => { const s = chatSessions.find(x => x.id === contextMenu.sessionId); if (s) startRename(s) }} className="flex w-full items-center gap-3 border-b border-gray-100 px-4 py-3 text-[14px] font-medium text-gray-700 transition hover:bg-indigo-50 hover:text-indigo-600">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Rename
              </button>
              {/* Delete */}
              <button onClick={() => handleDelete(contextMenu.sessionId)} className="flex w-full items-center gap-3 px-4 py-3 text-[14px] font-medium text-rose-600 transition hover:bg-red-50">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                  <path d="M10 11v6"/><path d="M14 11v6"/>
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
                Delete
              </button>
            </div>
          </>
        )}

        {/* Sign Out */}
        {user && (
          <button onClick={handleSignOut} className="mt-2 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-left text-sm font-medium text-rose-600 transition hover:bg-red-100">
            <LogOut className="h-4 w-4" />
            Sign Out ({user.email?.split('@')[0]})
          </button>
        )}
      </div>

      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/10" onClick={() => setSidebarOpen(false)} />}

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between p-4">
        <button onClick={() => setSidebarOpen(true)} className="text-gray-500 transition hover:text-gray-700">
          <Menu className="h-6 w-6" />
        </button>
        <button onClick={newChat} className="text-gray-500 transition hover:text-gray-700">
          <Plus className="h-6 w-6" />
        </button>
      </header>

      {/* ── Main Content ────────────────────────────────────────────────── */}
      <main className="flex flex-1 flex-col overflow-hidden">

        {!hasMessages ? (
          /* Empty / welcome state */
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
          /* Chat messages */
          <div className="flex-1 overflow-y-auto px-4 pb-4 pt-16">
            <div className="mx-auto flex w-full max-w-[700px] flex-col gap-5">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="mr-2.5 mt-1 h-7 w-7 shrink-0 overflow-hidden rounded-full">
                      <img src="/logo.png" alt="Grozl" className="h-full w-full object-contain" />
                    </div>
                  )}
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#4D6BFE] text-white'
                      : 'bg-white text-gray-800 shadow-sm border border-gray-100'
                  }`}>
                    {renderContent(msg.content, msg.role === 'assistant', i === messages.length - 1)}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {/* Input box at bottom when chatting */}
        {hasMessages && (
          <div className="w-full px-4 pb-4">
            <div className="mx-auto w-full max-w-[650px]">
              {InputBox}
            </div>
          </div>
        )}
      </main>
    </div>
  )
                      }

'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import {
  Menu, Plus, Search, FolderOpen, MessageSquarePlus,
  LogOut, Mic, Send, Camera, Image, FileText, Loader2,
} from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ChatScreenProps {
  user: User | null
}

export default function ChatScreen({ user }: ChatScreenProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [activeChips, setActiveChips] = useState<Set<string>>(new Set())
  const [activeMenuItem, setActiveMenuItem] = useState<string | null>(null)
  const [showAttachMenu, setShowAttachMenu] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const supabase = createClient()

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const toggleChip = (chip: string) => {
    setActiveChips((prev) => {
      const next = new Set(prev)
      next.has(chip) ? next.delete(chip) : next.add(chip)
      return next
    })
  }

  const newChat = () => {
    setMessages([])
    setInputValue('')
    setAttachedFiles([])
    setActiveChips(new Set())
    setSidebarOpen(false)
    setShowAttachMenu(false)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }

  // FIX 2: handleKeyDown removed — Enter = newline, send only via button

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length) setAttachedFiles(prev => [...prev, ...files])
    e.target.value = ''
  }

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleMicClick = () => {
    if (isRecording) {
      setIsRecording(false)
    } else {
      if (navigator.mediaDevices?.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ audio: true })
          .then(() => setIsRecording(true))
          .catch(() => alert('Microphone permission denied'))
      } else {
        alert('Microphone not supported on this device')
      }
    }
  }

  const handleSend = async () => {
    const text = inputValue.trim()
    if (!text || isLoading) return

    const fileNames = attachedFiles.map(f => `[Attached: ${f.name}]`).join(' ')
    const fullText = fileNames ? `${text}\n\n${fileNames}` : text

    const userMessage: Message = { role: 'user', content: fullText }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInputValue('')
    setAttachedFiles([])
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setIsLoading(true)

    const assistantPlaceholder: Message = { role: 'assistant', content: '' }
    setMessages([...newMessages, assistantPlaceholder])

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
    }
  }

  const hasText = inputValue.trim().length > 0
  const hasMessages = messages.length > 0

  // Reusable input box JSX
  const InputBox = (
    <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm transition focus-within:border-indigo-200 focus-within:shadow-lg focus-within:shadow-indigo-500/5">
      {/* FIX 3: File preview chips */}
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

      <textarea
        ref={textareaRef}
        placeholder="Ask Grozl anything..."
        rows={1}
        value={inputValue}
        onChange={handleInput}
        // FIX 2: No onKeyDown — Enter creates newline naturally
        disabled={isLoading}
        className="w-full resize-none bg-transparent text-base text-gray-800 outline-none placeholder:text-gray-400 disabled:opacity-50"
      />

      <div className="mt-3.5 flex items-center justify-between">
        <div className="flex gap-2.5">
          <button
            onClick={() => toggleChip('think')}
            className={`flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-medium transition-all duration-250 ease-out ${activeChips.has('think') ? 'border-[#4D6BFE]/60 bg-gradient-to-r from-[#EEF2FF] to-[#F0F4FF] text-[#4D6BFE] shadow-sm shadow-[#4D6BFE]/10' : 'border-gray-200 bg-white/80 text-gray-500 hover:border-gray-300 hover:bg-white hover:text-gray-600 hover:shadow-sm'}`}
          >
            <svg className="h-[15px] w-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z" />
              <path d="M9 21h6" /><path d="M12 6v1" /><path d="M9.5 9h5" />
            </svg>
            Think
          </button>
          <button
            onClick={() => toggleChip('search')}
            className={`flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-medium transition-all duration-250 ease-out ${activeChips.has('search') ? 'border-[#4D6BFE]/60 bg-gradient-to-r from-[#EEF2FF] to-[#F0F4FF] text-[#4D6BFE] shadow-sm shadow-[#4D6BFE]/10' : 'border-gray-200 bg-white/80 text-gray-500 hover:border-gray-300 hover:bg-white hover:text-gray-600 hover:shadow-sm'}`}
          >
            <svg className="h-[15px] w-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              <path d="M2 12h20" />
            </svg>
            Search
          </button>
        </div>

        <div className="flex items-center gap-4">
          {/* FIX 3: Attach menu with onChange handlers */}
          <div className="relative">
            {showAttachMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowAttachMenu(false)} />
                <div className="absolute bottom-9 right-0 z-50 w-[160px] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl">
                  <button
                    onClick={() => { cameraInputRef.current?.click(); setShowAttachMenu(false) }}
                    className="flex w-full items-center gap-3 border-b border-gray-100 px-4 py-3 text-[14px] font-medium text-gray-700 transition hover:bg-indigo-50 hover:text-indigo-600"
                  >
                    <Camera className="h-5 w-5" /> Camera
                  </button>
                  <button
                    onClick={() => { photoInputRef.current?.click(); setShowAttachMenu(false) }}
                    className="flex w-full items-center gap-3 border-b border-gray-100 px-4 py-3 text-[14px] font-medium text-gray-700 transition hover:bg-indigo-50 hover:text-indigo-600"
                  >
                    <Image className="h-5 w-5" /> Photos
                  </button>
                  <button
                    onClick={() => { fileInputRef.current?.click(); setShowAttachMenu(false) }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-[14px] font-medium text-gray-700 transition hover:bg-indigo-50 hover:text-indigo-600"
                  >
                    <FileText className="h-5 w-5" /> Files
                  </button>
                </div>
              </>
            )}
            <button
              onClick={() => setShowAttachMenu(!showAttachMenu)}
              className="text-gray-500 transition hover:text-gray-700"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>

          {!hasText ? (
            <button onClick={handleMicClick} className={`transition ${isRecording ? 'animate-pulse text-red-500' : 'text-gray-500 hover:text-gray-700'}`}>
              <Mic className="h-5 w-5" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={isLoading}
              className="text-indigo-600 transition hover:text-indigo-700 disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </button>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-gradient-to-b from-slate-50 to-indigo-50">

      {/* FIX 3: Hidden File Inputs with onChange */}
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
      <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} />

      {/* Sidebar */}
      <div className={`fixed left-0 top-0 z-50 flex h-full w-72 -translate-x-full flex-col gap-2 border-r border-gray-200 bg-white p-6 shadow-xl transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : ''}`}>
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search chats..." className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-300" />
        </div>
        <button
          onClick={() => { setActiveMenuItem(activeMenuItem === 'newchat' ? null : 'newchat'); newChat() }}
          className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-[15px] font-medium transition-all duration-200 ease-out ${activeMenuItem === 'newchat' ? 'border-[#4D6BFE]/60 bg-gradient-to-r from-[#EEF2FF] to-[#F0F4FF] text-[#4D6BFE] shadow-sm shadow-[#4D6BFE]/10' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700'}`}
        >
          <MessageSquarePlus className={`h-5 w-5 ${activeMenuItem === 'newchat' ? 'text-[#4D6BFE]' : 'text-gray-400'}`} />
          New Chat
        </button>
        <button
          onClick={() => setActiveMenuItem(activeMenuItem === 'projects' ? null : 'projects')}
          className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-[15px] font-medium transition-all duration-200 ease-out ${activeMenuItem === 'projects' ? 'border-[#4D6BFE]/60 bg-gradient-to-r from-[#EEF2FF] to-[#F0F4FF] text-[#4D6BFE] shadow-sm shadow-[#4D6BFE]/10' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700'}`}
        >
          <FolderOpen className={`h-5 w-5 ${activeMenuItem === 'projects' ? 'text-[#4D6BFE]' : 'text-gray-400'}`} />
          Projects
        </button>
        <span className="ml-4 mt-5 text-xs font-semibold uppercase tracking-wide text-gray-400">Recent Chats</span>
        <button className="rounded-xl px-4 py-3 text-left text-[15px] font-medium text-gray-600 transition hover:bg-indigo-50 hover:text-indigo-600">About Grozl AI</button>
        <button className="rounded-xl px-4 py-3 text-left text-[15px] font-medium text-gray-600 transition hover:bg-indigo-50 hover:text-indigo-600">My First Project</button>
        {user && (
          <button onClick={handleSignOut} className="mt-auto flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-left text-sm font-medium text-rose-600 transition hover:bg-red-100">
            <LogOut className="h-4 w-4" />
            Sign Out ({user.email?.split('@')[0]})
          </button>
        )}
      </div>

      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/10" onClick={() => setSidebarOpen(false)} />}

      {/* Header */}
      <header className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between p-4">
        <button onClick={() => setSidebarOpen(true)} className="text-gray-500 transition hover:text-gray-700">
          <Menu className="h-6 w-6" />
        </button>
        <button onClick={newChat} className="text-gray-500 transition hover:text-gray-700">
          <Plus className="h-6 w-6" />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 flex-col overflow-hidden">

        {/* FIX 1: Empty state — input box headline ke niche center mein */}
        {!hasMessages ? (
          <div className="flex flex-1 flex-col items-center justify-center px-4 pb-8">
            <div className="flex w-full max-w-[650px] flex-col items-center">
              <div className="mb-5 h-[90px] w-[90px]">
                <img src="/logo.png" alt="Grozl" className="h-full w-full object-contain" />
              </div>
              <h1 className="mb-7 text-center text-[28px] font-semibold tracking-tight text-gray-900">
                Your Mind, Amplified By Grozl
              </h1>
              {/* Input inline — headline ke bilkul neeche */}
              {InputBox}
            </div>
          </div>
        ) : (
          /* Messages area */
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
                        : 'bg-white text-gray-800 shadow-sm border border-gray-100'
                    }`}
                  >
                    {msg.content === '' && msg.role === 'assistant' ? (
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    ) : (
                      <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {/* Input Box — chat mode mein neeche fixed */}
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
    

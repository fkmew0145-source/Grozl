'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { Menu, Plus, Search, FolderOpen, MessageSquarePlus, LogOut, Mic, Send } from 'lucide-react'

interface ChatScreenProps {
  user: User | null
}

export default function ChatScreen({ user }: ChatScreenProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [activeChips, setActiveChips] = useState<Set<string>>(new Set())
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const supabase = createClient()

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
    setInputValue('')
    setActiveChips(new Set())
    setSidebarOpen(false)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }

  const hasText = inputValue.trim().length > 0

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-gradient-to-b from-slate-50 to-indigo-50">
      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 z-50 flex h-full w-72 -translate-x-full flex-col gap-2 border-r border-gray-200 bg-white p-6 shadow-xl transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : ''
        }`}
      >
        {/* Search */}
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search chats..."
            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-300"
          />
        </div>

        {/* Menu Items */}
        <button className="flex items-center gap-2.5 rounded-xl px-4 py-3 text-left text-[15px] font-medium text-gray-600 transition hover:bg-indigo-50 hover:text-indigo-600">
          <FolderOpen className="h-4 w-4 text-gray-400" />
          Projects
        </button>
        <button
          onClick={newChat}
          className="flex items-center gap-2.5 rounded-xl px-4 py-3 text-left text-[15px] font-medium text-gray-600 transition hover:bg-indigo-50 hover:text-indigo-600"
        >
          <MessageSquarePlus className="h-4 w-4 text-gray-400" />
          New Chat
        </button>

        {/* Recent Chats Label */}
        <span className="ml-4 mt-5 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Recent Chats
        </span>
        <button className="rounded-xl px-4 py-3 text-left text-[15px] font-medium text-gray-600 transition hover:bg-indigo-50 hover:text-indigo-600">
          About Grozl AI
        </button>
        <button className="rounded-xl px-4 py-3 text-left text-[15px] font-medium text-gray-600 transition hover:bg-indigo-50 hover:text-indigo-600">
          My First Project
        </button>

        {/* Sign Out */}
        {user && (
          <button
            onClick={handleSignOut}
            className="mt-auto flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-left text-sm font-medium text-rose-600 transition hover:bg-red-100"
          >
            <LogOut className="h-4 w-4" />
            Sign Out ({user.email?.split('@')[0]})
          </button>
        )}
      </div>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/10"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Header */}
      <header className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between p-4">
        <button
          onClick={() => setSidebarOpen(true)}
          className="text-gray-500 transition hover:text-gray-700"
        >
          <Menu className="h-6 w-6" />
        </button>
        <button
          onClick={newChat}
          className="text-gray-500 transition hover:text-gray-700"
        >
          <Plus className="h-6 w-6" />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 flex-col items-center justify-center p-5">
        <div className="-mt-16 flex w-full max-w-[650px] flex-col items-center">
          {/* Logo */}
          <div className="mb-5 flex h-[90px] w-[90px] items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 shadow-lg shadow-indigo-500/15">
            <span className="text-xs font-medium text-indigo-500">Logo</span>
          </div>

          {/* Headline */}
          <h1 className="mb-9 text-center text-[28px] font-semibold tracking-tight text-gray-900">
            How can we help you today?
          </h1>

          {/* Prompt Box */}
          <div className="w-full rounded-3xl border border-gray-200 bg-white p-4 shadow-sm transition focus-within:border-indigo-200 focus-within:shadow-lg focus-within:shadow-indigo-500/5">
            <textarea
              ref={textareaRef}
              placeholder="Ask Grozl anything..."
              rows={1}
              value={inputValue}
              onChange={handleInput}
              className="w-full resize-none bg-transparent text-base text-gray-800 outline-none placeholder:text-gray-400"
            />

            {/* Bottom Actions */}
            <div className="mt-3.5 flex items-center justify-between">
              {/* Feature Chips */}
              <div className="flex gap-2">
                <button
                  onClick={() => toggleChip('think')}
                  className={`rounded-xl border px-3.5 py-1.5 text-[13px] font-medium transition ${
                    activeChips.has('think')
                      ? 'border-indigo-200 bg-indigo-50 text-indigo-600'
                      : 'border-gray-200 bg-white text-gray-500 hover:border-indigo-200 hover:text-indigo-600'
                  }`}
                >
                  Think
                </button>
                <button
                  onClick={() => toggleChip('search')}
                  className={`rounded-xl border px-3.5 py-1.5 text-[13px] font-medium transition ${
                    activeChips.has('search')
                      ? 'border-indigo-200 bg-indigo-50 text-indigo-600'
                      : 'border-gray-200 bg-white text-gray-500 hover:border-indigo-200 hover:text-indigo-600'
                  }`}
                >
                  Search
                </button>
              </div>

              {/* Right Controls */}
              <div className="flex items-center gap-4">
                <button className="text-gray-500 transition hover:text-gray-700">
                  <Plus className="h-5 w-5" />
                </button>
                {!hasText ? (
                  <button className="text-gray-500 transition hover:text-gray-700">
                    <Mic className="h-5 w-5" />
                  </button>
                ) : (
                  <button className="text-indigo-600 transition hover:text-indigo-700">
                    <Send className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

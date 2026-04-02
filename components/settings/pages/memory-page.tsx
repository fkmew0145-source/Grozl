'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { loadPersonalization, savePersonalization, GrozlPersonalization } from '../settings-store'

interface MemoryPageProps {
  user: User | null
  onBack: () => void
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative flex h-7 w-12 items-center rounded-full transition-colors duration-200 ${value ? 'bg-[#4D6BFE]' : 'bg-gray-300 dark:bg-white/20'}`}
    >
      <span className={`absolute left-0.5 h-6 w-6 rounded-full bg-white shadow-md transition-transform duration-200 ${value ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  )
}

export default function MemoryPage({ user, onBack }: MemoryPageProps) {
  const [memoryText, setMemoryText]             = useState('')
  const [loading, setLoading]                   = useState(false)
  const [saved, setSaved]                       = useState(false)
  const [showManageMemory, setShowManageMemory] = useState(false)
  const [personalization, setPersonalization]   = useState<GrozlPersonalization>(loadPersonalization(user?.id))

  useEffect(() => {
    if (!user) return
    setLoading(true)
    const supabase = createClient()
    supabase.from('user_memories').select('memory').eq('user_id', user.id).single()
      .then(({ data }) => { setMemoryText(data?.memory || ''); setLoading(false) })
      .catch(() => setLoading(false))
  }, [user])

  const handleSave = async () => {
    if (!user) return
    setLoading(true)
    const supabase = createClient()
    await supabase.from('user_memories').upsert({ user_id: user.id, memory: memoryText, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    setLoading(false); setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  const handleClear = async () => {
    if (!user || !confirm('Clear all memory? Grozl will forget everything about you.')) return
    setMemoryText('')
    const supabase = createClient()
    await supabase.from('user_memories').upsert({ user_id: user.id, memory: '', updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  }

  const patchPersonalization = (patch: Partial<GrozlPersonalization>) => {
    const updated = { ...personalization, ...patch }
    setPersonalization(updated)
    savePersonalization(updated, user?.id)
  }

  if (showManageMemory) {
    return (
      <div className="flex h-full flex-col bg-[#F2F2F7] dark:bg-[#0d0f14]">
        <div className="flex items-center gap-3 bg-[#F2F2F7] dark:bg-[#0d0f14] px-4 py-4 pt-6">
          <button onClick={() => setShowManageMemory(false)} className="flex h-8 w-8 items-center justify-center rounded-full text-gray-600 dark:text-white/60 transition hover:bg-gray-200 dark:hover:bg-white/10">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-[17px] font-semibold text-gray-900 dark:text-white">Manage Memory</h1>
        </div>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-2">
          {!user ? (
            <div className="rounded-2xl bg-white dark:bg-white/5 px-4 py-5 text-center">
              <p className="text-[15px] text-gray-500 dark:text-white/50">Sign in to use persistent memory across devices.</p>
            </div>
          ) : (
            <>
              <div className="rounded-2xl bg-blue-50 dark:bg-blue-500/10 px-4 py-3">
                <p className="text-[13px] leading-relaxed text-blue-700 dark:text-blue-300">
                  Grozl uses this memory in every conversation. You can view and edit it directly below.
                </p>
              </div>
              <div className="flex flex-1 flex-col overflow-hidden rounded-2xl bg-white dark:bg-white/5">
                <p className="border-b border-gray-100 dark:border-white/10 px-4 py-3 text-[12px] font-semibold uppercase tracking-wide text-gray-400 dark:text-white/30">
                  Current Memory
                </p>
                <textarea
                  value={memoryText}
                  onChange={e => setMemoryText(e.target.value)}
                  placeholder={loading ? 'Loading...' : 'Nothing stored yet...'}
                  disabled={loading}
                  rows={10}
                  className="flex-1 resize-none bg-transparent px-4 py-3 text-[14px] text-gray-800 dark:text-white/90 outline-none placeholder:text-gray-300 dark:placeholder:text-white/20 disabled:opacity-50"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#4D6BFE] py-3.5 text-[14px] font-semibold text-white transition hover:bg-[#3D5BEE] disabled:opacity-60"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? '✓ Saved' : 'Save'}
                </button>
                <button
                  onClick={handleClear}
                  disabled={loading || !memoryText}
                  className="rounded-2xl border border-gray-200 dark:border-white/15 bg-white dark:bg-white/5 px-5 py-3.5 text-[14px] font-medium text-red-500 transition hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-40"
                >
                  Clear
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-[#F2F2F7] dark:bg-[#0d0f14]">
      <div className="flex items-center justify-between bg-[#F2F2F7] dark:bg-[#0d0f14] px-4 py-4 pt-6">
        <button onClick={onBack} className="flex h-8 w-8 items-center justify-center rounded-full text-gray-600 dark:text-white/60 transition hover:bg-gray-200 dark:hover:bg-white/10">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-[17px] font-semibold text-gray-900 dark:text-white">Memories</h1>
        <div className="h-8 w-8" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2">
        <div className="mb-5 overflow-hidden rounded-2xl bg-white dark:bg-white/5 shadow-sm">
          <button
            onClick={() => setShowManageMemory(true)}
            className="flex w-full items-center justify-between px-4 py-4 transition active:bg-gray-50 dark:active:bg-white/5"
          >
            <span className="text-[15px] text-gray-800 dark:text-white/90">Manage memories</span>
            <ChevronRight className="h-4 w-4 text-gray-400 dark:text-white/30" />
          </button>
        </div>

        <div className="mb-5 overflow-hidden rounded-2xl bg-white dark:bg-white/5 shadow-sm">
          <div className="px-4 py-4">
            <div className="flex items-center justify-between">
              <span className="text-[15px] text-gray-800 dark:text-white/90">Reference saved memories</span>
              <Toggle value={personalization.referenceMemories} onChange={v => patchPersonalization({ referenceMemories: v })} />
            </div>
            <p className="mt-1 text-[12px] leading-relaxed text-gray-400 dark:text-white/30">Lets Grozl save and use memories when responding.</p>
          </div>
          <div className="mx-4 h-px bg-gray-100 dark:bg-white/10" />
          <div className="px-4 py-4">
            <div className="flex items-center justify-between">
              <span className="text-[15px] text-gray-800 dark:text-white/90">Reference Chat History</span>
              <Toggle value={personalization.referenceChatHistory} onChange={v => patchPersonalization({ referenceChatHistory: v })} />
            </div>
            <p className="mt-1 text-[12px] leading-relaxed text-gray-400 dark:text-white/30">Lets Grozl reference recent conversations when responding.</p>
          </div>
        </div>

        <p className="mb-2 px-1 text-[13px] text-gray-500 dark:text-white/50">About you</p>
        <div className="mb-5 overflow-hidden rounded-2xl bg-white dark:bg-white/5 shadow-sm">
          <div className="px-4 pt-4 pb-2">
            <p className="mb-1.5 text-[12px] text-gray-400 dark:text-white/30">Your nickname</p>
            <input type="text" value={personalization.nickname} onChange={e => patchPersonalization({ nickname: e.target.value })} placeholder="Farru, Raj, Priya..." className="w-full bg-transparent text-[15px] text-gray-800 dark:text-white/90 outline-none placeholder:text-gray-300 dark:placeholder:text-white/20" />
          </div>
          <div className="mx-4 h-px bg-gray-100 dark:bg-white/10 my-2" />
          <div className="px-4 pt-2 pb-2">
            <p className="mb-1.5 text-[12px] text-gray-400 dark:text-white/30">Your occupation</p>
            <input type="text" value={personalization.occupation} onChange={e => patchPersonalization({ occupation: e.target.value })} placeholder="Engineer, student, designer..." className="w-full bg-transparent text-[15px] text-gray-800 dark:text-white/90 outline-none placeholder:text-gray-300 dark:placeholder:text-white/20" />
          </div>
          <div className="mx-4 h-px bg-gray-100 dark:bg-white/10 my-2" />
          <div className="px-4 pt-2 pb-4">
            <p className="mb-1.5 text-[12px] text-gray-400 dark:text-white/30">More about you</p>
            <textarea value={personalization.aboutYou} onChange={e => patchPersonalization({ aboutYou: e.target.value })} placeholder="Interests, values, or preferences to keep in mind" rows={3} className="w-full resize-none bg-transparent text-[15px] text-gray-800 dark:text-white/90 outline-none placeholder:text-gray-300 dark:placeholder:text-white/20" />
          </div>
        </div>

        <p className="mb-6 px-1 text-[12px] leading-relaxed text-gray-400 dark:text-white/30">
          This information is used to personalise Grozl's responses. It's stored locally and never shared with third parties.
        </p>
      </div>
    </div>
  )
}

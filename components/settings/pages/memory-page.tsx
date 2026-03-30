'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, Loader2 } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

interface MemoryPageProps {
  user: User | null
  onBack: () => void
}

export default function MemoryPage({ user, onBack }: MemoryPageProps) {
  const [memoryText, setMemoryText]   = useState('')
  const [loading, setLoading]         = useState(false)
  const [saved, setSaved]             = useState(false)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    const supabase = createClient()
    supabase
      .from('user_memories')
      .select('memory')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        setMemoryText(data?.memory || '')
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [user])

  const handleSave = async () => {
    if (!user) return
    setLoading(true)
    const supabase = createClient()
    await supabase.from('user_memories').upsert({
      user_id:    user.id,
      memory:     memoryText,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    setLoading(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleClear = async () => {
    if (!user || !confirm('Clear all memory? Grozl will forget everything about you.')) return
    setMemoryText('')
    const supabase = createClient()
    await supabase.from('user_memories').upsert({
      user_id:    user.id,
      memory:     '',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
  }

  return (
    <div className="flex h-full flex-col bg-[#F2F2F7]">
      {/* Header */}
      <div className="flex items-center gap-3 bg-[#F2F2F7] px-4 py-4 pt-6">
        <button onClick={onBack} className="flex h-8 w-8 items-center justify-center rounded-full text-gray-600 transition hover:bg-gray-200">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-[17px] font-semibold text-gray-900">Memory</h1>
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-2">

        {!user ? (
          <div className="rounded-2xl bg-white px-4 py-5 text-center">
            <p className="text-[15px] text-gray-500">Sign in to use persistent memory across devices.</p>
          </div>
        ) : (
          <>
            <div className="rounded-2xl bg-blue-50 px-4 py-3">
              <p className="text-[13px] leading-relaxed text-blue-700">
                Grozl remembers things you share — your name, preferences, ongoing projects, and more. This memory is used in every conversation to give you more personalized responses.
              </p>
            </div>

            <div className="flex flex-1 flex-col overflow-hidden rounded-2xl bg-white">
              <p className="border-b border-gray-100 px-4 py-3 text-[12px] font-semibold uppercase tracking-wide text-gray-400">
                Current Memory
              </p>
              <textarea
                value={memoryText}
                onChange={e => setMemoryText(e.target.value)}
                placeholder={loading ? 'Loading...' : 'Nothing stored yet...'}
                disabled={loading}
                rows={10}
                className="flex-1 resize-none bg-transparent px-4 py-3 text-[14px] text-gray-800 outline-none placeholder:text-gray-300 disabled:opacity-50"
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
                className="rounded-2xl border border-gray-200 bg-white px-5 py-3.5 text-[14px] font-medium text-red-500 transition hover:bg-red-50 disabled:opacity-40"
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
                                             

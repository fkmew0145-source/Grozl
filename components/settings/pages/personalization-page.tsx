'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronDown, X, Plus } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import {
  loadPersonalization, savePersonalization,
  GrozlPersonalization,
} from '../settings-store'

interface PersonalizationPageProps {
  user: User | null
  onBack: () => void
}

const BASE_TONES = [
  { id: 'default',   label: 'Default',    desc: 'Balanced and adaptive — Grozl mirrors your energy naturally.' },
  { id: 'formal',    label: 'Formal',     desc: 'Professional, structured, and precise responses.' },
  { id: 'casual',    label: 'Casual',     desc: 'Relaxed and friendly, like talking to a friend.' },
  { id: 'technical', label: 'Technical',  desc: 'Deep technical detail, code-first, no hand-holding.' },
  { id: 'concise',   label: 'Concise',    desc: 'Strictly functional. No filler words or extra explanation.' },
  { id: 'friendly',  label: 'Friendly',   desc: 'Warm, encouraging, and supportive in all replies.' },
  { id: 'humorous',  label: 'Humorous',   desc: 'Light-hearted, witty, with a dash of fun.' },
] as const

const AVAILABLE_CHARACTERISTICS = [
  'Use bullet points', 'Always give examples', 'Step-by-step explanations',
  'Include code snippets', 'Ask clarifying questions', 'Be direct',
  'Explain your reasoning', 'Use analogies', 'Avoid jargon',
  'Include pros and cons', 'Suggest alternatives', 'Be encouraging',
]

export default function PersonalizationPage({ user, onBack }: PersonalizationPageProps) {
  const [personalization, setPersonalization] = useState<GrozlPersonalization>(() => loadPersonalization(user?.id))
  const [showToneDialog, setShowToneDialog]   = useState(false)
  const [showCharDialog, setShowCharDialog]   = useState(false)
  const [saved, setSaved]                     = useState(false)

  const patch = (p: Partial<GrozlPersonalization>) => {
    setPersonalization(prev => {
      const updated = { ...prev, ...p }
      savePersonalization(updated, user?.id)
      return updated
    })
  }

  const handleSave = () => {
    savePersonalization(personalization, user?.id)
    setSaved(true)
    setTimeout(() => { setSaved(false); onBack() }, 800)
  }

  const currentTone = BASE_TONES.find(t => t.id === personalization.baseTone) ?? BASE_TONES[0]

  const toggleCharacteristic = (char: string) => {
    const existing = personalization.characteristics
    if (existing.includes(char)) {
      patch({ characteristics: existing.filter(c => c !== char) })
    } else {
      patch({ characteristics: [...existing, char] })
    }
  }

  return (
    <div className="flex h-full flex-col bg-[#F2F2F7]">
      {/* Header */}
      <div className="flex items-center justify-between bg-[#F2F2F7] px-4 py-4 pt-6">
        <button onClick={onBack} className="flex h-8 w-8 items-center justify-center rounded-full text-gray-600 transition hover:bg-gray-200">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-[17px] font-semibold text-gray-900">Personalization</h1>
        <button
          onClick={handleSave}
          className="flex h-8 w-8 items-center justify-center rounded-full text-gray-600 transition hover:bg-gray-200"
        >
          {saved ? (
            <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">

        {/* Base style and tone */}
        <div className="mb-2 overflow-hidden rounded-2xl bg-white shadow-sm">
          <button
            onClick={() => setShowToneDialog(true)}
            className="flex w-full items-center justify-between px-4 py-4 transition active:bg-gray-50"
          >
            <div className="text-left">
              <p className="text-[15px] text-gray-800">Base style and tone</p>
              <p className="text-[13px] text-gray-400">{currentTone.label}</p>
            </div>
            <ChevronDown className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <p className="mb-5 px-1 text-[12px] leading-relaxed text-gray-400">
          This is the main voice and tone Grozl uses in your conversations. This doesn't impact Grozl's capabilities.
        </p>

        {/* Characteristics */}
        <p className="mb-2 px-1 text-[13px] text-gray-500">Characteristics</p>
        <div className="mb-2 overflow-hidden rounded-2xl bg-white shadow-sm">
          <button
            onClick={() => setShowCharDialog(true)}
            className="flex w-full items-center justify-between px-4 py-4 transition active:bg-gray-50"
          >
            <span className="text-[15px] text-gray-800">Add characteristics</span>
            <Plus className="h-5 w-5 text-gray-400" />
          </button>
          {personalization.characteristics.length > 0 && (
            <div className="border-t border-gray-100 px-4 py-3">
              <div className="flex flex-wrap gap-2">
                {personalization.characteristics.map(char => (
                  <div
                    key={char}
                    className="flex items-center gap-1.5 rounded-full bg-[#EEF2FF] px-3 py-1.5 text-[13px] text-[#4D6BFE]"
                  >
                    <span>{char}</span>
                    <button onClick={() => toggleCharacteristic(char)} className="opacity-60 hover:opacity-100">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <p className="mb-5 px-1 text-[12px] leading-relaxed text-gray-400">
          Choose some additional customizations on top of your base style and tone.
        </p>

        {/* Custom instructions */}
        <p className="mb-2 px-1 text-[13px] text-gray-500">Custom instructions</p>
        <div className="mb-2 overflow-hidden rounded-2xl bg-white shadow-sm">
          <textarea
            value={personalization.customInstructions}
            onChange={e => patch({ customInstructions: e.target.value })}
            placeholder={
              'Response Style: Strictly functional and concise.\nTone: No extra excitement or filler words.\nGoal: Only answer what is asked or required for the task.'
            }
            rows={5}
            className="w-full resize-none bg-transparent px-4 py-4 text-[14px] text-gray-800 outline-none placeholder:text-[13px] placeholder:text-gray-300"
          />
        </div>

        <p className="mb-8 px-1 text-[12px] leading-relaxed text-gray-400">
          Grozl will follow these instructions in every conversation. Be specific for best results.
        </p>
      </div>

      {/* Tone dialog */}
      {showToneDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-8">
          <div className="w-full max-w-[340px] overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="px-5 pt-5 pb-3 text-center">
              <p className="text-[17px] font-semibold text-gray-900">Base Style &amp; Tone</p>
            </div>
            <div className="max-h-[55vh] overflow-y-auto">
              {BASE_TONES.map((tone, i) => (
                <button
                  key={tone.id}
                  onClick={() => { patch({ baseTone: tone.id }); setShowToneDialog(false) }}
                  className={`flex w-full items-start gap-3 px-5 py-4 text-left transition ${i > 0 ? 'border-t border-gray-100' : ''} active:bg-gray-50`}
                >
                  <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${personalization.baseTone === tone.id ? 'border-gray-900' : 'border-gray-300'}`}>
                    {personalization.baseTone === tone.id && <div className="h-2.5 w-2.5 rounded-full bg-gray-900" />}
                  </div>
                  <div>
                    <p className={`text-[15px] ${personalization.baseTone === tone.id ? 'font-medium text-gray-900' : 'text-gray-700'}`}>{tone.label}</p>
                    <p className="text-[12px] text-gray-400 leading-relaxed">{tone.desc}</p>
                  </div>
                </button>
              ))}
            </div>
            <div className="border-t border-gray-100">
              <button onClick={() => setShowToneDialog(false)} className="w-full py-4 text-[15px] text-gray-500 transition hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Characteristics dialog */}
      {showCharDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-8">
          <div className="w-full max-w-[340px] overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="px-5 pt-5 pb-3 text-center">
              <p className="text-[17px] font-semibold text-gray-900">Add Characteristics</p>
            </div>
            <div className="max-h-[55vh] overflow-y-auto px-4 py-3">
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_CHARACTERISTICS.map(char => {
                  const active = personalization.characteristics.includes(char)
                  return (
                    <button
                      key={char}
                      onClick={() => toggleCharacteristic(char)}
                      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] transition ${
                        active
                          ? 'border-[#4D6BFE] bg-[#EEF2FF] text-[#4D6BFE]'
                          : 'border-gray-200 bg-white text-gray-700'
                      }`}
                    >
                      {active && <X className="h-3 w-3" />}
                      {char}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="border-t border-gray-100">
              <button onClick={() => setShowCharDialog(false)} className="w-full py-4 text-[15px] font-semibold text-[#4D6BFE] transition hover:bg-gray-50">
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
      }
      

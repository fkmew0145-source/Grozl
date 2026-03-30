'use client'

import { ChevronLeft } from 'lucide-react'
import { GrozlSettings, patchSettings } from '../settings-store'

interface ModelPageProps {
  settings: GrozlSettings
  onSettingsChange: (s: GrozlSettings) => void
  onBack: () => void
}

const MODELS = [
  {
    id:    'auto',
    label: 'Auto (Smart Routing)',
    desc:  'Best model chosen per query — recommended',
    icon:  '⚡',
  },
  {
    id:    'deepseek',
    label: 'DeepSeek R1',
    desc:  'Best for coding, math, and deep reasoning',
    icon:  '🧠',
  },
  {
    id:    'groq',
    label: 'Groq Llama 3.3',
    desc:  'Ultra-fast responses for chat and general tasks',
    icon:  '🦙',
  },
  {
    id:    'gemini',
    label: 'Gemini 1.5 Flash',
    desc:  'Vision tasks and image understanding',
    icon:  '👁️',
  },
] as const

export default function ModelPage({ settings, onSettingsChange, onBack }: ModelPageProps) {
  const handleSelect = (id: GrozlSettings['defaultModel']) => {
    const updated = patchSettings({ defaultModel: id })
    onSettingsChange(updated)
  }

  return (
    <div className="flex h-full flex-col bg-[#F2F2F7]">
      {/* Header */}
      <div className="flex items-center gap-3 bg-[#F2F2F7] px-4 py-4 pt-6">
        <button onClick={onBack} className="flex h-8 w-8 items-center justify-center rounded-full text-gray-600 transition hover:bg-gray-200">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-[17px] font-semibold text-gray-900">Default Model</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2">
        <p className="mb-3 px-1 text-[13px] leading-relaxed text-gray-500">
          Choose which AI model Grozl uses by default. <span className="font-medium text-[#4D6BFE]">Auto</span> intelligently routes each query to the best available model.
        </p>

        <div className="overflow-hidden rounded-2xl bg-white">
          {MODELS.map((model, i) => (
            <button
              key={model.id}
              onClick={() => handleSelect(model.id)}
              className={`flex w-full items-center gap-4 px-4 py-4 text-left transition ${i > 0 ? 'border-t border-gray-100' : ''} active:bg-gray-50`}
            >
              <span className="text-[22px]">{model.icon}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-[15px] font-medium ${settings.defaultModel === model.id ? 'text-[#4D6BFE]' : 'text-gray-800'}`}>
                  {model.label}
                </p>
                <p className="text-[12px] text-gray-400">{model.desc}</p>
              </div>
              <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${settings.defaultModel === model.id ? 'border-[#4D6BFE]' : 'border-gray-300'}`}>
                {settings.defaultModel === model.id && (
                  <div className="h-2.5 w-2.5 rounded-full bg-[#4D6BFE]" />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
      }

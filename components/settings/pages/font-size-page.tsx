'use client'

import { ChevronLeft } from 'lucide-react'
import { GrozlSettings, patchSettings } from '../settings-store'

interface FontSizePageProps {
  settings: GrozlSettings
  onSettingsChange: (s: GrozlSettings) => void
  onBack: () => void
}

const SIZES = [
  { label: 'XS', value: 12 },
  { label: 'S',  value: 13 },
  { label: 'M',  value: 15 },
  { label: 'L',  value: 17 },
  { label: 'XL', value: 19 },
]

export default function FontSizePage({ settings, onSettingsChange, onBack }: FontSizePageProps) {
  const current = settings.fontSize ?? 15

  const handleSelect = (value: number) => {
    const updated = patchSettings({ fontSize: value })
    onSettingsChange(updated)
    document.documentElement.style.setProperty('--chat-font-size', `${value}px`)
  }

  return (
    <div className="flex h-full flex-col bg-[#F2F2F7] dark:bg-[#0d0f14]">
      {/* Header */}
      <div className="flex items-center gap-3 bg-[#F2F2F7] dark:bg-[#0d0f14] px-4 py-4 pt-6">
        <button
          onClick={onBack}
          className="flex h-8 w-8 items-center justify-center rounded-full text-gray-600 dark:text-white/60 transition hover:bg-gray-200 dark:hover:bg-white/10"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="text-[17px] font-semibold text-gray-900 dark:text-white">Font Size</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2">

        {/* Preview */}
        <div className="mb-6 rounded-2xl bg-white dark:bg-white/5 px-4 py-5">
          <p className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-gray-400 dark:text-white/30">Preview</p>
          <p style={{ fontSize: `${current}px`, lineHeight: 1.6 }} className="text-gray-800 dark:text-white/90">
            Grozl AI — Your Mind, Amplified.
          </p>
          <p style={{ fontSize: `${current - 2}px`, lineHeight: 1.5 }} className="mt-1 text-gray-500 dark:text-white/50">
            The quick brown fox jumps over the lazy dog.
          </p>
        </div>

        {/* Size options */}
        <p className="mb-2 px-1 text-[13px] text-gray-500 dark:text-white/50">Choose Size</p>
        <div className="mb-6 overflow-hidden rounded-2xl bg-white dark:bg-white/5">
          {SIZES.map((s, i) => (
            <div key={s.value}>
              <button
                onClick={() => handleSelect(s.value)}
                className="flex w-full items-center justify-between px-4 py-4 text-left transition active:bg-gray-50 dark:active:bg-white/5"
              >
                <div className="flex items-center gap-3">
                  <span style={{ fontSize: `${s.value}px` }} className="font-semibold text-gray-800 dark:text-white/90 w-8">Aa</span>
                  <span className="text-[15px] text-gray-800 dark:text-white/90">{s.label} · {s.value}px</span>
                </div>
                {current === s.value && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#4D6BFE]">
                    <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                )}
              </button>
              {i < SIZES.length - 1 && <div className="mx-4 h-px bg-gray-100 dark:bg-white/10" />}
            </div>
          ))}
        </div>

        {/* Slider */}
        <div className="mb-6 rounded-2xl bg-white dark:bg-white/5 px-4 py-5">
          <p className="mb-3 text-[13px] text-gray-500 dark:text-white/50">Or drag to adjust</p>
          <input
            type="range"
            min={12}
            max={20}
            value={current}
            onChange={e => handleSelect(Number(e.target.value))}
            className="w-full accent-[#4D6BFE]"
          />
          <div className="mt-1 flex justify-between text-[11px] text-gray-400 dark:text-white/30">
            <span>Small (12px)</span>
            <span className="font-semibold text-[#4D6BFE]">{current}px</span>
            <span>Large (20px)</span>
          </div>
        </div>
      </div>
    </div>
  )
}

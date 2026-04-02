'use client'

import { ChevronLeft } from 'lucide-react'
import { useTheme } from 'next-themes'
import { GrozlSettings, patchSettings } from '../settings-store'

interface AppearancePageProps {
  settings: GrozlSettings
  onSettingsChange: (s: GrozlSettings) => void
  onBack: () => void
}

const FONT_SIZES = [
  { label: 'XS', value: 12, preview: 'text-xs' },
  { label: 'S',  value: 13, preview: 'text-sm' },
  { label: 'M',  value: 15, preview: 'text-base' },
  { label: 'L',  value: 17, preview: 'text-lg' },
  { label: 'XL', value: 19, preview: 'text-xl' },
]

const THEMES = [
  {
    val: 'light' as const,
    label: 'Light',
    desc: 'Classic white interface',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <circle cx="12" cy="12" r="5"/>
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
      </svg>
    ),
  },
  {
    val: 'dark' as const,
    label: 'Dark',
    desc: 'Easy on the eyes at night',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
      </svg>
    ),
  },
  {
    val: 'system' as const,
    label: 'Auto',
    desc: 'Follows your device setting',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <rect x="2" y="3" width="20" height="14" rx="2"/>
        <path d="M8 21h8M12 17v4"/>
      </svg>
    ),
  },
]

export default function AppearancePage({ settings, onSettingsChange, onBack }: AppearancePageProps) {
  const { theme, setTheme } = useTheme()
  const activeTheme  = (theme as 'light' | 'dark' | 'system') ?? settings.theme ?? 'system'
  const currentSize  = settings.fontSize ?? 15

  const handleTheme = (val: 'light' | 'dark' | 'system') => {
    setTheme(val)
    const updated = patchSettings({ theme: val })
    onSettingsChange(updated)
  }

  const handleFontSize = (value: number) => {
    const updated = patchSettings({ fontSize: value })
    onSettingsChange(updated)
    document.documentElement.style.setProperty('--chat-font-size', `${value}px`)
  }

  return (
    <div className="flex h-full flex-col bg-[#f8fafc] dark:bg-[#0d0f14]">

      {/* Header */}
      <div className="flex items-center bg-white/70 dark:bg-white/5 backdrop-blur-xl px-4 py-3 pt-12">
        <button
          onClick={onBack}
          className="flex h-8 w-8 items-center justify-center rounded-full text-gray-600 dark:text-white/60 transition active:bg-gray-200 dark:active:bg-white/10"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="flex-1 text-center text-[17px] font-semibold text-black dark:text-white">Appearance</h1>
        <div className="h-8 w-8" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">

        {/* ── Theme ─────────────────────────────────────── */}
        <p className="mb-1.5 px-1 text-[13px] text-black/50 dark:text-white/40">Theme</p>
        <div className="mb-6 overflow-hidden rounded-2xl bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-black/5 dark:border-white/10">
          {THEMES.map((t, i) => (
            <div key={t.val}>
              <button
                onClick={() => handleTheme(t.val)}
                className="flex w-full items-center gap-4 px-4 py-4 text-left transition active:bg-gray-50 dark:active:bg-white/5"
              >
                {/* Theme icon */}
                <span className={[
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                  activeTheme === t.val
                    ? 'bg-indigo-500/15 text-indigo-500 dark:bg-indigo-500/20 dark:text-indigo-400'
                    : 'bg-black/5 dark:bg-white/8 text-black/40 dark:text-white/40',
                ].join(' ')}>
                  {t.icon}
                </span>

                {/* Labels */}
                <div className="flex-1">
                  <p className="text-[15px] font-medium text-black dark:text-white">{t.label}</p>
                  <p className="text-[12px] text-black/40 dark:text-white/40">{t.desc}</p>
                </div>

                {/* Checkmark */}
                {activeTheme === t.val ? (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500">
                    <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                ) : (
                  <span className="h-5 w-5 shrink-0 rounded-full border-2 border-black/15 dark:border-white/20" />
                )}
              </button>
              {i < THEMES.length - 1 && <div className="mx-4 h-px bg-black/5 dark:bg-white/10" />}
            </div>
          ))}
        </div>

        {/* ── Font Size ──────────────────────────────────── */}
        <p className="mb-1.5 px-1 text-[13px] text-black/50 dark:text-white/40">Font Size</p>

        {/* Preview */}
        <div className="mb-3 rounded-2xl bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-black/5 dark:border-white/10 px-4 py-4">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-black/30 dark:text-white/30">Preview</p>
          <p style={{ fontSize: `${currentSize}px`, lineHeight: 1.6 }} className="text-black dark:text-white">
            Grozl AI — Your Mind, Amplified.
          </p>
        </div>

        {/* Size selector */}
        <div className="mb-3 overflow-hidden rounded-2xl bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-black/5 dark:border-white/10">
          {FONT_SIZES.map((s, i) => (
            <div key={s.value}>
              <button
                onClick={() => handleFontSize(s.value)}
                className="flex w-full items-center justify-between px-4 py-4 text-left transition active:bg-gray-50 dark:active:bg-white/5"
              >
                <div className="flex items-center gap-4">
                  <span
                    style={{ fontSize: `${s.value}px`, lineHeight: 1 }}
                    className="w-6 font-semibold text-black dark:text-white"
                  >
                    Aa
                  </span>
                  <div>
                    <span className="text-[15px] text-black dark:text-white">{s.label}</span>
                    <span className="ml-2 text-[13px] text-black/35 dark:text-white/35">{s.value}px</span>
                  </div>
                </div>
                {currentSize === s.value ? (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500">
                    <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                ) : (
                  <span className="h-5 w-5 rounded-full border-2 border-black/15 dark:border-white/20" />
                )}
              </button>
              {i < FONT_SIZES.length - 1 && <div className="mx-4 h-px bg-black/5 dark:bg-white/10" />}
            </div>
          ))}
        </div>

        {/* Slider */}
        <div className="mb-6 rounded-2xl bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-black/5 dark:border-white/10 px-4 py-4">
          <p className="mb-3 text-[13px] text-black/40 dark:text-white/40">Drag to fine-tune</p>
          <input
            type="range"
            min={12}
            max={20}
            value={currentSize}
            onChange={e => handleFontSize(Number(e.target.value))}
            className="w-full accent-indigo-500"
          />
          <div className="mt-2 flex justify-between text-[11px] text-black/30 dark:text-white/30">
            <span>Small</span>
            <span>Large</span>
          </div>
        </div>

      </div>
    </div>
  )
    }
          

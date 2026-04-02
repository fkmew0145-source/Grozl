'use client'

import { useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { useTheme } from 'next-themes'
import { GrozlSettings, patchSettings, applyFontSize } from '../settings-store'

interface AppearancePageProps {
  settings: GrozlSettings
  onSettingsChange: (s: GrozlSettings) => void
  onBack: () => void
}

const THEMES = [
  { id: 'system', label: 'System', sub: 'Follow device setting' },
  { id: 'light',  label: 'Light',  sub: 'Always light mode' },
  { id: 'dark',   label: 'Dark',   sub: 'Always dark mode' },
] as const

export default function AppearancePage({ settings, onSettingsChange, onBack }: AppearancePageProps) {
  const { setTheme } = useTheme()
  const [showThemeDialog, setShowThemeDialog] = useState(false)
  const [tempTheme, setTempTheme]             = useState(settings.appearance)
  const [fontSize, setFontSize]               = useState(settings.fontSize)

  const confirmTheme = () => {
    const updated = patchSettings({ appearance: tempTheme })
    setTheme(tempTheme)          // next-themes applies immediately
    onSettingsChange(updated)
    setShowThemeDialog(false)
  }

  const handleFontChange = (val: number) => {
    setFontSize(val)
    const updated = patchSettings({ fontSize: val })
    applyFontSize(val)
    onSettingsChange(updated)
  }

  const appearanceLabel = { system: 'System', light: 'Light', dark: 'Dark' }[settings.appearance]

  return (
    <div className="flex h-full flex-col bg-transparent">
      {/* Header */}
      <div className="flex items-center gap-3 bg-white/70 dark:bg-white/5 backdrop-blur-xl px-4 py-4 pt-6">
        <button onClick={onBack} className="flex h-8 w-8 items-center justify-center rounded-full text-gray-600 transition active:bg-gray-200">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-[17px] font-semibold text-black dark:text-white">Appearance</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2">

        {/* Theme */}
        <p className="mb-2 px-1 text-[13px] text-black/50 dark:text-white/50">Theme</p>
        <div className="mb-1 overflow-hidden rounded-2xl bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-black/5 dark:border-white/10">
          <button
            onClick={() => { setTempTheme(settings.appearance); setShowThemeDialog(true) }}
            className="flex w-full items-center justify-between px-4 py-4 transition active:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <svg className="h-5 w-5 text-black/50 dark:text-white/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"/>
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
              </svg>
              <span className="text-[15px] text-black dark:text-white">Appearance</span>
            </div>
            <div className="flex items-center gap-1 text-gray-400">
              <span className="text-[14px]">{appearanceLabel}</span>
              <ChevronLeft className="h-4 w-4 rotate-180" />
            </div>
          </button>
        </div>
        <p className="mb-5 px-1 text-[12px] text-gray-400">Changing the appearance will apply immediately across the entire app.</p>

        {/* Font Size */}
        <p className="mb-2 px-1 text-[13px] text-black/50 dark:text-white/50">Font Size</p>
        <div className="mb-2 overflow-hidden rounded-2xl bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-black/5 dark:border-white/10 px-4 py-5">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-[13px] text-gray-400">A</span>
            <span className="text-[18px] font-semibold text-black dark:text-white">A</span>
          </div>
          <input
            type="range" min={12} max={20} value={fontSize}
            onChange={e => handleFontChange(Number(e.target.value))}
            className="w-full accent-gray-900"
          />
          <p className="mt-2 text-center text-[13px] text-gray-400">Size: {fontSize}px</p>
        </div>
        <p className="mb-5 px-1 text-[12px] text-gray-400">Adjust the text size in conversations.</p>

        {/* Preview */}
        <p className="mb-2 px-1 text-[13px] text-black/50 dark:text-white/50">Preview</p>
        <div className="overflow-hidden rounded-2xl bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-black/5 dark:border-white/10 px-4 py-4">
          <p style={{ fontSize: `${fontSize}px` }} className="leading-relaxed text-black dark:text-white">
            This is how your messages will look. Grozl is your smart AI companion.
          </p>
        </div>
      </div>

      {/* Theme Dialog */}
      {showThemeDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
          <div className="w-full max-w-[320px] overflow-hidden rounded-3xl bg-white/90 dark:bg-white/10 backdrop-blur-xl shadow-2xl border border-black/5 dark:border-white/10">
            <div className="px-5 pt-5 pb-3 text-center">
              <p className="text-[17px] font-semibold text-black dark:text-white">Appearance</p>
            </div>
            <div>
              {THEMES.map((t, i) => (
                <button
                  key={t.id}
                  onClick={() => setTempTheme(t.id)}
                  className={`flex w-full items-center justify-between px-5 py-4 text-left transition ${i > 0 ? 'border-t border-black/5 dark:border-white/10' : ''} active:bg-gray-50`}
                >
                  <div>
                    <p className={`text-[15px] ${tempTheme === t.id ? 'font-semibold text-black dark:text-white' : 'text-black/70 dark:text-white/70'}`}>{t.label}</p>
                    <p className="text-[12px] text-gray-400">{t.sub}</p>
                  </div>
                  <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${tempTheme === t.id ? 'border-black dark:border-white' : 'border-black/30 dark:border-white/30'}`}>
                    {tempTheme === t.id && <div className="h-2.5 w-2.5 rounded-full bg-black dark:bg-white" />}
                  </div>
                </button>
              ))}
            </div>
            <div className="border-t border-black/5 dark:border-white/10">
              <button onClick={confirmTheme} className="w-full py-4 text-[15px] font-semibold text-[#4D6BFE] transition active:bg-gray-50">
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
      }

                

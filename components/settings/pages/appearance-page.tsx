'use client'

import { useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { GrozlSettings, patchSettings } from '../settings-store'

interface AppearancePageProps {
  settings: GrozlSettings
  onSettingsChange: (s: GrozlSettings) => void
  onBack: () => void
}

export default function AppearancePage({ settings, onSettingsChange, onBack }: AppearancePageProps) {
  const [showAppearanceDialog, setShowAppearanceDialog] = useState(false)
  const [tempAppearance, setTempAppearance] = useState(settings.appearance)
  const [showFontPage, setShowFontPage]     = useState(false)

  const confirmAppearance = () => {
    const updated = patchSettings({ appearance: tempAppearance })
    onSettingsChange(updated)
    setShowAppearanceDialog(false)
  }

  const appearanceLabel = {
    system: 'System',
    light:  'Light',
    dark:   'Dark',
  }[settings.appearance]

  if (showFontPage) {
    return (
      <FontSizePage
        settings={settings}
        onSettingsChange={onSettingsChange}
        onBack={() => setShowFontPage(false)}
      />
    )
  }

  return (
    <div className="flex h-full flex-col bg-[#F2F2F7]">
      {/* Header */}
      <div className="flex items-center gap-3 bg-[#F2F2F7] px-4 py-4 pt-6">
        <button onClick={onBack} className="flex h-8 w-8 items-center justify-center rounded-full text-gray-600 transition hover:bg-gray-200">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-[17px] font-semibold text-gray-900">Appearance</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2">
        <div className="overflow-hidden rounded-2xl bg-white">
          {/* Appearance theme */}
          <button
            onClick={() => { setTempAppearance(settings.appearance); setShowAppearanceDialog(true) }}
            className="flex w-full items-center justify-between px-4 py-4 transition active:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <svg className="h-5 w-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
              <span className="text-[15px] text-gray-800">Appearance</span>
            </div>
            <div className="flex items-center gap-1 text-gray-400">
              <span className="text-[14px]">{appearanceLabel}</span>
              <ChevronLeft className="h-4 w-4 rotate-180" />
            </div>
          </button>

          <div className="mx-4 h-px bg-gray-100" />

          {/* Font size */}
          <button
            onClick={() => setShowFontPage(true)}
            className="flex w-full items-center justify-between px-4 py-4 transition active:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <span className="text-[15px] font-bold text-gray-500" style={{ letterSpacing: '-1px' }}>AA</span>
              <span className="text-[15px] text-gray-800">Font size</span>
            </div>
            <ChevronLeft className="h-4 w-4 rotate-180 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Appearance Dialog */}
      {showAppearanceDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-8">
          <div className="w-full max-w-[320px] overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="px-5 pt-5 pb-2 text-center">
              <p className="text-[17px] font-semibold text-gray-900">Appearance</p>
            </div>
            {(['system', 'light', 'dark'] as const).map((opt, i) => (
              <button
                key={opt}
                onClick={() => setTempAppearance(opt)}
                className={`flex w-full items-center gap-3 px-5 py-4 text-left transition ${i > 0 ? 'border-t border-gray-100' : ''} active:bg-gray-50`}
              >
                <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${tempAppearance === opt ? 'border-gray-900' : 'border-gray-300'}`}>
                  {tempAppearance === opt && <div className="h-2.5 w-2.5 rounded-full bg-gray-900" />}
                </div>
                <span className={`text-[15px] ${tempAppearance === opt ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                  {{ system: 'System', light: 'Light', dark: 'Dark' }[opt]}
                </span>
              </button>
            ))}
            <div className="border-t border-gray-100">
              <button onClick={confirmAppearance} className="w-full py-4 text-[15px] font-semibold text-[#4D6BFE] transition hover:bg-gray-50">
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Font Size sub-page (inline) ──────────────────────────────────────────────
function FontSizePage({
  settings,
  onSettingsChange,
  onBack,
}: {
  settings: GrozlSettings
  onSettingsChange: (s: GrozlSettings) => void
  onBack: () => void
}) {
  const [size, setSize] = useState(settings.fontSize)

  const handleChange = (val: number) => {
    setSize(val)
    const updated = patchSettings({ fontSize: val })
    onSettingsChange(updated)
    document.documentElement.style.setProperty('--chat-font-size', `${val}px`)
  }

  return (
    <div className="flex h-full flex-col bg-[#F2F2F7]">
      <div className="flex items-center gap-3 bg-[#F2F2F7] px-4 py-4 pt-6">
        <button onClick={onBack} className="flex h-8 w-8 items-center justify-center rounded-full text-gray-600 transition hover:bg-gray-200">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-[17px] font-semibold text-gray-900">Font size</h1>
      </div>

      <div className="flex flex-1 flex-col px-4 py-4">
        {/* Preview bubble */}
        <div className="mb-6 flex justify-end">
          <div className="max-w-[70%] rounded-2xl rounded-tr-sm bg-[#E8EEFF] px-4 py-3">
            <p style={{ fontSize: `${size}px` }} className="text-gray-800 leading-relaxed">
              Preview font size
            </p>
          </div>
        </div>

        <div className="mb-6 rounded-2xl bg-white px-4 py-4">
          <p style={{ fontSize: `${size}px` }} className="leading-relaxed text-gray-700 mb-3">
            You can adjust the font size by dragging the slider below.
          </p>
          <p style={{ fontSize: `${size - 1}px` }} className="leading-relaxed text-gray-500">
            If there are any issues or suggestions, please send feedback via Help &amp; Feedback.
          </p>
        </div>

        <div className="mt-auto rounded-2xl bg-white px-4 py-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[12px] text-gray-400">Small</span>
            <span className="text-[12px] text-gray-400">Default ({size}px)</span>
            <span className="text-[16px] text-gray-400">Large</span>
          </div>
          <input
            type="range"
            min={12}
            max={20}
            step={1}
            value={size}
            onChange={e => handleChange(Number(e.target.value))}
            className="w-full accent-gray-800"
          />
        </div>
      </div>
    </div>
  )
            }
            

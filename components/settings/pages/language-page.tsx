'use client'

import { useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { GrozlSettings, patchSettings } from '../settings-store'

interface LanguagePageProps {
  settings: GrozlSettings
  onSettingsChange: (s: GrozlSettings) => void
  onBack: () => void
}

const APP_LANGUAGES = [
  { id: 'hinglish', label: 'Hinglish (Hindi + English)' },
  { id: 'english',  label: 'English' },
  { id: 'hindi',    label: 'हिंदी (Hindi)' },
  { id: 'spanish',  label: 'Español (Spanish)' },
  { id: 'french',   label: 'Français (French)' },
  { id: 'arabic',   label: 'العربية (Arabic)' },
  { id: 'bengali',  label: 'বাংলা (Bengali)' },
  { id: 'portuguese', label: 'Português (Portuguese)' },
  { id: 'russian',  label: 'Русский (Russian)' },
  { id: 'urdu',     label: 'اردو (Urdu)' },
  { id: 'indonesian', label: 'Bahasa Indonesia' },
  { id: 'german',   label: 'Deutsch (German)' },
  { id: 'japanese', label: '日本語 (Japanese)' },
  { id: 'chinese',  label: '中文 (Chinese)' },
  { id: 'turkish',  label: 'Türkçe (Turkish)' },
] as const

const VOICE_LANGUAGES = [
  { id: 'hi-IN',  label: 'Hindi (India)' },
  { id: 'en-IN',  label: 'English (India)' },
  { id: 'en-US',  label: 'English (US)' },
]

export default function LanguagePage({ settings, onSettingsChange, onBack }: LanguagePageProps) {
  const [pendingLang, setPendingLang]       = useState<string | null>(null)
  const [pendingVoice, setPendingVoice]     = useState<string | null>(null)
  const [showLangDialog, setShowLangDialog] = useState(false)
  const [showVoiceDialog, setShowVoiceDialog] = useState(false)
  const [tempLang, setTempLang]             = useState(settings.language)
  const [tempVoice, setTempVoice]           = useState(settings.voiceLanguage)

  const confirmLang = () => {
    const updated = patchSettings({ language: tempLang as GrozlSettings['language'] })
    onSettingsChange(updated)
    setShowLangDialog(false)
  }

  const confirmVoice = () => {
    const updated = patchSettings({ voiceLanguage: tempVoice })
    onSettingsChange(updated)
    setShowVoiceDialog(false)
  }

  const currentLangLabel  = APP_LANGUAGES.find(l => l.id === settings.language)?.label  || settings.language
  const currentVoiceLabel = VOICE_LANGUAGES.find(l => l.id === settings.voiceLanguage)?.label || settings.voiceLanguage

  return (
    <div className="flex h-full flex-col bg-[#F2F2F7]">
      {/* Header */}
      <div className="flex items-center gap-3 bg-[#F2F2F7] px-4 py-4 pt-6">
        <button onClick={onBack} className="flex h-8 w-8 items-center justify-center rounded-full text-gray-600 transition hover:bg-gray-200">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-[17px] font-semibold text-gray-900">Language</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2">
        {/* App language */}
        <p className="mb-2 px-1 text-[13px] text-gray-500">App</p>
        <div className="mb-6 overflow-hidden rounded-2xl bg-white">
          <button
            onClick={() => { setTempLang(settings.language); setShowLangDialog(true) }}
            className="flex w-full items-center justify-between px-4 py-4 transition active:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <svg className="h-5 w-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                <path d="M2 12h20" />
              </svg>
              <span className="text-[15px] text-gray-800">Language</span>
            </div>
            <div className="flex items-center gap-1 text-gray-400">
              <span className="text-[14px]">{currentLangLabel.split(' ')[0]}</span>
              <ChevronLeft className="h-4 w-4 rotate-180" />
            </div>
          </button>
        </div>

        {/* Voice / Audio language */}
        <p className="mb-2 px-1 text-[13px] text-gray-500">Audio</p>
        <div className="overflow-hidden rounded-2xl bg-white">
          <button
            onClick={() => { setTempVoice(settings.voiceLanguage); setShowVoiceDialog(true) }}
            className="flex w-full items-center justify-between px-4 py-4 transition active:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <svg className="h-5 w-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
              <div className="text-left">
                <p className="text-[15px] text-gray-800">Main language</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-gray-400">
              <span className="text-[14px]">{currentVoiceLabel.split(' ')[0]}</span>
              <ChevronLeft className="h-4 w-4 rotate-180" />
            </div>
          </button>
          <p className="border-t border-gray-100 px-4 py-3 text-[12px] leading-relaxed text-gray-400">
            Select the primary language for voice input to get better recognition results.
          </p>
        </div>
      </div>

      {/* App Language Dialog */}
      {showLangDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-8">
          <div className="w-full max-w-[320px] overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="px-5 pt-5 pb-2 text-center">
              <svg className="mx-auto mb-2 h-7 w-7 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                <path d="M2 12h20" />
              </svg>
              <p className="text-[17px] font-semibold text-gray-900">Language</p>
            </div>
            <div className="max-h-[50vh] overflow-y-auto">
              {APP_LANGUAGES.map((lang, i) => (
                <button
                  key={lang.id}
                  onClick={() => setTempLang(lang.id)}
                  className={`flex w-full items-center gap-3 px-5 py-4 text-left transition ${i > 0 ? 'border-t border-gray-100' : ''} active:bg-gray-50`}
                >
                  <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${tempLang === lang.id ? 'border-gray-900' : 'border-gray-300'}`}>
                    {tempLang === lang.id && <div className="h-2.5 w-2.5 rounded-full bg-gray-900" />}
                  </div>
                  <span className={`text-[15px] ${tempLang === lang.id ? 'font-medium text-gray-900' : 'text-gray-700'}`}>{lang.label}</span>
                </button>
              ))}
            </div>
            <div className="border-t border-gray-100">
              <button onClick={confirmLang} className="w-full py-4 text-[15px] font-semibold text-[#4D6BFE] transition hover:bg-gray-50">
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Voice Language Dialog */}
      {showVoiceDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-8">
          <div className="w-full max-w-[320px] overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="px-5 pt-5 pb-2 text-center">
              <svg className="mx-auto mb-2 h-7 w-7 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              </svg>
              <p className="text-[17px] font-semibold text-gray-900">Main language</p>
            </div>
            <div className="max-h-[50vh] overflow-y-auto">
              {VOICE_LANGUAGES.map((lang, i) => (
                <button
                  key={lang.id}
                  onClick={() => setTempVoice(lang.id)}
                  className={`flex w-full items-center gap-3 px-5 py-4 text-left transition ${i > 0 ? 'border-t border-gray-100' : ''} active:bg-gray-50`}
                >
                  <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${tempVoice === lang.id ? 'border-gray-900' : 'border-gray-300'}`}>
                    {tempVoice === lang.id && <div className="h-2.5 w-2.5 rounded-full bg-gray-900" />}
                  </div>
                  <span className={`text-[15px] ${tempVoice === lang.id ? 'font-medium text-gray-900' : 'text-gray-700'}`}>{lang.label}</span>
                </button>
              ))}
            </div>
            <div className="border-t border-gray-100">
              <button onClick={confirmVoice} className="w-full py-4 text-[15px] font-semibold text-[#4D6BFE] transition hover:bg-gray-50">
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
      }

    

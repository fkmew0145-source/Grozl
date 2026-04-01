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
  // Indian languages (priority at top)
  { id: 'hinglish',   label: 'Hinglish',              flag: '🇮🇳', sub: 'Hindi + English mix' },
  { id: 'hindi',      label: 'हिंदी',                  flag: '🇮🇳', sub: 'Hindi' },
  { id: 'english',    label: 'English',               flag: '🇬🇧', sub: 'English' },
  { id: 'tamil',      label: 'தமிழ்',                  flag: '🇮🇳', sub: 'Tamil' },
  { id: 'telugu',     label: 'తెలుగు',                 flag: '🇮🇳', sub: 'Telugu' },
  { id: 'marathi',    label: 'मराठी',                  flag: '🇮🇳', sub: 'Marathi' },
  { id: 'gujarati',   label: 'ગુજરાતી',                flag: '🇮🇳', sub: 'Gujarati' },
  { id: 'kannada',    label: 'ಕನ್ನಡ',                  flag: '🇮🇳', sub: 'Kannada' },
  { id: 'malayalam',  label: 'മലയാളം',                 flag: '🇮🇳', sub: 'Malayalam' },
  { id: 'punjabi',    label: 'ਪੰਜਾਬੀ',                 flag: '🇮🇳', sub: 'Punjabi' },
  { id: 'bengali',    label: 'বাংলা',                  flag: '🇧🇩', sub: 'Bengali' },
  { id: 'urdu',       label: 'اردو',                   flag: '🇵🇰', sub: 'Urdu' },
  // International languages
  { id: 'spanish',    label: 'Español',               flag: '🇪🇸', sub: 'Spanish' },
  { id: 'french',     label: 'Français',              flag: '🇫🇷', sub: 'French' },
  { id: 'arabic',     label: 'العربية',               flag: '🇸🇦', sub: 'Arabic' },
  { id: 'portuguese', label: 'Português',             flag: '🇧🇷', sub: 'Portuguese' },
  { id: 'russian',    label: 'Русский',               flag: '🇷🇺', sub: 'Russian' },
  { id: 'indonesian', label: 'Bahasa Indonesia',      flag: '🇮🇩', sub: 'Indonesian' },
  { id: 'german',     label: 'Deutsch',               flag: '🇩🇪', sub: 'German' },
  { id: 'japanese',   label: '日本語',                  flag: '🇯🇵', sub: 'Japanese' },
  { id: 'chinese',    label: '中文',                   flag: '🇨🇳', sub: 'Chinese' },
  { id: 'turkish',    label: 'Türkçe',                flag: '🇹🇷', sub: 'Turkish' },
] as const

const VOICE_LANGUAGES = [
  { id: 'hi-IN',  label: 'Hindi (India)',    flag: '🇮🇳' },
  { id: 'ta-IN',  label: 'Tamil (India)',    flag: '🇮🇳' },
  { id: 'te-IN',  label: 'Telugu (India)',   flag: '🇮🇳' },
  { id: 'mr-IN',  label: 'Marathi (India)',  flag: '🇮🇳' },
  { id: 'gu-IN',  label: 'Gujarati (India)', flag: '🇮🇳' },
  { id: 'kn-IN',  label: 'Kannada (India)',  flag: '🇮🇳' },
  { id: 'ml-IN',  label: 'Malayalam (India)',flag: '🇮🇳' },
  { id: 'pa-IN',  label: 'Punjabi (India)',  flag: '🇮🇳' },
  { id: 'bn-IN',  label: 'Bengali (India)',  flag: '🇮🇳' },
  { id: 'en-IN',  label: 'English (India)',  flag: '🇮🇳' },
  { id: 'en-US',  label: 'English (US)',     flag: '🇺🇸' },
  { id: 'en-GB',  label: 'English (UK)',     flag: '🇬🇧' },
]

export default function LanguagePage({ settings, onSettingsChange, onBack }: LanguagePageProps) {
  const [showLangDialog, setShowLangDialog]   = useState(false)
  const [showVoiceDialog, setShowVoiceDialog] = useState(false)
  const [tempLang, setTempLang]               = useState(settings.language)
  const [tempVoice, setTempVoice]             = useState(settings.voiceLanguage)

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

  const currentLang  = APP_LANGUAGES.find(l => l.id === settings.language)
  const currentVoice = VOICE_LANGUAGES.find(l => l.id === settings.voiceLanguage)

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
        <p className="mb-2 px-1 text-[13px] text-gray-500">App Language</p>
        <div className="mb-6 overflow-hidden rounded-2xl bg-white">
          <button
            onClick={() => { setTempLang(settings.language); setShowLangDialog(true) }}
            className="flex w-full items-center justify-between px-4 py-4 transition active:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <span className="text-[20px]">{currentLang?.flag ?? '🌐'}</span>
              <div className="text-left">
                <p className="text-[15px] text-gray-800">{currentLang?.label ?? settings.language}</p>
                <p className="text-[12px] text-gray-400">{currentLang?.sub}</p>
              </div>
            </div>
            <ChevronLeft className="h-4 w-4 rotate-180 text-gray-400" />
          </button>
          <p className="border-t border-gray-100 px-4 py-3 text-[12px] leading-relaxed text-gray-400">
            Grozl will respond in this language by default. You can override it mid-conversation anytime.
          </p>
        </div>

        {/* Voice / Audio language */}
        <p className="mb-2 px-1 text-[13px] text-gray-500">Voice Input Language</p>
        <div className="overflow-hidden rounded-2xl bg-white">
          <button
            onClick={() => { setTempVoice(settings.voiceLanguage); setShowVoiceDialog(true) }}
            className="flex w-full items-center justify-between px-4 py-4 transition active:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <span className="text-[20px]">{currentVoice?.flag ?? '🎙️'}</span>
              <div className="text-left">
                <p className="text-[15px] text-gray-800">Main language</p>
                <p className="text-[12px] text-gray-400">{currentVoice?.label ?? settings.voiceLanguage}</p>
              </div>
            </div>
            <ChevronLeft className="h-4 w-4 rotate-180 text-gray-400" />
          </button>
          <p className="border-t border-gray-100 px-4 py-3 text-[12px] leading-relaxed text-gray-400">
            Select the primary language for voice input to get better speech recognition results.
          </p>
        </div>
      </div>

      {/* App Language Dialog */}
      {showLangDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
          <div className="w-full max-w-[340px] overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="px-5 pt-5 pb-3 text-center">
              <p className="text-[17px] font-semibold text-gray-900">Select Language</p>
            </div>
            <div className="max-h-[55vh] overflow-y-auto">
              {APP_LANGUAGES.map((lang, i) => (
                <button
                  key={lang.id}
                  onClick={() => setTempLang(lang.id)}
                  className={`flex w-full items-center gap-3 px-5 py-3.5 text-left transition ${i > 0 ? 'border-t border-gray-100' : ''} active:bg-gray-50`}
                >
                  <span className="text-[20px]">{lang.flag}</span>
                  <div className="flex-1 text-left">
                    <p className={`text-[15px] ${tempLang === lang.id ? 'font-medium text-gray-900' : 'text-gray-700'}`}>{lang.label}</p>
                    {lang.sub !== lang.label && <p className="text-[12px] text-gray-400">{lang.sub}</p>}
                  </div>
                  <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${tempLang === lang.id ? 'border-gray-900' : 'border-gray-300'}`}>
                    {tempLang === lang.id && <div className="h-2.5 w-2.5 rounded-full bg-gray-900" />}
                  </div>
                </button>
              ))}
            </div>
            <div className="border-t border-gray-100 flex">
              <button onClick={() => setShowLangDialog(false)} className="flex-1 border-r border-gray-100 py-4 text-[15px] text-gray-500 transition hover:bg-gray-50">Cancel</button>
              <button onClick={confirmLang} className="flex-1 py-4 text-[15px] font-semibold text-[#4D6BFE] transition hover:bg-gray-50">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Voice Language Dialog */}
      {showVoiceDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
          <div className="w-full max-w-[340px] overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="px-5 pt-5 pb-3 text-center">
              <p className="text-[17px] font-semibold text-gray-900">Voice Input Language</p>
            </div>
            <div className="max-h-[55vh] overflow-y-auto">
              {VOICE_LANGUAGES.map((lang, i) => (
                <button
                  key={lang.id}
                  onClick={() => setTempVoice(lang.id)}
                  className={`flex w-full items-center gap-3 px-5 py-3.5 text-left transition ${i > 0 ? 'border-t border-gray-100' : ''} active:bg-gray-50`}
                >
                  <span className="text-[20px]">{lang.flag}</span>
                  <span className={`flex-1 text-[15px] ${tempVoice === lang.id ? 'font-medium text-gray-900' : 'text-gray-700'}`}>{lang.label}</span>
                  <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${tempVoice === lang.id ? 'border-gray-900' : 'border-gray-300'}`}>
                    {tempVoice === lang.id && <div className="h-2.5 w-2.5 rounded-full bg-gray-900" />}
                  </div>
                </button>
              ))}
            </div>
            <div className="border-t border-gray-100 flex">
              <button onClick={() => setShowVoiceDialog(false)} className="flex-1 border-r border-gray-100 py-4 text-[15px] text-gray-500 transition hover:bg-gray-50">Cancel</button>
              <button onClick={confirmVoice} className="flex-1 py-4 text-[15px] font-semibold text-[#4D6BFE] transition hover:bg-gray-50">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
  }
  

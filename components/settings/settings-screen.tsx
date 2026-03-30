'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, LogOut } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { loadSettings, GrozlSettings } from './settings-store'
import AccountPage      from './pages/account-page'
import DataControlsPage from './pages/data-controls-page'
import MemoryPage       from './pages/memory-page'
import LanguagePage     from './pages/language-page'
import AppearancePage   from './pages/appearance-page'
import ModelPage        from './pages/model-page'
import AboutPage        from './pages/about-page'

type SubPage =
  | 'account'
  | 'data-controls'
  | 'memory'
  | 'language'
  | 'appearance'
  | 'model'
  | 'about'
  | null

interface SettingsScreenProps {
  user: User | null
  chatCount: number
  onClose: () => void
  onClearChats: () => void
  onLogout: () => void
}

export default function SettingsScreen({
  user,
  chatCount,
  onClose,
  onClearChats,
  onLogout,
}: SettingsScreenProps) {
  const [subPage, setSubPage]       = useState<SubPage>(null)
  const [settings, setSettings]     = useState<GrozlSettings>(loadSettings)
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)

  // Reload settings when screen opens
  useEffect(() => {
    setSettings(loadSettings())
  }, [])

  const handleLogout = useCallback(async () => {
    if (user) {
      const supabase = createClient()
      await supabase.auth.signOut()
    }
    localStorage.removeItem('grozl_user_profile')
    onLogout()
  }, [user, onLogout])

  const langLabel = {
    english:  'English',
    hindi:    'Hindi',
    hinglish: 'Hinglish',
  }[settings.language]

  const appearanceLabel = {
    system: 'System',
    light:  'Light',
    dark:   'Dark',
  }[settings.appearance]

  // Sub-page rendering
  if (subPage === 'account') {
    return (
      <SettingsWrapper>
        <AccountPage user={user} onBack={() => setSubPage(null)} onLogout={onLogout} />
      </SettingsWrapper>
    )
  }
  if (subPage === 'data-controls') {
    return (
      <SettingsWrapper>
        <DataControlsPage
          settings={settings}
          onSettingsChange={setSettings}
          chatCount={chatCount}
          onClearChats={() => { onClearChats(); setSubPage(null) }}
          onBack={() => setSubPage(null)}
        />
      </SettingsWrapper>
    )
  }
  if (subPage === 'memory') {
    return (
      <SettingsWrapper>
        <MemoryPage user={user} onBack={() => setSubPage(null)} />
      </SettingsWrapper>
    )
  }
  if (subPage === 'language') {
    return (
      <SettingsWrapper>
        <LanguagePage settings={settings} onSettingsChange={setSettings} onBack={() => setSubPage(null)} />
      </SettingsWrapper>
    )
  }
  if (subPage === 'appearance') {
    return (
      <SettingsWrapper>
        <AppearancePage settings={settings} onSettingsChange={setSettings} onBack={() => setSubPage(null)} />
      </SettingsWrapper>
    )
  }
  if (subPage === 'model') {
    return (
      <SettingsWrapper>
        <ModelPage settings={settings} onSettingsChange={setSettings} onBack={() => setSubPage(null)} />
      </SettingsWrapper>
    )
  }
  if (subPage === 'about') {
    return (
      <SettingsWrapper>
        <AboutPage onBack={() => setSubPage(null)} />
      </SettingsWrapper>
    )
  }

  // ── Main settings list ────────────────────────────────────────────────
  return (
    <SettingsWrapper>
      <div className="flex h-full flex-col bg-[#F2F2F7]">

        {/* Header */}
        <div className="flex items-center gap-3 bg-[#F2F2F7] px-4 py-4 pt-6">
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-600 transition hover:bg-gray-200"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-[17px] font-semibold text-gray-900">Settings</h1>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-2">

          {/* Profile section */}
          <p className="mb-2 px-1 text-[13px] text-gray-500">Profile</p>
          <div className="mb-6 overflow-hidden rounded-2xl bg-white">
            <SettingsRow
              icon={
                <svg className="h-5 w-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                </svg>
              }
              label="Account settings"
              onPress={() => setSubPage('account')}
            />
            <div className="mx-4 h-px bg-gray-100" />
            <SettingsRow
              icon={
                <svg className="h-5 w-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                </svg>
              }
              label="Data controls"
              onPress={() => setSubPage('data-controls')}
            />
            {user && (
              <>
                <div className="mx-4 h-px bg-gray-100" />
                <SettingsRow
                  icon={
                    <svg className="h-5 w-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18" />
                    </svg>
                  }
                  label="Memory"
                  onPress={() => setSubPage('memory')}
                />
              </>
            )}
          </div>

          {/* App section */}
          <p className="mb-2 px-1 text-[13px] text-gray-500">App</p>
          <div className="mb-6 overflow-hidden rounded-2xl bg-white">
            <SettingsRow
              icon={
                <svg className="h-5 w-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /><path d="M2 12h20" />
                </svg>
              }
              label="Language"
              value={langLabel}
              onPress={() => setSubPage('language')}
            />
            <div className="mx-4 h-px bg-gray-100" />
            <SettingsRow
              icon={
                <svg className="h-5 w-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
              }
              label="Appearance"
              value={appearanceLabel}
              onPress={() => setSubPage('appearance')}
            />
            <div className="mx-4 h-px bg-gray-100" />
            <SettingsRow
              icon={<span className="text-[15px] font-bold text-gray-500" style={{ letterSpacing: '-1px' }}>AA</span>}
              label="Font size"
              onPress={() => setSubPage('appearance')}
            />
          </div>

          {/* AI Model section */}
          <p className="mb-2 px-1 text-[13px] text-gray-500">AI Model</p>
          <div className="mb-6 overflow-hidden rounded-2xl bg-white">
            <SettingsRow
              icon={<span className="text-[18px]">🤖</span>}
              label="Default model"
              value={settings.defaultModel === 'auto' ? 'Auto' : settings.defaultModel === 'deepseek' ? 'DeepSeek R1' : settings.defaultModel === 'groq' ? 'Groq Llama' : 'Gemini'}
              onPress={() => setSubPage('model')}
            />
          </div>

          {/* About section */}
          <p className="mb-2 px-1 text-[13px] text-gray-500">About</p>
          <div className="mb-6 overflow-hidden rounded-2xl bg-white">
            <SettingsRow
              icon={
                <svg className="h-5 w-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              }
              label="About Grozl"
              value="v1.0.0"
              onPress={() => setSubPage('about')}
            />
          </div>

          {/* Help & Feedback */}
          <div className="mb-6 overflow-hidden rounded-2xl bg-white">
            <SettingsRow
              icon={
                <svg className="h-5 w-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              }
              label="Help & Feedback"
              onPress={() => setSubPage('about')}
            />
          </div>

          {/* Log out */}
          <div className="mb-8 overflow-hidden rounded-2xl bg-white">
            <button
              onClick={() => setShowLogoutDialog(true)}
              className="flex w-full items-center gap-3 px-4 py-4 text-left transition active:bg-gray-50"
            >
              <LogOut className="h-5 w-5 text-gray-500" />
              <span className="text-[15px] text-gray-800">Log out</span>
            </button>
          </div>

          <p className="mb-6 text-center text-[11px] text-gray-400">
            AI-generated content is for reference only. Use legally.
          </p>
        </div>
      </div>

      {/* Log out confirm dialog */}
      {showLogoutDialog && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 px-8">
          <div className="w-full max-w-[300px] overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="px-5 py-5 text-center">
              <p className="text-[17px] font-semibold text-gray-900">Confirm log out?</p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-gray-500">
                Logging out won't delete any data. You can sign back in anytime.
              </p>
            </div>
            <div className="flex border-t border-gray-100">
              <button
                onClick={() => setShowLogoutDialog(false)}
                className="flex-1 border-r border-gray-100 py-3.5 text-[15px] text-gray-600 transition hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-3.5 text-[15px] font-medium text-red-500 transition hover:bg-red-50"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </SettingsWrapper>
  )
}

// ── Reusable row component ────────────────────────────────────────────────────
function SettingsRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: React.ReactNode
  label: string
  value?: string
  onPress: () => void
}) {
  return (
    <button
      onClick={onPress}
      className="flex w-full items-center justify-between px-4 py-4 text-left transition active:bg-gray-50"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-5 w-5 items-center justify-center">{icon}</span>
        <span className="text-[15px] text-gray-800">{label}</span>
      </div>
      <div className="flex items-center gap-1 text-gray-400">
        {value && <span className="text-[14px]">{value}</span>}
        <ChevronRight className="h-4 w-4" />
      </div>
    </button>
  )
}

// ── Full-screen wrapper ───────────────────────────────────────────────────────
function SettingsWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[100] bg-[#F2F2F7]">
      {children}
    </div>
  )
  }
  

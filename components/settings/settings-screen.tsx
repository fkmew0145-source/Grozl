'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, LogOut } from 'lucide-react'
import { useTheme } from 'next-themes'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { loadSettings, patchSettings, GrozlSettings } from './settings-store'
import AccountPage        from './pages/account-page'
import DataControlsPage  from './pages/data-controls-page'
import MemoryPage        from './pages/memory-page'
import LanguagePage      from './pages/language-page'
import FontSizePage      from './pages/font-size-page'
import ModelPage         from './pages/model-page'
import AboutPage         from './pages/about-page'
import FeedbackPage      from './pages/feedback-page'
import HistoryPage       from './pages/history-page'
import PersonalizationPage from './pages/personalization-page'

type SubPage =
  | 'account'
  | 'data-controls'
  | 'memory'
  | 'language'
  | 'font-size'
  | 'model'
  | 'about'
  | 'feedback'
  | 'history'
  | 'personalization'
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
  const [subPage, setSubPage]   = useState<SubPage>(null)
  const [settings, setSettings] = useState<GrozlSettings>(loadSettings)
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  const { theme, setTheme } = useTheme()

  useEffect(() => { setSettings(loadSettings()) }, [])

  const handleThemeChange = useCallback((val: 'light' | 'dark' | 'system') => {
    setTheme(val)
    const updated = patchSettings({ theme: val })
    setSettings(updated)
  }, [setTheme])

  const handleLogout = useCallback(async () => {
    if (user) { const supabase = createClient(); await supabase.auth.signOut() }
    onLogout()
  }, [user, onLogout])

  const langLabel       = { english: 'English', hindi: 'Hindi', hinglish: 'Hinglish',
    tamil: 'Tamil', telugu: 'Telugu', marathi: 'Marathi', gujarati: 'Gujarati',
    kannada: 'Kannada', malayalam: 'Malayalam', punjabi: 'Punjabi', bengali: 'Bengali',
    urdu: 'Urdu', spanish: 'Spanish', french: 'French', arabic: 'Arabic',
    portuguese: 'Portuguese', russian: 'Russian', indonesian: 'Indonesian',
    german: 'German', japanese: 'Japanese', chinese: 'Chinese', turkish: 'Turkish',
  }[settings.language] ?? settings.language

  // ── Sub-page routing ──────────────────────────────────────────────────
  if (subPage === 'account')
    return <SettingsWrapper><AccountPage user={user} onBack={() => setSubPage(null)} onLogout={onLogout} /></SettingsWrapper>

  if (subPage === 'data-controls')
    return (
      <SettingsWrapper>
        <DataControlsPage
          settings={settings} onSettingsChange={setSettings}
          chatCount={chatCount}
          onClearChats={() => { onClearChats(); setSubPage(null) }}
          onBack={() => setSubPage(null)}
        />
      </SettingsWrapper>
    )

  if (subPage === 'memory')
    return <SettingsWrapper><MemoryPage user={user} onBack={() => setSubPage(null)} /></SettingsWrapper>

  if (subPage === 'personalization')
    return <SettingsWrapper><PersonalizationPage user={user} onBack={() => setSubPage(null)} /></SettingsWrapper>

  if (subPage === 'language')
    return <SettingsWrapper><LanguagePage settings={settings} onSettingsChange={setSettings} onBack={() => setSubPage(null)} /></SettingsWrapper>
  if (subPage === 'font-size')
    return <SettingsWrapper><FontSizePage settings={settings} onSettingsChange={setSettings} onBack={() => setSubPage(null)} /></SettingsWrapper>

  if (subPage === 'model')
    return <SettingsWrapper><ModelPage settings={settings} onSettingsChange={setSettings} onBack={() => setSubPage(null)} /></SettingsWrapper>

  if (subPage === 'about')
    return <SettingsWrapper><AboutPage onBack={() => setSubPage(null)} /></SettingsWrapper>

  if (subPage === 'feedback')
    return <SettingsWrapper><FeedbackPage onBack={() => setSubPage(null)} /></SettingsWrapper>

  if (subPage === 'history')
    return (
      <SettingsWrapper>
        <HistoryPage
          sessions={JSON.parse(localStorage.getItem('grozl_chat_sessions') || '[]')}
          onDeleteSession={(id) => {
            const sessions = JSON.parse(localStorage.getItem('grozl_chat_sessions') || '[]')
            const updated  = sessions.filter((s: { id: string }) => s.id !== id)
            localStorage.setItem('grozl_chat_sessions', JSON.stringify(updated))
          }}
          onClearAll={() => { onClearChats(); setSubPage(null) }}
          onBack={() => setSubPage(null)}
        />
      </SettingsWrapper>
    )

  // current theme value (fall back to settings if useTheme not yet mounted)
  const activeTheme = (theme as 'light' | 'dark' | 'system') ?? settings.theme ?? 'system'

  // ── Main settings list ────────────────────────────────────────────────
  return (
    <SettingsWrapper>
      <div className="flex h-full flex-col bg-transparent">

        {/* Header */}
        <div className="flex items-center bg-white/70 dark:bg-white/5 backdrop-blur-xl px-4 py-3 pt-12">
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-gray-600 dark:text-white/60 transition active:bg-gray-200 dark:active:bg-white/10">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="flex-1 text-center text-[17px] font-semibold text-black dark:text-white">Settings</h1>
          <div className="h-8 w-8" />
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">

          {/* ── Appearance ───────────────────────────────────────── */}
          <p className="mb-1.5 px-1 text-[13px] text-black/50 dark:text-white/50">Appearance</p>
          <div className="mb-5 overflow-hidden rounded-2xl bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-black/5 dark:border-white/10">
            <div className="flex items-center px-4 py-4 gap-3">
              {/* Icon */}
              <span className="flex h-5 w-5 items-center justify-center">
                {activeTheme === 'dark' ? <MoonIcon /> : activeTheme === 'light' ? <SunIcon /> : <SystemIcon />}
              </span>
              <span className="flex-1 text-[15px] text-black dark:text-white">Theme</span>
              {/* 3-way pill toggle */}
              <div className="flex items-center gap-0.5 rounded-xl bg-black/5 dark:bg-white/10 p-1">
                {(['light', 'system', 'dark'] as const).map((val) => {
                  const active = activeTheme === val
                  const labels: Record<typeof val, string> = { light: 'Light', system: 'Auto', dark: 'Dark' }
                  return (
                    <button
                      key={val}
                      onClick={() => handleThemeChange(val)}
                      className={[
                        'rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all duration-200',
                        active
                          ? 'bg-white dark:bg-white/20 text-black dark:text-white shadow-sm'
                          : 'text-black/40 dark:text-white/40 hover:text-black/70 dark:hover:text-white/70',
                      ].join(' ')}
                    >
                      {labels[val]}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Profile */}
          <p className="mb-1.5 px-1 text-[13px] text-black/50 dark:text-white/50">Profile</p>
          <div className="mb-5 overflow-hidden rounded-2xl bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-black/5 dark:border-white/10">
            <SettingsRow icon={<UserIcon />} label="Account settings" onPress={() => setSubPage('account')} />
            <Divider />
            <SettingsRow icon={<DataIcon />} label="Data controls" onPress={() => setSubPage('data-controls')} />
          </div>

          {/* Personalise */}
          <p className="mb-1.5 px-1 text-[13px] text-black/50 dark:text-white/50">Personalise</p>
          <div className="mb-5 overflow-hidden rounded-2xl bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-black/5 dark:border-white/10">
            <SettingsRow icon={<PersonIcon />} label="Personalization" onPress={() => setSubPage('personalization')} />
            <Divider />
            <SettingsRow icon={<MemoryIcon />} label="Memory" onPress={() => setSubPage('memory')} />
          </div>

          {/* App */}
          <p className="mb-1.5 px-1 text-[13px] text-black/50 dark:text-white/50">App</p>
          <div className="mb-5 overflow-hidden rounded-2xl bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-black/5 dark:border-white/10">
            <SettingsRow icon={<LangIcon />} label="Language" value={langLabel} onPress={() => setSubPage('language')} />
          </div>

          {/* About */}
          <p className="mb-1.5 px-1 text-[13px] text-black/50 dark:text-white/50">About</p>
          <div className="mb-5 overflow-hidden rounded-2xl bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-black/5 dark:border-white/10">
            <SettingsRow icon={<InfoIcon />} label="Check for updates" value="1.0.0" onPress={() => setSubPage('about')} />
          </div>

          {/* Help & Feedback */}
          <div className="mb-5 overflow-hidden rounded-2xl bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-black/5 dark:border-white/10">
            <SettingsRow icon={<HelpIcon />} label="Help & Feedback" onPress={() => setSubPage('feedback')} />
          </div>

          {/* Log out */}
          <div className="mb-8 overflow-hidden rounded-2xl bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-black/5 dark:border-white/10">
            <button
              onClick={() => setShowLogoutDialog(true)}
              className="flex w-full items-center gap-3 px-4 py-[14px] text-left transition active:bg-gray-50 dark:active:bg-white/5"
            >
              <LogOut className="h-5 w-5 text-black/50 dark:text-white/50" />
              <span className="text-[15px] text-black dark:text-white">Log out</span>
            </button>
          </div>

          <p className="mb-6 text-center text-[11px] text-gray-400">AI-generated, for reference only. Use legally.</p>
        </div>
      </div>

      {/* Log out confirm */}
      {showLogoutDialog && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 px-8">
          <div className="w-full max-w-[300px] overflow-hidden rounded-2xl bg-white dark:bg-[#1c1e26] shadow-2xl">
            <div className="px-5 py-5 text-center">
              <p className="text-[17px] font-semibold text-black dark:text-white">Confirm log out?</p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-black/50 dark:text-white/50">Logging out won't delete any data. You can sign back in anytime.</p>
            </div>
            <div className="flex border-t border-gray-100 dark:border-white/10">
              <button onClick={() => setShowLogoutDialog(false)} className="flex-1 border-r border-gray-100 dark:border-white/10 py-3.5 text-[15px] text-gray-600 dark:text-white/60 transition hover:bg-gray-50 dark:hover:bg-white/5">Cancel</button>
              <button onClick={handleLogout} className="flex-1 py-3.5 text-[15px] font-medium text-red-500 transition hover:bg-red-50 dark:hover:bg-red-500/10">Log out</button>
            </div>
          </div>
        </div>
      )}
    </SettingsWrapper>
  )
}

// ── Reusable components ───────────────────────────────────────────────────
function Divider() { return <div className="mx-4 h-px bg-black/5 dark:bg-white/10" /> }

function SettingsRow({ icon, label, value, onPress }: { icon: React.ReactNode; label: string; value?: string; onPress: () => void }) {
  return (
    <button onClick={onPress} className="flex w-full items-center justify-between px-4 py-4 text-left transition active:bg-gray-50 dark:active:bg-white/5">
      <div className="flex items-center gap-3">
        <span className="flex h-5 w-5 items-center justify-center">{icon}</span>
        <span className="text-[15px] text-black dark:text-white">{label}</span>
      </div>
      <div className="flex items-center gap-1 text-gray-400 dark:text-white/30">
        {value && <span className="text-[14px]">{value}</span>}
        <ChevronRight className="h-4 w-4" />
      </div>
    </button>
  )
}

function SettingsWrapper({ children }: { children: React.ReactNode }) {
  return <div className="fixed inset-0 z-[100] bg-[#f8fafc] dark:bg-[#0d0f14]">{children}</div>
}

// ── Icon components ───────────────────────────────────────────────────────
const s = { className: 'h-5 w-5 text-black/50 dark:text-white/50', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '1.75', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
function UserIcon()    { return <svg {...s}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> }
function DataIcon()    { return <svg {...s}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg> }
function LangIcon()    { return <svg {...s}><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg> }
function SunIcon()     { return <svg {...s}><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg> }
function MoonIcon()    { return <svg {...s}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg> }
function SystemIcon()  { return <svg {...s}><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg> }
function InfoIcon()    { return <svg {...s}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> }
function HelpIcon()    { return <svg {...s}><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> }
function PersonIcon()  { return <svg {...s}><path d="M12 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10z"/><path d="M20 21a8 8 0 1 0-16 0"/><path d="M15 10l1.5 1.5L19 9"/></svg> }
function MemoryIcon()  { return <svg {...s}><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/><circle cx="8" cy="10" r="1.5"/><circle cx="16" cy="10" r="1.5"/><path d="M8 10h8"/></svg> }
      

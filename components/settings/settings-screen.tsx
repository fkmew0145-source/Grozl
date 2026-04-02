'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, LogOut } from 'lucide-react'
import { useTheme } from 'next-themes'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { loadSettings, patchSettings, GrozlSettings } from './settings-store'
import AccountPage         from './pages/account-page'
import DataControlsPage   from './pages/data-controls-page'
import MemoryPage         from './pages/memory-page'
import LanguagePage       from './pages/language-page'
import ModelPage          from './pages/model-page'
import AboutPage          from './pages/about-page'
import FeedbackPage       from './pages/feedback-page'
import HistoryPage        from './pages/history-page'
import PersonalizationPage from './pages/personalization-page'

type SubPage =
  | 'account' | 'data-controls' | 'memory' | 'language'
  | 'model' | 'about' | 'feedback' | 'history' | 'personalization'
  | null

type ThemeVal = 'system' | 'light' | 'dark'

interface SettingsScreenProps {
  user: User | null
  chatCount: number
  onClose: () => void
  onClearChats: () => void
  onLogout: () => void
}

export default function SettingsScreen({
  user, chatCount, onClose, onClearChats, onLogout,
}: SettingsScreenProps) {
  const [subPage, setSubPage]               = useState<SubPage>(null)
  const [settings, setSettings]             = useState<GrozlSettings>(loadSettings)
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  const [showThemeModal, setShowThemeModal]  = useState(false)
  const [pendingTheme, setPendingTheme]      = useState<ThemeVal>('system')

  const { theme, setTheme } = useTheme()

  useEffect(() => { setSettings(loadSettings()) }, [])

  // sync pendingTheme when modal opens
  const openThemeModal = () => {
    setPendingTheme((theme as ThemeVal) ?? settings.theme ?? 'system')
    setShowThemeModal(true)
  }

  const confirmTheme = () => {
    setTheme(pendingTheme)
    const updated = patchSettings({ theme: pendingTheme })
    setSettings(updated)
    setShowThemeModal(false)
  }

  const handleLogout = useCallback(async () => {
    if (user) { const supabase = createClient(); await supabase.auth.signOut() }
    onLogout()
  }, [user, onLogout])

  const langLabel = {
    english:'English', hindi:'Hindi', hinglish:'Hinglish', tamil:'Tamil',
    telugu:'Telugu', marathi:'Marathi', gujarati:'Gujarati', kannada:'Kannada',
    malayalam:'Malayalam', punjabi:'Punjabi', bengali:'Bengali', urdu:'Urdu',
    spanish:'Spanish', french:'French', arabic:'Arabic', portuguese:'Portuguese',
    russian:'Russian', indonesian:'Indonesian', german:'German',
    japanese:'Japanese', chinese:'Chinese', turkish:'Turkish',
  }[settings.language] ?? settings.language

  const activeTheme = (theme as ThemeVal) ?? settings.theme ?? 'system'
  const themeLabel  = { system:'System', light:'Light', dark:'Dark' }[activeTheme] ?? 'System'

  // ── Sub-page routing ──────────────────────────────────────────────────
  if (subPage === 'account')
    return <W><AccountPage user={user} onBack={() => setSubPage(null)} onLogout={onLogout} /></W>

  if (subPage === 'data-controls')
    return (
      <W><DataControlsPage
        settings={settings} onSettingsChange={setSettings}
        chatCount={chatCount}
        onClearChats={() => { onClearChats(); setSubPage(null) }}
        onBack={() => setSubPage(null)}
      /></W>
    )

  if (subPage === 'memory')
    return <W><MemoryPage user={user} onBack={() => setSubPage(null)} /></W>

  if (subPage === 'personalization')
    return <W><PersonalizationPage user={user} onBack={() => setSubPage(null)} /></W>

  if (subPage === 'language')
    return <W><LanguagePage settings={settings} onSettingsChange={setSettings} onBack={() => setSubPage(null)} /></W>

  if (subPage === 'model')
    return <W><ModelPage settings={settings} onSettingsChange={setSettings} onBack={() => setSubPage(null)} /></W>

  if (subPage === 'about')
    return <W><AboutPage onBack={() => setSubPage(null)} /></W>

  if (subPage === 'feedback')
    return <W><FeedbackPage onBack={() => setSubPage(null)} /></W>

  if (subPage === 'history')
    return (
      <W><HistoryPage
        sessions={JSON.parse(localStorage.getItem('grozl_chat_sessions') || '[]')}
        onDeleteSession={(id) => {
          const s = JSON.parse(localStorage.getItem('grozl_chat_sessions') || '[]')
          localStorage.setItem('grozl_chat_sessions', JSON.stringify(s.filter((x: {id:string}) => x.id !== id)))
        }}
        onClearAll={() => { onClearChats(); setSubPage(null) }}
        onBack={() => setSubPage(null)}
      /></W>
    )

  // ── Main list ─────────────────────────────────────────────────────────
  return (
    <W>
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

          {/* Profile */}
          <p className="mb-1.5 px-1 text-[13px] text-black/50 dark:text-white/50">Profile</p>
          <div className="mb-5 overflow-hidden rounded-2xl bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-black/5 dark:border-white/10">
            <Row icon={<UserIcon />}   label="Account settings" onPress={() => setSubPage('account')} />
            <Div />
            <Row icon={<DataIcon />}   label="Data controls"    onPress={() => setSubPage('data-controls')} />
          </div>

          {/* Personalise */}
          <p className="mb-1.5 px-1 text-[13px] text-black/50 dark:text-white/50">Personalise</p>
          <div className="mb-5 overflow-hidden rounded-2xl bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-black/5 dark:border-white/10">
            <Row icon={<PersonIcon />} label="Personalization"  onPress={() => setSubPage('personalization')} />
            <Div />
            <Row icon={<MemoryIcon />} label="Memory"           onPress={() => setSubPage('memory')} />
          </div>

          {/* App */}
          <p className="mb-1.5 px-1 text-[13px] text-black/50 dark:text-white/50">App</p>
          <div className="mb-5 overflow-hidden rounded-2xl bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-black/5 dark:border-white/10">
            <Row icon={<LangIcon />}       label="Language"   value={langLabel}   onPress={() => setSubPage('language')} />
            <Div />
            <Row icon={<AppearanceIcon />} label="Appearance" value={themeLabel}  onPress={openThemeModal} />
          </div>

          {/* About */}
          <p className="mb-1.5 px-1 text-[13px] text-black/50 dark:text-white/50">About</p>
          <div className="mb-5 overflow-hidden rounded-2xl bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-black/5 dark:border-white/10">
            <Row icon={<InfoIcon />} label="Check for updates" value="1.0.0" onPress={() => setSubPage('about')} />
          </div>

          {/* Help */}
          <div className="mb-5 overflow-hidden rounded-2xl bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-black/5 dark:border-white/10">
            <Row icon={<HelpIcon />} label="Help & Feedback" onPress={() => setSubPage('feedback')} />
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

          <p className="mb-6 text-center text-[11px] text-gray-400 dark:text-white/25">AI-generated, for reference only. Use legally.</p>
        </div>
      </div>

      {/* ── Theme picker modal ───────────────────────────────────────── */}
      {showThemeModal && (
        <div
          className="fixed inset-0 z-[300] flex items-end justify-center bg-black/40 pb-6 px-4"
          onClick={() => setShowThemeModal(false)}
        >
          <div
            className="w-full max-w-sm overflow-hidden rounded-2xl bg-white dark:bg-[#1c1e26] shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Title */}
            <p className="border-b border-gray-100 dark:border-white/10 px-5 py-4 text-center text-[17px] font-semibold text-black dark:text-white">
              Appearance
            </p>

            {/* Options */}
            {(['system', 'light', 'dark'] as ThemeVal[]).map((val, i, arr) => (
              <div key={val}>
                <button
                  onClick={() => setPendingTheme(val)}
                  className="flex w-full items-center gap-4 px-5 py-4 text-left transition active:bg-gray-50 dark:active:bg-white/5"
                >
                  {/* Radio */}
                  <span className={[
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                    pendingTheme === val
                      ? 'border-black dark:border-white'
                      : 'border-gray-300 dark:border-white/30',
                  ].join(' ')}>
                    {pendingTheme === val && (
                      <span className="h-2.5 w-2.5 rounded-full bg-black dark:bg-white" />
                    )}
                  </span>
                  <span className="text-[16px] text-black dark:text-white capitalize">
                    {{ system: 'System', light: 'Light', dark: 'Dark' }[val]}
                  </span>
                </button>
                {i < arr.length - 1 && <div className="mx-5 h-px bg-gray-100 dark:bg-white/10" />}
              </div>
            ))}

            {/* Confirm */}
            <div className="border-t border-gray-100 dark:border-white/10 px-5 py-4">
              <button
                onClick={confirmTheme}
                className="w-full rounded-xl bg-black dark:bg-white py-3.5 text-[15px] font-semibold text-white dark:text-black transition active:opacity-80"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Logout confirm ───────────────────────────────────────────── */}
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
    </W>
  )
}

// ── Tiny helpers ──────────────────────────────────────────────────────────
function W({ children }: { children: React.ReactNode }) {
  return <div className="fixed inset-0 z-[100] bg-[#f8fafc] dark:bg-[#0d0f14]">{children}</div>
}
function Div() { return <div className="mx-4 h-px bg-black/5 dark:bg-white/10" /> }
function Row({ icon, label, value, onPress }: { icon: React.ReactNode; label: string; value?: string; onPress: () => void }) {
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

// ── Icons ─────────────────────────────────────────────────────────────────
const ic = { viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:'1.75', strokeLinecap:'round' as const, strokeLinejoin:'round' as const, className:'h-5 w-5 text-black/50 dark:text-white/50' }
function UserIcon()       { return <svg {...ic}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> }
function DataIcon()       { return <svg {...ic}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg> }
function LangIcon()       { return <svg {...ic}><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg> }
function AppearanceIcon() { return <svg {...ic}><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg> }
function InfoIcon()       { return <svg {...ic}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> }
function HelpIcon()       { return <svg {...ic}><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> }
function PersonIcon()     { return <svg {...ic}><path d="M12 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10z"/><path d="M20 21a8 8 0 1 0-16 0"/></svg> }
function MemoryIcon()     { return <svg {...ic}><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/><circle cx="8" cy="10" r="1.5"/><circle cx="16" cy="10" r="1.5"/><path d="M8 10h8"/></svg> }
            

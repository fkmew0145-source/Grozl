'use client'

import { ChevronLeft } from 'lucide-react'
import { GrozlSettings, patchSettings } from '../settings-store'

interface DataControlsPageProps {
  settings: GrozlSettings
  onSettingsChange: (s: GrozlSettings) => void
  chatCount: number
  onClearChats: () => void
  onBack: () => void
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative flex h-7 w-12 items-center rounded-full transition-colors duration-200 ${value ? 'bg-[#4D6BFE] dark:bg-[#4D6BFE]' : 'bg-gray-300 dark:bg-white/20'}`}
    >
      <span
        className={`absolute left-0.5 h-6 w-6 rounded-full bg-white shadow-md transition-transform duration-200 ${value ? 'translate-x-5' : 'translate-x-0'}`}
      />
    </button>
  )
}

export default function DataControlsPage({
  settings, onSettingsChange, chatCount, onClearChats, onBack,
}: DataControlsPageProps) {
  const toggle = (key: 'saveHistory' | 'improveModel') => {
    const updated = patchSettings({ [key]: !settings[key] })
    onSettingsChange(updated)
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
        <h2 className="text-[17px] font-semibold text-gray-900 dark:text-white">Data Controls</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2">

        <p className="mb-2 px-1 text-[13px] text-gray-500 dark:text-white/50">History</p>
        <div className="mb-6 overflow-hidden rounded-2xl bg-white dark:bg-white/5">
          <div className="px-4 py-4">
            <div className="flex items-center justify-between">
              <span className="text-[15px] text-gray-800 dark:text-white/90">Save Chat History</span>
              <Toggle value={settings.saveHistory} onChange={() => toggle('saveHistory')} />
            </div>
            <p className="mt-1 text-[12px] leading-relaxed text-gray-400 dark:text-white/30">Store your conversations locally</p>
          </div>

          <div className="mx-4 h-px bg-gray-100 dark:bg-white/10" />

          <div className="px-4 py-4">
            <div className="flex items-center justify-between">
              <span className="text-[15px] text-gray-800 dark:text-white/90">Improve Grozl for Everyone</span>
              <Toggle value={settings.improveModel} onChange={() => toggle('improveModel')} />
            </div>
            <p className="mt-1 text-[12px] leading-relaxed text-gray-400 dark:text-white/30">Help train better AI models</p>
          </div>
        </div>

        <p className="mb-2 px-1 text-[13px] text-gray-500 dark:text-white/50">Danger Zone</p>
        <div className="mb-6 overflow-hidden rounded-2xl bg-white dark:bg-white/5">
          <button
            onClick={onClearChats}
            className="flex w-full items-center justify-between px-4 py-4 text-left transition active:bg-gray-50 dark:active:bg-white/5"
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-[15px] text-rose-500">Clear All Chats</span>
              <span className="text-[12px] text-gray-400 dark:text-white/30">
                {chatCount > 0 ? `${chatCount} conversation${chatCount > 1 ? 's' : ''} will be deleted` : 'No chats to delete'}
              </span>
            </div>
          </button>
        </div>

        <p className="mb-6 text-center text-[11px] leading-relaxed text-gray-400 dark:text-white/30">
          Clearing chats removes them from this device only. Synced data may still exist on our servers.
        </p>
      </div>
    </div>
  )
            }

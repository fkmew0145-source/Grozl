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

export default function DataControlsPage({
  settings,
  onSettingsChange,
  chatCount,
  onClearChats,
  onBack,
}: DataControlsPageProps) {
  const toggle = (key: 'saveHistory' | 'improveModel') => {
    const updated = patchSettings({ [key]: !settings[key] })
    onSettingsChange(updated)
  }

  return (
    <div className="flex h-full flex-col bg-[#F2F2F7]">
      {/* Header */}
      <div className="flex items-center gap-3 bg-[#F2F2F7] px-4 py-4 pt-6">
        <button
          onClick={onBack}
          className="flex h-8 w-8 items-center justify-center rounded-full text-gray-600 transition hover:bg-gray-200"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="text-[17px] font-semibold text-gray-900">Data Controls</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2">

        {/* Chat history toggle */}
        <p className="mb-2 px-1 text-[13px] text-gray-500">History</p>
        <div className="mb-6 overflow-hidden rounded-2xl bg-white">
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex flex-col gap-0.5 flex-1 pr-4">
              <span className="text-[15px] text-gray-800">Save Chat History</span>
              <span className="text-[12px] text-gray-400">Store your conversations locally</span>
            </div>
            <button
              onClick={() => toggle('saveHistory')}
              className={`relative flex-shrink-0 h-[30px] w-[52px] rounded-full transition-colors duration-300 ${
                settings.saveHistory ? 'bg-[#34C759]' : 'bg-[#E5E5EA]'
              }`}
            >
              <span
                className={`absolute top-[2px] h-[26px] w-[26px] rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.25)] transition-transform duration-300 ${
                  settings.saveHistory ? 'translate-x-[24px]' : 'translate-x-[2px]'
                }`}
              />
            </button>
          </div>

          <div className="mx-4 h-px bg-gray-100" />

          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex flex-col gap-0.5 flex-1 pr-4">
              <span className="text-[15px] text-gray-800">Improve Grozl for Everyone</span>
              <span className="text-[12px] text-gray-400">Help train better AI models</span>
            </div>
            <button
              onClick={() => toggle('improveModel')}
              className={`relative flex-shrink-0 h-[30px] w-[52px] rounded-full transition-colors duration-300 ${
                settings.improveModel ? 'bg-[#34C759]' : 'bg-[#E5E5EA]'
              }`}
            >
              <span
                className={`absolute top-[2px] h-[26px] w-[26px] rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.25)] transition-transform duration-300 ${
                  settings.improveModel ? 'translate-x-[24px]' : 'translate-x-[2px]'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Clear chats */}
        <p className="mb-2 px-1 text-[13px] text-gray-500">Danger Zone</p>
        <div className="mb-6 overflow-hidden rounded-2xl bg-white">
          <button
            onClick={onClearChats}
            className="flex w-full items-center justify-between px-4 py-4 text-left transition active:bg-gray-50"
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-[15px] text-rose-500">Clear All Chats</span>
              <span className="text-[12px] text-gray-400">
                {chatCount > 0 ? `${chatCount} conversation${chatCount > 1 ? 's' : ''} will be deleted` : 'No chats to delete'}
              </span>
            </div>
          </button>
        </div>

        <p className="mb-6 text-center text-[11px] leading-relaxed text-gray-400">
          Clearing chats removes them from this device only. Synced data may still exist on our servers.
        </p>
      </div>
    </div>
  )
              }


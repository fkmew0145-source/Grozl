'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface AboutPageProps {
  onBack: () => void
}

export default function AboutPage({ onBack }: AboutPageProps) {
  const [subPage, setSubPage] = useState<'main' | 'service-agreement' | 'help'>('main')
  const [versionToast, setVersionToast] = useState(false)

  const showVersionToast = () => {
    setVersionToast(true)
    setTimeout(() => setVersionToast(false), 2500)
  }

  if (subPage === 'service-agreement') {
    return (
      <div className="flex h-full flex-col bg-[#F2F2F7]">
        <div className="flex items-center gap-3 bg-[#F2F2F7] px-4 py-4 pt-6">
          <button onClick={() => setSubPage('main')} className="flex h-8 w-8 items-center justify-center rounded-full text-gray-600 transition hover:bg-gray-200">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-[17px] font-semibold text-gray-900">Service agreement</h1>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-2">
          <div className="overflow-hidden rounded-2xl bg-white">
            <a href="#" className="flex w-full items-center justify-between px-4 py-4 transition active:bg-gray-50">
              <span className="text-[15px] text-gray-800">Terms of Use</span>
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </a>
            <div className="mx-4 h-px bg-gray-100" />
            <a href="#" className="flex w-full items-center justify-between px-4 py-4 transition active:bg-gray-50">
              <span className="text-[15px] text-gray-800">Privacy Policy</span>
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </a>
          </div>
        </div>
      </div>
    )
  }

  if (subPage === 'help') {
    return (
      <div className="flex h-full flex-col bg-[#F2F2F7]">
        <div className="flex items-center gap-3 bg-[#F2F2F7] px-4 py-4 pt-6">
          <button onClick={() => setSubPage('main')} className="flex h-8 w-8 items-center justify-center rounded-full text-gray-600 transition hover:bg-gray-200">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-[17px] font-semibold text-gray-900">Help &amp; Feedback</h1>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-2">
          <div className="overflow-hidden rounded-2xl bg-white">
            <a
              href="mailto:support@grozl.app"
              className="flex w-full items-center justify-between px-4 py-4 transition active:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <span className="text-[20px]">📧</span>
                <div>
                  <p className="text-[15px] text-gray-800">Email Support</p>
                  <p className="text-[12px] text-gray-400">support@grozl.app</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </a>
          </div>
          <p className="mt-4 px-1 text-center text-[12px] text-gray-400">
            We typically respond within 24–48 hours.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-[#F2F2F7]">
      {/* Header */}
      <div className="flex items-center gap-3 bg-[#F2F2F7] px-4 py-4 pt-6">
        <button onClick={onBack} className="flex h-8 w-8 items-center justify-center rounded-full text-gray-600 transition hover:bg-gray-200">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-[17px] font-semibold text-gray-900">About</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2">
        {/* App info card */}
        <div className="mb-6 flex flex-col items-center rounded-2xl bg-white px-4 py-6">
          <img src="/logo.png" alt="Grozl" className="mb-3 h-16 w-16 object-contain" />
          <p className="text-[19px] font-bold text-gray-900">Grozl AI</p>
          <p className="text-[13px] text-gray-400">All the World's Best AI. One Platform.</p>
        </div>

        {/* About section */}
        <p className="mb-2 px-1 text-[13px] text-gray-500">About</p>
        <div className="mb-6 overflow-hidden rounded-2xl bg-white">
          <button
            onClick={showVersionToast}
            className="flex w-full items-center justify-between px-4 py-4 transition active:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <svg className="h-5 w-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span className="text-[15px] text-gray-800">Check for updates</span>
            </div>
            <div className="flex items-center gap-1 text-gray-400">
              <span className="text-[13px]">v1.0.0</span>
              <ChevronRight className="h-4 w-4" />
            </div>
          </button>
          <div className="mx-4 h-px bg-gray-100" />
          <button
            onClick={() => setSubPage('service-agreement')}
            className="flex w-full items-center justify-between px-4 py-4 transition active:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <svg className="h-5 w-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
              </svg>
              <span className="text-[15px] text-gray-800">Service agreement</span>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </button>
        </div>

        {/* Help */}
        <div className="mb-6 overflow-hidden rounded-2xl bg-white">
          <button
            onClick={() => setSubPage('help')}
            className="flex w-full items-center justify-between px-4 py-4 transition active:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <svg className="h-5 w-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span className="text-[15px] text-gray-800">Help &amp; Feedback</span>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </button>
        </div>

        <p className="text-center text-[11px] text-gray-400">
          AI-generated content is for reference only. Use legally.
        </p>
      </div>

      {/* Version toast */}
      {versionToast && (
        <div className="pointer-events-none fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-gray-900 px-5 py-3 text-[14px] font-medium text-white shadow-xl">
          You are already on the latest version.
        </div>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { ChevronLeft, Trash2, MessageSquare } from 'lucide-react'

interface ChatSession {
  id: string
  title: string
  timestamp: number
}

interface HistoryPageProps {
  sessions: ChatSession[]
  onDeleteSession: (id: string) => void
  onClearAll: () => void
  onBack: () => void
}

export default function HistoryPage({
  sessions,
  onDeleteSession,
  onClearAll,
  onBack,
}: HistoryPageProps) {
  const [showConfirm, setShowConfirm] = useState(false)

  const formatDate = (ts: number) => {
    const d = new Date(ts)
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div className="flex h-full flex-col bg-[#F2F2F7]">
      {/* Header */}
      <div className="flex items-center justify-between bg-[#F2F2F7] px-4 py-4 pt-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-600 transition hover:bg-gray-200"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="text-[17px] font-semibold text-gray-900">Chat History</h2>
        </div>
        {sessions.length > 0 && (
          <button
            onClick={() => setShowConfirm(true)}
            className="text-[14px] font-medium text-rose-500 transition hover:text-rose-600"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <MessageSquare className="h-10 w-10 text-gray-300" />
            <p className="text-[15px] text-gray-400">No chat history yet</p>
            <p className="text-[13px] text-gray-300">Your conversations will appear here</p>
          </div>
        ) : (
          <div className="mb-6 overflow-hidden rounded-2xl bg-white">
            {sessions.map((session, i) => (
              <div key={session.id}>
                <div className="flex items-center justify-between px-4 py-4">
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <p className="truncate text-[15px] text-gray-800">{session.title}</p>
                    <p className="text-[12px] text-gray-400">{formatDate(session.timestamp)}</p>
                  </div>
                  <button
                    onClick={() => onDeleteSession(session.id)}
                    className="ml-3 shrink-0 text-gray-300 transition hover:text-rose-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {i < sessions.length - 1 && <div className="mx-4 h-px bg-gray-100" />}
              </div>
            ))}
          </div>
        )}

        <p className="mb-6 text-center text-[11px] text-gray-400">
          {sessions.length} conversation{sessions.length !== 1 ? 's' : ''} stored on this device
        </p>
      </div>

      {/* Clear all confirm dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 px-8">
          <div className="w-full max-w-[300px] overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="px-5 py-5 text-center">
              <p className="text-[17px] font-semibold text-gray-900">Clear All Chats?</p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-gray-500">
                This will permanently delete all {sessions.length} conversations. This cannot be undone.
              </p>
            </div>
            <div className="flex border-t border-gray-100">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 border-r border-gray-100 py-3.5 text-[15px] text-gray-600 transition hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => { onClearAll(); setShowConfirm(false); onBack() }}
                className="flex-1 py-3.5 text-[15px] font-medium text-rose-500 transition hover:bg-red-50"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { Search, MessageSquarePlus, MessageSquare, Settings, FolderOpen } from 'lucide-react'
import ArtifactsList from './artifacts-list'

interface ContentPart {
  type: 'text' | 'image_url'
  text?: string
  image_url?: { url: string }
}

interface Message {
  role: 'user' | 'assistant'
  content: string | ContentPart[]
}

interface ChatSession {
  id: string
  title: string
  messages: Message[]
  timestamp: number
  pinned?: boolean
  favorite?: boolean
  projectName?: string
}

interface ArtifactData {
  type: 'html' | 'react' | 'code'
  language?: string
  title: string
  content: string
}

interface SidebarProps {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  searchQuery: string
  setSearchQuery: (q: string) => void
  sortedSessions: ChatSession[]
  currentSessionId: string
  renamingId: string | null
  setRenamingId: (id: string | null) => void
  renameValue: string
  setRenameValue: (v: string) => void
  contextMenu: { sessionId: string; x: number; y: number } | null
  setContextMenu: (menu: { sessionId: string; x: number; y: number } | null) => void
  displayName: string
  initials: string
  chatSessions: ChatSession[]
  activeMenuItem: string | null
  setActiveMenuItem: (item: string | null) => void
  allArtifacts: ArtifactData[]
  showArtifactsList: boolean
  onNewChat: () => void
  onLoadSession: (session: ChatSession) => void
  onStartRename: (session: ChatSession) => void
  onConfirmRename: () => void
  onPin: (sessionId: string) => void
  onFavorite: (sessionId: string) => void
  onDelete: (sessionId: string) => void
  onLongPressStart: (e: React.TouchEvent | React.MouseEvent, sessionId: string) => void
  onLongPressEnd: () => void
  onOpenSettings: () => void
  onProjectsClick: () => void
  onArtifactsClick: () => void
  onOpenArtifact: (art: ArtifactData) => void
}

export default function Sidebar({
  sidebarOpen, setSidebarOpen, searchQuery, setSearchQuery,
  sortedSessions, currentSessionId, renamingId, setRenamingId,
  renameValue, setRenameValue, contextMenu, setContextMenu,
  displayName, initials, chatSessions,
  activeMenuItem, setActiveMenuItem, allArtifacts, showArtifactsList,
  onNewChat, onLoadSession, onStartRename, onConfirmRename,
  onPin, onFavorite, onDelete,
  onLongPressStart, onLongPressEnd,
  onOpenSettings, onProjectsClick, onArtifactsClick, onOpenArtifact,
}: SidebarProps) {
  return (
    <>
      <div
        className={`
          fixed left-0 top-0 z-50 flex h-full w-72 flex-col
          border-r border-gray-200 dark:border-white/[0.07]
          bg-white dark:bg-[#141414] shadow-xl
          transition-transform duration-300
          will-change-transform backface-visibility-hidden [transform:translate3d(0,0,0)]
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-6 pb-2">
          <div className="relative mb-5">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-white/30" />
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.05] py-2.5 pl-9 pr-3 text-sm text-gray-800 dark:text-[#ececec] outline-none focus:border-indigo-300 dark:focus:border-indigo-500/50 placeholder:text-gray-400 dark:placeholder:text-white/28"
            />
          </div>
          <button
            onClick={() => { setActiveMenuItem(activeMenuItem === 'newchat' ? null : 'newchat'); onNewChat() }}
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-[15px] font-medium transition-all ${
              activeMenuItem === 'newchat'
                ? 'border-[#4D6BFE]/60 bg-gradient-to-r from-[#EEF2FF] to-[#F0F4FF] dark:bg-none dark:from-[#4D6BFE]/20 dark:to-[#4D6BFE]/15 text-[#4D6BFE] shadow-sm'
                : 'border-gray-200 dark:border-white/[0.07] bg-white dark:bg-transparent text-gray-600 dark:text-[#ececec] hover:border-gray-300 dark:hover:border-white/[0.14] hover:bg-gray-50 dark:hover:bg-white/[0.05]'
            }`}
          >
            <MessageSquarePlus className={`h-5 w-5 ${activeMenuItem === 'newchat' ? 'text-[#4D6BFE]' : 'text-gray-400 dark:text-white/30'}`} />
            New Chat
          </button>
          <button
            onClick={onProjectsClick}
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-[15px] font-medium transition-all ${
              activeMenuItem === 'projects'
                ? 'border-[#4D6BFE]/60 bg-gradient-to-r from-[#EEF2FF] to-[#F0F4FF] dark:bg-none dark:from-[#4D6BFE]/20 dark:to-[#4D6BFE]/15 text-[#4D6BFE] shadow-sm'
                : 'border-gray-200 dark:border-white/[0.07] bg-white dark:bg-transparent text-gray-600 dark:text-[#ececec] hover:border-gray-300 dark:hover:border-white/[0.14] hover:bg-gray-50 dark:hover:bg-white/[0.05]'
            }`}
          >
            <FolderOpen className={`h-5 w-5 ${activeMenuItem === 'projects' ? 'text-[#4D6BFE]' : 'text-gray-400 dark:text-white/30'}`} />
            Projects
          </button>
          <button
            onClick={onArtifactsClick}
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-[15px] font-medium transition-all ${
              activeMenuItem === 'artifacts'
                ? 'border-[#4D6BFE]/60 bg-gradient-to-r from-[#EEF2FF] to-[#F0F4FF] dark:bg-none dark:from-[#4D6BFE]/20 dark:to-[#4D6BFE]/15 text-[#4D6BFE] shadow-sm'
                : 'border-gray-200 dark:border-white/[0.07] bg-white dark:bg-transparent text-gray-600 dark:text-[#ececec] hover:border-gray-300 dark:hover:border-white/[0.14] hover:bg-gray-50 dark:hover:bg-white/[0.05]'
            }`}
          >
            <svg className={`h-5 w-5 ${activeMenuItem === 'artifacts' ? 'text-[#4D6BFE]' : 'text-gray-400 dark:text-white/30'}`}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
            >
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <circle cx="17.5" cy="17.5" r="3.5" />
            </svg>
            Artifacts
            {allArtifacts.length > 0 && (
              <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                activeMenuItem === 'artifacts' ? 'bg-[#4D6BFE]/20 text-[#4D6BFE]' : 'bg-gray-100 dark:bg-white/[0.08] text-gray-500 dark:text-white/40'
              }`}>
                {allArtifacts.length}
              </span>
            )}
          </button>
          {showArtifactsList && (
            <ArtifactsList
              artifacts={allArtifacts}
              onOpen={(art) => { onOpenArtifact(art); setSidebarOpen(false) }}
            />
          )}
          {(() => {
            const projectSessions = sortedSessions.filter(s => s.projectName)
            const regularSessions = sortedSessions.filter(s => !s.projectName)

            const SessionItem = ({ session }: { session: ChatSession }) => (
              <div key={session.id} className="relative">
                {renamingId === session.id ? (
                  <div className="flex items-center gap-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/20 px-3 py-2">
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') onConfirmRename(); if (e.key === 'Escape') setRenamingId(null) }}
                      onBlur={onConfirmRename}
                      className="flex-1 bg-transparent text-[14px] text-indigo-700 dark:text-indigo-300 outline-none"
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => onLoadSession(session)}
                    onMouseDown={e => onLongPressStart(e, session.id)}
                    onMouseUp={onLongPressEnd}
                    onMouseLeave={onLongPressEnd}
                    onTouchStart={e => onLongPressStart(e, session.id)}
                    onTouchEnd={onLongPressEnd}
                    onContextMenu={e => {
                      e.preventDefault()
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                      setContextMenu({ sessionId: session.id, x: rect.left, y: rect.bottom + 4 })
                    }}
                    className={`flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-left text-[14px] text-gray-600 dark:text-white/60 transition hover:bg-indigo-50 dark:hover:bg-white/[0.05] hover:text-indigo-600 dark:hover:text-white/80 ${session.id === currentSessionId ? 'bg-indigo-50 dark:bg-white/[0.07] text-indigo-600 dark:text-white/80' : ''}`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {session.pinned ? (
                        <svg className="h-4 w-4 text-[#4D6BFE]" viewBox="0 0 24 24" fill="currentColor"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>
                      ) : session.favorite ? (
                        <svg className="h-4 w-4 text-amber-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                      ) : (
                        <MessageSquare className="h-4 w-4 text-gray-400 dark:text-white/28" />
                      )}
                    </div>
                    <span className="line-clamp-2 leading-snug">{session.title}</span>
                  </button>
                )}
              </div>
            )

            return (
              <>
                {projectSessions.length > 0 && (
                  <>
                    <span className="ml-1 mt-4 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-white/28">Projects</span>
                    {Object.entries(
                      projectSessions.reduce((acc, s) => {
                        const key = s.projectName!
                        if (!acc[key]) acc[key] = []
                        acc[key].push(s)
                        return acc
                      }, {} as Record<string, ChatSession[]>)
                    ).map(([projectName, sessions]) => (
                      <div key={projectName} className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5 px-2 py-1">
                          <FolderOpen className="h-3.5 w-3.5 text-[#4D6BFE]" />
                          <span className="text-[12px] font-semibold text-[#4D6BFE] truncate">{projectName}</span>
                        </div>
                        {sessions.map(s => <SessionItem key={s.id} session={s} />)}
                      </div>
                    ))}
                  </>
                )}
                {regularSessions.length > 0 && (
                  <>
                    <span className="ml-1 mt-4 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-white/28">Recent Chats</span>
                    <div className="flex flex-col gap-1">
                      {regularSessions.map(s => <SessionItem key={s.id} session={s} />)}
                    </div>
                  </>
                )}
                {sortedSessions.length === 0 && (
                  <p className="px-2 py-3 text-[13px] italic text-gray-400 dark:text-white/28">
                    {searchQuery ? 'No matching chats' : 'No recent chats yet'}
                  </p>
                )}
              </>
            )
          })()}
        </div>
        {contextMenu && (
          <>
            <div className="fixed inset-0 z-[60]" onClick={() => setContextMenu(null)} />
            <div
              className="fixed z-[70] w-44 overflow-hidden rounded-2xl border border-gray-100 dark:border-white/[0.08] bg-white dark:bg-[#212121] shadow-2xl"
              style={{ top: Math.min(contextMenu.y, window.innerHeight - 230), left: Math.min(contextMenu.x, window.innerWidth - 185) }}
            >
              {[
                { label: chatSessions.find(s => s.id === contextMenu.sessionId)?.pinned ? 'Unpin' : 'Pin', action: () => onPin(contextMenu.sessionId) },
                { label: chatSessions.find(s => s.id === contextMenu.sessionId)?.favorite ? 'Unfavorite' : 'Favorite', action: () => onFavorite(contextMenu.sessionId) },
                { label: 'Rename', action: () => { const s = chatSessions.find(x => x.id === contextMenu.sessionId); if (s) onStartRename(s) } },
              ].map((item, i) => (
                <button key={i} onClick={item.action} className="flex w-full items-center gap-3 border-b border-gray-100 dark:border-white/[0.07] px-4 py-3 text-[14px] font-medium text-gray-700 dark:text-[#ececec] transition hover:bg-indigo-50 dark:hover:bg-white/[0.07] hover:text-indigo-600 dark:hover:text-indigo-400">
                  {item.label}
                </button>
              ))}
              <button onClick={() => onDelete(contextMenu.sessionId)} className="flex w-full items-center gap-3 px-4 py-3 text-[14px] font-medium text-rose-500 transition hover:bg-red-50 dark:hover:bg-red-500/10">
                Delete
              </button>
            </div>
          </>
        )}
        <div className="flex items-center justify-between border-t border-gray-100 dark:border-white/[0.07] px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-900 dark:bg-white/[0.12] text-[13px] font-bold text-white">
              {initials}
            </div>
            <span className="truncate text-[15px] font-medium text-gray-800 dark:text-[#ececec]">{displayName}</span>
          </div>
          <button
            onClick={onOpenSettings}
            className="ml-3 shrink-0 rounded-xl p-2 text-gray-400 dark:text-white/40 transition hover:bg-gray-100 dark:hover:bg-white/[0.08] hover:text-gray-700 dark:hover:text-white/70"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </div>
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/20 dark:bg-black/50" onClick={() => setSidebarOpen(false)} />
      )}
    </>
  )
            }

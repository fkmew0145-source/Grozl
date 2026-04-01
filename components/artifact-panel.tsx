'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, Plus, X, ChevronLeft, MoreVertical, Lock, MessageSquare, Trash2, Star, Pin, Pencil, MessageSquarePlus } from 'lucide-react'

export interface Project {
  id: string
  name: string
  description: string
  createdAt: number
  sessionIds: string[]
  knowledge: string
  customInstructions: string
  pinned?: boolean
  favorite?: boolean
}

function projectsStorageKey(userId?: string | null) {
  return userId ? `grozl_projects_${userId}` : 'grozl_projects_guest'
}

function loadProjects(userId?: string | null): Project[] {
  try {
    const raw = localStorage.getItem(projectsStorageKey(userId))
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveProjects(projects: Project[], userId?: string | null) {
  try { localStorage.setItem(projectsStorageKey(userId), JSON.stringify(projects)) } catch { /* ignore */ }
}

interface ProjectsPanelProps {
  userId?: string | null
  currentSessionId: string
  currentSessionTitle?: string
  onClose: () => void
  onStartNewChatInProject: (project: Project) => void
}

type View = 'list' | 'detail'

export default function ProjectsPanel({
  userId,
  currentSessionId,
  currentSessionTitle = 'Current chat',
  onClose,
  onStartNewChatInProject,
}: ProjectsPanelProps) {
  const [projects, setProjects]     = useState<Project[]>(() => loadProjects(userId))
  const [view, setView]             = useState<View>('list')
  const [selected, setSelected]     = useState<Project | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showMenu, setShowMenu]     = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // ── Create form state (uncontrolled refs to fix typing bug) ──────────
  // Problem was: controlled inputs inside a bottom-sheet re-rendered on
  // every keystroke because the parent state update caused the sheet to
  // remount. Fix: keep name/desc in local refs + force-update only on blur
  // or submit so the sheet never unmounts mid-type.
  const newNameRef  = useRef('')
  const newDescRef  = useRef('')
  const nameInputRef = useRef<HTMLInputElement>(null)
  const descInputRef = useRef<HTMLTextAreaElement>(null)

  // ── Rename state ─────────────────────────────────────────────────────
  const [renamingId, setRenamingId]   = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  // ── Edit knowledge / instructions ────────────────────────────────────
  const [editKnowledge, setEditKnowledge]         = useState('')
  const [editInstructions, setEditInstructions]   = useState('')
  const [editingField, setEditingField]           = useState<'knowledge' | 'instructions' | null>(null)

  useEffect(() => {
    setProjects(loadProjects(userId))
  }, [userId])

  const save = (updated: Project[]) => {
    setProjects(updated)
    saveProjects(updated, userId)
  }

  // ── Create project ───────────────────────────────────────────────────
  const createProject = () => {
    const name = nameInputRef.current?.value.trim() || newNameRef.current.trim()
    const desc = descInputRef.current?.value.trim() || newDescRef.current.trim()
    if (!name) return
    const p: Project = {
      id: crypto.randomUUID(),
      name,
      description: desc,
      createdAt: Date.now(),
      sessionIds: [],
      knowledge: '',
      customInstructions: '',
      pinned: false,
      favorite: false,
    }
    save([p, ...projects])
    newNameRef.current = ''
    newDescRef.current = ''
    setShowCreate(false)
    setSelected(p)
    setView('detail')
  }

  // ── Delete ───────────────────────────────────────────────────────────
  const deleteProject = (id: string) => {
    save(projects.filter(p => p.id !== id))
    setSelected(null)
    setView('list')
    setShowMenu(false)
  }

  // ── Rename ───────────────────────────────────────────────────────────
  const startRename = (p: Project) => {
    setRenamingId(p.id)
    setRenameValue(p.name)
    setShowMenu(false)
  }

  const confirmRename = () => {
    if (!renamingId) return
    const trimmed = renameValue.trim()
    if (!trimmed) { setRenamingId(null); return }
    const updated = projects.map(p => p.id === renamingId ? { ...p, name: trimmed } : p)
    save(updated)
    if (selected?.id === renamingId) setSelected(updated.find(p => p.id === renamingId) ?? null)
    setRenamingId(null)
  }

  // ── Pin / Favorite ───────────────────────────────────────────────────
  const togglePin = (id: string) => {
    const updated = projects.map(p => p.id === id ? { ...p, pinned: !p.pinned } : p)
    save(updated)
    if (selected?.id === id) setSelected(updated.find(p => p.id === id) ?? null)
    setShowMenu(false)
  }

  const toggleFavorite = (id: string) => {
    const updated = projects.map(p => p.id === id ? { ...p, favorite: !p.favorite } : p)
    save(updated)
    if (selected?.id === id) setSelected(updated.find(p => p.id === id) ?? null)
    setShowMenu(false)
  }

  // ── Save knowledge / instructions ────────────────────────────────────
  const saveProjectField = (field: 'knowledge' | 'customInstructions', value: string) => {
    if (!selected) return
    const updated = projects.map(p => p.id === selected.id ? { ...p, [field]: value } : p)
    const fresh = updated.find(p => p.id === selected.id)!
    save(updated)
    setSelected(fresh)
    setEditingField(null)
  }

  // ── Sorted + filtered list ────────────────────────────────────────────
  const filteredProjects = projects
    .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      return b.createdAt - a.createdAt
    })

  // ── Create sheet ──────────────────────────────────────────────────────
  // Uses uncontrolled inputs (defaultValue + ref) so typing never stutters
  const CreateSheet = () => (
    <div className="fixed inset-0 z-[200] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={() => setShowCreate(false)} />
      <div className="relative w-full max-w-lg rounded-t-3xl bg-white px-5 pt-5 pb-8 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[18px] font-semibold text-gray-900">Create a project</h2>
          <button
            onClick={() => setShowCreate(false)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition active:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-1.5 text-[13px] font-medium text-gray-600">What are you working on?</p>
        {/* UNCONTROLLED input — no onChange state update, no re-render on type */}
        <input
          ref={nameInputRef}
          autoFocus
          defaultValue=""
          onKeyDown={e => e.key === 'Enter' && descInputRef.current?.focus()}
          placeholder="Name your project"
          className="mb-4 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-[15px] text-gray-800 outline-none focus:border-gray-400 placeholder:text-gray-400"
        />

        <p className="mb-1.5 text-[13px] font-medium text-gray-600">What are you trying to achieve?</p>
        <textarea
          ref={descInputRef}
          defaultValue=""
          placeholder="Describe your project, goals, subject, etc..."
          rows={4}
          className="mb-5 w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-[15px] text-gray-800 outline-none focus:border-gray-400 placeholder:text-gray-400"
        />

        <button
          onClick={createProject}
          className="w-full rounded-2xl bg-gray-700 py-4 text-[15px] font-semibold text-white transition active:bg-gray-800"
        >
          Create project
        </button>
      </div>
    </div>
  )

  // ── Detail view ───────────────────────────────────────────────────────
  if (view === 'detail' && selected) {
    const project = projects.find(p => p.id === selected.id) ?? selected

    if (editingField === 'knowledge') {
      return (
        <div className="flex h-full flex-col bg-[#F5F3EF]">
          <div className="flex items-center justify-between px-4 py-4 pt-6">
            <button onClick={() => setEditingField(null)} className="text-[15px] text-gray-600">Cancel</button>
            <h1 className="text-[17px] font-semibold text-gray-900">Project knowledge</h1>
            <button onClick={() => saveProjectField('knowledge', editKnowledge)} className="text-[15px] font-semibold text-[#4D6BFE]">Save</button>
          </div>
          <div className="flex-1 px-4">
            <textarea
              autoFocus
              value={editKnowledge}
              onChange={e => setEditKnowledge(e.target.value)}
              placeholder="Add knowledge, context, or documents for this project..."
              className="h-full w-full resize-none rounded-2xl bg-white px-4 py-4 text-[15px] text-gray-800 outline-none placeholder:text-gray-400"
            />
          </div>
        </div>
      )
    }

    if (editingField === 'instructions') {
      return (
        <div className="flex h-full flex-col bg-[#F5F3EF]">
          <div className="flex items-center justify-between px-4 py-4 pt-6">
            <button onClick={() => setEditingField(null)} className="text-[15px] text-gray-600">Cancel</button>
            <h1 className="text-[17px] font-semibold text-gray-900">Custom instructions</h1>
            <button onClick={() => saveProjectField('customInstructions', editInstructions)} className="text-[15px] font-semibold text-[#4D6BFE]">Save</button>
          </div>
          <div className="flex-1 px-4">
            <textarea
              autoFocus
              value={editInstructions}
              onChange={e => setEditInstructions(e.target.value)}
              placeholder="Add custom instructions for Grozl to follow in this project..."
              className="h-full w-full resize-none rounded-2xl bg-white px-4 py-4 text-[15px] text-gray-800 outline-none placeholder:text-gray-400"
            />
          </div>
        </div>
      )
    }

    return (
      <div className="flex h-full flex-col bg-[#F5F3EF]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 pt-6">
          <button
            onClick={() => { setView('list'); setSelected(null) }}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-600 transition active:bg-gray-100"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          {/* ⋮ Menu — now has Rename, Pin, Favorite, Delete */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-gray-600 transition active:bg-gray-100"
            >
              <MoreVertical className="h-5 w-5" />
            </button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-10 z-50 w-48 overflow-hidden rounded-2xl bg-white shadow-xl">
                  {/* Rename */}
                  <button
                    onClick={() => { startRename(project) }}
                    className="flex w-full items-center gap-2.5 px-4 py-3.5 text-[14px] text-gray-700 transition active:bg-gray-50 border-b border-gray-100"
                  >
                    <Pencil className="h-4 w-4 text-gray-400" />
                    Rename
                  </button>
                  {/* Pin */}
                  <button
                    onClick={() => togglePin(project.id)}
                    className="flex w-full items-center gap-2.5 px-4 py-3.5 text-[14px] text-gray-700 transition active:bg-gray-50 border-b border-gray-100"
                  >
                    <Pin className="h-4 w-4 text-gray-400" />
                    {project.pinned ? 'Unpin' : 'Pin'}
                  </button>
                  {/* Favorite */}
                  <button
                    onClick={() => toggleFavorite(project.id)}
                    className="flex w-full items-center gap-2.5 px-4 py-3.5 text-[14px] text-gray-700 transition active:bg-gray-50 border-b border-gray-100"
                  >
                    <Star className="h-4 w-4 text-gray-400" />
                    {project.favorite ? 'Unfavorite' : 'Favorite'}
                  </button>
                  {/* Delete */}
                  <button
                    onClick={() => deleteProject(project.id)}
                    className="flex w-full items-center gap-2.5 px-4 py-3.5 text-[14px] text-red-500 transition active:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete project
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-6">
          {/* Title — tap to rename inline */}
          {renamingId === project.id ? (
            <input
              autoFocus
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              onBlur={confirmRename}
              onKeyDown={e => { if (e.key === 'Enter') confirmRename(); if (e.key === 'Escape') setRenamingId(null) }}
              className="mb-3 w-full rounded-xl bg-white px-3 py-1 text-[28px] font-bold text-gray-900 outline-none"
            />
          ) : (
            <h1 className="mb-3 text-[28px] font-bold text-gray-900">{project.name}</h1>
          )}

          {/* Badges */}
          <div className="mb-4 flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 px-3 py-1">
              <Lock className="h-3.5 w-3.5 text-gray-500" />
              <span className="text-[13px] text-gray-600">Private</span>
            </div>
            {project.pinned && (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-[#4D6BFE]/40 bg-[#4D6BFE]/10 px-3 py-1">
                <Pin className="h-3 w-3 text-[#4D6BFE]" />
                <span className="text-[12px] text-[#4D6BFE]">Pinned</span>
              </div>
            )}
            {project.favorite && (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1">
                <Star className="h-3 w-3 text-amber-500" />
                <span className="text-[12px] text-amber-600">Favorite</span>
              </div>
            )}
          </div>

          {/* Memory */}
          <div className="mb-4 rounded-2xl border border-gray-200 bg-white px-4 py-3.5">
            <p className="text-[13px] text-gray-400">
              {project.sessionIds.length > 0
                ? `Project has ${project.sessionIds.length} chat${project.sessionIds.length !== 1 ? 's' : ''}.`
                : 'Project memory will appear after a few chats.'}
            </p>
          </div>

          {/* Knowledge & Instructions */}
          <div className="mb-5 grid grid-cols-2 gap-3">
            <button
              onClick={() => { setEditKnowledge(project.knowledge); setEditingField('knowledge') }}
              className="rounded-2xl bg-[#F0EDE8] px-4 py-4 text-left transition active:bg-[#E8E4DE]"
            >
              <p className="mb-2 text-[14px] font-semibold text-gray-800">Project knowledge</p>
              {project.knowledge ? (
                <p className="text-[12px] text-gray-500 line-clamp-2">{project.knowledge}</p>
              ) : (
                <p className="text-[13px] font-medium text-[#C2714F]">Add knowledge</p>
              )}
            </button>
            <button
              onClick={() => { setEditInstructions(project.customInstructions); setEditingField('instructions') }}
              className="rounded-2xl bg-[#F0EDE8] px-4 py-4 text-left transition active:bg-[#E8E4DE]"
            >
              <p className="mb-2 text-[14px] font-semibold text-gray-800">Custom instructions</p>
              {project.customInstructions ? (
                <p className="text-[12px] text-gray-500 line-clamp-2">{project.customInstructions}</p>
              ) : (
                <p className="text-[13px] font-medium text-[#C2714F]">Add instructions</p>
              )}
            </button>
          </div>

          {/* New Chat button — sidebar style (replaces FAB) */}
          <button
            onClick={() => onStartNewChatInProject(project)}
            className="mb-5 flex w-full items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-left text-[15px] font-medium text-gray-700 transition active:bg-gray-50"
          >
            <MessageSquarePlus className="h-5 w-5 text-gray-400" />
            New chat in this project
          </button>

          {/* Chats list */}
          {project.sessionIds.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <MessageSquare className="mb-3 h-12 w-12 text-gray-300 stroke-[1.2]" />
              <p className="text-[14px] text-gray-400">Chats you&apos;ve had with Grozl will show up here.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {project.sessionIds.map((sid, i) => (
                <div key={sid} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3.5">
                  <MessageSquare className="h-4 w-4 shrink-0 text-gray-400" />
                  <span className="flex-1 truncate text-[14px] text-gray-700">
                    {sid === currentSessionId ? currentSessionTitle : `Chat ${i + 1}`}
                  </span>
                  <button
                    onClick={() => {
                      const updated = projects.map(p =>
                        p.id === project.id ? { ...p, sessionIds: p.sessionIds.filter(id => id !== sid) } : p
                      )
                      const fresh = updated.find(p => p.id === project.id)!
                      save(updated)
                      setSelected(fresh)
                    }}
                    className="shrink-0 p-1 text-gray-300 transition active:text-red-400"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── List view ─────────────────────────────────────────────────────────
  return (
    <div className="flex h-full flex-col bg-[#F5F3EF]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 pt-6">
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full text-gray-600 transition active:bg-gray-100"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="16" y2="12"/><line x1="3" y1="18" x2="11" y2="18"/>
          </svg>
        </button>
        <button
          onClick={() => setShowCreate(true)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-gray-700 transition active:bg-gray-100"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      <div className="px-4 pb-4">
        <h1 className="mb-4 text-[28px] font-bold text-gray-900">Projects</h1>

        {/* Search — was not working because bg-white input had no bg in some builds */}
        <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-gray-400" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search projects"
            className="flex-1 bg-transparent text-[15px] text-gray-700 outline-none placeholder:text-gray-400"
          />
          {searchQuery.length > 0 && (
            <button onClick={() => setSearchQuery('')} className="text-gray-300 transition active:text-gray-500">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-8">
        {filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <svg className="mb-4 h-14 w-14 text-gray-300 stroke-[1.2]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              <line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/>
            </svg>
            <p className="text-[14px] leading-relaxed text-gray-400">
              {searchQuery
                ? 'No projects found.'
                : 'Create a project to organize and customize chats\nwith Grozl around a topic or set of documents.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {filteredProjects.map(p => (
              <button
                key={p.id}
                onClick={() => { setSelected(p); setView('detail') }}
                className="flex items-center gap-3 rounded-2xl bg-white px-4 py-4 text-left shadow-sm transition active:bg-gray-50"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100">
                  {p.pinned ? (
                    <Pin className="h-5 w-5 text-[#4D6BFE]" />
                  ) : p.favorite ? (
                    <Star className="h-5 w-5 text-amber-400" />
                  ) : (
                    <svg className="h-5 w-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                    </svg>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold text-gray-800">{p.name}</p>
                  <p className="text-[12px] text-gray-400">{p.sessionIds.length} chat{p.sessionIds.length !== 1 ? 's' : ''}</p>
                </div>
                <ChevronLeft className="h-4 w-4 shrink-0 rotate-180 text-gray-300" />
              </button>
            ))}
          </div>
        )}
      </div>

      {showCreate && <CreateSheet />}
    </div>
  )
}

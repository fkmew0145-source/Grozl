'use client'

import { useState, useEffect } from 'react'
import { Search, Plus, X, ChevronLeft, MoreVertical, Lock, MessageSquare, Trash2 } from 'lucide-react'
import { sessionsKey } from './settings/settings-store'

export interface Project {
  id: string
  name: string
  description: string
  createdAt: number
  sessionIds: string[]
  knowledge: string
  customInstructions: string
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

type View = 'list' | 'detail' | 'chat'

export default function ProjectsPanel({
  userId,
  currentSessionId,
  currentSessionTitle = 'Current chat',
  onClose,
  onStartNewChatInProject,
}: ProjectsPanelProps) {
  const [projects, setProjects]   = useState<Project[]>(() => loadProjects(userId))
  const [view, setView]           = useState<View>('list')
  const [selected, setSelected]   = useState<Project | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showMenu, setShowMenu]   = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [newName, setNewName]     = useState('')
  const [newDesc, setNewDesc]     = useState('')
  const [editKnowledge, setEditKnowledge]     = useState('')
  const [editInstructions, setEditInstructions] = useState('')
  const [editingField, setEditingField] = useState<'knowledge' | 'instructions' | null>(null)

  useEffect(() => {
    setProjects(loadProjects(userId))
  }, [userId])

  const save = (updated: Project[]) => {
    setProjects(updated)
    saveProjects(updated, userId)
  }

  const createProject = () => {
    if (!newName.trim()) return
    const p: Project = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      description: newDesc.trim(),
      createdAt: Date.now(),
      sessionIds: [],
      knowledge: '',
      customInstructions: '',
    }
    save([p, ...projects])
    setNewName('')
    setNewDesc('')
    setShowCreate(false)
    setSelected(p)
    setView('detail')
  }

  const deleteProject = (id: string) => {
    save(projects.filter(p => p.id !== id))
    setSelected(null)
    setView('list')
  }

  const saveProjectField = (field: 'knowledge' | 'customInstructions', value: string) => {
    if (!selected) return
    const updated = projects.map(p =>
      p.id === selected.id ? { ...p, [field]: value } : p
    )
    const fresh = updated.find(p => p.id === selected.id)!
    save(updated)
    setSelected(fresh)
    setEditingField(null)
  }

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // ── Create sheet ──────────────────────────────────────────────────────
  const CreateSheet = () => (
    <div className="fixed inset-0 z-[200] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={() => setShowCreate(false)} />
      <div className="relative w-full max-w-lg rounded-t-3xl bg-white px-5 pt-5 pb-8 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[18px] font-semibold text-gray-900">Create a project</h2>
          <button onClick={() => setShowCreate(false)} className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition active:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-1.5 text-[13px] font-medium text-gray-600">What are you working on?</p>
        <input
          autoFocus
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && createProject()}
          placeholder="Name your project"
          className="mb-4 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-[15px] text-gray-800 outline-none focus:border-gray-400 placeholder:text-gray-400"
        />

        <p className="mb-1.5 text-[13px] font-medium text-gray-600">What are you trying to achieve?</p>
        <textarea
          value={newDesc}
          onChange={e => setNewDesc(e.target.value)}
          placeholder="Describe your project, goals, subject, etc..."
          rows={4}
          className="mb-5 w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-[15px] text-gray-800 outline-none focus:border-gray-400 placeholder:text-gray-400"
        />

        <button
          onClick={createProject}
          disabled={!newName.trim()}
          className={`w-full rounded-2xl py-4 text-[15px] font-semibold text-white transition ${newName.trim() ? 'bg-gray-700 active:bg-gray-800' : 'bg-gray-300 cursor-not-allowed'}`}
        >
          Create project
        </button>
      </div>
    </div>
  )

  // ── Detail view (Image 3 style) ───────────────────────────────────────
  if (view === 'detail' && selected) {
    const project = projects.find(p => p.id === selected.id) ?? selected

    // Editing knowledge
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

    // Editing instructions
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
          <button onClick={() => { setView('list'); setSelected(null) }} className="flex h-8 w-8 items-center justify-center rounded-full text-gray-600 transition active:bg-gray-100">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="flex h-8 w-8 items-center justify-center rounded-full text-gray-600 transition active:bg-gray-100">
              <MoreVertical className="h-5 w-5" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-10 z-50 w-40 overflow-hidden rounded-2xl bg-white shadow-xl">
                <button
                  onClick={() => { deleteProject(project.id); setShowMenu(false) }}
                  className="flex w-full items-center gap-2.5 px-4 py-3.5 text-[14px] text-red-500 transition active:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete project
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5">
          {/* Project title */}
          <h1 className="mb-3 text-[28px] font-bold text-gray-900">{project.name}</h1>

          {/* Private badge */}
          <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-gray-300 px-3 py-1">
            <Lock className="h-3.5 w-3.5 text-gray-500" />
            <span className="text-[13px] text-gray-600">Private</span>
          </div>

          {/* Project memory */}
          <div className="mb-4 rounded-2xl border border-gray-200 bg-white px-4 py-3.5">
            <p className="text-[13px] text-gray-400">
              {project.sessionIds.length > 0
                ? `Project has ${project.sessionIds.length} chat${project.sessionIds.length !== 1 ? 's' : ''}.`
                : 'Project memory will appear after a few chats.'}
            </p>
          </div>

          {/* Knowledge & Instructions cards */}
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

          {/* Chats section */}
          {project.sessionIds.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center">
                <MessageSquare className="h-12 w-12 text-gray-400 stroke-[1.2]" />
              </div>
              <p className="text-[14px] text-gray-500">Chats you&apos;ve had with Grozl will show up here.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 pb-32">
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

        {/* New chat FAB */}
        <div className="absolute bottom-8 right-5">
          <button
            onClick={() => onStartNewChatInProject(project)}
            className="flex items-center gap-2 rounded-full bg-[#C2714F] px-5 py-3.5 text-[15px] font-semibold text-white shadow-lg transition active:bg-[#A85E3E]"
          >
            <Plus className="h-5 w-5" />
            New chat
          </button>
        </div>

        {showMenu && <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />}
      </div>
    )
  }

  // ── List view (Image 1 style) ─────────────────────────────────────────
  return (
    <div className="flex h-full flex-col bg-[#F5F3EF]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 pt-6">
        <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-gray-600 transition active:bg-gray-100">
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

        {/* Search */}
        <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-gray-400" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search projects"
            className="flex-1 text-[15px] text-gray-700 outline-none placeholder:text-gray-400"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-8">
        {filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center">
              <svg className="h-14 w-14 text-gray-400 stroke-[1.2]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                <line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/>
              </svg>
            </div>
            <p className="text-[14px] leading-relaxed text-gray-500">
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
                  <svg className="h-5 w-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                  </svg>
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
                         

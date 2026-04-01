'use client'

import { useState } from 'react'
import { FolderOpen, Plus, ChevronRight, X, Folder, Trash2, MessageSquare } from 'lucide-react'

export interface Project {
  id: string
  name: string
  description: string
  color: string
  createdAt: number
  sessionIds: string[]
}

const PROJECT_COLORS = [
  '#4D6BFE', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#06B6D4', '#F97316', '#EC4899',
]

const STORAGE_KEY = 'grozl_projects_v1'

function loadProjects(): Project[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveProjects(projects: Project[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(projects)) } catch { /* ignore */ }
}

interface ProjectsPanelProps {
  currentSessionId: string
  onClose: () => void
}

export default function ProjectsPanel({ currentSessionId, onClose }: ProjectsPanelProps) {
  const [projects, setProjects]         = useState<Project[]>(loadProjects)
  const [showCreate, setShowCreate]     = useState(false)
  const [newName, setNewName]           = useState('')
  const [newDesc, setNewDesc]           = useState('')
  const [newColor, setNewColor]         = useState(PROJECT_COLORS[0])
  const [selectedProject, setSelected] = useState<Project | null>(null)

  const createProject = () => {
    if (!newName.trim()) return
    const project: Project = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      description: newDesc.trim(),
      color: newColor,
      createdAt: Date.now(),
      sessionIds: [],
    }
    const updated = [project, ...projects]
    setProjects(updated)
    saveProjects(updated)
    setNewName('')
    setNewDesc('')
    setNewColor(PROJECT_COLORS[0])
    setShowCreate(false)
  }

  const addCurrentChat = (projectId: string) => {
    const updated = projects.map(p =>
      p.id === projectId && !p.sessionIds.includes(currentSessionId)
        ? { ...p, sessionIds: [currentSessionId, ...p.sessionIds] }
        : p
    )
    setProjects(updated)
    saveProjects(updated)
    // Refresh selected project view
    const fresh = updated.find(p => p.id === projectId)
    if (fresh) setSelected(fresh)
  }

  const removeChat = (projectId: string, sessionId: string) => {
    const updated = projects.map(p =>
      p.id === projectId
        ? { ...p, sessionIds: p.sessionIds.filter(id => id !== sessionId) }
        : p
    )
    setProjects(updated)
    saveProjects(updated)
    const fresh = updated.find(p => p.id === projectId)
    if (fresh) setSelected(fresh)
  }

  const deleteProject = (id: string) => {
    const updated = projects.filter(p => p.id !== id)
    setProjects(updated)
    saveProjects(updated)
    if (selectedProject?.id === id) setSelected(null)
  }

  // ── Detail view ──────────────────────────────────────────────────────
  if (selectedProject) {
    const project = projects.find(p => p.id === selectedProject.id) ?? selectedProject
    const alreadyAdded = project.sessionIds.includes(currentSessionId)

    return (
      <div className="flex h-full flex-col">

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
          <button
            onClick={() => setSelected(null)}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          >
            <ChevronRight className="h-5 w-5 rotate-180" />
          </button>
          <div
            className="flex h-8 w-8 items-center justify-center rounded-xl"
            style={{ background: project.color + '22' }}
          >
            <Folder className="h-4 w-4" style={{ color: project.color }} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold text-gray-800">{project.name}</p>
            {project.description && (
              <p className="truncate text-[12px] text-gray-400">{project.description}</p>
            )}
          </div>
          <button
            onClick={() => deleteProject(project.id)}
            className="shrink-0 rounded-xl p-2 text-red-400 transition hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {/* Add current chat */}
        <div className="px-5 pt-4 pb-2">
          <button
            onClick={() => addCurrentChat(project.id)}
            disabled={alreadyAdded}
            className={`flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed py-3 text-[13px] font-semibold transition ${
              alreadyAdded
                ? 'border-green-200 text-green-500 cursor-default'
                : 'border-gray-200 text-gray-400 hover:border-[#4D6BFE] hover:text-[#4D6BFE]'
            }`}
          >
            {alreadyAdded ? '✓ Current chat is in this project' : '+ Add current chat to project'}
          </button>
        </div>

        {/* Chat list */}
        <div className="flex-1 overflow-y-auto px-5 pb-5">
          {project.sessionIds.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-100">
                <MessageSquare className="h-5 w-5 text-gray-400" />
              </div>
              <p className="text-[13px] font-medium text-gray-500">No chats yet</p>
              <p className="mt-1 text-[11px] text-gray-400">Add current chat to get started</p>
            </div>
          ) : (
            <div className="mt-3 flex flex-col gap-1.5">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                {project.sessionIds.length} Chat{project.sessionIds.length !== 1 ? 's' : ''}
              </p>
              {project.sessionIds.map((sid, i) => (
                <div
                  key={sid}
                  className="group flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5"
                >
                  <div className="h-2 w-2 shrink-0 rounded-full" style={{ background: project.color }} />
                  <span className="flex-1 truncate text-[13px] text-gray-600">
                    {sid === currentSessionId ? '📍 Current chat' : `Chat ${i + 1}`}
                  </span>
                  <button
                    onClick={() => removeChat(project.id, sid)}
                    className="shrink-0 rounded-lg p-1 text-gray-300 opacity-0 transition group-hover:opacity-100 hover:bg-red-50 hover:text-red-400"
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

  // ── List view ────────────────────────────────────────────────────────
  return (
    <div className="flex h-full flex-col">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <FolderOpen className="h-5 w-5 text-[#4D6BFE]" />
          <span className="text-[16px] font-semibold text-gray-800">Projects</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 rounded-xl bg-[#4D6BFE]/10 px-3 py-1.5 text-[12px] font-semibold text-[#4D6BFE] transition hover:bg-[#4D6BFE]/20"
          >
            <Plus className="h-3.5 w-3.5" /> New
          </button>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="mx-4 mt-4 rounded-2xl border border-indigo-100 bg-gradient-to-b from-indigo-50/80 to-blue-50/60 p-4">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-indigo-400">New Project</p>
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') createProject(); if (e.key === 'Escape') setShowCreate(false) }}
            placeholder="Project name..."
            className="mb-2 w-full rounded-xl border border-indigo-200 bg-white px-3 py-2.5 text-[13px] text-gray-800 outline-none focus:border-[#4D6BFE] focus:ring-1 focus:ring-[#4D6BFE]/20 placeholder:text-gray-400"
          />
          <input
            value={newDesc}
            onChange={e => setNewDesc(e.target.value)}
            placeholder="Description (optional)..."
            className="mb-3 w-full rounded-xl border border-indigo-200 bg-white px-3 py-2.5 text-[13px] text-gray-800 outline-none focus:border-[#4D6BFE] focus:ring-1 focus:ring-[#4D6BFE]/20 placeholder:text-gray-400"
          />
          {/* Color picker */}
          <div className="mb-3 flex items-center gap-2">
            <span className="text-[11px] font-medium text-gray-400 mr-1">Color</span>
            {PROJECT_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setNewColor(c)}
                className={`h-5 w-5 rounded-full transition-all ${newColor === c ? 'scale-125 ring-2 ring-offset-2' : 'hover:scale-110'}`}
                style={{ background: c, ...(newColor === c ? { ringColor: c } : {}) }}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setShowCreate(false); setNewName(''); setNewDesc('') }}
              className="flex-1 rounded-xl border border-gray-200 py-2 text-[13px] font-medium text-gray-500 transition hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={createProject}
              disabled={!newName.trim()}
              className="flex-1 rounded-xl bg-[#4D6BFE] py-2 text-[13px] font-semibold text-white transition hover:bg-[#3D5BEE] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Create
            </button>
          </div>
        </div>
      )}

      {/* Projects list */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
              <FolderOpen className="h-7 w-7 text-gray-400" />
            </div>
            <p className="text-[15px] font-semibold text-gray-600">No projects yet</p>
            <p className="mt-1.5 text-[13px] text-gray-400">Group your chats into projects</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-5 rounded-2xl bg-[#4D6BFE]/10 px-5 py-2.5 text-[13px] font-semibold text-[#4D6BFE] transition hover:bg-[#4D6BFE]/20"
            >
              + Create your first project
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {projects.map(p => (
              <button
                key={p.id}
                onClick={() => setSelected(p)}
                className="group flex items-center gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3.5 text-left shadow-sm transition hover:border-[#4D6BFE]/30 hover:shadow-md"
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition group-hover:scale-105"
                  style={{ background: p.color + '20' }}
                >
                  <Folder className="h-5 w-5" style={{ color: p.color }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold text-gray-800">{p.name}</p>
                  {p.description
                    ? <p className="truncate text-[12px] text-gray-400">{p.description}</p>
                    : <p className="text-[12px] text-gray-300">{p.sessionIds.length} chat{p.sessionIds.length !== 1 ? 's' : ''}</p>
                  }
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {p.description && (
                    <span className="text-[11px] font-medium text-gray-400">
                      {p.sessionIds.length} chat{p.sessionIds.length !== 1 ? 's' : ''}
                    </span>
                  )}
                  <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-[#4D6BFE] transition" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
            }
              

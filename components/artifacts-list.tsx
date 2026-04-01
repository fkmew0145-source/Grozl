'use client'

import { Code2, ChevronRight } from 'lucide-react'

export interface ArtifactData {
  type: 'html' | 'react' | 'code'
  language?: string
  title: string
  content: string
}

interface ArtifactsListProps {
  artifacts: ArtifactData[]
  onOpen: (artifact: ArtifactData) => void
}

const TYPE_BADGE: Record<string, { bg: string; dot: string; label: string }> = {
  html:       { bg: 'bg-orange-50',  dot: 'bg-orange-400',  label: 'HTML'   },
  react:      { bg: 'bg-sky-50',     dot: 'bg-sky-400',     label: 'React'  },
  javascript: { bg: 'bg-yellow-50',  dot: 'bg-yellow-400',  label: 'JS'     },
  typescript: { bg: 'bg-blue-50',    dot: 'bg-blue-500',    label: 'TS'     },
  python:     { bg: 'bg-green-50',   dot: 'bg-green-400',   label: 'Py'     },
  code:       { bg: 'bg-violet-50',  dot: 'bg-violet-400',  label: 'Code'   },
}

function getBadge(type: string, language?: string) {
  const key = language?.toLowerCase() ?? type
  return TYPE_BADGE[key] ?? TYPE_BADGE.code
}

export default function ArtifactsList({ artifacts, onOpen }: ArtifactsListProps) {
  if (artifacts.length === 0) {
    return (
      <div className="ml-2 border-l-2 border-indigo-100 pl-3 py-2">
        <p className="text-[12px] italic text-gray-400">No artifacts yet</p>
      </div>
    )
  }

  return (
    <div className="ml-2 flex flex-col gap-0.5 border-l-2 border-indigo-100 pl-3">
      {artifacts.map((art, i) => {
        const badge = getBadge(art.type, art.language)
        return (
          <button
            key={i}
            onClick={() => onOpen(art)}
            className="group flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition hover:bg-indigo-50"
          >
            <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${badge.bg}`}>
              <Code2 className="h-3 w-3 text-gray-500 group-hover:text-indigo-500 transition" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-gray-700 group-hover:text-indigo-700 transition">
                {art.title}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                  {badge.label}
                </span>
              </div>
            </div>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-300 group-hover:text-indigo-300 transition" />
          </button>
        )
      })}
    </div>
  )
}

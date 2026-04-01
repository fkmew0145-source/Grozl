'use client'

import { useState, useRef } from 'react'
import { X, Code2, Eye, Copy, Check, RefreshCw, Terminal } from 'lucide-react'

interface ArtifactPanelProps {
  artifact: {
    type: 'html' | 'react' | 'code'
    language?: string
    title: string
    content: string
  } | null
  onClose: () => void
}

export default function ArtifactPanel({ artifact, onClose }: ArtifactPanelProps) {
  const [tab, setTab]             = useState<'preview' | 'code'>('preview')
  const [copied, setCopied]       = useState(false)
  const [iframeKey, setIframeKey] = useState(0)
  const iframeRef                 = useRef<HTMLIFrameElement>(null)

  const handleCopy = () => {
    navigator.clipboard.writeText(artifact?.content || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRefresh = () => setIframeKey(k => k + 1)

  const getPreviewHTML = () => {
    if (!artifact) return ''
    if (artifact.type === 'html') return artifact.content
    if (artifact.type === 'react') {
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
  <style>body { margin: 0; padding: 16px; font-family: system-ui, sans-serif; background: #fff; }</style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    const { useState, useEffect, useRef, useCallback } = React;
    ${artifact.content}
    const rootEl = document.getElementById('root');
    if (ReactDOM.createRoot) ReactDOM.createRoot(rootEl).render(<App />);
    else ReactDOM.render(<App />, rootEl);
  </script>
</body>
</html>`
    }
    return ''
  }

  if (!artifact) return null

  const canPreview = artifact.type === 'html' || artifact.type === 'react'
  const langLabel  = artifact.type === 'code' ? (artifact.language || 'code') : artifact.type

  const badgeColors: Record<string, string> = {
    html:       'bg-orange-500/20 text-orange-300',
    react:      'bg-sky-500/20 text-sky-300',
    code:       'bg-violet-500/20 text-violet-300',
    javascript: 'bg-yellow-500/20 text-yellow-300',
    python:     'bg-blue-500/20 text-blue-300',
    typescript: 'bg-blue-600/20 text-blue-300',
  }
  const badge = badgeColors[artifact.language?.toLowerCase() ?? artifact.type] ?? badgeColors.code

  return (
    <div className="flex h-full flex-col bg-[#0f1117] text-white">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 border-b border-white/[0.08] px-4 py-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.08]">
          {canPreview
            ? <Code2 className="h-4 w-4 text-[#7B93FF]" />
            : <Terminal className="h-4 w-4 text-violet-400" />}
        </div>
        <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-white/90">
          {artifact.title}
        </p>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${badge}`}>
          {langLabel}
        </span>
        <button
          onClick={onClose}
          className="ml-1 shrink-0 rounded-lg p-1.5 text-white/40 transition hover:bg-white/[0.08] hover:text-white/80"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────── */}
      {canPreview && (
        <div className="flex items-center justify-between border-b border-white/[0.08] px-4">
          <div className="flex">
            {(['preview', 'code'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex items-center gap-1.5 border-b-2 px-1 py-2.5 text-[13px] font-medium mr-5 transition-colors capitalize ${
                  tab === t
                    ? 'border-[#4D6BFE] text-[#7B93FF]'
                    : 'border-transparent text-white/35 hover:text-white/60'
                }`}
              >
                {t === 'preview'
                  ? <Eye className="h-3.5 w-3.5" />
                  : <Code2 className="h-3.5 w-3.5" />}
                {t}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            {tab === 'preview' && (
              <button
                onClick={handleRefresh}
                title="Refresh preview"
                className="rounded-lg p-1.5 text-white/40 transition hover:bg-white/[0.08] hover:text-white/70"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-white/40 transition hover:bg-white/[0.08] hover:text-white/70"
            >
              {copied
                ? <Check className="h-3.5 w-3.5 text-emerald-400" />
                : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      {/* ── Content ─────────────────────────────────────────────────── */}
      <div className="relative flex-1 overflow-hidden">

        {/* Pure code artifact */}
        {artifact.type === 'code' && (
          <div className="absolute inset-0 flex flex-col">
            <div className="flex shrink-0 items-center justify-between border-b border-white/[0.08] px-4 py-2">
              <span className="text-[11px] font-medium uppercase tracking-wider text-white/25">
                {artifact.language || 'code'}
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-white/40 transition hover:bg-white/[0.08] hover:text-white/70"
              >
                {copied
                  ? <Check className="h-3.5 w-3.5 text-emerald-400" />
                  : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              <pre className="p-5 text-[13px] leading-relaxed text-[#a9b1d6]">
                <code>{artifact.content}</code>
              </pre>
            </div>
          </div>
        )}

        {/* Preview iframe — white bg so content renders correctly */}
        {canPreview && tab === 'preview' && (
          <div className="absolute inset-0 bg-white">
            <iframe
              key={iframeKey}
              ref={iframeRef}
              srcDoc={getPreviewHTML()}
              className="h-full w-full border-0"
              sandbox="allow-scripts allow-same-origin allow-forms"
              title={artifact.title}
            />
          </div>
        )}

        {/* Code view for html/react */}
        {canPreview && tab === 'code' && (
          <div className="absolute inset-0 overflow-auto">
            <pre className="p-5 text-[13px] leading-relaxed text-[#a9b1d6]">
              <code>{artifact.content}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  )
          }

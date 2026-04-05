'use client'

import { useState } from 'react'
import {
  X, Code2, Eye, Copy, Check, RefreshCw, Terminal,
  FileText, Download, BookOpen, Settings2, Scroll, Lightbulb,
} from 'lucide-react'

// All artifact types matching system prompt
export type ArtifactType = 'webapp' | 'html' | 'react' | 'code' | 'script' | 'notes' | 'prompt' | 'config' | 'story'

interface ArtifactPanelProps {
  artifact: {
    type: ArtifactType | string
    language?: string
    title: string
    content: string
  } | null
  onClose: () => void
}

// ── File extension for download ───────────────────────────────────────────
function getFileExtension(type: string, language?: string): string {
  const lang = language?.toLowerCase() || ''

  // Language-specific extensions
  const langMap: Record<string, string> = {
    python: 'py', typescript: 'ts', javascript: 'js', tsx: 'tsx', jsx: 'jsx',
    java: 'java', cpp: 'cpp', c: 'c', rust: 'rs', go: 'go', php: 'php',
    ruby: 'rb', swift: 'swift', kotlin: 'kt', bash: 'sh', shell: 'sh',
    powershell: 'ps1', yaml: 'yaml', yml: 'yml', toml: 'toml', css: 'css',
    scss: 'scss', sql: 'sql', graphql: 'graphql', json: 'json', xml: 'xml',
    markdown: 'md', md: 'md', env: 'env',
  }

  if (lang && langMap[lang]) return langMap[lang]

  // Type-based fallback
  const typeMap: Record<string, string> = {
    webapp: 'html',
    html: 'html',
    react: 'jsx',
    code: lang ? (langMap[lang] || 'txt') : 'txt',
    script: 'sh',
    notes: 'md',
    prompt: 'txt',
    config: lang === 'json' ? 'json' : lang === 'yaml' || lang === 'yml' ? 'yaml' : lang === 'env' ? 'env' : 'json',
    story: 'md',
  }

  return typeMap[type] || 'txt'
}

// ── MIME type for download ─────────────────────────────────────────────────
function getMimeType(ext: string): string {
  const mimeMap: Record<string, string> = {
    html: 'text/html',
    css: 'text/css',
    js: 'application/javascript',
    ts: 'application/typescript',
    jsx: 'text/jsx',
    tsx: 'text/tsx',
    py: 'text/x-python',
    json: 'application/json',
    yaml: 'text/yaml',
    yml: 'text/yaml',
    sh: 'text/x-shellscript',
    md: 'text/markdown',
  }
  return mimeMap[ext] || 'text/plain'
}

// ── Which types can be live-previewed ─────────────────────────────────────
function isPreviewable(type: string): boolean {
  return type === 'webapp' || type === 'html' || type === 'react'
}

// ── Which types are text/prose (not code) ─────────────────────────────────
function isTextType(type: string): boolean {
  return type === 'notes' || type === 'story' || type === 'prompt'
}

// ── Icon per artifact type ─────────────────────────────────────────────────
function ArtifactIcon({ type, className = 'h-4 w-4' }: { type: string; className?: string }) {
  const iconClass = `${className}`
  switch (type) {
    case 'webapp':
    case 'html':    return <Eye className={iconClass} />
    case 'react':   return <Code2 className={iconClass} />
    case 'script':  return <Terminal className={iconClass} />
    case 'notes':   return <BookOpen className={iconClass} />
    case 'prompt':  return <Lightbulb className={iconClass} />
    case 'config':  return <Settings2 className={iconClass} />
    case 'story':   return <Scroll className={iconClass} />
    default:        return <FileText className={iconClass} />
  }
}

// ── Badge color per type ──────────────────────────────────────────────────
function getBadgeColor(type: string, language?: string): string {
  const colors: Record<string, string> = {
    webapp:  'bg-orange-500/20 text-orange-300',
    html:    'bg-orange-500/20 text-orange-300',
    react:   'bg-sky-500/20 text-sky-300',
    code:    'bg-violet-500/20 text-violet-300',
    script:  'bg-green-500/20 text-green-300',
    notes:   'bg-amber-500/20 text-amber-300',
    prompt:  'bg-pink-500/20 text-pink-300',
    config:  'bg-gray-400/20 text-gray-300',
    story:   'bg-rose-500/20 text-rose-300',
  }

  // Language-specific overrides for code type
  if (type === 'code') {
    const langColors: Record<string, string> = {
      javascript: 'bg-yellow-500/20 text-yellow-300',
      typescript: 'bg-blue-600/20 text-blue-300',
      python:     'bg-blue-500/20 text-blue-300',
      rust:       'bg-orange-600/20 text-orange-300',
    }
    if (language && langColors[language.toLowerCase()]) return langColors[language.toLowerCase()]
  }

  return colors[type] ?? colors.code
}

// ── Generate React preview wrapper ────────────────────────────────────────
function wrapReactForPreview(code: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
  <style>
    body { margin: 0; padding: 16px; font-family: system-ui, sans-serif; background: #fff; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    const { useState, useEffect, useRef, useCallback, useMemo } = React;
    ${code}
    const rootEl = document.getElementById('root');
    if (ReactDOM.createRoot) ReactDOM.createRoot(rootEl).render(<App />);
    else ReactDOM.render(<App />, rootEl);
  </script>
</body>
</html>`
}

export default function ArtifactPanel({ artifact, onClose }: ArtifactPanelProps) {
  const [tab, setTab]       = useState<'preview' | 'code'>('preview')
  const [copied, setCopied] = useState(false)
  const [iframeKey, setIframeKey] = useState(0)

  const handleCopy = () => {
    navigator.clipboard.writeText(artifact?.content || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    if (!artifact) return
    const ext      = getFileExtension(artifact.type, artifact.language)
    const mimeType = getMimeType(ext)
    const blob     = new Blob([artifact.content], { type: mimeType })
    const url      = URL.createObjectURL(blob)
    const a        = document.createElement('a')
    a.href         = url
    a.download     = `${artifact.title.replace(/[^a-z0-9\-_. ]/gi, '_')}.${ext}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const getPreviewHTML = (): string => {
    if (!artifact) return ''
    if (artifact.type === 'webapp' || artifact.type === 'html') return artifact.content
    if (artifact.type === 'react') return wrapReactForPreview(artifact.content)
    return ''
  }

  if (!artifact) return null

  const canPreview   = isPreviewable(artifact.type)
  const isText       = isTextType(artifact.type)
  const langLabel    = artifact.language || artifact.type
  const badgeColor   = getBadgeColor(artifact.type, artifact.language)

  // Default to code tab for non-previewable types
  const effectiveTab = canPreview ? tab : 'code'

  return (
    <div className="flex h-full flex-col bg-[#0f1117] text-white">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 border-b border-white/[0.08] px-4 py-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.08]">
          <ArtifactIcon type={artifact.type} className="h-4 w-4 text-[#7B93FF]" />
        </div>
        <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-white/90">
          {artifact.title}
        </p>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${badgeColor}`}>
          {langLabel}
        </span>
        <button
          onClick={onClose}
          className="ml-1 shrink-0 rounded-lg p-1.5 text-white/40 transition hover:bg-white/[0.08] hover:text-white/80"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* ── Tabs (only for previewable types) ────────────────────────────── */}
      {canPreview && (
        <div className="flex border-b border-white/[0.08]">
          {(['preview', 'code'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-[12px] font-semibold uppercase tracking-wide transition ${
                tab === t
                  ? 'border-b-2 border-[#7B93FF] text-[#7B93FF]'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              {t === 'preview' ? '⚡ Preview' : '< > Code'}
            </button>
          ))}
        </div>
      )}

      {/* ── Text type label (notes/story/prompt) ─────────────────────────── */}
      {isText && (
        <div className="flex border-b border-white/[0.08]">
          <button
            className="flex-1 py-2 text-[12px] font-semibold uppercase tracking-wide border-b-2 border-[#7B93FF] text-[#7B93FF]"
          >
            {artifact.type === 'notes' ? '📝 Notes' : artifact.type === 'story' ? '📖 Story' : '💡 Prompt'}
          </button>
        </div>
      )}

      {/* ── Content Area ─────────────────────────────────────────────────── */}
      <div className="relative flex-1 overflow-hidden">

        {/* Preview — iframe for html/react/webapp */}
        {canPreview && effectiveTab === 'preview' && (
          <iframe
            key={iframeKey}
            srcDoc={getPreviewHTML()}
            className="h-full w-full border-0 bg-white"
            sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
            title={artifact.title}
          />
        )}

        {/* Code view — syntax highlighted */}
        {effectiveTab === 'code' && !isText && (
          <div className="h-full overflow-auto">
            <pre className="h-full p-4 text-[13px] leading-relaxed font-mono text-[#abb2bf] whitespace-pre-wrap break-words">
              <code>{artifact.content}</code>
            </pre>
          </div>
        )}

        {/* Text view — notes, story, prompt */}
        {isText && (
          <div className="h-full overflow-auto p-5">
            <div
              className="prose prose-sm prose-invert max-w-none
                prose-headings:text-white/90 prose-headings:font-semibold
                prose-p:text-white/75 prose-p:leading-relaxed
                prose-li:text-white/75 prose-strong:text-white/90
                prose-blockquote:border-[#7B93FF] prose-blockquote:text-white/60
                prose-code:text-[#7B93FF] prose-code:bg-white/[0.07] prose-code:rounded prose-code:px-1"
              style={{ whiteSpace: 'pre-wrap', color: 'rgba(255,255,255,0.78)', fontSize: '14px', lineHeight: '1.75' }}
            >
              {artifact.content}
            </div>
          </div>
        )}
      </div>

      {/* ── Footer Actions ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-t border-white/[0.08] px-4 py-3">

        {/* Refresh (only for previewable) */}
        {canPreview && tab === 'preview' && (
          <button
            onClick={() => setIframeKey(k => k + 1)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium text-white/50 transition hover:bg-white/[0.08] hover:text-white/80"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        )}

        <div className="flex-1" />

        {/* Copy button */}
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium text-white/50 transition hover:bg-white/[0.08] hover:text-white/80"
        >
          {copied
            ? <><Check className="h-3.5 w-3.5 text-green-400" /><span className="text-green-400">Copied!</span></>
            : <><Copy className="h-3.5 w-3.5" />Copy</>
          }
        </button>

        {/* Download button */}
        <button
          onClick={handleDownload}
          className="flex items-center gap-1.5 rounded-lg bg-[#7B93FF]/10 px-3 py-1.5 text-[12px] font-semibold text-[#7B93FF] transition hover:bg-[#7B93FF]/20"
        >
          <Download className="h-3.5 w-3.5" />
          Download .{getFileExtension(artifact.type, artifact.language)}
        </button>
      </div>
    </div>
  )
      }
        

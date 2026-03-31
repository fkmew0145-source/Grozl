'use client'

import { useState, useRef } from 'react'
import { X, Code2, Eye, Copy, Check } from 'lucide-react'

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
  const [tab, setTab]       = useState<'preview' | 'code'>('preview')
  const [copied, setCopied] = useState(false)
  const iframeRef           = useRef<HTMLIFrameElement>(null)

  const handleCopy = () => {
    navigator.clipboard.writeText(artifact?.content || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

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
  <style>body { margin: 0; padding: 16px; font-family: system-ui, sans-serif; }</style>
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

  return (
    <div className="flex h-full flex-col border-l border-gray-200 bg-white">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <Code2 className="h-4 w-4 shrink-0 text-indigo-500" />
          <span className="truncate text-sm font-semibold text-gray-800">{artifact.title}</span>
          <span className="shrink-0 rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-600">
            {artifact.type === 'code' ? artifact.language : artifact.type}
          </span>
        </div>
        <button onClick={onClose} className="ml-2 shrink-0 text-gray-400 hover:text-gray-600">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Tabs (only for previewable types) */}
      {canPreview && (
        <div className="flex items-center justify-between border-b border-gray-100 px-4">
          <div className="flex">
            <button onClick={() => setTab('preview')}
              className={`flex items-center gap-1.5 border-b-2 px-1 py-2.5 text-[13px] font-medium mr-4 transition-colors ${tab === 'preview' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
            >
              <Eye className="h-3.5 w-3.5" /> Preview
            </button>
            <button onClick={() => setTab('code')}
              className={`flex items-center gap-1.5 border-b-2 px-1 py-2.5 text-[13px] font-medium transition-colors ${tab === 'code' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
            >
              <Code2 className="h-3.5 w-3.5" /> Code
            </button>
          </div>
          <button onClick={handleCopy} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-gray-500 transition hover:bg-gray-100">
            {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      )}

      {/* Content */}
      <div className="relative flex-1 overflow-hidden">

        {/* Code-only type */}
        {artifact.type === 'code' && (
          <div className="absolute inset-0 overflow-auto bg-gray-950">
            <div className="sticky top-0 flex justify-end bg-gray-900/80 px-4 py-2 backdrop-blur-sm border-b border-gray-800">
              <button onClick={handleCopy} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-gray-400 transition hover:bg-gray-800 hover:text-gray-200">
                {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied!' : 'Copy Code'}
              </button>
            </div>
            <pre className="p-5 text-[13px] leading-relaxed text-gray-200"><code>{artifact.content}</code></pre>
          </div>
        )}

        {/* Preview iframe */}
        {canPreview && tab === 'preview' && (
          <iframe
            ref={iframeRef}
            srcDoc={getPreviewHTML()}
            className="h-full w-full border-0"
            sandbox="allow-scripts allow-same-origin allow-forms"
            title={artifact.title}
          />
        )}

        {/* Code view for html/react */}
        {canPreview && tab === 'code' && (
          <div className="absolute inset-0 overflow-auto bg-gray-950">
            <pre className="p-5 text-[13px] leading-relaxed text-gray-200"><code>{artifact.content}</code></pre>
          </div>
        )}
      </div>
    </div>
  )
      }
      

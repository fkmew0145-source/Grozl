'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Code2, Eye, Copy, Check, ExternalLink } from 'lucide-react'

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
  const [tab, setTab] = useState<'preview' | 'code'>('preview')
  const [copied, setCopied] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const handleCopy = () => {
    navigator.clipboard.writeText(artifact?.content || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // React code ko HTML me wrap karo preview ke liye
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
    ${artifact.content}
    ReactDOM.render(<App />, document.getElementById('root'))
  </script>
</body>
</html>`
    }
    
    return '' // code type has no preview
  }

  if (!artifact) return null

  return (
    <div className="flex h-full flex-col border-l border-gray-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <Code2 className="h-4 w-4 text-indigo-500" />
          <span className="text-sm font-semibold text-gray-800">{artifact.title}</span>
          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-600">
            {artifact.type === 'code' ? artifact.language : artifact.type}
          </span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Tabs (only for html/react) */}
      {artifact.type !== 'code' && (
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setTab('preview')}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium ${
              tab === 'preview'
                ? 'border-b-2 border-indigo-500 text-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            Preview
          </button>
          <button
            onClick={() => setTab('code')}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium ${
              tab === 'code'
                ? 'border-b-2 border-indigo-500 text-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Code2 className="h-3.5 w-3.5" />
            Code
          </button>
        </div>
      )}

      {/* Content */}
      <div className="relative flex-1 overflow-hidden">
        {/* Copy button */}
        <button
          onClick={handleCopy}
          className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-600 shadow-sm hover:bg-gray-50"
        >
          {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
          {copied ? 'Copied!' : 'Copy'}
        </button>

        {/* Preview iframe */}
        {tab === 'preview' && artifact.type !== 'code' ? (
          <iframe
            ref={iframeRef}
            srcDoc={getPreviewHTML()}
            className="h-full w-full border-0"
            sandbox="allow-scripts allow-same-origin"
            title={artifact.title}
          />
        ) : (
          /* Code view */
          <div className="h-full overflow-auto bg-gray-950 p-4">
            <pre className="text-sm leading-relaxed text-gray-200">
              <code>{artifact.content}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  )
  }

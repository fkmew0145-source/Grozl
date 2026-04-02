'use client'

import { useState, useRef } from 'react'
import ReactMarkdown from 'react-markdown'

type FileType = 'image' | 'pdf' | 'audio' | 'video' | 'unknown'

interface CanvasFile {
  name: string
  type: FileType
  base64: string
  mimeType: string
  sizeKb: number
}

function getFileType(mimeType: string): FileType {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType === 'application/pdf') return 'pdf'
  if (mimeType.startsWith('audio/')) return 'audio'
  if (mimeType.startsWith('video/')) return 'video'
  return 'unknown'
}

const TYPE_EMOJI: Record<FileType, string> = {
  image: '🖼️', pdf: '📄', audio: '🎵', video: '🎬', unknown: '📎',
}

const ACCEPTED = 'image/*,application/pdf,audio/*,video/*,.txt,.csv,.json'

export default function UnifiedCanvas() {
  const [file,      setFile]      = useState<CanvasFile | null>(null)
  const [prompt,    setPrompt]    = useState('')
  const [answer,    setAnswer]    = useState('')
  const [loading,   setLoading]   = useState(false)
  const [dragOver,  setDragOver]  = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function readFile(f: File): Promise<CanvasFile> {
    return new Promise((resolve, reject) => {
      if (f.size > 20 * 1024 * 1024) { reject(new Error('File too large (max 20MB)')); return }
      const reader = new FileReader()
      reader.onload = e => {
        const result = e.target?.result as string
        const base64 = result.split(',')[1]
        resolve({
          name:     f.name,
          type:     getFileType(f.type),
          base64,
          mimeType: f.type,
          sizeKb:   Math.round(f.size / 1024),
        })
      }
      reader.onerror = () => reject(new Error('File read failed'))
      reader.readAsDataURL(f)
    })
  }

  async function handleFileDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) await loadFile(dropped)
  }

  async function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0]
    if (picked) await loadFile(picked)
  }

  async function loadFile(f: File) {
    try {
      const canvasFile = await readFile(f)
      setFile(canvasFile)
      setAnswer('')
    } catch (err) {
      alert(String(err))
    }
  }

  async function handleAnalyze() {
    if (!file || !prompt.trim() || loading) return
    setLoading(true)
    setAnswer('')

    try {
      const res = await fetch('/api/chat/canvas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          file: { base64: file.base64, mimeType: file.mimeType, name: file.name },
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        setAnswer(`❌ Error: ${err.error}`)
        return
      }

      // Stream the response
      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let fullText = ''
      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          fullText += decoder.decode(value, { stream: true })
          setAnswer(fullText)
        }
      }
    } catch (err) {
      setAnswer(`❌ Failed: ${String(err)}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'var(--background)', color: 'var(--foreground)',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ fontSize: 20 }}>🎨</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Unified Canvas</div>
          <div style={{ fontSize: 12, opacity: 0.5 }}>Image · PDF · Audio · Video — Gemini se analyze karo</div>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Drop zone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleFileDrop}
          style={{
            border: `2px dashed ${dragOver ? '#6366f1' : 'var(--border)'}`,
            borderRadius: 16, padding: '24px 20px', textAlign: 'center',
            cursor: 'pointer', transition: 'all 0.15s',
            background: dragOver ? 'rgba(99,102,241,0.05)' : 'var(--card)',
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED}
            onChange={handleFileInput}
            style={{ display: 'none' }}
          />
          {file ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 32 }}>{TYPE_EMOJI[file.type]}</span>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{file.name}</div>
              <div style={{ fontSize: 12, opacity: 0.5 }}>{file.sizeKb} KB • {file.mimeType}</div>
              <button
                onClick={e => { e.stopPropagation(); setFile(null); setAnswer('') }}
                style={{
                  padding: '3px 10px', borderRadius: 8, fontSize: 11,
                  border: '1px solid var(--border)', background: 'transparent',
                  cursor: 'pointer', marginTop: 4, color: '#ef4444',
                }}
              >
                ✕ Remove
              </button>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📁</div>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                File yahan drop karo ya click karo
              </div>
              <div style={{ fontSize: 12, opacity: 0.5 }}>
                Image, PDF, Audio, Video — max 20MB
              </div>
            </div>
          )}
        </div>

        {/* Preview for images */}
        {file?.type === 'image' && (
          <img
            src={`data:${file.mimeType};base64,${file.base64}`}
            alt="preview"
            style={{
              maxHeight: 200, borderRadius: 12, objectFit: 'contain',
              border: '1px solid var(--border)',
            }}
          />
        )}

        {/* Prompt area */}
        <div style={{ display: 'flex', gap: 8 }}>
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            disabled={!file}
            placeholder={file ? 'Is file ke baare mein kuch bhi pucho...' : 'Pehle file upload karo ⬆️'}
            rows={3}
            style={{
              flex: 1, resize: 'none', padding: '10px 12px',
              borderRadius: 12, border: '1px solid var(--border)',
              background: 'var(--input)', color: 'var(--foreground)',
              fontSize: 14, fontFamily: 'inherit', outline: 'none',
              opacity: !file ? 0.5 : 1,
            }}
          />
          <button
            onClick={handleAnalyze}
            disabled={!file || !prompt.trim() || loading}
            style={{
              padding: '10px 16px', borderRadius: 12, fontWeight: 700, fontSize: 14,
              background: (!file || !prompt.trim() || loading) ? 'var(--muted)' : '#6366f1',
              color: (!file || !prompt.trim() || loading) ? 'var(--muted-foreground)' : 'white',
              border: 'none', cursor: (!file || !prompt.trim() || loading) ? 'not-allowed' : 'pointer',
              alignSelf: 'flex-end',
            }}
          >
            {loading ? '⏳' : '🔍 Analyze'}
          </button>
        </div>

        {/* Quick prompts */}
        {file && !answer && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(file.type === 'image'
              ? ['Is image mein kya hai?', 'Text extract karo', 'Koi issue hai?']
              : file.type === 'pdf'
              ? ['Summarize karo', 'Key points nikalo', 'Questions banao']
              : ['Transcribe karo', 'Summary do', 'Kya bol raha hai?']
            ).map(q => (
              <button
                key={q}
                onClick={() => setPrompt(q)}
                style={{
                  padding: '5px 12px', borderRadius: 20, fontSize: 12,
                  border: '1px solid var(--border)', background: 'transparent',
                  cursor: 'pointer', color: 'var(--foreground)',
                }}
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Answer */}
        {answer && (
          <div style={{
            borderRadius: 12, padding: '14px 16px',
            background: 'var(--card)', border: '1px solid var(--border)',
            fontSize: 13.5, lineHeight: 1.65,
          }}>
            <div style={{
              fontSize: 11, opacity: 0.5, marginBottom: 8, fontWeight: 600,
              display: 'flex', justifyContent: 'space-between',
            }}>
              <span>🤖 Gemini 1.5 Pro</span>
              <button
                onClick={() => navigator.clipboard.writeText(answer)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.6, fontSize: 11 }}
              >
                📋 Copy
              </button>
            </div>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{answer}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  )
        }
                

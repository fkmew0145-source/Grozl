'use client'

import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'

// ── Types ─────────────────────────────────────────────────────────────────
interface BattleResult {
  modelId: string
  text: string
  latencyMs: number
  error: string | null
}

const MODEL_META: Record<string, { label: string; provider: string; color: string; bg: string }> = {
  groq:     { label: 'Llama 3.3',  provider: 'Groq',    color: '#10b981', bg: 'rgba(16,185,129,0.08)' },
  gemini:   { label: 'Gemini 1.5', provider: 'Google',  color: '#3b82f6', bg: 'rgba(59,130,246,0.08)' },
  deepseek: { label: 'DeepSeek',   provider: 'DeepSeek',color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)' },
}

const ALL_MODELS = ['groq', 'gemini', 'deepseek']

// ── Main Component ────────────────────────────────────────────────────────
export default function BattleMode() {
  const [prompt,    setPrompt]    = useState('')
  const [results,   setResults]   = useState<BattleResult[]>([])
  const [loading,   setLoading]   = useState(false)
  const [selected,  setSelected]  = useState<string[]>(['groq', 'gemini', 'deepseek'])
  const [voted,     setVoted]     = useState<string | null>(null)
  const [history,   setHistory]   = useState<{ role: string; content: string }[]>([])

  function toggleModel(id: string) {
    setSelected(prev =>
      prev.includes(id) ? (prev.length > 2 ? prev.filter(m => m !== id) : prev) : [...prev, id]
    )
  }

  async function handleSend() {
    if (!prompt.trim() || loading) return
    const newHistory = [...history, { role: 'user', content: prompt }]
    setHistory(newHistory)
    setPrompt('')
    setResults([])
    setVoted(null)
    setLoading(true)

    try {
      const res = await fetch('/api/chat/battle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newHistory, models: selected }),
      })
      const data = await res.json()
      if (data.results) {
        setResults(data.results)
        // Add assistant responses to history (use best/first model)
        const bestResult = data.results.find((r: BattleResult) => !r.error && r.text)
        if (bestResult) {
          setHistory(h => [...h, { role: 'assistant', content: bestResult.text }])
        }
      }
    } catch {
      setResults(selected.map(modelId => ({
        modelId, text: '', latencyMs: 0, error: 'Network error'
      })))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'var(--background)', color: 'var(--foreground)',
      fontFamily: 'inherit',
    }}>
      {/* ── Header ── */}
      <div style={{
        padding: '12px 16px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span style={{ fontSize: 20 }}>⚔️</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Battle Mode</div>
          <div style={{ fontSize: 12, opacity: 0.5 }}>Ek saath 3 models compare karo</div>
        </div>
        {/* Model toggles */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {ALL_MODELS.map(id => {
            const meta = MODEL_META[id]
            const active = selected.includes(id)
            return (
              <button
                key={id}
                onClick={() => toggleModel(id)}
                style={{
                  padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                  border: `1.5px solid ${active ? meta.color : 'var(--border)'}`,
                  background: active ? meta.bg : 'transparent',
                  color: active ? meta.color : 'var(--muted-foreground)',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {meta.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Results Grid ── */}
      <div style={{
        flex: 1, overflow: 'hidden',
        display: 'grid',
        gridTemplateColumns: `repeat(${selected.length}, 1fr)`,
        gap: 1, background: 'var(--border)',
        minHeight: 0,
      }}>
        {selected.map(modelId => {
          const meta = MODEL_META[modelId]
          const result = results.find(r => r.modelId === modelId)
          const isWinner = voted === modelId

          return (
            <div
              key={modelId}
              style={{
                background: 'var(--background)',
                display: 'flex', flexDirection: 'column', overflow: 'hidden',
              }}
            >
              {/* Model header */}
              <div style={{
                padding: '8px 14px',
                borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', gap: 8,
                background: meta.bg,
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: meta.color }} />
                <span style={{ fontWeight: 700, fontSize: 13, color: meta.color }}>{meta.label}</span>
                <span style={{ fontSize: 11, opacity: 0.5, marginLeft: 2 }}>{meta.provider}</span>
                {result?.latencyMs ? (
                  <span style={{
                    marginLeft: 'auto', fontSize: 11, opacity: 0.5,
                    fontFamily: 'monospace',
                  }}>
                    {result.latencyMs}ms
                  </span>
                ) : null}
                {results.length > 0 && !voted && (
                  <button
                    onClick={() => setVoted(modelId)}
                    style={{
                      marginLeft: voted ? 'auto' : 4,
                      padding: '2px 8px', borderRadius: 12, fontSize: 10,
                      border: '1px solid var(--border)',
                      background: 'transparent', cursor: 'pointer',
                      color: 'var(--foreground)',
                    }}
                  >
                    👍 Vote
                  </button>
                )}
                {isWinner && (
                  <span style={{
                    marginLeft: 'auto',
                    fontSize: 11, fontWeight: 700, color: meta.color,
                  }}>
                    🏆 Winner
                  </span>
                )}
              </div>

              {/* Response content */}
              <div style={{
                flex: 1, overflow: 'auto', padding: '14px 16px',
                fontSize: 13.5, lineHeight: 1.65,
              }}>
                {loading && !result ? (
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center', opacity: 0.5 }}>
                    <span style={{ animation: 'pulse 1s infinite' }}>●</span>
                    <span style={{ animation: 'pulse 1s infinite 0.2s' }}>●</span>
                    <span style={{ animation: 'pulse 1s infinite 0.4s' }}>●</span>
                    <style>{`@keyframes pulse { 0%,100%{opacity:0.3} 50%{opacity:1} }`}</style>
                  </div>
                ) : result?.error ? (
                  <div style={{ color: '#ef4444', fontSize: 12 }}>
                    ⚠️ {result.error}
                  </div>
                ) : result?.text ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{result.text}</ReactMarkdown>
                  </div>
                ) : (
                  <div style={{ opacity: 0.3, fontSize: 12 }}>
                    Response yahan aayega...
                  </div>
                )}
              </div>

              {/* Copy button */}
              {result?.text && (
                <div style={{ padding: '6px 12px', borderTop: '1px solid var(--border)' }}>
                  <button
                    onClick={() => navigator.clipboard.writeText(result.text)}
                    style={{
                      padding: '3px 10px', borderRadius: 8, fontSize: 11,
                      border: '1px solid var(--border)', background: 'transparent',
                      cursor: 'pointer', color: 'var(--muted-foreground)',
                    }}
                  >
                    📋 Copy
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Input Bar ── */}
      <div style={{
        padding: '10px 12px', borderTop: '1px solid var(--border)',
        display: 'flex', gap: 8, alignItems: 'flex-end',
      }}>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          placeholder="Kuch bhi pucho... teeno models ek saath jawab denge ⚔️"
          rows={2}
          style={{
            flex: 1, resize: 'none', padding: '10px 12px',
            borderRadius: 12, border: '1px solid var(--border)',
            background: 'var(--input)', color: 'var(--foreground)',
            fontSize: 14, lineHeight: 1.5, outline: 'none',
            fontFamily: 'inherit',
          }}
        />
        <button
          onClick={handleSend}
          disabled={!prompt.trim() || loading}
          style={{
            padding: '10px 18px', borderRadius: 12, fontWeight: 700, fontSize: 14,
            background: loading || !prompt.trim() ? 'var(--muted)' : '#6366f1',
            color: loading || !prompt.trim() ? 'var(--muted-foreground)' : 'white',
            border: 'none', cursor: loading || !prompt.trim() ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s', whiteSpace: 'nowrap',
          }}
        >
          {loading ? '⏳' : '⚔️ Fight'}
        </button>
      </div>

      {voted && (
        <div style={{
          padding: '6px 16px', background: MODEL_META[voted].bg, fontSize: 12,
          borderTop: '1px solid var(--border)', textAlign: 'center',
          color: MODEL_META[voted].color, fontWeight: 600,
        }}>
          🏆 Tumne {MODEL_META[voted].label} ko winner choose kiya!
          <button
            onClick={() => setVoted(null)}
            style={{ marginLeft: 8, opacity: 0.6, background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 11 }}
          >
            Change
          </button>
        </div>
      )}
    </div>
  )
      }
                  

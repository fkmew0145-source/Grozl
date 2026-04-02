import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'

const groq  = new Groq({ apiKey: process.env.GROQ_API_KEY })
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

// ── Model configs shown in Battle UI ─────────────────────────────────────
export const BATTLE_MODELS = [
  { id: 'groq',      label: 'Llama 3.3',  provider: 'Groq',    color: '#10b981' },
  { id: 'gemini',    label: 'Gemini',      provider: 'Google',  color: '#3b82f6' },
  { id: 'deepseek',  label: 'DeepSeek',    provider: 'DeepSeek',color: '#8b5cf6' },
]

const SYSTEM_PROMPT = `You are Grozl — a coding-first AI assistant. Be concise, direct, and helpful.`

// ── Individual model callers (non-streaming for Battle Mode) ──────────────

async function callGroqBattle(messages: { role: string; content: string }[]): Promise<string> {
  const res = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages] as Parameters<typeof groq.chat.completions.create>[0]['messages'],
    max_tokens: 1024,
    temperature: 0.7,
    stream: false,
  })
  return res.choices[0]?.message?.content || '(No response)'
}

async function callGeminiBattle(messages: { role: string; content: string }[]): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
  const history = messages.slice(0, -1).map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))
  const lastMsg = messages[messages.length - 1]?.content || ''
  const chat = model.startChat({ history, systemInstruction: SYSTEM_PROMPT })
  const result = await chat.sendMessage(lastMsg)
  return result.response.text()
}

async function callDeepSeekBattle(messages: { role: string; content: string }[]): Promise<string> {
  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
      max_tokens: 1024,
      stream: false,
    }),
  })
  const data = await res.json()
  return data.choices?.[0]?.message?.content || '(No response)'
}

// ── POST handler ──────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { messages, models = ['groq', 'gemini', 'deepseek'] }: {
      messages: { role: string; content: string }[]
      models?: string[]
    } = await req.json()

    if (!messages?.length) {
      return NextResponse.json({ error: 'No messages provided' }, { status: 400 })
    }

    // Fire all selected models in PARALLEL — key to Battle Mode speed
    const calls = models.map(async (modelId) => {
      const start = Date.now()
      try {
        let text = ''
        if (modelId === 'groq')     text = await callGroqBattle(messages)
        if (modelId === 'gemini')   text = await callGeminiBattle(messages)
        if (modelId === 'deepseek') text = await callDeepSeekBattle(messages)
        return { modelId, text, latencyMs: Date.now() - start, error: null }
      } catch (err) {
        return { modelId, text: '', latencyMs: Date.now() - start, error: String(err) }
      }
    })

    const results = await Promise.all(calls)
    return NextResponse.json({ results })
  } catch (err) {
    return NextResponse.json({ error: `Battle failed: ${err}` }, { status: 500 })
  }
                                 }
          

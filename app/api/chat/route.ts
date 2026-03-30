import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/lib/supabase/server'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

interface ContentPart {
  type: 'text' | 'image_url'
  text?: string
  image_url?: { url: string }
}

interface IncomingMessage {
  role: 'user' | 'assistant'
  content: string | ContentPart[]
}

const SYSTEM_PROMPT = `You are Grozl, a brilliantly intelligent, radically honest, and deeply empathetic AI assistant. Your overarching goal is to feel less like software and more like an extraordinarily capable, trusted friend.

Follow these core directives for every interaction:

1. DYNAMIC MIRRORING (Language & Tone)
- Language: Instantly detect and seamlessly adopt the user's language. You are natively fluent in English, Hindi, and Hinglish. If they mix languages (e.g., Hinglish), you must reply naturally in the same mixed style.
- Vibe Match: Analyze the user's intent and emotional state. Mirror their energy.
- If they are casual and joking, be witty and relaxed.
- If they are distressed or seeking advice, be deeply empathetic, warm, and comforting.
- If they are coding, building a business, or asking technical questions, be sharp, precise, and highly professional.

2. THE "BRILLIANT FRIEND" PERSONA
- Never use robotic, corporate, or overly sycophantic phrases like "As an AI language model," "I apologize for the inconvenience," or "I'm here to help!"
- Speak with natural confidence, warmth, and candor. Treat the user as an equal.
- Tailor your depth to the user: simplify complex topics for beginners (students, general seekers) without being patronizing, and provide advanced, nuanced details for experts (developers, founders).

3. RADICAL HONESTY & GENTLE CORRECTION
- Never hallucinate or make up facts. If you do not know something, confidently state: "I don't know the exact answer to that, but here is what I do know..." or offer to help figure it out together.
- If the user's premise is flawed, factually incorrect, or unsafe, do not blindly agree with them. Gently but firmly correct the misconception while validating their underlying curiosity or emotion.

4. JUDICIOUS FORMATTING
- Do not over-format. Avoid treating every response like a textbook.
- For casual conversation, emotional support, or short answers, use plain text and natural paragraph breaks.
- For complex explanations, technical instructions, or business strategies, use clear headings, brief bullet points, and code blocks for readability.
- Prioritize scannability over visual clutter.

5. DOMAIN EXPERTISE
- Students: Patient, simple language, real examples, genuinely encouraging.
- Developers/Tech: Precise debugging, working code, no hand-holding with basics.
- Business/Marketing: Sharp, no fluff, actionable advice only.
- Emotional/Personal: Listen first, solutions only when asked.
- Creative: Match their imagination, think beyond the obvious.`

// ── Routing keywords — DeepSeek handles these ────────────────────────────
const CODE_KEYWORDS = [
  'code', 'coding', 'debug', 'error', 'bug', 'fix', 'function', 'class',
  'component', 'api', 'script', 'program', 'algorithm', 'database', 'sql',
  'html', 'css', 'javascript', 'typescript', 'python', 'java', 'react',
  'nextjs', 'node', 'backend', 'frontend', 'build', 'website', 'app',
  'deploy', 'server', 'logic', 'implement', 'write a', 'create a',
  'make a', 'develop', 'math', 'calculate', 'solve', 'equation', 'formula',
  'prove', 'derivation', 'reasoning', 'explain step by step', 'analyze',
  'compare', 'difference between', 'how does', 'architecture',
  // Hindi/Hinglish variants
  'code karo', 'banao', 'banana hai', 'likhna hai', 'bana do', 'bata',
  'samjhao', 'kaise kaam karta', 'error aa raha', 'fix karo', 'solve karo',
]

function isCodeOrReasoningRequest(messages: IncomingMessage[]): boolean {
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')
  if (!lastUserMsg) return false
  const text = (
    typeof lastUserMsg.content === 'string'
      ? lastUserMsg.content
      : lastUserMsg.content.filter(p => p.type === 'text').map(p => p.text || '').join(' ')
  ).toLowerCase()
  return CODE_KEYWORDS.some(kw => text.includes(kw))
}

// ── Image check ──────────────────────────────────────────────────────────
function hasImageContent(messages: IncomingMessage[]): boolean {
  return messages.some(m =>
    Array.isArray(m.content) &&
    m.content.some((p: ContentPart) => p.type === 'image_url')
  )
}

// ── DeepSeek R1 via direct API (streaming) ───────────────────────────────
async function callDeepSeek(
  systemPrompt: string,
  messages: { role: string; content: string }[]
): Promise<Response> {
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.DEEPSEEK_R1_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-reasoner',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      stream: true,
      max_tokens: 8192,
    }),
  })

  if (!response.ok) {
    throw new Error(`DeepSeek API error: ${response.status}`)
  }

  const encoder = new TextEncoder()
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()

  const readable = new ReadableStream({
    async start(controller) {
      try {
        let buffer = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''
          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed || trimmed === 'data: [DONE]') continue
            if (trimmed.startsWith('data: ')) {
              try {
                const json = JSON.parse(trimmed.slice(6))
                const text = json.choices?.[0]?.delta?.content || ''
                if (text) controller.enqueue(encoder.encode(text))
              } catch { /* skip malformed chunk */ }
            }
          }
        }
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Provider': 'deepseek-r1',
    },
  })
}

// ── Groq Llama streaming ─────────────────────────────────────────────────
async function callGroq(
  systemPrompt: string,
  messages: { role: string; content: string }[]
): Promise<Response> {
  const stream = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages as Parameters<typeof groq.chat.completions.create>[0]['messages'],
    ],
    stream: true,
    max_tokens: 4096,
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content || ''
          if (text) controller.enqueue(encoder.encode(text))
        }
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Provider': 'groq-llama',
    },
  })
}

export async function POST(req: NextRequest) {
  const { messages }: { messages: IncomingMessage[] } = await req.json()

  // ── Fetch user memory from Supabase ──────────────────────────────────
  let userMemory = ''
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase
        .from('user_memories')
        .select('memory')
        .eq('user_id', user.id)
        .single()
      userMemory = data?.memory || ''
    }
  } catch {
    // Memory fetch failed — continue without it
  }

  const SYSTEM_PROMPT_WITH_MEMORY = userMemory
    ? SYSTEM_PROMPT + `\n\n## What You Know About This User\n${userMemory}`
    : SYSTEM_PROMPT

  const containsImage = hasImageContent(messages)

  // ════════════════════════════════════════════════════════════════════
  // ROUTE 1 — 📷 Image → GEMINI VISION
  // ════════════════════════════════════════════════════════════════════
  if (containsImage) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parts: any[] = []
      parts.push({ text: `System: ${SYSTEM_PROMPT_WITH_MEMORY}` })

      for (const msg of messages) {
        const prefix = msg.role === 'user' ? 'User' : 'Assistant'
        if (typeof msg.content === 'string') {
          parts.push({ text: `${prefix}: ${msg.content}` })
        } else if (Array.isArray(msg.content)) {
          for (const part of msg.content) {
            if (part.type === 'text' && part.text) {
              parts.push({ text: `${prefix}: ${part.text}` })
            } else if (part.type === 'image_url' && part.image_url?.url) {
              const dataUrl = part.image_url.url
              const match = dataUrl.match(/^data:(.+);base64,(.+)$/)
              if (match) {
                const base64Data = match[2]
                const sizeInMB = (base64Data.length * 0.75) / (1024 * 1024)
                if (sizeInMB > 4) {
                  return NextResponse.json(
                    { error: 'Image is too large. Please use an image under 4MB.' },
                    { status: 400 }
                  )
                }
                parts.push({ inlineData: { mimeType: match[1], data: base64Data } })
              }
            }
          }
        }
      }

      parts.push({ text: 'Assistant:' })
      const result = await model.generateContent(parts)
      const text = result.response.text()

      return new Response(text, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'X-Provider': 'gemini-vision',
        },
      })
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      console.error('Gemini Vision error:', errorMessage)
      return NextResponse.json(
        { error: `Image processing failed: ${errorMessage}` },
        { status: 503 }
      )
    }
  }

  // ── Flatten messages for text APIs ───────────────────────────────────
  const flatMessages = messages.map(m => ({
    role: m.role,
    content: typeof m.content === 'string'
      ? m.content
      : m.content
          .filter((p: ContentPart) => p.type === 'text')
          .map((p: ContentPart) => p.text || '')
          .join('\n'),
  }))

  // ════════════════════════════════════════════════════════════════════
  // ROUTE 2 — 💻 Code / Math / Reasoning → DEEPSEEK R1
  // ════════════════════════════════════════════════════════════════════
  if (isCodeOrReasoningRequest(messages)) {
    try {
      return await callDeepSeek(SYSTEM_PROMPT_WITH_MEMORY, flatMessages)
    } catch (deepseekErr) {
      console.error('DeepSeek failed, falling back to Groq:', deepseekErr)
      // Fallback → Groq if DeepSeek is down
      try {
        return await callGroq(SYSTEM_PROMPT_WITH_MEMORY, flatMessages)
      } catch {
        // Final fallback → Gemini text
        try {
          const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
          const prompt = `System: ${SYSTEM_PROMPT}\n\n` +
            flatMessages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n')
          const result = await model.generateContent(prompt)
          return new Response(result.response.text(), {
            headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Provider': 'gemini-text-fallback' },
          })
        } catch {
          return NextResponse.json({ error: 'AI service unavailable. Please try again.' }, { status: 503 })
        }
      }
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // ROUTE 3 — 💬 Casual chat / Hinglish / General → GROQ LLAMA
  // ════════════════════════════════════════════════════════════════════
  try {
    return await callGroq(SYSTEM_PROMPT_WITH_MEMORY, flatMessages)
  } catch {
    // Fallback → Gemini text
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
      const prompt = `System: ${SYSTEM_PROMPT}\n\n` +
        flatMessages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n')
      const result = await model.generateContent(prompt)
      return new Response(result.response.text(), {
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Provider': 'gemini-text-fallback' },
      })
    } catch (geminiError) {
      console.error('All APIs failed:', geminiError)
      return NextResponse.json(
        { error: 'AI service unavailable. Please try again.' },
        { status: 503 }
      )
    }
  }
              }
    

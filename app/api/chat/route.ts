import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'

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

// Check if any message contains an image
function hasImageContent(messages: IncomingMessage[]): boolean {
  return messages.some(m =>
    Array.isArray(m.content) &&
    m.content.some((p: ContentPart) => p.type === 'image_url')
  )
}

export async function POST(req: NextRequest) {
  const { messages }: { messages: IncomingMessage[] } = await req.json()

  const containsImage = hasImageContent(messages)

  // ── If images present → Gemini Vision (non-streaming) ────────────────
  if (containsImage) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parts: any[] = []

      // System prompt at the beginning
      parts.push({ text: `System: ${SYSTEM_PROMPT}` })

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
                parts.push({
                  inlineData: {
                    mimeType: match[1],
                    data: match[2],
                  },
                })
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
    } catch (err) {
      console.error('Gemini Vision error:', err)
      return NextResponse.json(
        { error: 'Could not process image. Please try again.' },
        { status: 503 }
      )
    }
  }

  // ── Text-only → Groq (streaming) ─────────────────────────────────────
  const groqMessages = messages.map(m => ({
    role: m.role,
    content: typeof m.content === 'string'
      ? m.content
      : m.content
          .filter((p: ContentPart) => p.type === 'text')
          .map((p: ContentPart) => p.text || '')
          .join('\n'),
  }))

  try {
    const stream = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...groqMessages,
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
        'X-Provider': 'groq',
      },
    })
  } catch {
    // ── Groq failed → Gemini text fallback ───────────────────────────
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

      const prompt = `System: ${SYSTEM_PROMPT}\n\n` + groqMessages
        .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n')

      const result = await model.generateContent(prompt)
      const text = result.response.text()

      return new Response(text, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'X-Provider': 'gemini',
        },
      })
    } catch (geminiError) {
      console.error('Both APIs failed:', geminiError)
      return NextResponse.json(
        { error: 'AI service unavailable. Please try again.' },
        { status: 503 }
      )
    }
  }
        }
  

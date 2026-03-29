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
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

      // Build Gemini parts from all messages
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parts: any[] = []

      for (const msg of messages) {
        const prefix = msg.role === 'user' ? 'User' : 'Assistant'

        if (typeof msg.content === 'string') {
          parts.push({ text: `${prefix}: ${msg.content}` })
        } else if (Array.isArray(msg.content)) {
          for (const part of msg.content) {
            if (part.type === 'text' && part.text) {
              parts.push({ text: `${prefix}: ${part.text}` })
            } else if (part.type === 'image_url' && part.image_url?.url) {
              // Extract base64 data from data URL (e.g. "data:image/jpeg;base64,/9j/...")
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
  // Normalize content to plain strings for Groq
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
      messages: groqMessages,
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

      const prompt = groqMessages
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
                     

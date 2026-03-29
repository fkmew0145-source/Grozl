import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(req: NextRequest) {
  const { messages } = await req.json()

  // --- Groq (primary) with streaming ---
  try {
    const stream = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
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
    // --- Gemini fallback (non-streaming) ---
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

      // Convert OpenAI-style messages to a single prompt for Gemini
      const prompt = messages
        .map((m: { role: string; content: string }) =>
          m.role === 'user' ? `User: ${m.content}` : `Assistant: ${m.content}`
        )
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

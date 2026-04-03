import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

const CANVAS_SYSTEM = `You are Grozl Canvas — a multimodal AI assistant powered by Gemini 1.5 Pro.
Analyze files (images, PDFs, audio, video) with extreme detail and accuracy.
Respond in the same language as the user's prompt. Be thorough, structured, and helpful.`

export async function POST(req: NextRequest) {
  try {
    const { prompt, file }: {
      prompt: string
      file: { base64: string; mimeType: string; name: string }
    } = await req.json()

    if (!prompt || !file?.base64) {
      return NextResponse.json({ error: 'Prompt aur file dono chahiye' }, { status: 400 })
    }

    // Check file size (base64 is ~4/3 of original size)
    const approxSizeMb = (file.base64.length * 0.75) / (1024 * 1024)
    if (approxSizeMb > 15) {
      return NextResponse.json({ error: 'File too large. Please use a file under 15MB.' }, { status: 400 })
    }

    // Use Gemini 1.5 Pro for multimodal (supports PDF, audio, video natively)
    const model = genAI.getGenerativeModel({
      model:'gemini-2.0-flash',
      systemInstruction: CANVAS_SYSTEM,
    })

    const parts: Parameters<typeof model.generateContentStream>[0] extends { parts?: infer P } ? P : never[] | unknown[] = [
      {
        inlineData: {
          mimeType: file.mimeType,
          data: file.base64,
        },
      },
      { text: prompt },
    ]

    const result = await model.generateContentStream(parts as Parameters<typeof model.generateContentStream>[0])

    // Stream response back to client
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text()
            if (text) controller.enqueue(encoder.encode(text))
          }
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Provider': 'gemini-1.5-pro-canvas',
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Canvas failed: ${message}` }, { status: 503 })
  }
      }
    

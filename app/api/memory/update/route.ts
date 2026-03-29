import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { messages } = await req.json()

    // Fetch existing memory
    const { data: existing } = await supabase
      .from('user_memories')
      .select('memory')
      .eq('user_id', user.id)
      .single()

    const currentMemory = existing?.memory || ''

    // Ask Groq to extract and update memory from this conversation
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 500,
      messages: [
        {
          role: 'system',
          content: `You are a memory extraction assistant. Given a conversation and existing memory about a user, extract and update key facts about the user.

Focus on: name, profession, location, interests, ongoing projects, preferences, goals, struggles, and any personal details they've shared.

Keep it concise — max 300 words. Write in plain text, no formatting. Only include confirmed facts, not assumptions.

Existing memory:
${currentMemory || 'None yet.'}`,
        },
        {
          role: 'user',
          content: `Here is the latest conversation:\n\n${messages
            .map((m: { role: string; content: string }) => `${m.role === 'user' ? 'User' : 'Grozl'}: ${typeof m.content === 'string' ? m.content : '[image/file]'}`)
            .join('\n')}\n\nPlease update the memory with any new information learned about the user.`,
        },
      ],
    })

    const updatedMemory = completion.choices[0]?.message?.content || currentMemory

    // Upsert memory
    await supabase.from('user_memories').upsert({
      user_id: user.id,
      memory: updatedMemory,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Memory update error:', err)
    return NextResponse.json({ error: 'Failed to update memory' }, { status: 500 })
  }
      }

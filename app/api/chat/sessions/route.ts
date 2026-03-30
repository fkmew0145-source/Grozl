import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ── GET: fetch all sessions for logged-in user ───────────────────────────
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ sessions: [] })

    const { data, error } = await supabase
      .from('chat_sessions')
      .select('id, title, messages, pinned, favorite, created_at, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(50)

    if (error) throw error
    return NextResponse.json({ sessions: data || [] })
  } catch (err) {
    console.error('Sessions GET error:', err)
    return NextResponse.json({ sessions: [] })
  }
}

// ── POST: upsert a single session ────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { id, title, messages, pinned, favorite } = body

    if (!id || !messages) {
      return NextResponse.json({ error: 'Missing id or messages' }, { status: 400 })
    }

    const { error } = await supabase
      .from('chat_sessions')
      .upsert({
        id,
        user_id:    user.id,
        title:      title || 'New Chat',
        messages:   messages,
        pinned:     pinned  ?? false,
        favorite:   favorite ?? false,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' })

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Sessions POST error:', err)
    return NextResponse.json({ error: 'Failed to save session' }, { status: 500 })
  }
}

// ── DELETE: delete a single session ─────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const { error } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Sessions DELETE error:', err)
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 })
  }
                                        }

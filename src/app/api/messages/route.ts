import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/messages?conversationId=xxx
export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const conversationId = searchParams.get('conversationId')

  if (!conversationId) {
    return NextResponse.json({ error: 'conversationId required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      profiles(id, full_name, role, avatar_url),
      proofs(id, file_name, version, status)
    `)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Mark messages as read
  await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .is('read_at', null)
    .neq('sender_id', user.id)

  return NextResponse.json({ data })
}

// POST /api/messages — send a message
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { conversation_id, content, file_url, file_name } = body

  if (!conversation_id || !content?.trim()) {
    return NextResponse.json({ error: 'conversation_id and content required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id,
      sender_id: user.id,
      content: content.trim(),
      file_url: file_url || null,
      file_name: file_name || null,
    })
    .select('*, profiles(id, full_name, role, avatar_url)')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 201 })
}

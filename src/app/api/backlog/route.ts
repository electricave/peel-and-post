import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function isStudio() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, ok: false }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return { supabase, ok: profile?.role === 'studio' }
}

// GET /api/backlog?phase=1  (studio only)
export async function GET(req: NextRequest) {
  const { supabase, ok } = await isStudio()
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const phase = req.nextUrl.searchParams.get('phase')
  let query = supabase.from('phase_backlog').select('*').order('created_at', { ascending: true })
  if (phase) query = query.eq('phase', Number(phase))

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// POST /api/backlog  — add item
export async function POST(req: NextRequest) {
  const { supabase, ok } = await isStudio()
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { phase = 1, title, notes } = await req.json()
  if (!title?.trim()) return NextResponse.json({ error: 'Title required' }, { status: 400 })

  const { data, error } = await supabase
    .from('phase_backlog')
    .insert({ phase, title: title.trim(), notes: notes?.trim() || null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}

// PATCH /api/backlog  — toggle resolved
export async function PATCH(req: NextRequest) {
  const { supabase, ok } = await isStudio()
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { id, resolved } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { data, error } = await supabase
    .from('phase_backlog')
    .update({ resolved })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// DELETE /api/backlog  — remove item
export async function DELETE(req: NextRequest) {
  const { supabase, ok } = await isStudio()
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabase.from('phase_backlog').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

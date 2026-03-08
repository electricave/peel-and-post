import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { sendStatusEmail } from '@/lib/email'

// GET /api/proofs?orderId=xxx
export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orderId = new URL(request.url).searchParams.get('orderId')
  if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 })

  const { data, error } = await supabase
    .from('proofs').select('*').eq('order_id', orderId).order('version', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// PATCH /api/proofs — approve or request revision
export async function PATCH(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { proof_id, action, feedback } = body

  if (!proof_id || !action || !['approved', 'revision'].includes(action)) {
    return NextResponse.json({ error: 'proof_id and valid action required' }, { status: 400 })
  }

  // Update the proof
  const { data: proof, error: proofError } = await supabase
    .from('proofs')
    .update({
      status: action,
      feedback: feedback || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', proof_id)
    .select('order_id')
    .single()

  if (proofError) {
    return NextResponse.json({ error: proofError.message }, { status: 500 })
  }

  // Update order status
  const newOrderStatus = action === 'approved' ? 'proof_approved' : 'proof_sent'
  await supabase
    .from('orders')
    .update({ status: newOrderStatus })
    .eq('id', proof.order_id)

  // Get order details for notification
  const { data: order } = await supabase
    .from('orders')
    .select('product, customer_id')
    .eq('id', proof.order_id)
    .single()

  if (order) {
    // Notify the customer
    const notifTitle = action === 'approved'
      ? '✓ Proof approved — complete payment to start production'
      : '↩ Revision request sent'

    const notifBody = action === 'approved'
      ? `Your ${order.product} proof is approved. Complete payment to enter production.`
      : `Your revision notes have been sent to the studio.`

    await supabase
      .from('notifications')
      .insert({
        user_id: order.customer_id,
        type: action === 'approved' ? 'proof_approved' : 'order_update',
        title: notifTitle,
        body: notifBody,
        order_id: proof.order_id,
      })

    // Fetch customer profile for email
    const { data: customer } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', order.customer_id)
      .single()

    if (customer) {
      // proof_approved / revision_requested both email the studio; customer gets notified in-app
      await sendStatusEmail(
        action === 'approved' ? 'proof_approved' : 'revision_requested',
        { ...order, id: proof.order_id } as any,
        customer
      )
    }
  }

  return NextResponse.json({ success: true })
}

// DELETE /api/proofs?proof_id=xxx — studio only, deletes proof record + storage file
export async function DELETE(request: NextRequest) {
  // Auth check via user client
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'studio') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const proofId = new URL(request.url).searchParams.get('proof_id')
  if (!proofId) return NextResponse.json({ error: 'proof_id required' }, { status: 400 })

  // Use admin client to bypass RLS for the actual deletions
  const admin = createAdminClient()

  const { data: proof, error: fetchError } = await admin
    .from('proofs').select('file_url').eq('id', proofId).single()
  if (fetchError || !proof) return NextResponse.json({ error: 'Proof not found' }, { status: 404 })

  // Remove from storage
  const { error: storageError } = await admin.storage.from('proofs').remove([proof.file_url])
  if (storageError) console.error('Storage delete error:', storageError.message)

  // Delete DB record
  const { error: dbError } = await admin.from('proofs').delete().eq('id', proofId)
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

// POST /api/proofs — studio uploads a new proof, triggers proof_sent email to customer
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Studio only
  const { data: studioProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (studioProfile?.role !== 'studio') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { order_id, file_url, file_name, file_size } = body

  if (!order_id || !file_url || !file_name) {
    return NextResponse.json({ error: 'order_id, file_url, and file_name required' }, { status: 400 })
  }

  // Get next version number
  const { data: existing } = await supabase
    .from('proofs')
    .select('version')
    .eq('order_id', order_id)
    .order('version', { ascending: false })
    .limit(1)

  const nextVersion = (existing?.[0]?.version ?? 0) + 1

  const { data: proof, error } = await supabase
    .from('proofs')
    .insert({
      order_id,
      file_url,
      file_name,
      file_size: file_size ?? null,
      version: nextVersion,
      status: 'pending',
      uploaded_by: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Update order status to proof_sent
  await supabase
    .from('orders')
    .update({ status: 'proof_sent' })
    .eq('id', order_id)

  // Fetch order + customer for notification and email
  const { data: order } = await supabase
    .from('orders')
    .select('*, profiles:customer_id(full_name, email)')
    .eq('id', order_id)
    .single()

  if (order) {
    const customer = (order as any).profiles

    // In-app notification
    await supabase.from('notifications').insert({
      user_id: order.customer_id,
      type: 'proof_ready',
      title: 'Your proof is ready to review',
      body: `Version ${nextVersion} of your ${order.product} proof is ready.`,
      order_id,
    })

    // Email
    if (customer) {
      await sendStatusEmail('proof_sent', order, customer)
    }
  }

  return NextResponse.json({ data: proof }, { status: 201 })
}

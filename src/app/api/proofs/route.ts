import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

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
      ? '✓ Proof approved — heading to print!'
      : '↩ Revision request sent'

    const notifBody = action === 'approved'
      ? `Your ${order.product} order is now heading to production.`
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
  }

  return NextResponse.json({ success: true })
}

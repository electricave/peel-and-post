import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { sendStatusEmail } from '@/lib/email'
import type { OrderStatus } from '@/types'

// Status transitions the studio is allowed to set via PATCH
const STUDIO_STATUSES: OrderStatus[] = ['in_review', 'in_production', 'shipped', 'delivered', 'cancelled']

// GET /api/orders — list orders for the current user
export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const tab = searchParams.get('tab') // 'current' | 'past'

  let query = supabase
    .from('orders')
    .select('*, profiles(full_name, company_name)')
    .order('created_at', { ascending: false })

  if (tab === 'current') {
    query = query.not('status', 'in', '("delivered","cancelled")')
  } else if (tab === 'past') {
    query = query.in('status', ['delivered', 'cancelled'])
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}

// POST /api/orders — create a new order
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { product, quantity, finish, size, shape, turnaround, notes } = body

  // Validate required fields
  if (!product || !quantity || !finish || !size || !shape || !turnaround) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Estimate total price
  const PRICES: Record<string, number> = {
    'Die-Cut Stickers': 0.18,
    'Kiss-Cut Sheets': 2.50,
    'Holographic Stickers': 0.35,
    'Clear Stickers': 0.22,
  }

  let estimated_total = (PRICES[product] ?? 0.20) * Number(quantity)
  if (turnaround.includes('Rush (3')) estimated_total *= 1.20
  if (turnaround.includes('Super Rush')) estimated_total *= 1.40

  // Create the order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      customer_id: user.id,
      product,
      quantity: Number(quantity),
      finish,
      size,
      shape,
      turnaround,
      notes: notes || null,
      estimated_total: Math.round(estimated_total * 100) / 100,
    })
    .select()
    .single()

  if (orderError) {
    return NextResponse.json({ error: orderError.message }, { status: 500 })
  }

  // Auto-create conversation for this order
  await supabase
    .from('conversations')
    .insert({ order_id: order.id })

  // Create a welcome notification
  await supabase
    .from('notifications')
    .insert({
      user_id: user.id,
      type: 'order_update',
      title: 'Order submitted!',
      body: `Your order for ${product} has been received. The studio will be in touch shortly.`,
      order_id: order.id,
    })

  // Send order confirmation email
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .single()

  if (profile) {
    await sendStatusEmail('order_placed', order, profile)
  }

  return NextResponse.json({ data: order }, { status: 201 })
}

// PATCH /api/orders — studio-only order status updates
export async function PATCH(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Studio only
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'studio') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { order_id, status, tracking_number } = body

  if (!order_id || !status) {
    return NextResponse.json({ error: 'order_id and status required' }, { status: 400 })
  }
  if (!STUDIO_STATUSES.includes(status)) {
    return NextResponse.json({ error: `Invalid status. Allowed: ${STUDIO_STATUSES.join(', ')}` }, { status: 400 })
  }

  const updatePayload: Record<string, unknown> = { status }
  if (status === 'shipped' && tracking_number) updatePayload.tracking_number = tracking_number
  if (status === 'shipped') updatePayload.shipped_at = new Date().toISOString()
  if (status === 'delivered') updatePayload.delivered_at = new Date().toISOString()

  const { data: order, error } = await supabase
    .from('orders')
    .update(updatePayload)
    .eq('id', order_id)
    .select('*, profiles:customer_id(full_name, email)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify customer in-app
  const statusLabels: Record<string, string> = {
    in_review: 'Your artwork is under review',
    in_production: 'Your order is in production',
    shipped: tracking_number ? `Your order has shipped — tracking: ${tracking_number}` : 'Your order has shipped',
    delivered: 'Your order has been delivered',
    cancelled: 'Your order has been cancelled',
  }
  if (statusLabels[status]) {
    await supabase.from('notifications').insert({
      user_id: order.customer_id,
      type: 'order_update',
      title: statusLabels[status],
      order_id: order.id,
    })
  }

  // Send status email
  const customer = (order as any).profiles
  if (customer) {
    const emailEventMap: Partial<Record<string, Parameters<typeof sendStatusEmail>[0]>> = {
      in_production: 'in_production',
      shipped: 'shipped',
      delivered: 'delivered',
    }
    const emailEvent = emailEventMap[status]
    if (emailEvent) {
      await sendStatusEmail(emailEvent, order, customer, { trackingNumber: tracking_number })
    }
  }

  return NextResponse.json({ success: true })
}

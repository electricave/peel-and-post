import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

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

  return NextResponse.json({ data: order }, { status: 201 })
}

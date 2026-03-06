import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-02-25.clover',
})

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { orderId } = await req.json()
  if (!orderId) return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })

  // Fetch the order
  const { data: order, error } = await supabase
    .from('orders')
    .select('*, profiles(email, full_name)')
    .eq('id', orderId)
    .single()

  if (error || !order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  if (order.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (order.status !== 'proof_approved') return NextResponse.json({ error: 'Order not ready for payment' }, { status: 400 })

  const amountInCents = Math.round((order.total_price || 0) * 100)

  // Create Stripe Checkout Session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    customer_email: user.email,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Peel & Post — Order #${order.id.slice(0, 8).toUpperCase()}`,
            description: `${order.product_type || 'Stickers'} · Qty ${order.quantity}`,
          },
          unit_amount: amountInCents,
        },
        quantity: 1,
      },
    ],
    metadata: {
      orderId: order.id,
      userId: user.id,
    },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/orders/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/orders`,
  })

  // Save session ID to order
  await supabase
    .from('orders')
    .update({ stripe_session_id: session.id })
    .eq('id', orderId)

  // Create pending payment record
  await supabase
    .from('payments')
    .insert({
      order_id: order.id,
      user_id: user.id,
      stripe_session_id: session.id,
      amount_total: amountInCents,
      currency: 'usd',
      status: 'pending',
    })

  return NextResponse.json({ url: session.url })
}
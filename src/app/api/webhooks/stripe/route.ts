import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { sendStatusEmail } from '@/lib/email'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-02-25.clover',
})

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = await createClient()

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const orderId = session.metadata?.orderId
    const userId = session.metadata?.userId

    if (!orderId || !userId) {
      return NextResponse.json({ error: 'Missing metadata' }, { status: 400 })
    }

    // Update order to paid
    await supabase
      .from('orders')
      .update({
        status: 'paid',
        stripe_session_id: session.id,
        stripe_payment_intent_id: session.payment_intent as string,
        paid_at: new Date().toISOString(),
      })
      .eq('id', orderId)

    // Update payment record
    await supabase
      .from('payments')
      .update({
        status: 'paid',
        stripe_payment_intent_id: session.payment_intent as string,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_session_id', session.id)

    // Send payment confirmation email
    const { data: order } = await supabase
      .from('orders')
      .select('*, profiles:customer_id(full_name, email)')
      .eq('id', orderId)
      .single()

    if (order) {
      const customer = (order as any).profiles
      if (customer) {
        await sendStatusEmail('paid', order, customer)
      }
    }
  }

  if (event.type === 'checkout.session.expired') {
    const session = event.data.object as Stripe.Checkout.Session

    await supabase
      .from('payments')
      .update({
        status: 'failed',
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_session_id', session.id)
  }

  return NextResponse.json({ received: true })
}
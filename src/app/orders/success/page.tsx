import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: { session_id?: string }
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const sessionId = searchParams.session_id

  let order = null
  if (sessionId) {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('stripe_session_id', sessionId)
      .single()
    order = data
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F7F3EE',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Lato, sans-serif',
      padding: '40px 20px',
    }}>
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '16px',
        padding: '56px 48px',
        maxWidth: '520px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 4px 24px rgba(74,55,40,0.08)',
        border: '1px solid #EDE7DC',
      }}>
        {/* Success icon */}
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: '#7A8C6E',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h1 style={{
          fontFamily: 'Playfair Display, serif',
          fontSize: '28px',
          fontWeight: '700',
          color: '#4A3728',
          margin: '0 0 12px',
        }}>
          Payment confirmed
        </h1>

        <p style={{
          fontSize: '16px',
          color: '#A8896E',
          margin: '0 0 32px',
          lineHeight: '1.6',
        }}>
          Your order is now in production. We'll be in touch when it's on its way.
        </p>

        {order && (
          <div style={{
            backgroundColor: '#F7F3EE',
            borderRadius: '10px',
            padding: '20px 24px',
            marginBottom: '32px',
            textAlign: 'left',
          }}>
            <div style={{
              fontSize: '10px',
              fontWeight: '700',
              letterSpacing: '2px',
              color: '#A8896E',
              textTransform: 'uppercase',
              marginBottom: '12px',
            }}>
              Order Summary
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '14px', color: '#4A3728' }}>Order</span>
              <span style={{ fontSize: '14px', color: '#4A3728', fontWeight: '600' }}>
                #{order.id.slice(0, 8).toUpperCase()}
              </span>
            </div>
            {order.product_type && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', color: '#4A3728' }}>Product</span>
                <span style={{ fontSize: '14px', color: '#4A3728' }}>{order.product_type}</span>
              </div>
            )}
            {order.quantity && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', color: '#4A3728' }}>Quantity</span>
                <span style={{ fontSize: '14px', color: '#4A3728' }}>{order.quantity}</span>
              </div>
            )}
            {order.total_price && (
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #EDE7DC', paddingTop: '8px', marginTop: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: '700', color: '#4A3728' }}>Total paid</span>
                <span style={{ fontSize: '14px', fontWeight: '700', color: '#4A3728' }}>
                  ${Number(order.total_price).toFixed(2)}
                </span>
              </div>
            )}
          </div>
        )}

        <Link href="/orders" style={{
          display: 'inline-block',
          backgroundColor: '#C4714A',
          color: '#fff',
          padding: '14px 32px',
          borderRadius: '8px',
          textDecoration: 'none',
          fontSize: '14px',
          fontWeight: '700',
          letterSpacing: '1px',
          textTransform: 'uppercase',
        }}>
          View My Orders
        </Link>
      </div>
    </div>
  )
}
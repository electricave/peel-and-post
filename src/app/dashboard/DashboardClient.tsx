'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import NewOrderModal from '@/components/orders/NewOrderModal'
import type { Profile, Order } from '@/types'

export default function DashboardClient({ profile, orders, stats }: {
  profile: Profile | null
  orders: Order[]
  stats: { activeOrders: number; proofsToReview: number; unreadMessages: number }
}) {
  const [orderModalOpen, setOrderModalOpen] = useState(false)
  const router = useRouter()

  // Most recent active order for the timeline
  const featuredOrder = orders[0]

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar profile={profile} unreadMessages={stats.unreadMessages} pendingProofs={stats.proofsToReview} />

      <main style={{ marginLeft: '260px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Topbar pendingProofs={stats.proofsToReview} onNewOrder={() => setOrderModalOpen(true)} hideNewOrder={profile?.role === 'studio'} />

        <div style={{ padding: '36px 40px', animation: 'fadeIn 0.3s ease' }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '28px', fontWeight: 700, color: 'var(--brown)', marginBottom: '6px' }}>Dashboard</h2>
          <p style={{ fontSize: '14px', color: 'var(--brown-light)', marginBottom: '28px' }}>
            Welcome back{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}. Here's what's happening with your orders.
          </p>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '28px' }}>
            <StatCard color="var(--terracotta)" label="Active Orders" value={stats.activeOrders} sub="All in progress" />
            <StatCard color="#C05050" label="Proofs to Review" value={stats.proofsToReview} sub="Waiting on your OK" />
            <StatCard color="var(--gold)" label="New Messages" value={stats.unreadMessages} sub="From the studio" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
            {/* Order timeline */}
            <div style={{ background: 'var(--white)', borderRadius: '16px', border: '1px solid var(--cream-dark)', boxShadow: 'var(--shadow-card)', overflow: 'hidden' }}>
              <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid var(--cream-dark)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '16px', fontWeight: 600 }}>
                  {featuredOrder ? `${featuredOrder.product} — Progress` : 'Order Progress'}
                </h3>
                <span onClick={() => router.push('/orders')} style={{ fontSize: '12px', color: 'var(--terracotta)', cursor: 'pointer', fontWeight: 700 }}>All orders →</span>
              </div>

              {featuredOrder ? (
                <OrderTimeline order={featuredOrder} />
              ) : (
                <div style={{ padding: '40px 24px', textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', marginBottom: '12px' }}>✦</div>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '16px', color: 'var(--brown)', marginBottom: '8px' }}>No active orders yet</div>
                  <div style={{ fontSize: '13px', color: 'var(--brown-light)', marginBottom: '20px' }}>Place your first order to get started</div>
                  <button
                    onClick={() => setOrderModalOpen(true)}
                    style={{ padding: '10px 24px', borderRadius: '8px', background: 'var(--terracotta)', color: 'white', border: 'none', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    + Place First Order
                  </button>
                </div>
              )}
            </div>

            {/* Quick actions / recent orders */}
            <div style={{ background: 'var(--white)', borderRadius: '16px', border: '1px solid var(--cream-dark)', boxShadow: 'var(--shadow-card)', overflow: 'hidden' }}>
              <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid var(--cream-dark)' }}>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '16px', fontWeight: 600 }}>Your Orders</h3>
              </div>

              {orders.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--brown-light)', fontSize: '13px' }}>No active orders</div>
              ) : (
                orders.slice(0, 4).map(order => (
                  <div
                    key={order.id}
                    onClick={() => router.push('/orders')}
                    style={{ padding: '14px 24px', borderBottom: '1px solid var(--cream-dark)', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', transition: 'background 0.15s' }}
                  >
                    <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'var(--terracotta-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', flexShrink: 0 }}>
                      {order.product.includes('Holo') ? '🌈' : order.product.includes('Clear') ? '🔍' : order.product.includes('Kiss') ? '📄' : '✂️'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--brown)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '2px' }}>{order.product}</div>
                      <div style={{ fontSize: '11px', color: 'var(--brown-light)' }}>#{order.order_number} · {order.quantity} units</div>
                    </div>
                    <StatusDot status={order.status} />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      <NewOrderModal
        open={orderModalOpen}
        onClose={() => setOrderModalOpen(false)}
        onSuccess={() => { setOrderModalOpen(false); router.refresh() }}
      />
    </div>
  )
}

function StatCard({ color, label, value, sub }: { color: string; label: string; value: number; sub: string }) {
  return (
    <div style={{ background: 'var(--white)', borderRadius: '14px', padding: '20px 22px', boxShadow: 'var(--shadow-card)', border: '1px solid var(--cream-dark)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: color }} />
      <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--brown-light)', marginBottom: '8px' }}>{label}</div>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '32px', fontWeight: 700, color: 'var(--brown)', lineHeight: 1, marginBottom: '3px' }}>{value}</div>
      <div style={{ fontSize: '11px', color: 'var(--brown-light)' }}>{sub}</div>
    </div>
  )
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    proof_sent: '#C9A84C',
    in_production: 'var(--terracotta)',
    shipped: 'var(--sage)',
    delivered: 'var(--sage)',
  }
  return <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors[status] ?? 'var(--cream-dark)', flexShrink: 0 }} />
}

const STATUS_TIMELINE: Record<string, { steps: string[]; current: number }> = {
  pending:        { steps: ['Order Placed', 'Artwork Review', 'Proof', 'Production', 'Shipped'], current: 0 },
  artwork_needed: { steps: ['Order Placed', 'Artwork Review', 'Proof', 'Production', 'Shipped'], current: 1 },
  in_review:      { steps: ['Order Placed', 'Artwork Review', 'Proof', 'Production', 'Shipped'], current: 1 },
  proof_sent:     { steps: ['Order Placed', 'Artwork Review', 'Proof', 'Production', 'Shipped'], current: 2 },
  proof_approved: { steps: ['Order Placed', 'Artwork Review', 'Proof', 'Production', 'Shipped'], current: 3 },
  in_production:  { steps: ['Order Placed', 'Artwork Review', 'Proof', 'Production', 'Shipped'], current: 3 },
  shipped:        { steps: ['Order Placed', 'Artwork Review', 'Proof', 'Production', 'Shipped'], current: 4 },
  delivered:      { steps: ['Order Placed', 'Artwork Review', 'Proof', 'Production', 'Shipped'], current: 5 },
}

function OrderTimeline({ order }: { order: Order }) {
  const timeline = STATUS_TIMELINE[order.status] ?? STATUS_TIMELINE.pending
  const { steps, current } = timeline

  return (
    <div style={{ padding: '20px 24px' }}>
      {steps.map((step, i) => {
        const done = i < current
        const active = i === current
        const upcoming = i > current
        return (
          <div key={step} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', marginBottom: i < steps.length - 1 ? '4px' : 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '4px', flexShrink: 0 }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: done ? 'var(--sage)' : active ? 'var(--terracotta)' : 'var(--cream-dark)', flexShrink: 0 }} />
              {i < steps.length - 1 && <div style={{ width: '2px', height: '32px', background: done ? 'var(--sage-light)' : 'var(--cream-dark)', margin: '4px 0' }} />}
            </div>
            <div style={{ paddingBottom: i < steps.length - 1 ? '8px' : 0 }}>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: done ? 'var(--sage)' : active ? 'var(--terracotta)' : 'var(--brown-light)', marginBottom: '2px' }}>
                {done ? 'Complete' : active ? 'Current step' : 'Upcoming'}
              </div>
              <div style={{ fontSize: '14px', fontWeight: done || active ? 700 : 400, color: upcoming ? 'var(--brown-light)' : 'var(--brown)' }}>{step}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

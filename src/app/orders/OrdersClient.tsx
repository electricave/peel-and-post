'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import NewOrderModal from '@/components/orders/NewOrderModal'
import { OrderCard } from '@/components/orders/OrderCard'
import type { Profile, Order, OrderStatus } from '@/types'

const STATUS_LABELS: Partial<Record<OrderStatus, string>> = {
  pending:        'Pending',
  artwork_needed: 'Artwork Needed',
  in_review:      'In Review',
  proof_sent:     'Proof Sent',
  proof_approved: 'Proof Approved',
  paid:           'Paid',
  in_production:  'In Production',
  shipped:        'Shipped',
  delivered:      'Delivered',
  cancelled:      'Cancelled',
}

const CURRENT_STATUSES: OrderStatus[] = ['pending', 'artwork_needed', 'in_review', 'proof_sent', 'proof_approved', 'paid', 'in_production']
const PAST_STATUSES: OrderStatus[]    = ['shipped', 'delivered', 'cancelled']

export default function OrdersClient({ profile, currentOrders, pastOrders, stats }: {
  profile: Profile | null
  currentOrders: Order[]
  pastOrders: Order[]
  stats: { activeOrders: number; proofsToReview: number; unreadMessages: number }
}) {
  const [tab, setTab] = useState<'current' | 'past'>('current')
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all')
  const [orderModalOpen, setOrderModalOpen] = useState(false)
  const [reorderSource, setReorderSource] = useState<Order | undefined>(undefined)
  const router = useRouter()

  function handleReorder(order: Order) {
    setReorderSource(order)
    setOrderModalOpen(true)
  }

  function switchTab(t: 'current' | 'past') {
    setTab(t)
    setStatusFilter('all')
  }

  const tabOrders = tab === 'current' ? currentOrders : pastOrders
  const tabStatuses = tab === 'current' ? CURRENT_STATUSES : PAST_STATUSES
  const orders = statusFilter === 'all' ? tabOrders : tabOrders.filter(o => o.status === statusFilter)
  const userId = profile?.id ?? ''
  const isStudio = profile?.role === 'studio'

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar profile={profile} unreadMessages={stats.unreadMessages} pendingProofs={stats.proofsToReview} />

      <main style={{ marginLeft: '260px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Topbar pendingProofs={stats.proofsToReview} onNewOrder={() => setOrderModalOpen(true)} hideNewOrder={isStudio} />

        <div style={{ padding: '36px 40px', animation: 'fadeIn 0.3s ease' }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '28px', fontWeight: 700, color: 'var(--brown)', marginBottom: '6px' }}>My Orders</h2>
          <p style={{ fontSize: '14px', color: 'var(--brown-light)', marginBottom: '24px' }}>Track and manage your sticker orders from Peel & Post Studio.</p>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', background: 'var(--white)', border: '1px solid var(--cream-dark)', borderRadius: '11px', padding: '5px', width: 'fit-content' }}>
            {(['current', 'past'] as const).map(t => (
              <button
                key={t}
                onClick={() => switchTab(t)}
                style={{
                  padding: '8px 22px', borderRadius: '7px', border: 'none', cursor: 'pointer',
                  fontFamily: "'Lato', sans-serif", fontSize: '13px', fontWeight: 700,
                  background: tab === t ? 'var(--terracotta)' : 'transparent',
                  color: tab === t ? 'white' : 'var(--brown-light)',
                  transition: 'all 0.15s',
                }}
              >
                {t === 'current' ? 'Current Orders' : 'Past Orders'}
                {t === 'current' && currentOrders.length > 0 && (
                  <span style={{ marginLeft: '6px', background: tab === 'current' ? 'rgba(255,255,255,0.25)' : 'var(--cream-dark)', color: tab === 'current' ? 'white' : 'var(--brown-mid)', fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '8px' }}>
                    {currentOrders.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Status filter chips */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
            <button
              onClick={() => setStatusFilter('all')}
              style={{
                padding: '6px 16px', borderRadius: '20px', cursor: 'pointer',
                fontFamily: "'Lato', sans-serif", fontSize: '12px', fontWeight: 700,
                border: `1.5px solid ${statusFilter === 'all' ? 'var(--brown)' : 'var(--cream-dark)'}`,
                background: statusFilter === 'all' ? 'var(--brown)' : 'var(--white)',
                color: statusFilter === 'all' ? 'white' : 'var(--brown-light)',
                transition: 'all 0.15s',
              }}
            >
              All
            </button>
            {tabStatuses.map(s => {
              const count = tabOrders.filter(o => o.status === s).length
              const active = statusFilter === s
              const empty = count === 0
              return (
                <button
                  key={s}
                  onClick={() => !empty && setStatusFilter(active ? 'all' : s)}
                  style={{
                    padding: '6px 16px', borderRadius: '20px',
                    cursor: empty ? 'default' : 'pointer',
                    fontFamily: "'Lato', sans-serif", fontSize: '12px', fontWeight: 700,
                    border: `1.5px solid ${active ? 'var(--terracotta)' : 'var(--cream-dark)'}`,
                    background: active ? 'var(--terracotta-pale)' : 'var(--white)',
                    color: active ? 'var(--terracotta)' : empty ? 'var(--cream-dark)' : 'var(--brown-light)',
                    transition: 'all 0.15s',
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                  }}
                >
                  {STATUS_LABELS[s]}
                  {count > 0 && (
                    <span style={{
                      fontSize: '10px', fontWeight: 700,
                      background: active ? 'var(--terracotta)' : 'var(--cream-dark)',
                      color: active ? 'white' : 'var(--brown-mid)',
                      padding: '0 5px', borderRadius: '8px',
                    }}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Order list */}
          {orders.length === 0 ? (
            <div style={{ background: 'var(--white)', borderRadius: '16px', border: '1px solid var(--cream-dark)', padding: '60px 40px', textAlign: 'center' }}>
              <div style={{ fontSize: '40px', marginBottom: '16px' }}>{tab === 'current' ? '✦' : '📦'}</div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', color: 'var(--brown)', marginBottom: '8px' }}>
                {tab === 'current' ? 'No active orders' : 'No past orders yet'}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--brown-light)', marginBottom: '24px' }}>
                {tab === 'current' ? 'Place your first order to get started' : 'Completed orders will appear here'}
              </div>
              {tab === 'current' && (
                <button
                  onClick={() => setOrderModalOpen(true)}
                  style={{ padding: '11px 28px', borderRadius: '8px', background: 'var(--terracotta)', color: 'white', border: 'none', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}
                >
                  + Place Your First Order
                </button>
              )}
            </div>
          ) : (
            orders.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                userId={userId}
                isStudio={isStudio}
                onProofAction={() => router.refresh()}
                onMessage={() => router.push('/messages')}
                onReorder={handleReorder}
              />
            ))
          )}
        </div>
      </main>

      <NewOrderModal
        open={orderModalOpen}
        onClose={() => { setOrderModalOpen(false); setReorderSource(undefined) }}
        onSuccess={() => { setOrderModalOpen(false); setReorderSource(undefined); router.refresh() }}
        reorderFrom={reorderSource}
      />
    </div>
  )
}

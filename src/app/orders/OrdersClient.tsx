'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import NewOrderModal from '@/components/orders/NewOrderModal'
import { OrderCard } from '@/components/orders/OrderCard'
import type { Profile, Order } from '@/types'

export default function OrdersClient({ profile, currentOrders, pastOrders, stats }: {
  profile: Profile | null
  currentOrders: Order[]
  pastOrders: Order[]
  stats: { activeOrders: number; proofsToReview: number; unreadMessages: number }
}) {
  const [tab, setTab] = useState<'current' | 'past'>('current')
  const [orderModalOpen, setOrderModalOpen] = useState(false)
  const [reorderSource, setReorderSource] = useState<Order | undefined>(undefined)
  const router = useRouter()

  function handleReorder(order: Order) {
    setReorderSource(order)
    setOrderModalOpen(true)
  }

  const orders = tab === 'current' ? currentOrders : pastOrders
  const userId = profile?.id ?? ''
  const isStudio = profile?.role === 'studio'

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar profile={profile} unreadMessages={stats.unreadMessages} pendingProofs={stats.proofsToReview} />

      <main style={{ marginLeft: '260px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Topbar pendingProofs={stats.proofsToReview} onNewOrder={() => setOrderModalOpen(true)} />

        <div style={{ padding: '36px 40px', animation: 'fadeIn 0.3s ease' }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '28px', fontWeight: 700, color: 'var(--brown)', marginBottom: '6px' }}>My Orders</h2>
          <p style={{ fontSize: '14px', color: 'var(--brown-light)', marginBottom: '24px' }}>Track and manage your sticker orders from Peel & Post Studio.</p>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: 'var(--white)', border: '1px solid var(--cream-dark)', borderRadius: '11px', padding: '5px', width: 'fit-content' }}>
            {(['current', 'past'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
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

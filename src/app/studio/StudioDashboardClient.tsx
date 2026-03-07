'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Order, Proof, OrderStatus } from '@/types'

type ArtworkFile = {
  order_id: string
  file_url: string
  file_name: string
  created_at: string
}

type ConversationMessage = {
  id: string
  sender_id: string
  content: string
  read_at: string | null
  created_at: string
}

type Conversation = {
  id: string
  order_id: string
  messages: ConversationMessage[]
}

type Props = {
  studioName: string
  orders: Order[]
  proofs: Proof[]
  conversations: Conversation[]
  artwork: ArtworkFile[]
  currentUserId: string
}

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string }> = {
  pending:          { label: 'Pending',          color: '#C9A84C', bg: '#FDF6E3' },
  artwork_needed:   { label: 'Artwork Needed',    color: '#C4714A', bg: '#F2E0D5' },
  in_review:        { label: 'In Review',         color: '#C9A84C', bg: '#FDF6E3' },
  proof_sent:       { label: 'Proof Sent',        color: '#C4714A', bg: '#F2E0D5' },
  proof_approved:   { label: 'Proof Approved',    color: '#7A8C6E', bg: '#E8EDE4' },
  paid:             { label: 'Paid',              color: '#7A8C6E', bg: '#E8EDE4' },
  in_production:    { label: 'In Production',     color: '#4A3728', bg: '#EDE7DC' },
  shipped:          { label: 'Shipped',           color: '#7A8C6E', bg: '#E8EDE4' },
  delivered:        { label: 'Delivered',         color: '#7A8C6E', bg: '#E8EDE4' },
  cancelled:        { label: 'Cancelled',         color: '#A8896E', bg: '#F7F3EE' },
}

const ALL_STATUSES: OrderStatus[] = [
  'pending', 'artwork_needed', 'in_review', 'proof_sent',
  'proof_approved', 'in_production', 'shipped', 'delivered', 'cancelled',
]

function StatusBadge({ status }: { status: OrderStatus }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: '#A8896E', bg: '#F7F3EE' }
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '3px 10px',
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      color: cfg.color,
      background: cfg.bg,
      border: `1px solid ${cfg.color}30`,
      whiteSpace: 'nowrap',
    }}>
      {cfg.label}
    </span>
  )
}

function StatCard({ label, value, sub, accent }: {
  label: string
  value: number | string
  sub?: string
  accent?: string
}) {
  return (
    <div style={{
      background: 'var(--white)',
      border: '1px solid var(--cream-dark)',
      borderRadius: 14,
      padding: '24px 28px',
      boxShadow: '0 2px 12px rgba(74,55,40,0.08)',
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
    }}>
      <span style={{
        fontSize: 10, fontWeight: 700, letterSpacing: '0.18em',
        textTransform: 'uppercase', color: 'var(--brown-light)',
        fontFamily: 'Lato, sans-serif',
      }}>
        {label}
      </span>
      <span style={{
        fontSize: 36, fontWeight: 700,
        color: accent || 'var(--brown)',
        fontFamily: 'Playfair Display, serif',
        lineHeight: 1,
      }}>
        {value}
      </span>
      {sub && (
        <span style={{ fontSize: 12, color: 'var(--brown-light)', fontFamily: 'Lato, sans-serif' }}>
          {sub}
        </span>
      )}
    </div>
  )
}

export default function StudioDashboardClient({
  studioName,
  orders: initialOrders,
  proofs,
  conversations,
  artwork,
  currentUserId,
}: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [orders, setOrders] = useState<Order[]>(initialOrders)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all')
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null)
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)
  const [statusDropdownOpen, setStatusDropdownOpen] = useState<string | null>(null)
  const [trackingModal, setTrackingModal] = useState<{ orderId: string } | null>(null)
  const [trackingInput, setTrackingInput] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  // Realtime order updates
  useEffect(() => {
    const channel = supabase
      .channel('studio-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        router.refresh()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase, router])

  // ── Derived stats ──────────────────────────────────────────
  const needsArtwork      = orders.filter(o => o.status === 'artwork_needed')
  const inReview          = orders.filter(o => o.status === 'in_review')
  const proofSent         = orders.filter(o => o.status === 'proof_sent')
  const inProduction      = orders.filter(o => o.status === 'in_production')

  // Unread messages: messages not sent by studio that have no read_at
  const unreadCount = conversations.reduce((acc, conv) => {
    const unread = conv.messages.filter(m => m.sender_id !== currentUserId && !m.read_at)
    return acc + unread.length
  }, 0)

  // Needs attention: artwork_needed + in_review (proof to prep)
  const attentionOrders = [...needsArtwork, ...inReview]

  // ── Filtered table ─────────────────────────────────────────
  const filtered = orders.filter(o => {
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter
    const q = search.toLowerCase()
    const matchesSearch = !q
      || String(o.order_number).includes(q)
      || (o.profiles?.full_name || '').toLowerCase().includes(q)
      || (o.profiles?.email || '').toLowerCase().includes(q)
      || (o.profiles?.company_name || '').toLowerCase().includes(q)
      || o.product.toLowerCase().includes(q)
    return matchesStatus && matchesSearch
  })

  // ── Helpers ────────────────────────────────────────────────
  async function updateStatus(orderId: string, newStatus: OrderStatus, trackingNumber?: string) {
    setUpdatingOrder(orderId)
    setStatusDropdownOpen(null)
    // Route through API so status-change emails are triggered
    const res = await fetch('/api/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: orderId, status: newStatus, tracking_number: trackingNumber }),
    })
    if (res.ok) {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
    }
    setUpdatingOrder(null)
  }

  async function confirmShipped() {
    if (!trackingModal) return
    await updateStatus(trackingModal.orderId, 'shipped', trackingInput.trim() || undefined)
    setOrders(prev => prev.map(o =>
      o.id === trackingModal.orderId
        ? { ...o, status: 'shipped' as OrderStatus, tracking_number: trackingInput.trim() || o.tracking_number }
        : o
    ))
    setTrackingModal(null)
    setTrackingInput('')
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  function formatCurrency(val: number | null) {
    if (val == null) return '—'
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)
  }

  function getOrderProofs(orderId: string) {
    return proofs.filter(p => p.order_id === orderId).sort((a, b) => b.version - a.version)
  }

  function getOrderConversation(orderId: string) {
    return conversations.find(c => c.order_id === orderId)
  }

  function getOrderArtwork(orderId: string) {
    return artwork.filter(a => a.order_id === orderId)
  }

  function getUnreadForOrder(orderId: string) {
    const conv = getOrderConversation(orderId)
    if (!conv) return 0
    return conv.messages.filter(m => m.sender_id !== currentUserId && !m.read_at).length
  }

  if (!mounted) return null

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--cream)',
      marginLeft: 260,
      padding: '36px 40px',
      fontFamily: 'Lato, sans-serif',
      animation: 'fadeIn 0.3s ease',
    }}>

      {/* ── Header ────────────────────────────────────────── */}
      <div style={{ marginBottom: 32 }}>
        <p style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.18em',
          textTransform: 'uppercase', color: 'var(--terracotta)',
          marginBottom: 6, fontFamily: 'Lato, sans-serif',
        }}>
          Studio View
        </p>
        <h1 style={{
          fontFamily: 'Playfair Display, serif',
          fontSize: 32, fontWeight: 700, color: 'var(--brown)', margin: 0,
        }}>
          Good morning, {studioName.split(' ')[0]} 👋
        </h1>
        <p style={{ color: 'var(--brown-light)', fontSize: 14, marginTop: 6 }}>
          Here's everything that needs your attention today.
        </p>
      </div>

      {/* ── Stat Cards ────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: 16,
        marginBottom: 36,
      }}>
        <StatCard label="Total Orders"    value={orders.length}        sub="all time" />
        <StatCard label="Artwork Needed"  value={needsArtwork.length}  sub="awaiting upload"   accent={needsArtwork.length > 0 ? 'var(--gold)' : undefined} />
        <StatCard label="In Review"       value={inReview.length}      sub="proof to prepare"  accent={inReview.length > 0 ? 'var(--terracotta)' : undefined} />
        <StatCard label="Proof Sent"      value={proofSent.length}     sub="awaiting approval" accent={proofSent.length > 0 ? 'var(--gold)' : undefined} />
        <StatCard label="Unread Messages" value={unreadCount}          sub="from customers"    accent={unreadCount > 0 ? 'var(--terracotta)' : undefined} />
      </div>

      {/* ── Needs Attention ───────────────────────────────── */}
      {attentionOrders.length > 0 && (
        <div style={{ marginBottom: 36 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: 'var(--terracotta)',
              display: 'inline-block',
              boxShadow: '0 0 0 3px var(--terracotta-pale)',
            }} />
            <h2 style={{
              fontFamily: 'Playfair Display, serif',
              fontSize: 18, fontWeight: 600, color: 'var(--brown)', margin: 0,
            }}>
              Needs Your Attention
            </h2>
            <span style={{
              background: 'var(--terracotta)', color: 'white',
              borderRadius: 20, fontSize: 11, fontWeight: 700, padding: '2px 8px',
            }}>
              {attentionOrders.length}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {attentionOrders.map(order => (
              <div key={order.id} style={{
                background: 'var(--white)',
                border: '1px solid var(--cream-dark)',
                borderLeft: `4px solid ${order.status === 'in_review' ? 'var(--terracotta)' : 'var(--gold)'}`,
                borderRadius: 12,
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                boxShadow: '0 2px 8px rgba(74,55,40,0.06)',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--brown)' }}>
                      {order.profiles?.full_name || order.profiles?.email || 'Unknown Customer'}
                    </span>
                    {order.profiles?.company_name && (
                      <>
                        <span style={{ color: 'var(--brown-light)', fontSize: 12 }}>·</span>
                        <span style={{ color: 'var(--brown-light)', fontSize: 12 }}>{order.profiles.company_name}</span>
                      </>
                    )}
                    <span style={{ color: 'var(--brown-light)', fontSize: 12 }}>·</span>
                    <span style={{ color: 'var(--brown-light)', fontSize: 12 }}>
                      {order.product} · {order.quantity} pcs
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--brown-light)' }}>
                    Order #{order.order_number} · {formatDate(order.created_at)}
                  </div>
                </div>
                <StatusBadge status={order.status} />
                <button
                  onClick={() => setExpandedOrder(order.id)}
                  style={{
                    background: 'var(--terracotta)', color: 'white',
                    border: 'none', borderRadius: 8,
                    padding: '8px 16px', fontSize: 12, fontWeight: 700,
                    cursor: 'pointer', letterSpacing: '0.04em',
                    fontFamily: 'Lato, sans-serif', whiteSpace: 'nowrap',
                  }}
                >
                  View Order →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── All Orders Table ──────────────────────────────── */}
      <div style={{
        background: 'var(--white)',
        border: '1px solid var(--cream-dark)',
        borderRadius: 16,
        boxShadow: '0 2px 12px rgba(74,55,40,0.08)',
        overflow: 'hidden',
      }}>
        {/* Table toolbar */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--cream-dark)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}>
          <h2 style={{
            fontFamily: 'Playfair Display, serif',
            fontSize: 18, fontWeight: 600, color: 'var(--brown)', margin: 0,
          }}>
            All Orders
          </h2>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: 12, top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--brown-light)', fontSize: 14, pointerEvents: 'none',
              }}>🔍</span>
              <input
                type="text"
                placeholder="Search name, company, product..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  paddingLeft: 36, paddingRight: 14, paddingTop: 9, paddingBottom: 9,
                  borderRadius: 10, border: '1px solid var(--cream-dark)',
                  background: 'var(--cream)', fontSize: 13, color: 'var(--brown)',
                  fontFamily: 'Lato, sans-serif', outline: 'none', width: 240,
                }}
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as OrderStatus | 'all')}
              style={{
                padding: '9px 14px', borderRadius: 10,
                border: '1px solid var(--cream-dark)',
                background: 'var(--cream)', fontSize: 13, color: 'var(--brown)',
                fontFamily: 'Lato, sans-serif', outline: 'none', cursor: 'pointer',
              }}
            >
              <option value="all">All Statuses</option>
              {ALL_STATUSES.map(s => (
                <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: 'Lato, sans-serif' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--cream-dark)' }}>
                {['#', 'Customer', 'Product', 'Qty', 'Finish / Shape', 'Total', 'Status', 'Proof', 'Actions'].map(h => (
                  <th key={h} style={{
                    padding: '12px 16px', textAlign: 'left',
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.14em',
                    textTransform: 'uppercase', color: 'var(--brown-light)',
                    background: 'var(--cream)', whiteSpace: 'nowrap',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{
                    padding: '48px 24px', textAlign: 'center',
                    color: 'var(--brown-light)', fontSize: 14,
                  }}>
                    No orders match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((order, idx) => {
                  const orderProofs  = getOrderProofs(order.id)
                  const latestProof  = orderProofs[0]
                  const orderArtwork = getOrderArtwork(order.id)
                  const unread       = getUnreadForOrder(order.id)
                  const isExpanded   = expandedOrder === order.id
                  const isUpdating   = updatingOrder === order.id

                  return (
                    <>
                      <tr
                        key={order.id}
                        style={{
                          borderBottom: '1px solid var(--cream-dark)',
                          background: idx % 2 === 0 ? 'var(--white)' : 'rgba(247,243,238,0.4)',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--terracotta-pale)')}
                        onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? 'var(--white)' : 'rgba(247,243,238,0.4)')}
                      >
                        {/* Order number */}
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ fontWeight: 700, color: 'var(--brown)', fontSize: 13 }}>
                            #{order.order_number}
                          </span>
                          {unread > 0 && (
                            <span style={{
                              marginLeft: 6, background: 'var(--terracotta)',
                              color: 'white', borderRadius: 20,
                              fontSize: 10, fontWeight: 700, padding: '1px 6px',
                            }}>
                              {unread} new
                            </span>
                          )}
                        </td>

                        {/* Customer */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--brown)', fontSize: 13 }}>
                            {order.profiles?.full_name || '—'}
                          </div>
                          {order.profiles?.company_name && (
                            <div style={{ fontSize: 11, color: 'var(--brown-light)', marginTop: 2 }}>
                              {order.profiles.company_name}
                            </div>
                          )}
                          <div style={{ fontSize: 11, color: 'var(--brown-light)', marginTop: 1 }}>
                            {order.profiles?.email || ''}
                          </div>
                        </td>

                        {/* Product */}
                        <td style={{ padding: '14px 16px', color: 'var(--brown)', fontSize: 13 }}>
                          {order.product}
                        </td>

                        {/* Quantity */}
                        <td style={{ padding: '14px 16px', color: 'var(--brown)', fontWeight: 600 }}>
                          {order.quantity}
                        </td>

                        {/* Finish / Shape */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontSize: 12, color: 'var(--brown)' }}>{order.finish}</div>
                          <div style={{ fontSize: 11, color: 'var(--brown-light)', marginTop: 2 }}>{order.shape} · {order.size}</div>
                        </td>

                        {/* Total */}
                        <td style={{ padding: '14px 16px', color: 'var(--brown)', fontWeight: 600, fontSize: 13 }}>
                          {formatCurrency(order.final_total ?? order.estimated_total)}
                        </td>

                        {/* Status dropdown */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ position: 'relative', display: 'inline-block' }}>
                            <button
                              onClick={e => {
                                e.stopPropagation()
                                setStatusDropdownOpen(statusDropdownOpen === order.id ? null : order.id)
                              }}
                              disabled={isUpdating}
                              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', opacity: isUpdating ? 0.5 : 1 }}
                            >
                              <StatusBadge status={order.status} />
                              <span style={{ fontSize: 9, marginLeft: 4, color: 'var(--brown-light)' }}>▼</span>
                            </button>

                            {statusDropdownOpen === order.id && (
                              <div style={{
                                position: 'absolute', top: '100%', left: 0, zIndex: 100,
                                background: 'var(--white)', border: '1px solid var(--cream-dark)',
                                borderRadius: 10, boxShadow: '0 8px 24px rgba(74,55,40,0.15)',
                                padding: '6px 0', minWidth: 180, marginTop: 4,
                              }}>
                                {ALL_STATUSES.map(s => (
                                  <button
                                    key={s}
                                    onClick={e => {
                                      e.stopPropagation()
                                      setStatusDropdownOpen(null)
                                      if (s === 'shipped') {
                                        setTrackingInput('')
                                        setTrackingModal({ orderId: order.id })
                                      } else {
                                        updateStatus(order.id, s)
                                      }
                                    }}
                                    style={{
                                      display: 'block', width: '100%', textAlign: 'left',
                                      padding: '8px 14px',
                                      background: order.status === s ? 'var(--cream)' : 'none',
                                      border: 'none', cursor: 'pointer', fontSize: 12,
                                      fontFamily: 'Lato, sans-serif', color: 'var(--brown)',
                                      fontWeight: order.status === s ? 700 : 400,
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--cream)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = order.status === s ? 'var(--cream)' : 'none')}
                                  >
                                    {STATUS_CONFIG[s].label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Latest proof */}
                        <td style={{ padding: '14px 16px' }}>
                          {latestProof ? (
                            <div>
                              <span style={{
                                fontSize: 11, fontWeight: 700,
                                textTransform: 'uppercase', letterSpacing: '0.06em',
                                color: latestProof.status === 'approved' ? 'var(--sage)'
                                  : latestProof.status === 'revision' ? 'var(--terracotta)'
                                  : 'var(--gold)',
                              }}>
                                {latestProof.status === 'approved' ? '✓ Approved'
                                  : latestProof.status === 'revision' ? '↺ Revision'
                                  : 'Pending'}
                              </span>
                              <div style={{ fontSize: 10, color: 'var(--brown-light)', marginTop: 2 }}>
                                v{latestProof.version}
                              </div>
                            </div>
                          ) : orderArtwork.length > 0 ? (
                            <span style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 700 }}>Artwork ✓</span>
                          ) : (
                            <span style={{ fontSize: 11, color: 'var(--cream-dark)' }}>—</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <button
                              onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                              style={{
                                background: isExpanded ? 'var(--brown)' : 'var(--cream)',
                                color: isExpanded ? 'white' : 'var(--brown)',
                                border: '1px solid var(--cream-dark)',
                                borderRadius: 8, padding: '6px 12px',
                                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                                fontFamily: 'Lato, sans-serif', transition: 'all 0.15s',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {isExpanded ? 'Close' : 'Details'}
                            </button>
                            <button
                              onClick={() => router.push(`/messages?order=${order.id}`)}
                              style={{
                                background: 'none', border: '1px solid var(--cream-dark)',
                                borderRadius: 8, padding: '6px 10px',
                                fontSize: 13, cursor: 'pointer', color: 'var(--brown-light)',
                              }}
                              title="Message customer"
                            >
                              💬
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* ── Expanded detail row ─────────────────────── */}
                      {isExpanded && (
                        <tr key={`${order.id}-expanded`}>
                          <td colSpan={9} style={{ padding: 0, background: 'var(--cream)' }}>
                            <div style={{
                              padding: '20px 24px',
                              borderBottom: '1px solid var(--cream-dark)',
                              animation: 'fadeIn 0.2s ease',
                            }}>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>

                                {/* Order specs */}
                                <div style={{
                                  background: 'var(--white)', borderRadius: 12,
                                  padding: '16px 18px', border: '1px solid var(--cream-dark)',
                                }}>
                                  <p style={{
                                    fontSize: 10, fontWeight: 700, letterSpacing: '0.14em',
                                    textTransform: 'uppercase', color: 'var(--brown-light)',
                                    marginBottom: 12, marginTop: 0,
                                  }}>Order Specs</p>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {[
                                      ['Product', order.product],
                                      ['Quantity', order.quantity],
                                      ['Size', order.size],
                                      ['Shape', order.shape],
                                      ['Finish', order.finish],
                                      ['Turnaround', order.turnaround],
                                      ['Est. Total', formatCurrency(order.estimated_total)],
                                      ['Final Total', formatCurrency(order.final_total)],
                                    ].map(([k, v]) => (
                                      <div key={String(k)} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                        <span style={{ color: 'var(--brown-light)' }}>{k}</span>
                                        <span style={{ color: 'var(--brown)', fontWeight: 600 }}>{v}</span>
                                      </div>
                                    ))}
                                  </div>
                                  {order.notes && (
                                    <div style={{
                                      marginTop: 12, padding: '10px 12px',
                                      background: 'var(--cream)', borderRadius: 8,
                                      fontSize: 12, color: 'var(--brown)', lineHeight: 1.5,
                                    }}>
                                      <strong style={{
                                        color: 'var(--brown-light)', display: 'block',
                                        marginBottom: 4, fontSize: 10,
                                        textTransform: 'uppercase', letterSpacing: '0.1em',
                                      }}>Notes</strong>
                                      {order.notes}
                                    </div>
                                  )}
                                </div>

                                {/* Artwork files */}
                                <div style={{
                                  background: 'var(--white)', borderRadius: 12,
                                  padding: '16px 18px', border: '1px solid var(--cream-dark)',
                                }}>
                                  <p style={{
                                    fontSize: 10, fontWeight: 700, letterSpacing: '0.14em',
                                    textTransform: 'uppercase', color: 'var(--brown-light)',
                                    marginBottom: 12, marginTop: 0,
                                  }}>Artwork Files</p>
                                  {orderArtwork.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--brown-light)', fontSize: 13 }}>
                                      <div style={{ fontSize: 24, marginBottom: 8 }}>🖼️</div>
                                      No artwork uploaded yet
                                    </div>
                                  ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                      {orderArtwork.map((a, i) => (
                                        <a key={i} href={a.file_url} target="_blank" rel="noopener noreferrer"
                                          style={{
                                            display: 'flex', alignItems: 'center', gap: 8,
                                            padding: '8px 10px', background: 'var(--cream)',
                                            borderRadius: 8, fontSize: 12,
                                            color: 'var(--terracotta)', textDecoration: 'none',
                                            fontWeight: 600, border: '1px solid var(--cream-dark)',
                                          }}
                                        >
                                          <span>📎</span>
                                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {a.file_name}
                                          </span>
                                          <span style={{ fontSize: 10, color: 'var(--brown-light)', flexShrink: 0 }}>
                                            {formatDate(a.created_at)}
                                          </span>
                                        </a>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* Proofs */}
                                <div style={{
                                  background: 'var(--white)', borderRadius: 12,
                                  padding: '16px 18px', border: '1px solid var(--cream-dark)',
                                }}>
                                  <p style={{
                                    fontSize: 10, fontWeight: 700, letterSpacing: '0.14em',
                                    textTransform: 'uppercase', color: 'var(--brown-light)',
                                    marginBottom: 12, marginTop: 0,
                                  }}>Proofs</p>
                                  {orderProofs.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--brown-light)', fontSize: 13 }}>
                                      <div style={{ fontSize: 24, marginBottom: 8 }}>📄</div>
                                      No proofs sent yet
                                    </div>
                                  ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                      {orderProofs.map(p => (
                                        <div key={p.id} style={{
                                          padding: '10px 12px', background: 'var(--cream)',
                                          borderRadius: 8, border: '1px solid var(--cream-dark)',
                                        }}>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <a href={p.file_url} target="_blank" rel="noopener noreferrer"
                                              style={{ fontSize: 12, color: 'var(--terracotta)', textDecoration: 'none', fontWeight: 600 }}
                                            >
                                              📄 {p.file_name || `Proof v${p.version}`}
                                            </a>
                                            <span style={{
                                              fontSize: 10, fontWeight: 700,
                                              textTransform: 'uppercase', letterSpacing: '0.06em',
                                              color: p.status === 'approved' ? 'var(--sage)'
                                                : p.status === 'revision' ? 'var(--terracotta)'
                                                : 'var(--gold)',
                                            }}>
                                              {p.status}
                                            </span>
                                          </div>
                                          {p.feedback && (
                                            <div style={{
                                              marginTop: 8, padding: '8px 10px',
                                              background: 'var(--terracotta-pale)',
                                              borderRadius: 6, fontSize: 12,
                                              color: 'var(--brown)', lineHeight: 1.5,
                                            }}>
                                              <strong style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--terracotta)' }}>
                                                Feedback:{' '}
                                              </strong>
                                              {p.feedback}
                                            </div>
                                          )}
                                          <div style={{ fontSize: 11, color: 'var(--brown-light)', marginTop: 6 }}>
                                            Version {p.version} · {formatDate(p.created_at)}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 24px', borderTop: '1px solid var(--cream-dark)',
          background: 'var(--cream)', fontSize: 12, color: 'var(--brown-light)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>Showing {filtered.length} of {orders.length} orders</span>
          {statusFilter !== 'all' && (
            <button
              onClick={() => setStatusFilter('all')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--terracotta)', fontSize: 12, fontWeight: 600,
                fontFamily: 'Lato, sans-serif',
              }}
            >
              Clear filter ✕
            </button>
          )}
        </div>
      </div>

      {/* Click-outside to close status dropdown */}
      {statusDropdownOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 50 }}
          onClick={() => setStatusDropdownOpen(null)}
        />
      )}

      {/* Tracking number modal */}
      {trackingModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(74,55,40,0.5)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
          onClick={e => e.target === e.currentTarget && setTrackingModal(null)}
        >
          <div style={{ background: 'var(--white)', borderRadius: '16px', padding: '32px', width: '420px', maxWidth: '95vw', boxShadow: '0 20px 60px rgba(74,55,40,0.25)' }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', fontWeight: 700, color: 'var(--brown)', marginBottom: '8px' }}>
              📦 Mark as Shipped
            </div>
            <p style={{ fontSize: '13px', color: 'var(--brown-light)', margin: '0 0 20px', lineHeight: 1.5 }}>
              Add a tracking number to notify the customer. You can leave it blank if you don't have one yet.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--brown-light)' }}>
                Tracking Number (optional)
              </label>
              <input
                type="text"
                value={trackingInput}
                onChange={e => setTrackingInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && confirmShipped()}
                placeholder="e.g. 1Z999AA10123456784"
                autoFocus
                style={{ padding: '10px 14px', borderRadius: '10px', border: '1.5px solid var(--cream-dark)', background: 'var(--cream)', fontFamily: 'Lato, sans-serif', fontSize: '14px', color: 'var(--brown)', outline: 'none', width: '100%', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={confirmShipped}
                style={{ flex: 1, padding: '11px', borderRadius: '9px', background: 'var(--sage)', color: 'white', border: 'none', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Lato, sans-serif' }}
              >
                ✓ Confirm Shipped
              </button>
              <button
                onClick={() => setTrackingModal(null)}
                style={{ padding: '11px 18px', borderRadius: '9px', background: 'transparent', border: '1.5px solid var(--cream-dark)', color: 'var(--brown-mid)', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Lato, sans-serif' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

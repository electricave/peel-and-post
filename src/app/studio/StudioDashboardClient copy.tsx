'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Profile = {
  id: string
  full_name: string | null
  email: string | null
}

type Order = {
  id: string
  customer_id: string
  status: string
  sticker_type: string
  quantity: number
  size: string
  notes: string | null
  created_at: string
  profiles: Profile | null
}

type Proof = {
  id: string
  order_id: string
  file_url: string
  status: string
  created_at: string
}

type Message = {
  order_id: string
  created_at: string
  sender_id: string
  content: string
}

type Artwork = {
  order_id: string
  file_url: string
  created_at: string
}

type Props = {
  studioName: string
  orders: Order[]
  proofs: Proof[]
  messages: Message[]
  artwork: Artwork[]
  currentUserId: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  submitted:       { label: 'Submitted',        color: '#C9A84C', bg: '#FDF6E3' },
  artwork_received:{ label: 'Artwork Received',  color: '#7A8C6E', bg: '#E8EDE4' },
  proof_sent:      { label: 'Proof Sent',        color: '#C4714A', bg: '#F2E0D5' },
  proof_approved:  { label: 'Proof Approved',    color: '#7A8C6E', bg: '#E8EDE4' },
  in_production:   { label: 'In Production',     color: '#4A3728', bg: '#EDE7DC' },
  shipped:         { label: 'Shipped',           color: '#7A8C6E', bg: '#E8EDE4' },
  completed:       { label: 'Completed',         color: '#A8896E', bg: '#F7F3EE' },
  revision_requested: { label: 'Revision Req.', color: '#C4714A', bg: '#F2E0D5' },
}

const VALID_STATUSES = [
  'submitted',
  'artwork_received',
  'proof_sent',
  'proof_approved',
  'in_production',
  'shipped',
  'completed',
  'revision_requested',
]

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: '#A8896E', bg: '#F7F3EE' }
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

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
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
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: 'var(--brown-light)',
        fontFamily: 'Lato, sans-serif',
      }}>
        {label}
      </span>
      <span style={{
        fontSize: 36,
        fontWeight: 700,
        color: accent || 'var(--brown)',
        fontFamily: 'Playfair Display, serif',
        lineHeight: 1,
      }}>
        {value}
      </span>
      {sub && (
        <span style={{
          fontSize: 12,
          color: 'var(--brown-light)',
          fontFamily: 'Lato, sans-serif',
        }}>
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
  messages,
  artwork,
  currentUserId,
}: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [orders, setOrders] = useState<Order[]>(initialOrders)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null)
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)
  const [statusDropdownOpen, setStatusDropdownOpen] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Realtime: listen for order changes
  useEffect(() => {
    const channel = supabase
      .channel('studio-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        router.refresh()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase, router])

  // --- Derived stats ---
  const needsArtwork = orders.filter(o => o.status === 'submitted' && !artwork.find(a => a.order_id === o.id))
  const needsProof   = orders.filter(o => o.status === 'artwork_received')
  const awaitingApproval = orders.filter(o => o.status === 'proof_sent')
  const revisionRequested = orders.filter(o => o.status === 'revision_requested')
  const inProduction = orders.filter(o => o.status === 'in_production')

  // Orders needing attention (ordered by urgency)
  const attentionOrders = [
    ...revisionRequested,
    ...needsArtwork,
    ...needsProof,
  ]

  // --- Filtered orders for main table ---
  const filtered = orders.filter(o => {
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter
    const q = search.toLowerCase()
    const matchesSearch = !q
      || o.id.toLowerCase().includes(q)
      || (o.profiles?.full_name || '').toLowerCase().includes(q)
      || (o.profiles?.email || '').toLowerCase().includes(q)
      || o.sticker_type.toLowerCase().includes(q)
    return matchesStatus && matchesSearch
  })

  // --- Update order status ---
  async function updateStatus(orderId: string, newStatus: string) {
    setUpdatingOrder(orderId)
    setStatusDropdownOpen(null)
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId)

    if (!error) {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
    }
    setUpdatingOrder(null)
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    })
  }

  function getOrderProof(orderId: string) {
    return proofs.filter(p => p.order_id === orderId)
  }

  function getOrderMessages(orderId: string) {
    return messages.filter(m => m.order_id === orderId)
  }

  function getOrderArtwork(orderId: string) {
    return artwork.filter(a => a.order_id === orderId)
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

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <p style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--terracotta)',
          marginBottom: 6,
          fontFamily: 'Lato, sans-serif',
        }}>
          Studio View
        </p>
        <h1 style={{
          fontFamily: 'Playfair Display, serif',
          fontSize: 32,
          fontWeight: 700,
          color: 'var(--brown)',
          margin: 0,
        }}>
          Good morning, {studioName.split(' ')[0]} 👋
        </h1>
        <p style={{ color: 'var(--brown-light)', fontSize: 14, marginTop: 6 }}>
          Here's everything that needs your attention today.
        </p>
      </div>

      {/* Stat Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: 16,
        marginBottom: 36,
      }}>
        <StatCard
          label="Total Orders"
          value={orders.length}
          sub="all time"
        />
        <StatCard
          label="Needs Artwork"
          value={needsArtwork.length}
          sub="awaiting upload"
          accent={needsArtwork.length > 0 ? 'var(--gold)' : undefined}
        />
        <StatCard
          label="Proofs to Send"
          value={needsProof.length}
          sub="artwork received"
          accent={needsProof.length > 0 ? 'var(--terracotta)' : undefined}
        />
        <StatCard
          label="Revisions"
          value={revisionRequested.length}
          sub="customer requested"
          accent={revisionRequested.length > 0 ? 'var(--terracotta)' : undefined}
        />
        <StatCard
          label="In Production"
          value={inProduction.length}
          sub="being printed"
          accent="var(--sage)"
        />
      </div>

      {/* Needs Attention Section */}
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
              fontSize: 18,
              fontWeight: 600,
              color: 'var(--brown)',
              margin: 0,
            }}>
              Needs Your Attention
            </h2>
            <span style={{
              background: 'var(--terracotta)',
              color: 'white',
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 700,
              padding: '2px 8px',
            }}>
              {attentionOrders.length}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {attentionOrders.map(order => (
              <div key={order.id} style={{
                background: 'var(--white)',
                border: '1px solid var(--cream-dark)',
                borderLeft: `4px solid ${order.status === 'revision_requested' ? 'var(--terracotta)' : 'var(--gold)'}`,
                borderRadius: 12,
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                boxShadow: '0 2px 8px rgba(74,55,40,0.06)',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <span style={{
                      fontFamily: 'Lato, sans-serif',
                      fontWeight: 700,
                      fontSize: 13,
                      color: 'var(--brown)',
                    }}>
                      {order.profiles?.full_name || 'Unknown Customer'}
                    </span>
                    <span style={{ color: 'var(--brown-light)', fontSize: 12 }}>·</span>
                    <span style={{ color: 'var(--brown-light)', fontSize: 12 }}>
                      {order.sticker_type} · {order.quantity} pcs
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--brown-light)' }}>
                    Order #{order.id.slice(0, 8).toUpperCase()} · {formatDate(order.created_at)}
                  </div>
                </div>
                <StatusBadge status={order.status} />
                <button
                  onClick={() => router.push(`/orders?highlight=${order.id}`)}
                  style={{
                    background: 'var(--terracotta)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    padding: '8px 16px',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    letterSpacing: '0.04em',
                    fontFamily: 'Lato, sans-serif',
                    whiteSpace: 'nowrap',
                  }}
                >
                  View Order →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Orders Table */}
      <div style={{
        background: 'var(--white)',
        border: '1px solid var(--cream-dark)',
        borderRadius: 16,
        boxShadow: '0 2px 12px rgba(74,55,40,0.08)',
        overflow: 'hidden',
      }}>
        {/* Table Header */}
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
            fontSize: 18,
            fontWeight: 600,
            color: 'var(--brown)',
            margin: 0,
          }}>
            All Orders
          </h2>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: 12, top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--brown-light)',
                fontSize: 14,
                pointerEvents: 'none',
              }}>
                🔍
              </span>
              <input
                type="text"
                placeholder="Search customer, order..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  paddingLeft: 36,
                  paddingRight: 14,
                  paddingTop: 9,
                  paddingBottom: 9,
                  borderRadius: 10,
                  border: '1px solid var(--cream-dark)',
                  background: 'var(--cream)',
                  fontSize: 13,
                  color: 'var(--brown)',
                  fontFamily: 'Lato, sans-serif',
                  outline: 'none',
                  width: 220,
                }}
              />
            </div>
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{
                padding: '9px 14px',
                borderRadius: 10,
                border: '1px solid var(--cream-dark)',
                background: 'var(--cream)',
                fontSize: 13,
                color: 'var(--brown)',
                fontFamily: 'Lato, sans-serif',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Statuses</option>
              {VALID_STATUSES.map(s => (
                <option key={s} value={s}>
                  {STATUS_CONFIG[s]?.label || s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 13,
            fontFamily: 'Lato, sans-serif',
          }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--cream-dark)' }}>
                {['Order', 'Customer', 'Type', 'Qty', 'Status', 'Date', 'Proof', 'Actions'].map(h => (
                  <th key={h} style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: 'var(--brown-light)',
                    background: 'var(--cream)',
                    whiteSpace: 'nowrap',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{
                    padding: '48px 24px',
                    textAlign: 'center',
                    color: 'var(--brown-light)',
                    fontSize: 14,
                  }}>
                    No orders match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((order, idx) => {
                  const orderProofs = getOrderProof(order.id)
                  const orderMsgs = getOrderMessages(order.id)
                  const orderArtwork = getOrderArtwork(order.id)
                  const latestProof = orderProofs[0]
                  const isExpanded = expandedOrder === order.id
                  const isUpdating = updatingOrder === order.id

                  return (
                    <>
                      <tr
                        key={order.id}
                        style={{
                          borderBottom: '1px solid var(--cream-dark)',
                          background: idx % 2 === 0 ? 'var(--white)' : 'rgba(247,243,238,0.4)',
                          transition: 'background 0.15s',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--terracotta-pale)')}
                        onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? 'var(--white)' : 'rgba(247,243,238,0.4)')}
                      >
                        {/* Order ID */}
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{
                            fontWeight: 700,
                            color: 'var(--brown)',
                            fontFamily: 'Lato, sans-serif',
                            fontSize: 12,
                            letterSpacing: '0.04em',
                          }}>
                            #{order.id.slice(0, 8).toUpperCase()}
                          </span>
                          {orderMsgs.length > 0 && (
                            <span style={{
                              marginLeft: 6,
                              background: 'var(--terracotta)',
                              color: 'white',
                              borderRadius: 20,
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '1px 6px',
                            }}>
                              {orderMsgs.length} msg{orderMsgs.length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </td>

                        {/* Customer */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--brown)', fontSize: 13 }}>
                            {order.profiles?.full_name || '—'}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--brown-light)', marginTop: 2 }}>
                            {order.profiles?.email || ''}
                          </div>
                        </td>

                        {/* Type */}
                        <td style={{ padding: '14px 16px', color: 'var(--brown)', fontSize: 13 }}>
                          {order.sticker_type}
                        </td>

                        {/* Quantity */}
                        <td style={{ padding: '14px 16px', color: 'var(--brown)', fontSize: 13, fontWeight: 600 }}>
                          {order.quantity}
                        </td>

                        {/* Status - inline dropdown */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ position: 'relative', display: 'inline-block' }}>
                            <button
                              onClick={e => {
                                e.stopPropagation()
                                setStatusDropdownOpen(statusDropdownOpen === order.id ? null : order.id)
                              }}
                              disabled={isUpdating}
                              style={{
                                background: 'none',
                                border: 'none',
                                padding: 0,
                                cursor: 'pointer',
                                opacity: isUpdating ? 0.5 : 1,
                              }}
                            >
                              <StatusBadge status={order.status} />
                              <span style={{ fontSize: 9, marginLeft: 4, color: 'var(--brown-light)' }}>▼</span>
                            </button>

                            {statusDropdownOpen === order.id && (
                              <div style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                zIndex: 100,
                                background: 'var(--white)',
                                border: '1px solid var(--cream-dark)',
                                borderRadius: 10,
                                boxShadow: '0 8px 24px rgba(74,55,40,0.15)',
                                padding: '6px 0',
                                minWidth: 180,
                                marginTop: 4,
                              }}>
                                {VALID_STATUSES.map(s => (
                                  <button
                                    key={s}
                                    onClick={e => {
                                      e.stopPropagation()
                                      updateStatus(order.id, s)
                                    }}
                                    style={{
                                      display: 'block',
                                      width: '100%',
                                      textAlign: 'left',
                                      padding: '8px 14px',
                                      background: order.status === s ? 'var(--cream)' : 'none',
                                      border: 'none',
                                      cursor: 'pointer',
                                      fontSize: 12,
                                      fontFamily: 'Lato, sans-serif',
                                      color: 'var(--brown)',
                                      fontWeight: order.status === s ? 700 : 400,
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--cream)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = order.status === s ? 'var(--cream)' : 'none')}
                                  >
                                    {STATUS_CONFIG[s]?.label || s}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Date */}
                        <td style={{ padding: '14px 16px', color: 'var(--brown-light)', fontSize: 12, whiteSpace: 'nowrap' }}>
                          {formatDate(order.created_at)}
                        </td>

                        {/* Proof status */}
                        <td style={{ padding: '14px 16px' }}>
                          {latestProof ? (
                            <span style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: latestProof.status === 'approved' ? 'var(--sage)' : 'var(--terracotta)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.06em',
                            }}>
                              {latestProof.status === 'approved' ? '✓ Approved' : latestProof.status}
                            </span>
                          ) : (
                            orderArtwork.length > 0 ? (
                              <span style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 700 }}>
                                Artwork ✓
                              </span>
                            ) : (
                              <span style={{ fontSize: 11, color: 'var(--cream-dark)' }}>—</span>
                            )
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
                                borderRadius: 8,
                                padding: '6px 12px',
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: 'pointer',
                                fontFamily: 'Lato, sans-serif',
                                transition: 'all 0.15s',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {isExpanded ? 'Close' : 'Details'}
                            </button>
                            <button
                              onClick={() => router.push(`/messages?order=${order.id}`)}
                              style={{
                                background: 'none',
                                border: '1px solid var(--cream-dark)',
                                borderRadius: 8,
                                padding: '6px 10px',
                                fontSize: 13,
                                cursor: 'pointer',
                                color: 'var(--brown-light)',
                                transition: 'all 0.15s',
                              }}
                              title="Message customer"
                            >
                              💬
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded row */}
                      {isExpanded && (
                        <tr key={`${order.id}-expanded`}>
                          <td colSpan={8} style={{ padding: 0, background: 'var(--cream)' }}>
                            <div style={{
                              padding: '20px 24px',
                              borderBottom: '1px solid var(--cream-dark)',
                              animation: 'fadeIn 0.2s ease',
                            }}>
                              <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(3, 1fr)',
                                gap: 20,
                              }}>
                                {/* Order Details */}
                                <div style={{
                                  background: 'var(--white)',
                                  borderRadius: 12,
                                  padding: '16px 18px',
                                  border: '1px solid var(--cream-dark)',
                                }}>
                                  <p style={{
                                    fontSize: 10, fontWeight: 700, letterSpacing: '0.14em',
                                    textTransform: 'uppercase', color: 'var(--brown-light)',
                                    marginBottom: 12, marginTop: 0,
                                  }}>
                                    Order Details
                                  </p>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {[
                                      ['Type', order.sticker_type],
                                      ['Quantity', order.quantity],
                                      ['Size', order.size],
                                      ['Customer', order.profiles?.full_name || '—'],
                                      ['Email', order.profiles?.email || '—'],
                                    ].map(([k, v]) => (
                                      <div key={String(k)} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                        <span style={{ color: 'var(--brown-light)' }}>{k}</span>
                                        <span style={{ color: 'var(--brown)', fontWeight: 600 }}>{v}</span>
                                      </div>
                                    ))}
                                  </div>
                                  {order.notes && (
                                    <div style={{
                                      marginTop: 12,
                                      padding: '10px 12px',
                                      background: 'var(--cream)',
                                      borderRadius: 8,
                                      fontSize: 12,
                                      color: 'var(--brown)',
                                      lineHeight: 1.5,
                                    }}>
                                      <strong style={{ color: 'var(--brown-light)', display: 'block', marginBottom: 4, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Notes</strong>
                                      {order.notes}
                                    </div>
                                  )}
                                </div>

                                {/* Artwork */}
                                <div style={{
                                  background: 'var(--white)',
                                  borderRadius: 12,
                                  padding: '16px 18px',
                                  border: '1px solid var(--cream-dark)',
                                }}>
                                  <p style={{
                                    fontSize: 10, fontWeight: 700, letterSpacing: '0.14em',
                                    textTransform: 'uppercase', color: 'var(--brown-light)',
                                    marginBottom: 12, marginTop: 0,
                                  }}>
                                    Artwork
                                  </p>
                                  {orderArtwork.length === 0 ? (
                                    <div style={{
                                      textAlign: 'center', padding: '20px 0',
                                      color: 'var(--brown-light)', fontSize: 13,
                                    }}>
                                      <div style={{ fontSize: 24, marginBottom: 8 }}>🖼️</div>
                                      No artwork uploaded yet
                                    </div>
                                  ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                      {orderArtwork.map((a, i) => (
                                        <a
                                          key={i}
                                          href={a.file_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 8,
                                            padding: '8px 10px',
                                            background: 'var(--cream)',
                                            borderRadius: 8,
                                            fontSize: 12,
                                            color: 'var(--terracotta)',
                                            textDecoration: 'none',
                                            fontWeight: 600,
                                            border: '1px solid var(--cream-dark)',
                                          }}
                                        >
                                          <span>📎</span>
                                          Artwork file {i + 1}
                                          <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--brown-light)' }}>
                                            {formatDate(a.created_at)}
                                          </span>
                                        </a>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* Proofs */}
                                <div style={{
                                  background: 'var(--white)',
                                  borderRadius: 12,
                                  padding: '16px 18px',
                                  border: '1px solid var(--cream-dark)',
                                }}>
                                  <p style={{
                                    fontSize: 10, fontWeight: 700, letterSpacing: '0.14em',
                                    textTransform: 'uppercase', color: 'var(--brown-light)',
                                    marginBottom: 12, marginTop: 0,
                                  }}>
                                    Proofs
                                  </p>
                                  {orderProofs.length === 0 ? (
                                    <div style={{
                                      textAlign: 'center', padding: '20px 0',
                                      color: 'var(--brown-light)', fontSize: 13,
                                    }}>
                                      <div style={{ fontSize: 24, marginBottom: 8 }}>📄</div>
                                      No proofs sent yet
                                    </div>
                                  ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                      {orderProofs.map((p, i) => (
                                        <div key={p.id} style={{
                                          padding: '8px 10px',
                                          background: 'var(--cream)',
                                          borderRadius: 8,
                                          border: '1px solid var(--cream-dark)',
                                        }}>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <a
                                              href={p.file_url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              style={{
                                                fontSize: 12, color: 'var(--terracotta)',
                                                textDecoration: 'none', fontWeight: 600,
                                              }}
                                            >
                                              📄 Proof {i + 1}
                                            </a>
                                            <span style={{
                                              fontSize: 10,
                                              fontWeight: 700,
                                              textTransform: 'uppercase',
                                              letterSpacing: '0.06em',
                                              color: p.status === 'approved' ? 'var(--sage)' : 'var(--gold)',
                                            }}>
                                              {p.status}
                                            </span>
                                          </div>
                                          <div style={{ fontSize: 11, color: 'var(--brown-light)', marginTop: 4 }}>
                                            {formatDate(p.created_at)}
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

        {/* Table footer */}
        <div style={{
          padding: '12px 24px',
          borderTop: '1px solid var(--cream-dark)',
          background: 'var(--cream)',
          fontSize: 12,
          color: 'var(--brown-light)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span>
            Showing {filtered.length} of {orders.length} orders
          </span>
          {statusFilter !== 'all' && (
            <button
              onClick={() => setStatusFilter('all')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--terracotta)',
                fontSize: 12,
                fontWeight: 600,
                fontFamily: 'Lato, sans-serif',
              }}
            >
              Clear filter ✕
            </button>
          )}
        </div>
      </div>

      {/* Click outside to close dropdowns */}
      {statusDropdownOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 50 }}
          onClick={() => setStatusDropdownOpen(null)}
        />
      )}

    </div>
  )
}

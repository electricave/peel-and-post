'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Order, Proof, OrderStatus, Profile } from '@/types'
import Sidebar from '@/components/layout/Sidebar'
import ArtworkUploader from '@/components/orders/ArtworkUploader'
import toast from 'react-hot-toast'

type ArtworkFile = {
  order_id: string
  file_path: string
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
  profile: Profile | null
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
  profile,
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
  const [localProofs, setLocalProofs] = useState<Proof[]>(proofs)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'current' | 'past'>('current')
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all')
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null)
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)
  const [statusDropdownOpen, setStatusDropdownOpen] = useState<string | null>(null)
  const [trackingModal, setTrackingModal] = useState<{ orderId: string } | null>(null)
  const [trackingInput, setTrackingInput] = useState('')
  const [manageMode, setManageMode] = useState(false)
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set())
  const [bulkUpdating, setBulkUpdating] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [uploadingProofFor, setUploadingProofFor] = useState<string | null>(null)
  const [proofDragOverFor, setProofDragOverFor] = useState<string | null>(null)
  const [deletingProof, setDeletingProof] = useState<string | null>(null)

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
  const shipping          = orders.filter(o => o.status === 'shipped')

  // Unread messages: messages not sent by studio that have no read_at
  const unreadCount = conversations.reduce((acc, conv) => {
    const unread = conv.messages.filter(m => m.sender_id !== currentUserId && !m.read_at)
    return acc + unread.length
  }, 0)

  // Needs attention: artwork_needed + in_review (proof to prep)
  const attentionOrders = [...needsArtwork, ...inReview]

  const PAST_STATUSES: OrderStatus[] = ['shipped', 'delivered', 'cancelled']
  const CURRENT_STATUSES: OrderStatus[] = ALL_STATUSES.filter(s => !PAST_STATUSES.includes(s))

  // Reset status filter when switching tabs
  function switchTab(t: 'current' | 'past') {
    setTab(t)
    setStatusFilter('all')
  }

  const tabStatuses = tab === 'current' ? CURRENT_STATUSES : PAST_STATUSES

  // ── Filtered table ─────────────────────────────────────────
  const filtered = orders.filter(o => {
    const inTab = tab === 'current'
      ? !PAST_STATUSES.includes(o.status)
      : PAST_STATUSES.includes(o.status)
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter
    const q = search.toLowerCase()
    const matchesSearch = !q
      || String(o.order_number).includes(q)
      || (o.profiles?.full_name || '').toLowerCase().includes(q)
      || (o.profiles?.email || '').toLowerCase().includes(q)
      || (o.profiles?.company_name || '').toLowerCase().includes(q)
      || o.product.toLowerCase().includes(q)
    return inTab && matchesStatus && matchesSearch
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

  function toggleSelectOrder(id: string) {
    setSelectedOrders(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedOrders.size === filtered.length) {
      setSelectedOrders(new Set())
    } else {
      setSelectedOrders(new Set(filtered.map(o => o.id)))
    }
  }

  async function handleBulkStatusUpdate(newStatus: OrderStatus) {
    if (selectedOrders.size === 0) return
    setBulkUpdating(true)
    // For bulk "shipped" we skip tracking (no tracking number in bulk)
    const ids = Array.from(selectedOrders)
    await Promise.all(ids.map(id =>
      fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: id, status: newStatus }),
      })
    ))
    setOrders(prev => prev.map(o =>
      selectedOrders.has(o.id) ? { ...o, status: newStatus } : o
    ))
    setSelectedOrders(new Set())
    setBulkUpdating(false)
  }

  function handleExportCSV() {
    const rows = filtered.filter(o => selectedOrders.has(o.id))
    const headers = ['Order #', 'Customer', 'Email', 'Company', 'Product', 'Qty', 'Size', 'Shape', 'Finish', 'Turnaround', 'Status', 'Est. Total', 'Final Total', 'Created At']
    const lines = [
      headers.join(','),
      ...rows.map(o => [
        o.order_number,
        `"${o.profiles?.full_name ?? ''}"`,
        `"${o.profiles?.email ?? ''}"`,
        `"${o.profiles?.company_name ?? ''}"`,
        `"${o.product}"`,
        o.quantity,
        `"${o.size}"`,
        `"${o.shape}"`,
        `"${o.finish}"`,
        `"${o.turnaround}"`,
        o.status,
        o.estimated_total ?? '',
        o.final_total ?? '',
        `"${formatDate(o.created_at)}"`,
      ].join(','))
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `peel-post-orders-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleDeleteProof(proofId: string) {
    setDeletingProof(proofId)
    try {
      const res = await fetch(`/api/proofs?proof_id=${proofId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setLocalProofs(prev => prev.filter(p => p.id !== proofId))
      toast.success('Proof deleted')
    } catch {
      toast.error('Could not delete proof')
    } finally {
      setDeletingProof(null)
    }
  }

  async function handleProofUpload(orderId: string, files: FileList | null) {
    if (!files || files.length === 0) return
    const file = files[0]
    if (file.size > 50 * 1024 * 1024) { toast.error('File exceeds 50MB limit'); return }
    setUploadingProofFor(orderId)
    try {
      const ext = file.name.split('.').pop()
      const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const storagePath = `${orderId}/${safeName}`
      const { error: uploadError } = await supabase.storage.from('proofs').upload(storagePath, file, { upsert: false })
      if (uploadError) throw uploadError
      const res = await fetch('/api/proofs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, file_url: storagePath, file_name: file.name, file_size: file.size }),
      })
      if (!res.ok) { const { error } = await res.json(); throw new Error(error ?? 'Failed to save proof') }
      const { data: newProof } = await res.json()
      if (newProof) setLocalProofs(prev => [newProof, ...prev])
      toast.success('Proof uploaded — customer notified')
    } catch (err: any) {
      toast.error(err.message ?? 'Upload failed')
    } finally {
      setUploadingProofFor(null)
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  function formatCurrency(val: number | null) {
    if (val == null) return '—'
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)
  }

  function getOrderProofs(orderId: string) {
    return localProofs
      .filter(p => p.order_id === orderId)
      .sort((a, b) => b.version - a.version)
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
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--cream)', fontFamily: 'Lato, sans-serif' }}>
      <Sidebar profile={profile} unreadMessages={unreadCount} pendingProofs={0} />
      <div style={{
        marginLeft: 260,
        flex: 1,
        padding: '36px 40px',
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
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 16,
        marginBottom: 36,
      }}>
        <StatCard label="Proof Needed"    value={inReview.length}      sub="proof to prepare"  accent={inReview.length > 0 ? 'var(--terracotta)' : undefined} />
        <StatCard label="Approval Needed" value={proofSent.length}     sub="awaiting approval" accent={proofSent.length > 0 ? 'var(--gold)' : undefined} />
        <StatCard label="In Production"   value={inProduction.length}  sub="being printed"     accent={inProduction.length > 0 ? 'var(--brown-mid)' : undefined} />
        <StatCard label="Shipping"        value={shipping.length}      sub="on their way"      accent={shipping.length > 0 ? 'var(--sage)' : undefined} />
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
                  onClick={() => {
                    const isPast = PAST_STATUSES.includes(order.status)
                    switchTab(isPast ? 'past' : 'current')
                    setStatusFilter('all')
                    setExpandedOrder(order.id)
                    setTimeout(() => {
                      document.getElementById(`order-row-${order.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    }, 50)
                  }}
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
        <div style={{ padding: '20px 24px 0', borderBottom: '1px solid var(--cream-dark)' }}>

          {/* Top row: title + manage button + search */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, fontWeight: 600, color: 'var(--brown)', margin: 0 }}>
                All Orders
              </h2>
              <button
                onClick={() => {
                  setManageMode(m => !m)
                  setSelectedOrders(new Set())
                }}
                style={{
                  padding: '5px 14px', borderRadius: 8,
                  border: `1.5px solid ${manageMode ? 'var(--terracotta)' : 'var(--cream-dark)'}`,
                  background: manageMode ? 'var(--terracotta-pale)' : 'transparent',
                  color: manageMode ? 'var(--terracotta)' : 'var(--brown-light)',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  fontFamily: 'Lato, sans-serif', transition: 'all 0.15s',
                }}
              >
                {manageMode ? '✕ Done' : 'Manage Orders'}
              </button>
            </div>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--brown-light)', fontSize: 14, pointerEvents: 'none' }}>🔍</span>
              <input
                type="text"
                placeholder="Search name, company, product..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: 36, paddingRight: 14, paddingTop: 9, paddingBottom: 9, borderRadius: 10, border: '1px solid var(--cream-dark)', background: 'var(--cream)', fontSize: 13, color: 'var(--brown)', fontFamily: 'Lato, sans-serif', outline: 'none', width: 240 }}
              />
            </div>
          </div>

          {/* Current / Past tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            {(['current', 'past'] as const).map(t => {
              const count = orders.filter(o => t === 'current' ? !PAST_STATUSES.includes(o.status) : PAST_STATUSES.includes(o.status)).length
              const active = tab === t
              return (
                <button
                  key={t}
                  onClick={() => switchTab(t)}
                  style={{
                    padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    fontFamily: 'Lato, sans-serif', fontSize: 13, fontWeight: 700,
                    background: active ? 'var(--terracotta)' : 'transparent',
                    color: active ? 'white' : 'var(--brown-light)',
                    transition: 'all 0.2s',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  {t === 'current' ? 'Current Orders' : 'Past Orders'}
                  {count > 0 && (
                    <span style={{
                      background: active ? 'rgba(255,255,255,0.25)' : 'var(--cream-dark)',
                      color: active ? 'white' : 'var(--brown-mid)',
                      fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 8,
                    }}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Status filter chips — Proof first, All last */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingBottom: 14 }}>
            {/* In Review chip always shown first, labelled "Proof" */}
            {tab === 'current' && (() => {
              const s = 'in_review' as OrderStatus
              const cfg = STATUS_CONFIG[s]
              const count = orders.filter(o => o.status === s).length
              const active = statusFilter === s
              const empty = count === 0
              return (
                <button
                  key={s}
                  onClick={() => !empty && setStatusFilter(active ? 'all' : s)}
                  style={{
                    padding: '5px 14px', borderRadius: 20,
                    cursor: empty ? 'default' : 'pointer',
                    fontFamily: 'Lato, sans-serif', fontSize: 12, fontWeight: 700,
                    border: `1.5px solid ${active ? cfg.color : 'var(--cream-dark)'}`,
                    background: active ? cfg.bg : 'transparent',
                    color: active ? cfg.color : empty ? 'var(--cream-dark)' : 'var(--brown-light)',
                    opacity: empty ? 0.5 : 1,
                    transition: 'all 0.15s',
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                  }}
                >
                  Proof
                  {count > 0 && (
                    <span style={{
                      fontSize: 10, fontWeight: 700,
                      background: active ? cfg.color : 'var(--cream-dark)',
                      color: active ? 'white' : 'var(--brown-mid)',
                      padding: '0px 5px', borderRadius: 8,
                    }}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })()}

            {/* Remaining status chips (excluding in_review which is handled above) */}
            {tabStatuses.filter(s => s !== 'in_review').map(s => {
              const cfg = STATUS_CONFIG[s]
              const count = orders.filter(o => o.status === s).length
              const active = statusFilter === s
              const empty = count === 0
              return (
                <button
                  key={s}
                  onClick={() => !empty && setStatusFilter(active ? 'all' : s)}
                  style={{
                    padding: '5px 14px', borderRadius: 20,
                    cursor: empty ? 'default' : 'pointer',
                    fontFamily: 'Lato, sans-serif', fontSize: 12, fontWeight: 700,
                    border: `1.5px solid ${active ? cfg.color : 'var(--cream-dark)'}`,
                    background: active ? cfg.bg : 'transparent',
                    color: active ? cfg.color : empty ? 'var(--cream-dark)' : 'var(--brown-light)',
                    opacity: empty ? 0.5 : 1,
                    transition: 'all 0.15s',
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                  }}
                >
                  {cfg.label}
                  {count > 0 && (
                    <span style={{
                      fontSize: 10, fontWeight: 700,
                      background: active ? cfg.color : 'var(--cream-dark)',
                      color: active ? 'white' : 'var(--brown-mid)',
                      padding: '0px 5px', borderRadius: 8,
                    }}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}

            {/* All — always last */}
            <button
              onClick={() => setStatusFilter('all')}
              style={{
                padding: '5px 14px', borderRadius: 20, cursor: 'pointer',
                fontFamily: 'Lato, sans-serif', fontSize: 12, fontWeight: 700,
                border: `1.5px solid ${statusFilter === 'all' ? 'var(--brown)' : 'var(--cream-dark)'}`,
                background: statusFilter === 'all' ? 'var(--brown)' : 'transparent',
                color: statusFilter === 'all' ? 'white' : 'var(--brown-light)',
                transition: 'all 0.15s',
              }}
            >
              All
            </button>
          </div>
        </div>

        {/* Bulk actions bar */}
        {manageMode && selectedOrders.size > 0 && (
          <div style={{
            padding: '12px 24px',
            background: 'var(--brown)',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'white', fontFamily: 'Lato, sans-serif' }}>
              {selectedOrders.size} order{selectedOrders.size > 1 ? 's' : ''} selected
            </span>
            <div style={{ flex: 1 }} />
            <select
              disabled={bulkUpdating}
              defaultValue=""
              onChange={e => {
                if (e.target.value) handleBulkStatusUpdate(e.target.value as OrderStatus)
                e.target.value = ''
              }}
              style={{
                padding: '7px 12px', borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.12)', fontSize: 12,
                color: 'white', fontFamily: 'Lato, sans-serif',
                cursor: 'pointer', outline: 'none',
                opacity: bulkUpdating ? 0.5 : 1,
              }}
            >
              <option value="" disabled style={{ color: '#333' }}>Set status…</option>
              {ALL_STATUSES.filter(s => s !== 'shipped').map(s => (
                <option key={s} value={s} style={{ color: '#333' }}>{STATUS_CONFIG[s].label}</option>
              ))}
            </select>
            <button
              onClick={handleExportCSV}
              disabled={bulkUpdating}
              style={{
                padding: '7px 14px', borderRadius: 8,
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: 'white', fontSize: 12, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'Lato, sans-serif',
              }}
            >
              ↓ Export CSV
            </button>
            <button
              onClick={() => setSelectedOrders(new Set())}
              style={{
                padding: '7px 12px', borderRadius: 8,
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.2)',
                color: 'rgba(255,255,255,0.7)', fontSize: 12,
                cursor: 'pointer', fontFamily: 'Lato, sans-serif',
              }}
            >
              ✕ Clear
            </button>
            {bulkUpdating && (
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Updating…</span>
            )}
          </div>
        )}

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: 'Lato, sans-serif' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--cream-dark)' }}>
                {manageMode && (
                  <th style={{ padding: '12px 16px', background: 'var(--cream)', width: 40 }}>
                    <input
                      type="checkbox"
                      checked={filtered.length > 0 && selectedOrders.size === filtered.length}
                      ref={el => { if (el) el.indeterminate = selectedOrders.size > 0 && selectedOrders.size < filtered.length }}
                      onChange={toggleSelectAll}
                      style={{ cursor: 'pointer', width: 15, height: 15, accentColor: 'var(--terracotta)' }}
                    />
                  </th>
                )}
                {['#', 'Customer', 'Product', 'Qty', 'Finish / Shape', 'Total', 'Status', 'Proof'].map(h => (
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
                  <td colSpan={manageMode ? 9 : 8} style={{
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
                        id={`order-row-${order.id}`}
                        onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                        style={{
                          borderBottom: '1px solid var(--cream-dark)',
                          background: selectedOrders.has(order.id)
                            ? '#D9B8A3'
                            : isExpanded
                            ? 'var(--terracotta-pale)'
                            : idx % 2 === 0 ? 'var(--white)' : 'rgba(247,243,238,0.4)',
                          transition: 'background 0.15s',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={e => { if (!selectedOrders.has(order.id) && !isExpanded) e.currentTarget.style.background = 'var(--terracotta-pale)' }}
                        onMouseLeave={e => { if (!selectedOrders.has(order.id)) e.currentTarget.style.background = isExpanded ? 'var(--terracotta-pale)' : idx % 2 === 0 ? 'var(--white)' : 'rgba(247,243,238,0.4)' }}
                      >
                        {/* Checkbox — only visible in manage mode */}
                        {manageMode && (
                          <td
                            style={{
                              padding: '14px 16px',
                              borderLeft: selectedOrders.has(order.id) ? '3px solid var(--terracotta)' : '3px solid transparent',
                              transition: 'border-color 0.15s',
                            }}
                            onClick={e => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={selectedOrders.has(order.id)}
                              onChange={() => toggleSelectOrder(order.id)}
                              style={{ cursor: 'pointer', width: 15, height: 15, accentColor: 'var(--terracotta)' }}
                            />
                          </td>
                        )}

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
                              onMouseEnter={e => e.stopPropagation()}
                              onMouseLeave={e => e.stopPropagation()}
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

                      </tr>

                      {/* ── Expanded detail row ─────────────────────── */}
                      {isExpanded && (
                        <tr key={`${order.id}-expanded`}>
                          <td colSpan={manageMode ? 9 : 8} style={{ padding: 0, background: 'var(--cream)' }}>
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
                                  <ArtworkUploader
                                    orderId={order.id}
                                    userId={currentUserId}
                                    isStudio={true}
                                  />
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
                                  {/* Upload dropzone */}
                                  {!['shipped', 'delivered', 'cancelled'].includes(order.status) && (
                                    <div
                                      onDragOver={e => { e.preventDefault(); setProofDragOverFor(order.id) }}
                                      onDragLeave={() => setProofDragOverFor(null)}
                                      onDrop={e => { e.preventDefault(); setProofDragOverFor(null); handleProofUpload(order.id, e.dataTransfer.files) }}
                                      onClick={() => !uploadingProofFor && (document.getElementById(`proof-input-${order.id}`) as HTMLInputElement)?.click()}
                                      style={{
                                        border: `2px dashed ${proofDragOverFor === order.id ? 'var(--terracotta)' : 'var(--cream-dark)'}`,
                                        borderRadius: 10, padding: '14px 12px', textAlign: 'center',
                                        cursor: uploadingProofFor ? 'default' : 'pointer',
                                        background: proofDragOverFor === order.id ? 'var(--terracotta-pale)' : 'var(--cream)',
                                        transition: 'all 0.2s', marginBottom: 12,
                                      }}
                                    >
                                      {uploadingProofFor === order.id ? (
                                        <p style={{ margin: 0, fontSize: 12, color: 'var(--brown-light)' }}>⏳ Uploading…</p>
                                      ) : (
                                        <>
                                          <p style={{ margin: 0, fontSize: 12, color: 'var(--brown-light)' }}>
                                            🖼 Drop proof or <span style={{ color: 'var(--terracotta)', fontWeight: 700 }}>browse</span>
                                          </p>
                                          <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--brown-light)' }}>
                                            PNG, JPG, PDF, AI · Max 50MB
                                          </p>
                                        </>
                                      )}
                                    </div>
                                  )}
                                  <input
                                    id={`proof-input-${order.id}`}
                                    type="file"
                                    accept=".png,.jpg,.jpeg,.pdf,.ai,.eps,.svg"
                                    style={{ display: 'none' }}
                                    onChange={e => handleProofUpload(order.id, e.target.files)}
                                  />

                                  {orderProofs.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '12px 0', color: 'var(--brown-light)', fontSize: 13 }}>
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
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                              <span style={{
                                                fontSize: 10, fontWeight: 700,
                                                textTransform: 'uppercase', letterSpacing: '0.06em',
                                                color: p.status === 'approved' ? 'var(--sage)'
                                                  : p.status === 'revision' ? 'var(--terracotta)'
                                                  : 'var(--gold)',
                                              }}>
                                                {p.status}
                                              </span>
                                              <button
                                                onClick={() => handleDeleteProof(p.id)}
                                                disabled={deletingProof === p.id}
                                                title="Delete proof"
                                                style={{
                                                  background: 'none', border: 'none',
                                                  cursor: deletingProof === p.id ? 'default' : 'pointer',
                                                  color: deletingProof === p.id ? 'var(--cream-dark)' : '#C05050',
                                                  fontSize: 13, lineHeight: 1, padding: '2px 4px',
                                                  borderRadius: 4,
                                                }}
                                              >
                                                ✕
                                              </button>
                                            </div>
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
        }}>
          Showing {filtered.length} order{filtered.length !== 1 ? 's' : ''}
          {statusFilter !== 'all' ? ` · ${STATUS_CONFIG[statusFilter].label}` : ''}
          {search ? ` matching "${search}"` : ''}
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
    </div>
  )
}

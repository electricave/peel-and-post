'use client'

import { useState, useRef } from 'react'
import type { Order, Proof } from '@/types'
import toast from 'react-hot-toast'
import ArtworkUploader from '@/components/orders/ArtworkUploader'
import { createClient } from '@/lib/supabase/client'

const STATUS_STYLES: Record<string, { label: string; bg: string; color: string }> = {
  pending:        { label: 'Pending',         bg: '#EDE7DC', color: '#7A5C48' },
  artwork_needed: { label: 'Artwork Needed',  bg: '#FEF3CD', color: '#7A5C00' },
  in_review:      { label: 'In Review',       bg: '#FEF3CD', color: '#7A5C00' },
  proof_sent:     { label: 'Proof Review',    bg: '#FEF3CD', color: '#7A5C00' },
  proof_approved: { label: 'Approved',        bg: '#E8EDE4', color: '#7A8C6E' },
  paid:           { label: 'Paid',            bg: '#E8EDE4', color: '#7A8C6E' },
  in_production:  { label: 'In Production',   bg: '#F2E0D5', color: '#C4714A' },
  shipped:        { label: 'Shipped',         bg: '#E8EDE4', color: '#7A8C6E' },
  delivered:      { label: 'Delivered',       bg: '#E8EDE4', color: '#7A8C6E' },
  cancelled:      { label: 'Cancelled',       bg: '#FCE4E4', color: '#B03030' },
}

export function StatusPill({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.pending
  return (
    <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', whiteSpace: 'nowrap', background: s.bg, color: s.color }}>
      {s.label}
    </span>
  )
}

const PRODUCT_EMOJI: Record<string, string> = {
  'Die-Cut Stickers': '✂️',
  'Kiss-Cut Sheets': '📄',
  'Holographic Stickers': '🌈',
  'Clear Stickers': '🔍',
}

export function OrderCard({ order, userId, isStudio, onProofAction, onMessage }: {
  order: Order
  userId: string
  isStudio: boolean
  onProofAction?: () => void
  onMessage?: () => void
}) {
  const supabase = createClient()
  const proofInputRef = useRef<HTMLInputElement>(null)

  const [open, setOpen] = useState(false)
  const [proofs, setProofs] = useState<Proof[]>([])
  const [loadingProofs, setLoadingProofs] = useState(false)
  const [reviewingProof, setReviewingProof] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')
  const [checkingOut, setCheckingOut] = useState(false)
  const [uploadingProof, setUploadingProof] = useState(false)
  const [proofDragOver, setProofDragOver] = useState(false)

  async function loadProofs() {
    if (proofs.length > 0) return
    setLoadingProofs(true)
    try {
      const res = await fetch(`/api/proofs?orderId=${order.id}`)
      const { data } = await res.json()
      setProofs(data ?? [])
    } finally {
      setLoadingProofs(false)
    }
  }

  function toggleOpen() {
    if (!open) loadProofs()
    setOpen(o => !o)
  }

  async function handleProofAction(proofId: string, action: 'approved' | 'revision') {
    try {
      const res = await fetch('/api/proofs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proof_id: proofId, action, feedback }),
      })
      if (!res.ok) throw new Error()
      toast.success(action === 'approved' ? '✓ Proof approved — heading to print!' : '↩ Revision request sent to studio')
      setProofs(prev => prev.map(p => p.id === proofId ? { ...p, status: action } : p))
      setReviewingProof(null)
      setFeedback('')
      onProofAction?.()
    } catch {
      toast.error('Something went wrong')
    }
  }

  async function handlePayNow() {
    setCheckingOut(true)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id }),
      })
      const { url, error } = await res.json()
      if (error) throw new Error(error)
      window.location.href = url
    } catch (err: any) {
      toast.error(err.message || 'Could not start checkout')
      setCheckingOut(false)
    }
  }

  async function handleProofUpload(files: FileList | null) {
    if (!files || files.length === 0) return
    const file = files[0]
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File exceeds 50MB limit')
      return
    }
    setUploadingProof(true)
    try {
      const ext = file.name.split('.').pop()
      const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const storagePath = `${order.id}/${safeName}`

      const { error: uploadError } = await supabase.storage
        .from('proofs')
        .upload(storagePath, file, { upsert: false })
      if (uploadError) throw uploadError

      const res = await fetch('/api/proofs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: order.id,
          file_url: storagePath,
          file_name: file.name,
          file_size: file.size,
        }),
      })
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error ?? 'Failed to save proof')
      }
      const { data: newProof } = await res.json()
      setProofs(prev => [newProof, ...prev])
      toast.success('Proof uploaded — customer notified')
      if (proofInputRef.current) proofInputRef.current.value = ''
    } catch (err: any) {
      toast.error(err.message ?? 'Upload failed')
    } finally {
      setUploadingProof(false)
    }
  }

  const emoji = PRODUCT_EMOJI[order.product] ?? '🏷️'
  const showPayNow = !isStudio && order.status === 'proof_approved' && order.final_total
  const showPaidBanner = !isStudio && (order.status === 'paid' || order.status === 'in_production')

  return (
    <div style={{ background: 'var(--white)', borderRadius: '14px', border: '1px solid var(--cream-dark)', boxShadow: 'var(--shadow-card)', marginBottom: '12px', overflow: 'hidden', transition: 'box-shadow 0.2s' }}>
      {/* Summary row - always visible */}
      <div onClick={toggleOpen} style={{ padding: '18px 24px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', userSelect: 'none' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: 'linear-gradient(135deg, var(--terracotta-pale), var(--cream-dark))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>
          {emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--brown-light)', marginBottom: '3px' }}>
            Order #{order.order_number}
          </div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '16px', fontWeight: 600, color: 'var(--brown)', marginBottom: '4px' }}>
            {order.product}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>
            {order.quantity} units · Placed {new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            {order.estimated_ship_at && ` · Est. ship ${new Date(order.estimated_ship_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          {/* Pay Now badge in summary row */}
          {showPayNow && (
            <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', background: '#F2E0D5', color: '#C4714A', whiteSpace: 'nowrap' }}>
              💳 Payment Due
            </span>
          )}
          <StatusPill status={order.status} />
          <span style={{ fontSize: '11px', color: 'var(--brown-light)', transition: 'transform 0.25s', display: 'inline-block', transform: open ? 'rotate(180deg)' : 'none' }}>▼</span>
        </div>
      </div>

      {/* Expanded body */}
      {open && (
        <div style={{ borderTop: '1px solid var(--cream-dark)' }}>
          <div style={{ padding: '20px 24px' }}>
            {/* Order details */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', background: 'var(--cream)', borderRadius: '12px', border: '1px solid var(--cream-dark)', padding: '16px 20px', marginBottom: '20px' }}>
              {[['Finish', order.finish], ['Size', order.size], ['Shape', order.shape], ['Turnaround', order.turnaround]].map(([label, value]) => (
                <div key={label}>
                  <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--brown-light)', marginBottom: '4px' }}>{label}</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--brown)' }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Pay Now banner */}
            {showPayNow && (
              <div style={{
                background: 'linear-gradient(135deg, #FDF4EF, #F9EBE2)',
                border: '1.5px solid #E8B99A',
                borderRadius: '12px',
                padding: '20px 24px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
              }}>
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#C4714A', marginBottom: '4px' }}>
                    Ready for Payment
                  </div>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', fontWeight: 700, color: '#4A3728' }}>
                    ${Number(order.final_total).toFixed(2)}
                  </div>
                  <div style={{ fontSize: '12px', color: '#A8896E', marginTop: '2px' }}>
                    Your proof has been approved — pay to start production
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handlePayNow() }}
                  disabled={checkingOut}
                  style={{
                    padding: '12px 28px',
                    borderRadius: '8px',
                    background: checkingOut ? '#E8B99A' : '#C4714A',
                    color: 'white',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: 700,
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    cursor: checkingOut ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'background 0.2s',
                  }}
                >
                  {checkingOut ? 'Redirecting…' : '💳 Pay Now'}
                </button>
              </div>
            )}

            {/* Paid / in production confirmation banner */}
            {showPaidBanner && (
              <div style={{
                background: 'linear-gradient(135deg, #EFF4EB, #E4EDE0)',
                border: '1.5px solid #B2C9A4',
                borderRadius: '12px',
                padding: '20px 24px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
              }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%',
                  background: '#7A8C6E', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', flexShrink: 0,
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#7A8C6E', marginBottom: '4px' }}>
                    Payment Confirmed
                  </div>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '16px', fontWeight: 700, color: '#4A3728' }}>
                    {order.status === 'in_production' ? 'Your stickers are in production' : 'Payment received — heading to production'}
                  </div>
                  {order.final_total && (
                    <div style={{ fontSize: '12px', color: '#7A8C6E', marginTop: '2px' }}>
                      ${Number(order.final_total).toFixed(2)} paid · We'll notify you when your order ships
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Proofs */}
            {loadingProofs ? (
              <div style={{ color: 'var(--brown-light)', fontSize: '13px', padding: '12px 0' }}>Loading proofs…</div>
            ) : proofs.length > 0 ? (
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--brown-light)', marginBottom: '14px' }}>Proofs & Files</div>
                {proofs.map(proof => (
                  <div key={proof.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid var(--cream-dark)' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--terracotta-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>🖼</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--brown)', marginBottom: '2px' }}>{proof.file_name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>Version {proof.version} · {new Date(proof.created_at).toLocaleDateString()}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {proof.status === 'pending' ? (
                        reviewingProof === proof.id ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '240px' }}>
                            <textarea
                              placeholder="Revision notes (optional)…"
                              value={feedback}
                              onChange={e => setFeedback(e.target.value)}
                              rows={2}
                              style={{ padding: '8px 12px', borderRadius: '8px', border: '1.5px solid var(--cream-dark)', background: 'var(--cream)', fontSize: '13px', resize: 'none', outline: 'none' }}
                            />
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button onClick={() => handleProofAction(proof.id, 'approved')} style={{ flex: 1, padding: '7px', borderRadius: '7px', background: 'var(--sage)', color: 'white', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>✓ Approve</button>
                              <button onClick={() => handleProofAction(proof.id, 'revision')} style={{ flex: 1, padding: '7px', borderRadius: '7px', background: 'transparent', border: '1.5px solid var(--cream-dark)', color: 'var(--brown-mid)', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>↩ Revise</button>
                              <button onClick={() => setReviewingProof(null)} style={{ padding: '7px 10px', borderRadius: '7px', background: 'transparent', border: 'none', color: 'var(--brown-light)', cursor: 'pointer' }}>✕</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', background: '#FEF3CD', color: '#7A5C00' }}>⏳ Needs Approval</span>
                            <button onClick={() => setReviewingProof(proof.id)} style={{ padding: '7px 16px', borderRadius: '7px', background: 'var(--terracotta)', color: 'white', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>Review</button>
                          </>
                        )
                      ) : proof.status === 'approved' ? (
                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', background: 'var(--sage-pale)', color: 'var(--sage)' }}>✓ Approved</span>
                      ) : (
                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', background: '#FCE4E4', color: '#B03030' }}>↩ Revision Requested</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '13px', color: 'var(--brown-light)', fontStyle: 'italic' }}>No proofs yet — the studio will share one shortly.</div>
            )}

            {/* Studio — Upload Proof */}
            {isStudio && !['shipped', 'delivered', 'cancelled'].includes(order.status) && (
              <div style={{ marginTop: '24px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--brown-light)', marginBottom: '12px' }}>
                  Upload Proof
                </div>
                <div
                  onDragOver={e => { e.preventDefault(); setProofDragOver(true) }}
                  onDragLeave={() => setProofDragOver(false)}
                  onDrop={e => { e.preventDefault(); setProofDragOver(false); handleProofUpload(e.dataTransfer.files) }}
                  onClick={() => !uploadingProof && proofInputRef.current?.click()}
                  style={{
                    border: `2px dashed ${proofDragOver ? 'var(--terracotta)' : 'var(--cream-dark)'}`,
                    borderRadius: '10px',
                    padding: '20px 16px',
                    textAlign: 'center',
                    cursor: uploadingProof ? 'default' : 'pointer',
                    background: proofDragOver ? 'var(--terracotta-pale)' : 'var(--cream)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {uploadingProof ? (
                    <>
                      <div style={{ fontSize: '20px', marginBottom: '4px' }}>⏳</div>
                      <p style={{ margin: 0, fontSize: '13px', color: 'var(--brown-light)', fontFamily: 'Lato, sans-serif' }}>
                        Uploading proof…
                      </p>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: '20px', marginBottom: '4px' }}>🖼</div>
                      <p style={{ margin: 0, fontSize: '13px', color: 'var(--brown-light)', fontFamily: 'Lato, sans-serif' }}>
                        Drop proof here or <span style={{ color: 'var(--terracotta)', fontWeight: 700 }}>browse</span>
                      </p>
                      <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--brown-light)', fontFamily: 'Lato, sans-serif' }}>
                        PNG, JPG, PDF, AI · Max 50MB · Customer is notified on upload
                      </p>
                    </>
                  )}
                </div>
                <input
                  ref={proofInputRef}
                  type="file"
                  accept=".png,.jpg,.jpeg,.pdf,.ai,.eps,.svg"
                  style={{ display: 'none' }}
                  onChange={e => handleProofUpload(e.target.files)}
                />
              </div>
            )}

            {/* Artwork Uploader */}
            <ArtworkUploader
              orderId={order.id}
              userId={userId}
              isStudio={isStudio}
            />
          </div>

          {/* Action buttons */}
          <div style={{ padding: '14px 24px', borderTop: '1px solid var(--cream-dark)', display: 'flex', gap: '10px', background: 'var(--cream)' }}>
            <button
              onClick={onMessage}
              style={{ padding: '9px 18px', borderRadius: '8px', background: 'transparent', border: '1.5px solid var(--cream-dark)', color: 'var(--brown-mid)', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
            >
              💬 Message Studio
            </button>
            {order.tracking_number && (
              <button style={{ padding: '9px 18px', borderRadius: '8px', background: 'transparent', border: '1.5px solid var(--cream-dark)', color: 'var(--brown-mid)', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                📦 Track Shipment
              </button>
            )}
            <a
              href={`/orders/${order.id}/invoice`}
              onClick={(e) => e.stopPropagation()}
              style={{ padding: '9px 18px', borderRadius: '8px', background: 'transparent', border: '1.5px solid var(--cream-dark)', color: 'var(--brown-mid)', fontSize: '13px', fontWeight: 700, cursor: 'pointer', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              🧾 View Invoice
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

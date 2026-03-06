'use client'

import type { Order, Profile } from '@/types'

type InvoiceOrder = Order & { profiles: Profile | null }

const STATUS_LABELS: Record<string, string> = {
  pending:        'Pending',
  artwork_needed: 'Artwork Needed',
  in_review:      'In Review',
  proof_sent:     'Proof Sent',
  proof_approved: 'Approved',
  paid:           'Paid',
  in_production:  'In Production',
  shipped:        'Shipped',
  delivered:      'Delivered',
  cancelled:      'Cancelled',
}

const STATUS_COLORS: Record<string, string> = {
  pending:        '#A8896E',
  artwork_needed: '#C9A84C',
  in_review:      '#C9A84C',
  proof_sent:     '#C9A84C',
  proof_approved: '#7A8C6E',
  paid:           '#7A8C6E',
  in_production:  '#C4714A',
  shipped:        '#7A8C6E',
  delivered:      '#7A8C6E',
  cancelled:      '#B03030',
}

function formatCurrency(cents: number | null): string {
  if (cents == null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

export default function InvoiceView({ order }: { order: InvoiceOrder }) {
  const statusLabel = STATUS_LABELS[order.status] ?? order.status
  const statusColor = STATUS_COLORS[order.status] ?? '#A8896E'
  const isPaid = ['paid', 'in_production', 'shipped', 'delivered'].includes(order.status)
  const displayTotal = order.final_total ?? order.estimated_total

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #invoice-printable, #invoice-printable * { visibility: visible !important; }
          #invoice-printable { position: fixed; top: 0; left: 0; width: 100%; }
          #invoice-actions { display: none !important; }
        }
        @page { margin: 0.75in; }
      `}</style>

      <div style={{
        minHeight: '100vh',
        backgroundColor: '#F7F3EE',
        padding: '40px 24px',
        fontFamily: "'Lato', sans-serif",
      }}>
        {/* Actions bar — hidden on print */}
        <div id="invoice-actions" style={{
          maxWidth: 760, margin: '0 auto 24px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <a href="/orders" style={{
            color: '#A8896E', textDecoration: 'none',
            fontSize: 13, fontWeight: 700,
            letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            ← Back to Orders
          </a>
          <div style={{ flex: 1 }} />
          <button
            onClick={() => window.print()}
            style={{
              backgroundColor: '#C4714A', color: '#fff',
              border: 'none', borderRadius: 6,
              padding: '10px 20px',
              fontFamily: "'Lato', sans-serif",
              fontSize: 13, fontWeight: 700,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Print / Save PDF
          </button>
        </div>

        {/* Invoice card */}
        <div id="invoice-printable" style={{
          maxWidth: 760, margin: '0 auto',
          backgroundColor: '#fff',
          borderRadius: 12,
          border: '1px solid #EDE7DC',
          overflow: 'hidden',
        }}>

          {/* Header */}
          <div style={{
            backgroundColor: '#4A3728',
            padding: '36px 48px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          }}>
            <div>
              <div style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 28, fontWeight: 700,
                color: '#F7F3EE', letterSpacing: '0.02em',
              }}>
                Peel &amp; Post Studio
              </div>
              <div style={{ color: '#A8896E', fontSize: 13, marginTop: 4 }}>
                Custom Sticker Printing
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 22, fontWeight: 700, color: '#F7F3EE',
              }}>
                Invoice
              </div>
              <div style={{ color: '#A8896E', fontSize: 13, marginTop: 4 }}>
                #{String(order.order_number).padStart(4, '0')}
              </div>
            </div>
          </div>

          {/* Meta row */}
          <div style={{
            padding: '24px 48px',
            backgroundColor: '#FAF7F4',
            borderBottom: '1px solid #EDE7DC',
            display: 'flex', gap: 48, flexWrap: 'wrap',
          }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', color: '#A8896E', textTransform: 'uppercase', marginBottom: 4 }}>Date</div>
              <div style={{ fontSize: 14, color: '#4A3728' }}>{formatDate(order.created_at)}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', color: '#A8896E', textTransform: 'uppercase', marginBottom: 4 }}>Status</div>
              <div style={{
                display: 'inline-block', fontSize: 12, fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                color: statusColor, backgroundColor: statusColor + '18',
                borderRadius: 4, padding: '2px 8px',
              }}>
                {statusLabel}
              </div>
            </div>
            {isPaid && order.paid_at && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', color: '#A8896E', textTransform: 'uppercase', marginBottom: 4 }}>Paid On</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#7A8C6E' }}>
                  {formatDate(order.paid_at)} ✓
                </div>
              </div>
            )}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', color: '#A8896E', textTransform: 'uppercase', marginBottom: 4 }}>Order ID</div>
              <div style={{ fontSize: 11, color: '#A8896E', fontFamily: 'monospace' }}>{order.id}</div>
            </div>
          </div>

          {/* Bill to */}
          <div style={{ padding: '28px 48px', borderBottom: '1px solid #EDE7DC' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', color: '#A8896E', textTransform: 'uppercase', marginBottom: 10 }}>Bill To</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#4A3728' }}>
              {order.profiles?.full_name ?? '—'}
            </div>
            {order.profiles?.company_name && (
              <div style={{ fontSize: 13, color: '#4A3728', marginTop: 2 }}>{order.profiles.company_name}</div>
            )}
            <div style={{ fontSize: 14, color: '#A8896E', marginTop: 2 }}>
              {order.profiles?.email ?? '—'}
            </div>
          </div>

          {/* Line items */}
          <div style={{ padding: '28px 48px', borderBottom: '1px solid #EDE7DC' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', color: '#A8896E', textTransform: 'uppercase', marginBottom: 16 }}>Order Details</div>

            {/* Column headers */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr auto auto',
              gap: '0 24px', fontSize: 11, fontWeight: 700,
              letterSpacing: '0.1em', color: '#A8896E', textTransform: 'uppercase',
              paddingBottom: 8, borderBottom: '1px solid #EDE7DC', marginBottom: 12,
            }}>
              <span>Description</span>
              <span style={{ textAlign: 'right' }}>Qty</span>
              <span style={{ textAlign: 'right' }}>Total</span>
            </div>

            {/* Main line item */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr auto auto',
              gap: '0 24px', padding: '12px 0',
              borderBottom: '1px solid #F0EAE2',
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#4A3728' }}>
                  {order.product}
                </div>
                <div style={{ fontSize: 12, color: '#A8896E', marginTop: 4, lineHeight: 1.6 }}>
                  {order.size} · {order.shape} · {order.finish}
                </div>
                {order.turnaround && (
                  <div style={{ fontSize: 12, color: '#A8896E' }}>
                    Turnaround: {order.turnaround}
                  </div>
                )}
              </div>
              <div style={{ fontSize: 14, color: '#4A3728', textAlign: 'right', whiteSpace: 'nowrap', alignSelf: 'center' }}>
                {order.quantity.toLocaleString()}
              </div>
              <div style={{ fontSize: 14, color: '#4A3728', textAlign: 'right', whiteSpace: 'nowrap', alignSelf: 'center' }}>
                {formatCurrency(displayTotal)}
              </div>
            </div>
          </div>

          {/* Total */}
          <div style={{ padding: '20px 48px', borderBottom: '1px solid #EDE7DC' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ width: 240 }}>
                {order.final_total && order.estimated_total && order.final_total !== order.estimated_total && (
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    fontSize: 13, color: '#A8896E',
                    paddingBottom: 8, borderBottom: '1px solid #EDE7DC', marginBottom: 10,
                  }}>
                    <span>Estimate</span>
                    <span>{formatCurrency(order.estimated_total)}</span>
                  </div>
                )}
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  fontSize: 17, fontWeight: 700, color: '#4A3728',
                }}>
                  <span>{isPaid ? 'Total Paid' : 'Total'}</span>
                  <span>{formatCurrency(displayTotal)}</span>
                </div>
                {!isPaid && (
                  <div style={{ fontSize: 11, color: '#A8896E', marginTop: 4, textAlign: 'right' }}>
                    {order.final_total ? 'Final amount' : 'Estimated — final confirmed on approval'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div style={{ padding: '20px 48px', borderBottom: '1px solid #EDE7DC' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', color: '#A8896E', textTransform: 'uppercase', marginBottom: 8 }}>Notes</div>
              <div style={{ fontSize: 14, color: '#4A3728', lineHeight: 1.6 }}>{order.notes}</div>
            </div>
          )}

          {/* Footer */}
          <div style={{
            padding: '24px 48px',
            textAlign: 'center',
            backgroundColor: '#FAF7F4',
          }}>
            <div style={{ fontSize: 12, color: '#A8896E' }}>
              Thank you for your order. Questions? Reply to your order thread in the portal.
            </div>
            <div style={{ fontSize: 11, color: '#C4A08A', marginTop: 6 }}>
              peel-and-post.vercel.app
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import type { Order } from '@/types'

const TOTAL_STEPS = 7

const STEPS = {
  1: { title: 'Choose your product',       sub: 'What type of sticker would you like to order?' },
  2: { title: 'Choose your quantity',      sub: 'How many would you like?' },
  3: { title: 'Choose your finish',        sub: 'How should the surface look and feel?' },
  4: { title: 'Choose your size',          sub: 'What dimensions do you need?' },
  5: { title: 'Choose your shape',         sub: 'What shape should they be cut to?' },
  6: { title: 'Choose your turnaround',    sub: 'How quickly do you need your order?' },
  7: { title: 'Review your order',         sub: 'Everything look right? Submit to notify the studio.' },
}

const PRODUCTS = [
  { value: 'Die-Cut Stickers',     emoji: '✂️', desc: 'Custom-shaped stickers cut to your exact design outline',    price: 'From $0.18 / sticker' },
  { value: 'Kiss-Cut Sheets',      emoji: '📄', desc: 'Multiple stickers on a single backing sheet, easy to peel', price: 'From $2.50 / sheet' },
  { value: 'Holographic Stickers', emoji: '🌈', desc: 'Dazzling rainbow-shimmer foil finish on any shape',          price: 'From $0.35 / sticker' },
  { value: 'Clear Stickers',       emoji: '🔍', desc: 'Transparent background for a no-label, printed-on look',     price: 'From $0.22 / sticker' },
]

const QUANTITIES = [
  { value: '50',  emoji: '🔹', desc: 'Great for samples, events, or testing a new design' },
  { value: '100', emoji: '🔷', desc: 'Popular choice for small runs and product launches' },
  { value: '200', emoji: '📦', desc: 'Perfect for markets, pop-ups, and giveaways' },
  { value: '300', emoji: '🗂️', desc: 'Great value for ongoing use and retail stocking' },
  { value: '500', emoji: '🏭', desc: 'High-volume run with the best per-unit pricing' },
]

const FINISHES = [
  { value: 'Glossy', emoji: '💎', desc: 'Bright and shiny — makes colours pop with a premium feel' },
  { value: 'Matte',  emoji: '🎨', desc: 'Smooth and non-reflective for an elegant, understated look' },
]

const SIZES = [
  { value: '2" × 2"', emoji: '🔲', desc: 'Compact — great for laptops, bottles, and small packaging' },
  { value: '3" × 3"', emoji: '⬛', desc: 'Most popular size — versatile for almost any use case' },
  { value: '4" × 4"', emoji: '🟫', desc: 'Bold and impactful — ideal for windows, walls, and bags' },
]

const SHAPES = [
  { value: 'Die-Cut',   emoji: '✂️', desc: 'Cut precisely to your artwork outline for a custom silhouette' },
  { value: 'Circle',    emoji: '⭕', desc: 'Clean and symmetrical — a timeless shape for logos and icons' },
  { value: 'Square',    emoji: '⬜', desc: 'Structured and bold — great for grid-aligned designs' },
  { value: 'Rectangle', emoji: '▬', desc: 'Ideal for banners, text-heavy designs, and product labels' },
  { value: 'Oval',      emoji: '🥚', desc: 'Soft and elegant — perfect for vintage or botanical styles' },
]

const TURNAROUNDS = [
  { value: 'Standard (7–10 days)',  emoji: '📅', desc: '7–10 business days — the most economical option',                price: 'No surcharge' },
  { value: 'Rush (3–5 days)',       emoji: '⚡', desc: '3–5 business days — for tight deadlines and upcoming events',   price: '+20% surcharge' },
  { value: 'Super Rush (1–2 days)', emoji: '🚀', desc: '1–2 business days — fastest available, subject to capacity',   price: '+40% surcharge' },
]

// Maps display values → API slugs
const PRODUCT_SLUG_MAP: Record<string, string> = {
  'Die-Cut Stickers':     'die-cut',
  'Kiss-Cut Sheets':      'kiss-cut',
  'Holographic Stickers': 'holographic',
  'Clear Stickers':       'die-cut',
}

const FINISH_SLUG_MAP: Record<string, string> = {
  'Glossy': 'gloss',
  'Matte':  'matte',
}

const RUSH_SLUG_MAP: Record<string, string> = {
  'Standard (7–10 days)':  'standard',
  'Rush (3–5 days)':       'rush',
  'Super Rush (1–2 days)': 'super-rush',
}

// Fallback prices if API is unavailable
const PRICES: Record<string, number> = {
  'Die-Cut Stickers':     0.18,
  'Kiss-Cut Sheets':      2.50,
  'Holographic Stickers': 0.35,
  'Clear Stickers':       0.22,
}

interface LiveQuote {
  finalTotal: number
  finalPricePerUnit: number
  quantityDiscountPercent: number
  rushSurchargePercent: number
  subtotal: number
}

interface OrderState {
  product: string; quantity: string; customQty: string
  finish: string; size: string; customSize: string
  shape: string; turnaround: string; notes: string
}

const EMPTY: OrderState = {
  product: '', quantity: '', customQty: '',
  finish: '', size: '', customSize: '',
  shape: '', turnaround: '', notes: '',
}

function orderToState(order: Order): OrderState {
  const qtyStr = String(order.quantity)
  const qtyInList = QUANTITIES.some(q => q.value === qtyStr)
  const sizeInList = SIZES.some(s => s.value === order.size)
  return {
    product:    order.product,
    quantity:   qtyInList ? qtyStr : 'custom',
    customQty:  qtyInList ? '' : qtyStr,
    finish:     order.finish,
    size:       sizeInList ? order.size : 'custom',
    customSize: sizeInList ? '' : order.size,
    shape:      order.shape,
    turnaround: order.turnaround,
    notes:      order.notes ?? '',
  }
}

export default function NewOrderModal({ open, onClose, onSuccess, reorderFrom }: {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  reorderFrom?: Order
}) {
  const [step, setStep] = useState(reorderFrom ? 7 : 1)
  const [state, setState] = useState<OrderState>(reorderFrom ? orderToState(reorderFrom) : EMPTY)
  const [submitting, setSubmitting] = useState(false)
  const [liveQuote, setLiveQuote] = useState<LiveQuote | null>(null)
  const [quoteLoading, setQuoteLoading] = useState(false)

  // Fetch live price quote when customer reaches the review step
  useEffect(() => {
    if (step !== 7) return

    const qty = state.quantity === 'custom' ? Number(state.customQty) : Number(state.quantity)
    const size = state.size === 'custom' ? state.customSize : state.size
    const productSlug = PRODUCT_SLUG_MAP[state.product]
    const finishSlug  = FINISH_SLUG_MAP[state.finish]
    const rushSlug    = RUSH_SLUG_MAP[state.turnaround]

    if (!productSlug || !finishSlug || !rushSlug || !size || !qty) return

    setQuoteLoading(true)
    setLiveQuote(null)

    fetch('/api/pricing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productSlug, finishSlug, sizeLabel: size, quantity: qty, rushSlug }),
    })
      .then(r => r.json())
      .then(d => { if (d.breakdown) setLiveQuote(d.breakdown) })
      .catch(() => {})
      .finally(() => setQuoteLoading(false))
  }, [step])

  function set(key: keyof OrderState, value: string) {
    setState(prev => ({ ...prev, [key]: value }))
  }

  function stepReady() {
    if (step === 1) return !!state.product
    if (step === 2) return !!(state.quantity && state.quantity !== 'custom') || Number(state.customQty) > 0
    if (step === 3) return !!state.finish
    if (step === 4) return !!(state.size && state.size !== 'custom') || !!state.customSize.trim()
    if (step === 5) return !!state.shape
    if (step === 6) return !!state.turnaround
    if (step === 7) return true
    return false
  }

  function selectAndAdvance(key: keyof OrderState, value: string) {
    setState(prev => ({ ...prev, [key]: value }))
    setTimeout(() => setStep(s => s + 1), 260)
  }

  // Fallback estimate used only if live quote is unavailable
  function getEstimate() {
    const qty = state.quantity === 'custom' ? Number(state.customQty) : Number(state.quantity)
    let total = (PRICES[state.product] ?? 0.20) * qty
    if (state.turnaround.includes('Rush (3')) total *= 1.20
    if (state.turnaround.includes('Super Rush')) total *= 1.40
    return qty > 0 ? `~$${total.toFixed(2)}` : '—'
  }

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const qty = state.quantity === 'custom' ? Number(state.customQty) : Number(state.quantity)
      const size = state.size === 'custom' ? state.customSize : state.size

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: state.product,
          quantity: qty,
          finish: state.finish,
          size,
          shape: state.shape,
          turnaround: state.turnaround,
          notes: state.notes || undefined,
          estimated_total: liveQuote?.finalTotal ?? null,
        }),
      })

      if (!res.ok) throw new Error('Failed to submit order')

      toast.success(`🎉 Order for ${state.product} submitted!`)
      onSuccess()
      handleClose()
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleClose() {
    onClose()
    setTimeout(() => { setStep(reorderFrom ? 7 : 1); setState(reorderFrom ? orderToState(reorderFrom) : EMPTY); setLiveQuote(null) }, 300)
  }

  if (!open) return null

  const s = STEPS[step as keyof typeof STEPS]

  return (
    <div
      onClick={e => e.target === e.currentTarget && handleClose()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(74,55,40,0.5)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
    >
      <div style={{ background: 'var(--white)', borderRadius: '20px', width: '700px', maxWidth: '96vw', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(74,55,40,0.25)', animation: 'modalIn 0.25s ease', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '24px 28px 20px', borderBottom: '1px solid var(--cream-dark)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '22px', fontWeight: 700, color: 'var(--brown)', marginBottom: '4px' }}>
              {reorderFrom ? '🔁 Reorder' : s.title}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--brown-light)' }}>
              {reorderFrom ? `Pre-filled from Order #${reorderFrom.order_number} — confirm or adjust before submitting` : s.sub}
            </div>
          </div>
          <button onClick={handleClose} style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1.5px solid var(--cream-dark)', background: 'transparent', cursor: 'pointer', fontSize: '16px', color: 'var(--brown-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 28px', borderBottom: '1px solid var(--cream-dark)', background: 'var(--cream)', flexShrink: 0 }}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map(n => (
            <div key={n} style={{ display: 'flex', alignItems: 'center', flex: n < TOTAL_STEPS ? 1 : 'none' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, transition: 'all 0.3s',
                  background: n < step ? 'var(--sage)' : n === step ? 'var(--terracotta)' : 'var(--white)',
                  color: n <= step ? 'white' : 'var(--brown-light)',
                  border: n > step ? '2px solid var(--cream-dark)' : 'none',
                }}>
                  {n < step ? '✓' : n}
                </div>
              </div>
              {n < TOTAL_STEPS && <div style={{ flex: 1, height: '2px', background: n < step ? 'var(--sage)' : 'var(--cream-dark)', margin: '0 4px', marginTop: '-16px' }} />}
            </div>
          ))}
        </div>

        {/* Body */}
        <div style={{ padding: '24px 28px', flex: 1 }}>
          {step === 1 && <OptionGrid options={PRODUCTS} onSelect={v => selectAndAdvance('product', v)} selected={state.product} />}
          {step === 2 && (
            <div>
              <OptionGrid options={QUANTITIES} onSelect={v => selectAndAdvance('quantity', v)} selected={state.quantity} />
              <div style={{ marginTop: '12px' }}>
                <OptionCard
                  emoji="✏️" name="Custom" desc="Enter any quantity you need"
                  selected={state.quantity === 'custom'}
                  onClick={() => set('quantity', 'custom')}
                />
                {state.quantity === 'custom' && (
                  <input type="number" min="1" placeholder="Enter quantity"
                    value={state.customQty} onChange={e => set('customQty', e.target.value)}
                    style={{ marginTop: '8px', width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid var(--terracotta)', background: 'var(--cream)', fontSize: '14px', outline: 'none' }}
                    autoFocus
                  />
                )}
              </div>
            </div>
          )}
          {step === 3 && <OptionGrid options={FINISHES} onSelect={v => selectAndAdvance('finish', v)} selected={state.finish} />}
          {step === 4 && (
            <div>
              <OptionGrid options={SIZES} onSelect={v => selectAndAdvance('size', v)} selected={state.size} />
              <div style={{ marginTop: '12px' }}>
                <OptionCard
                  emoji="✏️" name="Custom" desc="Enter your own dimensions"
                  selected={state.size === 'custom'}
                  onClick={() => set('size', 'custom')}
                />
                {state.size === 'custom' && (
                  <input type="text" placeholder='e.g. 2.5" × 3.5"'
                    value={state.customSize} onChange={e => set('customSize', e.target.value)}
                    style={{ marginTop: '8px', width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid var(--terracotta)', background: 'var(--cream)', fontSize: '14px', outline: 'none' }}
                    autoFocus
                  />
                )}
              </div>
            </div>
          )}
          {step === 5 && <OptionGrid options={SHAPES} onSelect={v => selectAndAdvance('shape', v)} selected={state.shape} />}
          {step === 6 && <OptionGrid options={TURNAROUNDS} onSelect={v => selectAndAdvance('turnaround', v)} selected={state.turnaround} />}

          {/* Step 7: Review */}
          {step === 7 && (
            <div>
              <div style={{ background: 'var(--cream)', borderRadius: '12px', border: '1px solid var(--cream-dark)', padding: '20px', marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--brown-light)', marginBottom: '14px' }}>Order Summary</div>
                {[
                  ['Product',    state.product],
                  ['Quantity',   state.quantity === 'custom' ? state.customQty : state.quantity],
                  ['Finish',     state.finish],
                  ['Size',       state.size === 'custom' ? state.customSize : state.size],
                  ['Shape',      state.shape],
                  ['Turnaround', state.turnaround],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--cream-dark)', fontSize: '13px' }}>
                    <span style={{ color: 'var(--brown-light)' }}>{label}</span>
                    <span style={{ fontWeight: 700 }}>{value || '—'}</span>
                  </div>
                ))}

                {/* Estimated total */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '10px 0 0', fontSize: '14px' }}>
                  <span style={{ fontWeight: 700 }}>Estimated Total</span>
                  <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', color: 'var(--terracotta)', fontWeight: 700 }}>
                    {quoteLoading
                      ? 'Calculating…'
                      : liveQuote
                        ? `$${liveQuote.finalTotal.toFixed(2)}`
                        : getEstimate()}
                  </span>
                </div>

                {/* Live quote breakdown */}
                {liveQuote && (
                  <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {liveQuote.quantityDiscountPercent > 0 && (
                      <div style={{ fontSize: '11px', color: 'var(--sage)', fontWeight: 600, textAlign: 'right' }}>
                        Includes {liveQuote.quantityDiscountPercent}% quantity discount
                      </div>
                    )}
                    {liveQuote.rushSurchargePercent > 0 && (
                      <div style={{ fontSize: '11px', color: 'var(--brown-light)', textAlign: 'right' }}>
                        Includes +{liveQuote.rushSurchargePercent}% rush surcharge
                      </div>
                    )}
                    <div style={{ fontSize: '11px', color: 'var(--brown-light)', textAlign: 'right' }}>
                      ${liveQuote.finalPricePerUnit.toFixed(4)} per unit
                    </div>
                  </div>
                )}
              </div>

              <div style={{ fontSize: '12px', color: 'var(--brown-light)', lineHeight: 1.6, padding: '12px 14px', background: 'var(--sage-pale)', borderRadius: '8px', borderLeft: '3px solid var(--sage)', marginBottom: '16px' }}>
                ✦ This is an estimate only. Peel & Post Studio will confirm final pricing after reviewing your artwork. You'll receive a proof before any charge is made.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--brown-light)' }}>Any notes for the studio?</label>
                <textarea
                  value={state.notes} onChange={e => set('notes', e.target.value)}
                  placeholder="Event date, special instructions, reorder info, etc."
                  rows={3}
                  style={{ padding: '10px 14px', borderRadius: '10px', border: '1.5px solid var(--cream-dark)', background: 'var(--cream)', fontSize: '14px', color: 'var(--brown)', resize: 'none', outline: 'none', lineHeight: 1.5 }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 28px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--cream-dark)', flexShrink: 0 }}>
          <button
            onClick={() => setStep(s => s - 1)}
            style={{ display: step > 1 ? 'block' : 'none', padding: '10px 20px', borderRadius: '8px', background: 'transparent', border: '1.5px solid var(--cream-dark)', fontSize: '13px', fontWeight: 700, color: 'var(--brown-mid)', cursor: 'pointer' }}
          >
            ← Back
          </button>
          <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>Step {step} of {TOTAL_STEPS}</div>
          {step < TOTAL_STEPS ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!stepReady()}
              style={{ padding: '10px 28px', borderRadius: '8px', background: stepReady() ? 'var(--terracotta)' : 'var(--cream-dark)', border: 'none', fontSize: '13px', fontWeight: 700, color: stepReady() ? 'white' : 'var(--brown-light)', cursor: stepReady() ? 'pointer' : 'not-allowed' }}
            >
              Continue →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{ padding: '10px 28px', borderRadius: '8px', background: submitting ? 'var(--cream-dark)' : 'var(--terracotta)', border: 'none', fontSize: '13px', fontWeight: 700, color: submitting ? 'var(--brown-light)' : 'white', cursor: submitting ? 'not-allowed' : 'pointer' }}
            >
              {submitting ? 'Submitting…' : 'Submit Order ✓'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function OptionGrid({ options, onSelect, selected }: {
  options: { value: string; emoji: string; desc: string; price?: string }[]
  onSelect: (v: string) => void
  selected: string
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
      {options.map(o => (
        <OptionCard key={o.value} emoji={o.emoji} name={o.value} desc={o.desc} price={o.price} selected={selected === o.value} onClick={() => onSelect(o.value)} />
      ))}
    </div>
  )
}

function OptionCard({ emoji, name, desc, price, selected, onClick }: {
  emoji: string; name: string; desc: string; price?: string; selected: boolean; onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      style={{
        border: `2px solid ${selected ? 'var(--terracotta)' : 'var(--cream-dark)'}`,
        borderRadius: '14px', padding: '18px 16px', cursor: 'pointer', background: selected ? 'var(--terracotta-pale)' : 'var(--white)',
        textAlign: 'center', position: 'relative', transition: 'all 0.2s',
        boxShadow: selected ? '0 0 0 3px rgba(196,113,74,0.15)' : 'none',
      }}
    >
      {selected && <div style={{ position: 'absolute', top: '10px', right: '10px', width: '20px', height: '20px', background: 'var(--terracotta)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '11px', fontWeight: 700 }}>✓</div>}
      <div style={{ fontSize: '32px', marginBottom: '10px' }}>{emoji}</div>
      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--brown)', marginBottom: '4px' }}>{name}</div>
      <div style={{ fontSize: '11px', color: 'var(--brown-light)', lineHeight: 1.5 }}>{desc}</div>
      {price && <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--terracotta)', marginTop: '8px' }}>{price}</div>}
    </div>
  )
}

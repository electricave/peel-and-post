'use client'

import { useState, useEffect } from 'react'

const TOTAL_STEPS = 7

const STEPS = {
  1: { title: 'Choose your product',    sub: 'What type of sticker would you like to order?' },
  2: { title: 'Choose your quantity',   sub: 'How many would you like?' },
  3: { title: 'Choose your finish',     sub: 'How should the surface look and feel?' },
  4: { title: 'Choose your size',       sub: 'What dimensions do you need?' },
  5: { title: 'Choose your shape',      sub: 'What shape should they be cut to?' },
  6: { title: 'Choose your turnaround', sub: 'How quickly do you need your order?' },
  7: { title: 'Your quote',             sub: 'Here\'s your instant price estimate.' },
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
  { value: 'Standard (7–10 days)',  emoji: '📅', desc: '7–10 business days — the most economical option',              price: 'No surcharge' },
  { value: 'Rush (3–5 days)',       emoji: '⚡', desc: '3–5 business days — for tight deadlines and upcoming events',  price: '+20% surcharge' },
  { value: 'Super Rush (1–2 days)', emoji: '🚀', desc: '1–2 business days — fastest available, subject to capacity',  price: '+40% surcharge' },
]

const PRODUCT_SLUG_MAP: Record<string, string> = {
  'Die-Cut Stickers':     'die-cut',
  'Kiss-Cut Sheets':      'kiss-cut',
  'Holographic Stickers': 'holographic',
  'Clear Stickers':       'die-cut',
}
const FINISH_SLUG_MAP: Record<string, string> = { 'Glossy': 'gloss', 'Matte': 'matte' }
const RUSH_SLUG_MAP: Record<string, string> = {
  'Standard (7–10 days)':  'standard',
  'Rush (3–5 days)':       'rush',
  'Super Rush (1–2 days)': 'super-rush',
}

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

export default function QuotePage() {
  const [step, setStep] = useState(1)
  const [state, setState] = useState<OrderState>(EMPTY)
  const [liveQuote, setLiveQuote] = useState<LiveQuote | null>(null)
  const [quoteLoading, setQuoteLoading] = useState(false)

  // Fetch live price quote when guest reaches the review step
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

  function selectAndAdvance(key: keyof OrderState, value: string) {
    setState(prev => ({ ...prev, [key]: value }))
    setTimeout(() => setStep(s => s + 1), 260)
  }

  function stepReady() {
    if (step === 1) return !!state.product
    if (step === 2) return !!(state.quantity && state.quantity !== 'custom') || Number(state.customQty) > 0
    if (step === 3) return !!state.finish
    if (step === 4) return !!(state.size && state.size !== 'custom') || !!state.customSize.trim()
    if (step === 5) return !!state.shape
    if (step === 6) return !!state.turnaround
    return true
  }

  function getEstimate() {
    const qty = state.quantity === 'custom' ? Number(state.customQty) : Number(state.quantity)
    let total = (PRICES[state.product] ?? 0.20) * qty
    if (state.turnaround.includes('Rush (3')) total *= 1.20
    if (state.turnaround.includes('Super Rush')) total *= 1.40
    return qty > 0 ? `~$${total.toFixed(2)}` : '—'
  }

  function handlePlaceOrder() {
    // Save order state to sessionStorage so it can be auto-submitted after login
    sessionStorage.setItem('pendingOrder', JSON.stringify({
      product: state.product,
      quantity: state.quantity === 'custom' ? Number(state.customQty) : Number(state.quantity),
      finish: state.finish,
      size: state.size === 'custom' ? state.customSize : state.size,
      shape: state.shape,
      turnaround: state.turnaround,
      notes: state.notes || undefined,
      estimated_total: liveQuote?.finalTotal ?? null,
    }))
    window.location.href = '/auth/login'
  }

  const s = STEPS[step as keyof typeof STEPS]

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F7F3EE',
      fontFamily: "'Lato', sans-serif",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Lato:wght@300;400;700&display=swap" rel="stylesheet" />

      {/* Top bar */}
      <div style={{
        background: 'white',
        borderBottom: '1px solid #EDE7DC',
        padding: '16px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <a href="/auth/login" style={{ textDecoration: 'none' }}>
          <div>
            <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', color: '#A8896E' }}>
              Custom Sticker Printing
            </div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', fontWeight: 700, color: '#4A3728' }}>
              Peel & <span style={{ color: '#C4714A' }}>Post</span> Studio
            </div>
          </div>
        </a>
        <a
          href="/auth/login"
          style={{
            fontSize: '13px', fontWeight: 700, color: '#C4714A',
            textDecoration: 'none', padding: '8px 20px',
            border: '1.5px solid #C4714A', borderRadius: '8px',
          }}
        >
          Sign in →
        </a>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px' }}>

        {/* Heading */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#A8896E', marginBottom: '6px' }}>
            Instant Price Quote
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '30px', fontWeight: 700, color: '#4A3728', margin: '0 0 6px' }}>
            {s.title}
          </h1>
          <p style={{ fontSize: '14px', color: '#7A5C48', margin: 0 }}>{s.sub}</p>
        </div>

        {/* Step indicator */}
        <div style={{
          display: 'flex', alignItems: 'center',
          background: 'white', borderRadius: '12px', border: '1px solid #EDE7DC',
          padding: '16px 20px', marginBottom: '24px',
        }}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map(n => (
            <div key={n} style={{ display: 'flex', alignItems: 'center', flex: n < TOTAL_STEPS ? 1 : 'none' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontWeight: 700, transition: 'all 0.3s', flexShrink: 0,
                background: n < step ? '#7A8C6E' : n === step ? '#C4714A' : 'white',
                color: n <= step ? 'white' : '#A8896E',
                border: n > step ? '2px solid #EDE7DC' : 'none',
              }}>
                {n < step ? '✓' : n}
              </div>
              {n < TOTAL_STEPS && (
                <div style={{ flex: 1, height: '2px', background: n < step ? '#7A8C6E' : '#EDE7DC', margin: '0 4px' }} />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #EDE7DC', padding: '28px', marginBottom: '20px' }}>
          {step === 1 && <OptionGrid options={PRODUCTS} onSelect={v => selectAndAdvance('product', v)} selected={state.product} />}
          {step === 2 && (
            <div>
              <OptionGrid options={QUANTITIES} onSelect={v => selectAndAdvance('quantity', v)} selected={state.quantity} />
              <div style={{ marginTop: '12px' }}>
                <OptionCard emoji="✏️" name="Custom" desc="Enter any quantity you need"
                  selected={state.quantity === 'custom'} onClick={() => set('quantity', 'custom')} />
                {state.quantity === 'custom' && (
                  <input type="number" min="1" placeholder="Enter quantity"
                    value={state.customQty} onChange={e => set('customQty', e.target.value)}
                    style={{ marginTop: '8px', width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #C4714A', background: '#F7F3EE', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
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
                <OptionCard emoji="✏️" name="Custom" desc="Enter your own dimensions"
                  selected={state.size === 'custom'} onClick={() => set('size', 'custom')} />
                {state.size === 'custom' && (
                  <input type="text" placeholder='e.g. 2.5" × 3.5"'
                    value={state.customSize} onChange={e => set('customSize', e.target.value)}
                    style={{ marginTop: '8px', width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #C4714A', background: '#F7F3EE', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                    autoFocus
                  />
                )}
              </div>
            </div>
          )}
          {step === 5 && <OptionGrid options={SHAPES} onSelect={v => selectAndAdvance('shape', v)} selected={state.shape} />}
          {step === 6 && <OptionGrid options={TURNAROUNDS} onSelect={v => selectAndAdvance('turnaround', v)} selected={state.turnaround} />}

          {/* Step 7: Quote summary + CTA */}
          {step === 7 && (
            <div>
              {/* Summary */}
              <div style={{ background: '#F7F3EE', borderRadius: '12px', border: '1px solid #EDE7DC', padding: '20px', marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#A8896E', marginBottom: '14px' }}>Order Summary</div>
                {[
                  ['Product',    state.product],
                  ['Quantity',   state.quantity === 'custom' ? state.customQty : state.quantity],
                  ['Finish',     state.finish],
                  ['Size',       state.size === 'custom' ? state.customSize : state.size],
                  ['Shape',      state.shape],
                  ['Turnaround', state.turnaround],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #EDE7DC', fontSize: '13px' }}>
                    <span style={{ color: '#A8896E' }}>{label}</span>
                    <span style={{ fontWeight: 700, color: '#4A3728' }}>{value || '—'}</span>
                  </div>
                ))}

                {/* Price */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '14px 0 0', fontSize: '14px' }}>
                  <span style={{ fontWeight: 700, color: '#4A3728' }}>Estimated Total</span>
                  <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '24px', color: '#C4714A', fontWeight: 700 }}>
                    {quoteLoading ? 'Calculating…' : liveQuote ? `$${liveQuote.finalTotal.toFixed(2)}` : getEstimate()}
                  </span>
                </div>

                {liveQuote && (
                  <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {liveQuote.quantityDiscountPercent > 0 && (
                      <div style={{ fontSize: '11px', color: '#7A8C6E', fontWeight: 600, textAlign: 'right' }}>
                        Includes {liveQuote.quantityDiscountPercent}% quantity discount
                      </div>
                    )}
                    {liveQuote.rushSurchargePercent > 0 && (
                      <div style={{ fontSize: '11px', color: '#A8896E', textAlign: 'right' }}>
                        Includes +{liveQuote.rushSurchargePercent}% rush surcharge
                      </div>
                    )}
                    <div style={{ fontSize: '11px', color: '#A8896E', textAlign: 'right' }}>
                      ${liveQuote.finalPricePerUnit.toFixed(4)} per unit
                    </div>
                  </div>
                )}
              </div>

              <div style={{ fontSize: '12px', color: '#7A5C48', lineHeight: 1.6, padding: '12px 14px', background: '#E8EDE4', borderRadius: '8px', borderLeft: '3px solid #7A8C6E', marginBottom: '20px' }}>
                ✦ This is an estimate only. Peel & Post Studio will confirm final pricing after reviewing your artwork. You'll receive a proof before any charge is made.
              </div>

              {/* Notes */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '24px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#A8896E' }}>
                  Any notes for the studio? (optional)
                </label>
                <textarea
                  value={state.notes} onChange={e => set('notes', e.target.value)}
                  placeholder="Event date, special instructions, etc."
                  rows={3}
                  style={{ padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #EDE7DC', background: '#F7F3EE', fontSize: '14px', color: '#4A3728', resize: 'none', outline: 'none', lineHeight: 1.5 }}
                />
              </div>

              {/* CTA */}
              <button
                onClick={handlePlaceOrder}
                style={{
                  width: '100%', padding: '16px',
                  background: '#C4714A', border: 'none', borderRadius: '12px',
                  fontSize: '15px', fontWeight: 700, color: 'white',
                  cursor: 'pointer', fontFamily: "'Lato', sans-serif",
                  marginBottom: '10px',
                }}
              >
                Create account &amp; place order →
              </button>
              <button
                onClick={handlePlaceOrder}
                style={{
                  width: '100%', padding: '14px',
                  background: 'transparent', border: '1.5px solid #EDE7DC', borderRadius: '12px',
                  fontSize: '14px', fontWeight: 700, color: '#7A5C48',
                  cursor: 'pointer', fontFamily: "'Lato', sans-serif",
                }}
              >
                Already have an account? Sign in →
              </button>
            </div>
          )}
        </div>

        {/* Footer nav */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={() => setStep(s => s - 1)}
            style={{
              display: step > 1 ? 'block' : 'none',
              padding: '10px 20px', borderRadius: '8px',
              background: 'transparent', border: '1.5px solid #EDE7DC',
              fontSize: '13px', fontWeight: 700, color: '#7A5C48', cursor: 'pointer',
            }}
          >
            ← Back
          </button>
          <div style={{ fontSize: '12px', color: '#A8896E' }}>Step {step} of {TOTAL_STEPS}</div>
          {step < TOTAL_STEPS && (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!stepReady()}
              style={{
                padding: '10px 28px', borderRadius: '8px',
                background: stepReady() ? '#C4714A' : '#EDE7DC',
                border: 'none', fontSize: '13px', fontWeight: 700,
                color: stepReady() ? 'white' : '#A8896E',
                cursor: stepReady() ? 'pointer' : 'not-allowed',
              }}
            >
              Continue →
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
        <OptionCard key={o.value} emoji={o.emoji} name={o.value} desc={o.desc} price={o.price}
          selected={selected === o.value} onClick={() => onSelect(o.value)} />
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
        border: `2px solid ${selected ? '#C4714A' : '#EDE7DC'}`,
        borderRadius: '14px', padding: '18px 16px', cursor: 'pointer',
        background: selected ? '#F2E0D5' : 'white',
        textAlign: 'center', position: 'relative', transition: 'all 0.2s',
        boxShadow: selected ? '0 0 0 3px rgba(196,113,74,0.15)' : 'none',
      }}
    >
      {selected && (
        <div style={{
          position: 'absolute', top: '10px', right: '10px',
          width: '20px', height: '20px', background: '#C4714A',
          borderRadius: '50%', display: 'flex', alignItems: 'center',
          justifyContent: 'center', color: 'white', fontSize: '11px', fontWeight: 700,
        }}>✓</div>
      )}
      <div style={{ fontSize: '32px', marginBottom: '10px' }}>{emoji}</div>
      <div style={{ fontSize: '13px', fontWeight: 700, color: '#4A3728', marginBottom: '4px' }}>{name}</div>
      <div style={{ fontSize: '11px', color: '#A8896E', lineHeight: 1.5 }}>{desc}</div>
      {price && <div style={{ fontSize: '11px', fontWeight: 700, color: '#C4714A', marginTop: '8px' }}>{price}</div>}
    </div>
  )
}

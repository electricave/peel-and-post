'use client';

// src/app/studio/pricing/PricingClient.tsx

import { useState } from 'react';
import { ProductType, FinishVariant, SizeVariant, QuantityBreak, RushOption, formatCurrency } from '@/lib/pricing';
import Sidebar from '@/components/layout/Sidebar';
import type { Profile } from '@/types';

interface Props {
  profile: Profile | null;
  initialProducts: ProductType[];
  initialFinishes: FinishVariant[];
  initialSizes: SizeVariant[];
  initialBreaks: QuantityBreak[];
  initialRush: RushOption[];
}

type Tab = 'products' | 'finishes' | 'sizes' | 'quantity' | 'rush';

export default function PricingClient({ profile, initialProducts, initialFinishes, initialSizes, initialBreaks, initialRush }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('products');
  const [products, setProducts] = useState(initialProducts);
  const [finishes, setFinishes] = useState(initialFinishes);
  const [sizes, setSizes] = useState(initialSizes);
  const [breaks, setBreaks] = useState(initialBreaks);
  const [rush, setRush] = useState(initialRush);
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Preview calculator state
  const [preview, setPreview] = useState({
    productSlug: initialProducts[0]?.slug ?? '',
    finishSlug: initialFinishes[0]?.slug ?? '',
    sizeLabel: initialSizes[0]?.label ?? '',
    quantity: 100,
    rushSlug: initialRush[0]?.slug ?? '',
  });
  const [previewResult, setPreviewResult] = useState<null | { finalTotal: number; finalPricePerUnit: number; quantityDiscountPercent: number; rushSurchargePercent: number; subtotal: number }>(null);
  const [previewing, setPreviewing] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const saveRow = async (table: string, id: string, updates: Record<string, unknown>) => {
    setSaving(id);
    try {
      const res = await fetch(`/api/studio/pricing`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table, id, updates }),
      });
      if (!res.ok) throw new Error('Save failed');
      showToast('Saved');
    } catch {
      showToast('Error saving — please try again');
    } finally {
      setSaving(null);
    }
  };

  const runPreview = async () => {
    setPreviewing(true);
    try {
      const res = await fetch('/api/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preview),
      });
      const data = await res.json();
      if (data.breakdown) setPreviewResult(data.breakdown);
      else showToast(data.error ?? 'Preview failed');
    } catch {
      showToast('Preview failed');
    } finally {
      setPreviewing(false);
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'products', label: 'Products' },
    { id: 'finishes', label: 'Finishes' },
    { id: 'sizes', label: 'Sizes' },
    { id: 'quantity', label: 'Quantity Breaks' },
    { id: 'rush', label: 'Rush Options' },
  ];

  const inputStyle = {
    padding: '6px 10px',
    borderRadius: 8,
    border: '1px solid var(--cream-dark)',
    background: 'var(--cream)',
    color: 'var(--brown)',
    fontSize: 13,
    fontFamily: 'Lato, sans-serif',
    width: '100%',
  };

  const labelStyle = {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '2px',
    textTransform: 'uppercase' as const,
    color: 'var(--brown-light)',
    marginBottom: 4,
    display: 'block',
  };

  const cellStyle = {
    padding: '12px 16px',
    borderBottom: '1px solid var(--cream-dark)',
    fontSize: 13,
    color: 'var(--brown)',
    verticalAlign: 'middle' as const,
  };

  const headCellStyle = {
    ...cellStyle,
    fontWeight: 700,
    fontSize: 10,
    letterSpacing: '2px',
    textTransform: 'uppercase' as const,
    color: 'var(--brown-light)',
    background: 'var(--cream)',
    borderBottom: '2px solid var(--cream-dark)',
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--cream)', fontFamily: 'Lato, sans-serif' }}>
      <Sidebar profile={profile} unreadMessages={0} pendingProofs={0} />
      <div style={{ marginLeft: 260, flex: 1, padding: '36px 40px' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 9999,
          background: 'var(--brown)', color: 'white',
          padding: '12px 20px', borderRadius: 10,
          fontSize: 13, fontWeight: 600,
          boxShadow: '0 4px 20px rgba(74,55,40,0.25)',
          animation: 'fadeIn 0.2s ease',
        }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', color: 'var(--brown-light)', marginBottom: 8 }}>
          Studio · Pricing
        </div>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 28, color: 'var(--brown)', margin: 0 }}>
          Pricing Rules
        </h1>
        <p style={{ color: 'var(--brown-light)', fontSize: 14, marginTop: 8 }}>
          Configure product base prices, finish multipliers, size adjustments, quantity discounts, and rush surcharges.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start' }}>

        {/* Left: Rules tables */}
        <div style={{ background: 'var(--white)', borderRadius: 14, border: '1px solid var(--cream-dark)', boxShadow: '0 2px 12px rgba(74,55,40,0.08)' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--cream-dark)', padding: '0 4px' }}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '14px 18px',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '1.5px',
                  textTransform: 'uppercase',
                  color: activeTab === tab.id ? 'var(--terracotta)' : 'var(--brown-light)',
                  borderBottom: activeTab === tab.id ? '2px solid var(--terracotta)' : '2px solid transparent',
                  marginBottom: -1,
                  transition: 'color 0.15s',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ overflowX: 'auto' }}>
            {/* PRODUCTS TAB */}
            {activeTab === 'products' && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={headCellStyle}>Product</th>
                    <th style={headCellStyle}>Base Price / Unit</th>
                    <th style={headCellStyle}>Min Qty</th>
                    <th style={headCellStyle}>Active</th>
                    <th style={headCellStyle}></th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(p => (
                    <EditableProductRow
                      key={p.slug}
                      product={p}
                      saving={saving === p.slug}
                      onSave={(updates) => {
                        setProducts(prev => prev.map(x => x.slug === p.slug ? { ...x, ...updates } : x));
                        saveRow('product_types', p.slug, updates);
                      }}
                      inputStyle={inputStyle}
                      cellStyle={cellStyle}
                    />
                  ))}
                </tbody>
              </table>
            )}

            {/* FINISHES TAB */}
            {activeTab === 'finishes' && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={headCellStyle}>Finish</th>
                    <th style={headCellStyle}>Price Multiplier</th>
                    <th style={headCellStyle}>Effect</th>
                    <th style={headCellStyle}>Active</th>
                    <th style={headCellStyle}></th>
                  </tr>
                </thead>
                <tbody>
                  {finishes.map(f => (
                    <EditableFinishRow
                      key={f.slug}
                      finish={f}
                      saving={saving === f.slug}
                      onSave={(updates) => {
                        setFinishes(prev => prev.map(x => x.slug === f.slug ? { ...x, ...updates } : x));
                        saveRow('finish_variants', f.slug, updates);
                      }}
                      inputStyle={inputStyle}
                      cellStyle={cellStyle}
                    />
                  ))}
                </tbody>
              </table>
            )}

            {/* SIZES TAB */}
            {activeTab === 'sizes' && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={headCellStyle}>Size</th>
                    <th style={headCellStyle}>Price Multiplier</th>
                    <th style={headCellStyle}>Effect</th>
                    <th style={headCellStyle}>Active</th>
                    <th style={headCellStyle}></th>
                  </tr>
                </thead>
                <tbody>
                  {sizes.map(s => (
                    <EditableSizeRow
                      key={s.label}
                      size={s}
                      saving={saving === s.label}
                      onSave={(updates) => {
                        setSizes(prev => prev.map(x => x.label === s.label ? { ...x, ...updates } : x));
                        saveRow('size_variants', s.label, updates);
                      }}
                      inputStyle={inputStyle}
                      cellStyle={cellStyle}
                    />
                  ))}
                </tbody>
              </table>
            )}

            {/* QUANTITY BREAKS TAB */}
            {activeTab === 'quantity' && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={headCellStyle}>Min Qty</th>
                    <th style={headCellStyle}>Max Qty</th>
                    <th style={headCellStyle}>Discount %</th>
                    <th style={headCellStyle}></th>
                  </tr>
                </thead>
                <tbody>
                  {breaks.map(b => (
                    <EditableBreakRow
                      key={b.min_quantity}
                      breakRow={b}
                      saving={saving === String(b.min_quantity)}
                      onSave={(updates) => {
                        setBreaks(prev => prev.map(x => x.min_quantity === b.min_quantity ? { ...x, ...updates } : x));
                        saveRow('quantity_breaks', String(b.min_quantity), updates);
                      }}
                      inputStyle={inputStyle}
                      cellStyle={cellStyle}
                    />
                  ))}
                </tbody>
              </table>
            )}

            {/* RUSH TAB */}
            {activeTab === 'rush' && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={headCellStyle}>Option</th>
                    <th style={headCellStyle}>Surcharge %</th>
                    <th style={headCellStyle}>Turnaround</th>
                    <th style={headCellStyle}>Active</th>
                    <th style={headCellStyle}></th>
                  </tr>
                </thead>
                <tbody>
                  {rush.map(r => (
                    <EditableRushRow
                      key={r.slug}
                      rushOption={r}
                      saving={saving === r.slug}
                      onSave={(updates) => {
                        setRush(prev => prev.map(x => x.slug === r.slug ? { ...x, ...updates } : x));
                        saveRow('rush_options', r.slug, updates);
                      }}
                      inputStyle={inputStyle}
                      cellStyle={cellStyle}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right: Price calculator preview */}
        <div style={{ background: 'var(--white)', borderRadius: 14, border: '1px solid var(--cream-dark)', boxShadow: '0 2px 12px rgba(74,55,40,0.08)', padding: 24, position: 'sticky', top: 24 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--brown-light)', marginBottom: 16 }}>
            Price Calculator
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={labelStyle}>Product</label>
              <select style={inputStyle} value={preview.productSlug} onChange={e => setPreview(p => ({ ...p, productSlug: e.target.value }))}>
                {products.map(p => <option key={p.slug} value={p.slug}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Finish</label>
              <select style={inputStyle} value={preview.finishSlug} onChange={e => setPreview(p => ({ ...p, finishSlug: e.target.value }))}>
                {finishes.map(f => <option key={f.slug} value={f.slug}>{f.name}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Size</label>
              <select style={inputStyle} value={preview.sizeLabel} onChange={e => setPreview(p => ({ ...p, sizeLabel: e.target.value }))}>
                {sizes.map(s => <option key={s.label} value={s.label}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Quantity</label>
              <input style={inputStyle} type="number" min={1} value={preview.quantity} onChange={e => setPreview(p => ({ ...p, quantity: Number(e.target.value) }))} />
            </div>
            <div>
              <label style={labelStyle}>Turnaround</label>
              <select style={inputStyle} value={preview.rushSlug} onChange={e => setPreview(p => ({ ...p, rushSlug: e.target.value }))}>
                {rush.map(r => <option key={r.slug} value={r.slug}>{r.name}</option>)}
              </select>
            </div>

            <button
              onClick={runPreview}
              disabled={previewing}
              style={{
                padding: '10px 0',
                background: 'var(--terracotta)',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                cursor: previewing ? 'not-allowed' : 'pointer',
                opacity: previewing ? 0.7 : 1,
                transition: 'opacity 0.15s',
              }}
            >
              {previewing ? 'Calculating…' : 'Calculate Price'}
            </button>

            {previewResult && (
              <div style={{ borderTop: '1px solid var(--cream-dark)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <PriceLine label="Subtotal" value={formatCurrency(previewResult.subtotal)} />
                {previewResult.quantityDiscountPercent > 0 && (
                  <PriceLine label={`Qty discount (${previewResult.quantityDiscountPercent}%)`} value={`−${formatCurrency(previewResult.subtotal * previewResult.quantityDiscountPercent / 100)}`} positive />
                )}
                {previewResult.rushSurchargePercent > 0 && (
                  <PriceLine label={`Rush surcharge (+${previewResult.rushSurchargePercent}%)`} value={`+${formatCurrency(previewResult.subtotal * previewResult.rushSurchargePercent / 100)}`} />
                )}
                <div style={{ borderTop: '1px solid var(--cream-dark)', paddingTop: 10, marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--brown)' }}>Total</span>
                  <span style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, color: 'var(--terracotta)', fontWeight: 700 }}>{formatCurrency(previewResult.finalTotal)}</span>
                </div>
                <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--brown-light)' }}>
                  {formatCurrency(previewResult.finalPricePerUnit)} / unit
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

function PriceLine({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
      <span style={{ color: 'var(--brown-light)' }}>{label}</span>
      <span style={{ color: positive ? 'var(--sage)' : 'var(--brown)', fontWeight: 600 }}>{value}</span>
    </div>
  );
}

// ── Editable row components ──────────────────────────────────────────────────

interface CellProps { inputStyle: React.CSSProperties; cellStyle: React.CSSProperties; }

function EditableProductRow({ product, saving, onSave, inputStyle, cellStyle }: { product: ProductType; saving: boolean; onSave: (u: Partial<ProductType>) => void } & CellProps) {
  const [price, setPrice] = useState(String(product.base_price_per_unit));
  const [minQty, setMinQty] = useState(String(product.min_quantity));
  const [active, setActive] = useState(product.active ?? true);
  const dirty = price !== String(product.base_price_per_unit) || minQty !== String(product.min_quantity) || active !== (product.active ?? true);
  return (
    <tr>
      <td style={cellStyle}><strong>{product.name}</strong><div style={{ fontSize: 11, color: 'var(--brown-light)' }}>{product.slug}</div></td>
      <td style={{ ...cellStyle, width: 130 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ color: 'var(--brown-light)', fontSize: 13 }}>$</span>
          <input style={{ ...inputStyle, width: 80 }} type="number" step="0.01" min="0" value={price} onChange={e => setPrice(e.target.value)} />
        </div>
      </td>
      <td style={{ ...cellStyle, width: 100 }}>
        <input style={{ ...inputStyle, width: 70 }} type="number" min="1" value={minQty} onChange={e => setMinQty(e.target.value)} />
      </td>
      <td style={{ ...cellStyle, width: 70 }}>
        <ActiveToggle active={active} onChange={setActive} />
      </td>
      <td style={{ ...cellStyle, width: 80 }}>
        {dirty && (
          <SaveButton saving={saving} onClick={() => onSave({ base_price_per_unit: Number(price), min_quantity: Number(minQty), active })} />
        )}
      </td>
    </tr>
  );
}

function EditableFinishRow({ finish, saving, onSave, inputStyle, cellStyle }: { finish: FinishVariant; saving: boolean; onSave: (u: Partial<FinishVariant>) => void } & CellProps) {
  const [mult, setMult] = useState(String(finish.price_multiplier));
  const [active, setActive] = useState((finish as FinishVariant & { active?: boolean }).active ?? true);
  const dirty = mult !== String(finish.price_multiplier) || active !== ((finish as FinishVariant & { active?: boolean }).active ?? true);
  const pct = ((Number(mult) - 1) * 100).toFixed(0);
  const effect = Number(pct) === 0 ? 'No change' : Number(pct) > 0 ? `+${pct}%` : `${pct}%`;
  return (
    <tr>
      <td style={cellStyle}><strong>{finish.name}</strong></td>
      <td style={{ ...cellStyle, width: 140 }}>
        <input style={{ ...inputStyle, width: 90 }} type="number" step="0.01" min="0" value={mult} onChange={e => setMult(e.target.value)} />
      </td>
      <td style={{ ...cellStyle, width: 100 }}>
        <span style={{ fontSize: 12, color: Number(pct) > 0 ? 'var(--terracotta)' : Number(pct) < 0 ? 'var(--sage)' : 'var(--brown-light)' }}>{effect}</span>
      </td>
      <td style={{ ...cellStyle, width: 70 }}>
        <ActiveToggle active={active} onChange={setActive} />
      </td>
      <td style={{ ...cellStyle, width: 80 }}>
        {dirty && <SaveButton saving={saving} onClick={() => onSave({ price_multiplier: Number(mult) })} />}
      </td>
    </tr>
  );
}

function EditableSizeRow({ size, saving, onSave, inputStyle, cellStyle }: { size: SizeVariant; saving: boolean; onSave: (u: Partial<SizeVariant>) => void } & CellProps) {
  const [mult, setMult] = useState(String(size.price_multiplier));
  const [active, setActive] = useState((size as SizeVariant & { active?: boolean }).active ?? true);
  const dirty = mult !== String(size.price_multiplier) || active !== ((size as SizeVariant & { active?: boolean }).active ?? true);
  const pct = ((Number(mult) - 1) * 100).toFixed(0);
  const effect = Number(pct) === 0 ? 'No change' : Number(pct) > 0 ? `+${pct}%` : `${pct}%`;
  return (
    <tr>
      <td style={cellStyle}><strong>{size.label}</strong></td>
      <td style={{ ...cellStyle, width: 140 }}>
        <input style={{ ...inputStyle, width: 90 }} type="number" step="0.01" min="0" value={mult} onChange={e => setMult(e.target.value)} />
      </td>
      <td style={{ ...cellStyle, width: 100 }}>
        <span style={{ fontSize: 12, color: Number(pct) > 0 ? 'var(--terracotta)' : Number(pct) < 0 ? 'var(--sage)' : 'var(--brown-light)' }}>{effect}</span>
      </td>
      <td style={{ ...cellStyle, width: 70 }}>
        <ActiveToggle active={active} onChange={setActive} />
      </td>
      <td style={{ ...cellStyle, width: 80 }}>
        {dirty && <SaveButton saving={saving} onClick={() => onSave({ price_multiplier: Number(mult) })} />}
      </td>
    </tr>
  );
}

function EditableBreakRow({ breakRow, saving, onSave, inputStyle, cellStyle }: { breakRow: QuantityBreak; saving: boolean; onSave: (u: Partial<QuantityBreak>) => void } & CellProps) {
  const [discount, setDiscount] = useState(String(breakRow.discount_percent));
  const dirty = discount !== String(breakRow.discount_percent);
  return (
    <tr>
      <td style={cellStyle}>{breakRow.min_quantity.toLocaleString()}+</td>
      <td style={cellStyle}>{breakRow.max_quantity ? breakRow.max_quantity.toLocaleString() : '∞'}</td>
      <td style={{ ...cellStyle, width: 130 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <input style={{ ...inputStyle, width: 70 }} type="number" step="0.5" min="0" max="100" value={discount} onChange={e => setDiscount(e.target.value)} />
          <span style={{ color: 'var(--brown-light)', fontSize: 13 }}>%</span>
        </div>
      </td>
      <td style={{ ...cellStyle, width: 80 }}>
        {dirty && <SaveButton saving={saving} onClick={() => onSave({ discount_percent: Number(discount) })} />}
      </td>
    </tr>
  );
}

function EditableRushRow({ rushOption, saving, onSave, inputStyle, cellStyle }: { rushOption: RushOption; saving: boolean; onSave: (u: Partial<RushOption>) => void } & CellProps) {
  const [surcharge, setSurcharge] = useState(String(rushOption.surcharge_percent));
  const [active, setActive] = useState((rushOption as RushOption & { active?: boolean }).active ?? true);
  const dirty = surcharge !== String(rushOption.surcharge_percent) || active !== ((rushOption as RushOption & { active?: boolean }).active ?? true);
  const turnaround = rushOption.turnaround_days_min && rushOption.turnaround_days_max
    ? `${rushOption.turnaround_days_min}–${rushOption.turnaround_days_max} days`
    : '—';
  return (
    <tr>
      <td style={cellStyle}><strong>{rushOption.name}</strong></td>
      <td style={{ ...cellStyle, width: 140 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <input style={{ ...inputStyle, width: 70 }} type="number" step="1" min="0" value={surcharge} onChange={e => setSurcharge(e.target.value)} />
          <span style={{ color: 'var(--brown-light)', fontSize: 13 }}>%</span>
        </div>
      </td>
      <td style={{ ...cellStyle, width: 130 }}>
        <span style={{ fontSize: 12, color: 'var(--brown-light)' }}>{turnaround}</span>
      </td>
      <td style={{ ...cellStyle, width: 70 }}>
        <ActiveToggle active={active} onChange={setActive} />
      </td>
      <td style={{ ...cellStyle, width: 80 }}>
        {dirty && <SaveButton saving={saving} onClick={() => onSave({ surcharge_percent: Number(surcharge) })} />}
      </td>
    </tr>
  );
}

function ActiveToggle({ active, onChange }: { active: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!active)}
      style={{
        padding: '3px 10px',
        borderRadius: 20,
        border: 'none',
        cursor: 'pointer',
        fontSize: 11,
        fontWeight: 700,
        background: active ? 'var(--sage-pale)' : 'var(--cream-dark)',
        color: active ? 'var(--sage)' : 'var(--brown-light)',
        transition: 'all 0.15s',
      }}
    >
      {active ? 'On' : 'Off'}
    </button>
  );
}

function SaveButton({ saving, onClick }: { saving: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      style={{
        padding: '5px 12px',
        borderRadius: 8,
        border: 'none',
        cursor: saving ? 'not-allowed' : 'pointer',
        fontSize: 11,
        fontWeight: 700,
        background: 'var(--terracotta)',
        color: 'white',
        opacity: saving ? 0.6 : 1,
        transition: 'opacity 0.15s',
        whiteSpace: 'nowrap',
      }}
    >
      {saving ? '…' : 'Save'}
    </button>
  );
}

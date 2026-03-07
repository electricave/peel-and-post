'use client'

import Sidebar from '@/components/layout/Sidebar'

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending', artwork_needed: 'Artwork Needed', in_review: 'In Review',
  proof_sent: 'Proof Review', proof_approved: 'Approved', paid: 'Paid',
  in_production: 'In Production', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled',
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#A8896E', artwork_needed: '#C9A84C', in_review: '#C9A84C',
  proof_sent: '#C9A84C', proof_approved: '#7A8C6E', paid: '#7A8C6E',
  in_production: '#C4714A', shipped: '#7A8C6E', delivered: '#4A8C6E', cancelled: '#B03030',
}

function currency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function BarChart({ data, color, valuePrefix = '' }: {
  data: { label: string; value: number }[]
  color: string
  valuePrefix?: string
}) {
  const max = Math.max(...data.map(d => d.value), 1)
  const W = 480, H = 160, padL = 8, padR = 8, padT = 8, padB = 28
  const innerW = W - padL - padR
  const innerH = H - padT - padB
  const barW = Math.floor(innerW / data.length) - 6

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
      {data.map((d, i) => {
        const barH = max > 0 ? Math.max((d.value / max) * innerH, d.value > 0 ? 2 : 0) : 0
        const x = padL + i * (innerW / data.length) + 3
        const y = padT + innerH - barH
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} fill={color} rx={3} opacity={0.85} />
            {d.value > 0 && (
              <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize={9} fill="#7A5C48" fontFamily="Lato, sans-serif" fontWeight={700}>
                {valuePrefix}{d.value % 1 === 0 ? d.value : d.value.toFixed(0)}
              </text>
            )}
            <text x={x + barW / 2} y={H - 6} textAnchor="middle" fontSize={10} fill="#A8896E" fontFamily="Lato, sans-serif">
              {d.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function HorizontalBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '12px', color: 'var(--brown)', fontWeight: 600, fontFamily: 'Lato, sans-serif' }}>{label}</span>
        <span style={{ fontSize: '12px', color: 'var(--brown-light)', fontFamily: 'Lato, sans-serif' }}>{value}</span>
      </div>
      <div style={{ height: '8px', background: 'var(--cream-dark)', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '4px', transition: 'width 0.6s ease' }} />
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent: string }) {
  return (
    <div style={{ background: 'var(--white)', borderRadius: '14px', border: '1px solid var(--cream-dark)', padding: '20px 24px', flex: 1 }}>
      <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--brown-light)', marginBottom: '8px', fontFamily: 'Lato, sans-serif' }}>
        {label}
      </div>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '28px', fontWeight: 700, color: accent, marginBottom: '4px' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: '12px', color: 'var(--brown-light)', fontFamily: 'Lato, sans-serif' }}>{sub}</div>}
    </div>
  )
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--white)', borderRadius: '14px', border: '1px solid var(--cream-dark)', padding: '24px' }}>
      <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--brown-light)', marginBottom: '20px', fontFamily: 'Lato, sans-serif' }}>
        {title}
      </div>
      {children}
    </div>
  )
}

export default function AnalyticsClient({ profile, data }: { profile: any; data: any }) {
  if (!data) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', fontFamily: 'Lato, sans-serif', color: 'var(--brown-light)' }}>
        Failed to load analytics.
      </div>
    )
  }

  const { stats, ordersByMonth, statusCounts, productCounts } = data

  const maxStatus = Math.max(...Object.values(statusCounts as Record<string, number>), 1)
  const maxProduct = Math.max(...Object.values(productCounts as Record<string, number>), 1)

  const monthOrderData = ordersByMonth.map((m: any) => ({ label: m.label, value: m.count }))
  const monthRevenueData = ordersByMonth.map((m: any) => ({ label: m.label, value: Math.round(m.revenue) }))

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--cream)', fontFamily: 'Lato, sans-serif' }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Lato:wght@300;400;700&display=swap" rel="stylesheet" />
      <Sidebar profile={profile} unreadMessages={0} pendingProofs={0} />

      <main style={{ marginLeft: '260px', flex: 1, padding: '36px 40px' }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '28px', fontWeight: 700, color: 'var(--brown)', marginBottom: '6px' }}>Analytics</h2>
        <p style={{ fontSize: '14px', color: 'var(--brown-light)', marginBottom: '32px' }}>Order and revenue overview for Peel & Post Studio.</p>

        {/* Stat cards */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <StatCard label="Total Orders" value={String(stats.totalOrders)} sub="All time" accent="var(--brown)" />
          <StatCard label="Total Revenue" value={currency(stats.totalRevenue)} sub="Paid orders" accent="var(--terracotta)" />
          <StatCard label="Avg Order Value" value={currency(stats.avgOrderValue)} sub="Paid orders" accent="var(--sage)" />
          <StatCard label="This Month" value={String(stats.ordersThisMonth)} sub="New orders" accent="var(--gold)" />
        </div>

        {/* Charts row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <ChartCard title="Orders — Last 6 Months">
            <BarChart data={monthOrderData} color="#C4714A" />
          </ChartCard>
          <ChartCard title="Revenue — Last 6 Months">
            <BarChart data={monthRevenueData} color="#7A8C6E" valuePrefix="$" />
          </ChartCard>
        </div>

        {/* Status + Products row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <ChartCard title="Orders by Status">
            {Object.entries(statusCounts as Record<string, number>)
              .sort((a, b) => b[1] - a[1])
              .map(([status, count]) => (
                <HorizontalBar
                  key={status}
                  label={STATUS_LABELS[status] ?? status}
                  value={count}
                  max={maxStatus}
                  color={STATUS_COLORS[status] ?? '#A8896E'}
                />
              ))}
          </ChartCard>
          <ChartCard title="Orders by Product">
            {Object.entries(productCounts as Record<string, number>)
              .sort((a, b) => b[1] - a[1])
              .map(([product, count]) => (
                <HorizontalBar
                  key={product}
                  label={product}
                  value={count}
                  max={maxProduct}
                  color="#C9A84C"
                />
              ))}
          </ChartCard>
        </div>
      </main>
    </div>
  )
}

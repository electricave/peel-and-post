'use client'

import { useRouter } from 'next/navigation'

export default function Topbar({
  pendingProofs = 0,
  onNewOrder,
}: {
  pendingProofs?: number
  onNewOrder?: () => void
}) {
  const router = useRouter()

  return (
    <div style={{
      background: 'var(--white)',
      padding: '0 40px',
      height: '72px',
      display: 'flex',
      alignItems: 'center',
      borderBottom: '1px solid var(--cream-dark)',
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: 'var(--terracotta-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>
            {pendingProofs > 0 ? '⏳' : '✦'}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--terracotta)', marginBottom: '1px' }}>
              {pendingProofs > 0 ? 'Action needed' : 'Welcome back'}
            </div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '14px', fontWeight: 600, color: 'var(--brown)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {pendingProofs > 0
                ? `${pendingProofs} proof${pendingProofs > 1 ? 's' : ''} waiting for your approval`
                : 'Peel & Post Studio Portal'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <button
            onClick={() => router.push('/messages')}
            style={{ background: 'transparent', border: '1.5px solid var(--cream-dark)', color: 'var(--brown-mid)', padding: '9px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            💬 Contact Studio
          </button>
          <button
            onClick={onNewOrder}
            style={{ background: 'var(--terracotta)', color: 'white', border: 'none', padding: '9px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            + New Order
          </button>
        </div>
      </div>
    </div>
  )
}

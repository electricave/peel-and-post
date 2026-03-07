'use client'

import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'


const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: '⊞', href: '/dashboard' },
  { id: 'orders',    label: 'My Orders',  icon: '◈', href: '/orders' },
  { id: 'messages',  label: 'Messages',   icon: '◎', href: '/messages' },
]

const STUDIO_NAV_ITEMS = [
  { id: 'studio',     label: 'Studio Dashboard', icon: '⚙', href: '/studio' },
  { id: 'pricing',    label: 'Pricing Rules',     icon: '◈', href: '/studio/pricing' },
  { id: 'analytics',  label: 'Analytics',         icon: '◉', href: '/studio/analytics' },
]

export default function Sidebar({
  profile,
  unreadMessages = 0,
  pendingProofs = 0,
}: {
  profile: Profile | null
  unreadMessages?: number
  pendingProofs?: number
}) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const isStudio = profile?.role === 'studio'

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  const badges: Record<string, number> = {
    orders: pendingProofs,
    messages: unreadMessages,
  }

  function NavItem({ item, badge }: { item: typeof NAV_ITEMS[0], badge?: number }) {
    const isActive = pathname.startsWith(item.href)
    return (
      <div
        onClick={() => router.push(item.href)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 12px',
          borderRadius: '8px',
          cursor: 'pointer',
          color: isActive ? 'white' : 'rgba(247,243,238,0.6)',
          background: isActive ? 'var(--terracotta)' : 'transparent',
          fontWeight: isActive ? 700 : 400,
          fontSize: '14px',
          transition: 'all 0.2s',
          marginBottom: '2px',
        }}
      >
        <span style={{ width: '18px', textAlign: 'center', fontSize: '16px', flexShrink: 0 }}>{item.icon}</span>
        {item.label}
        {badge != null && badge > 0 && (
          <span style={{
            marginLeft: 'auto',
            background: isActive ? 'rgba(255,255,255,0.3)' : 'var(--gold)',
            color: isActive ? 'white' : 'var(--brown)',
            fontSize: '10px',
            fontWeight: 700,
            padding: '2px 7px',
            borderRadius: '10px',
          }}>
            {badge}
          </span>
        )}
      </div>
    )
  }

  return (
    <aside style={{
      position: 'fixed',
      left: 0, top: 0, bottom: 0,
      width: '260px',
      background: 'var(--brown)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 100,
    }}>
      {/* Brand */}
      <div style={{
        padding: '0 28px',
        height: '72px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        flexShrink: 0,
      }}>
        <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', color: 'var(--brown-light)', marginBottom: '4px' }}>
          {isStudio ? 'Studio Portal' : 'Customer Portal'}
        </div>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '22px', fontWeight: 700, color: 'var(--cream)', lineHeight: 1.2 }}>
          Peel & <span style={{ color: 'var(--terracotta-light)' }}>Post</span> Studio
        </h1>
      </div>

      {/* Shop card */}
      <div style={{ margin: '16px 16px 0', background: 'rgba(255,255,255,0.06)', borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--terracotta)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0, position: 'relative' }}>
          🌿
          <div style={{ position: 'absolute', bottom: '1px', right: '1px', width: '10px', height: '10px', background: '#5CB85C', borderRadius: '50%', border: '2px solid var(--brown)' }} />
        </div>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--cream)' }}>Peel & Post Studio</div>
          <div style={{ fontSize: '11px', color: 'var(--brown-light)', marginTop: '1px' }}>Your Sticker Maker</div>
          <div style={{ fontSize: '10px', color: '#5CB85C', marginTop: '2px', fontWeight: 700 }}>● Online now</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '8px 12px', flex: 1 }}>

        {/* Studio section — only visible to studio role */}
        {isStudio && (
          <>
            <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--brown-light)', padding: '16px 12px 8px' }}>
              Studio
            </div>
            {STUDIO_NAV_ITEMS.map(item => (
              <NavItem key={item.id} item={item} />
            ))}
            <div style={{ margin: '12px 12px 0', borderTop: '1px solid rgba(255,255,255,0.08)' }} />
          </>
        )}

        {/* Customer section */}
        <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--brown-light)', padding: '16px 12px 8px' }}>
          My Portal
        </div>
        {NAV_ITEMS.map(item => (
          <NavItem key={item.id} item={item} badge={badges[item.id]} />
        ))}
      </nav>

      {/* User footer */}
      <div style={{ padding: '20px 16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--brown-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Playfair Display', serif", fontSize: '13px', fontWeight: 700, color: 'white', flexShrink: 0 }}>
            {profile?.full_name?.charAt(0) ?? profile?.email?.charAt(0) ?? '?'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--cream)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {profile?.full_name ?? profile?.email}
            </div>
            {profile?.company_name && (
              <div style={{ fontSize: '10px', color: 'var(--brown-light)', marginTop: '1px' }}>{profile.company_name}</div>
            )}
          </div>
          <button
            onClick={handleSignOut}
            title="Sign out"
            style={{ background: 'transparent', border: 'none', color: 'var(--brown-light)', fontSize: '16px', cursor: 'pointer', padding: '4px', borderRadius: '4px' }}
          >
            ⎋
          </button>
        </div>
      </div>
    </aside>
  )
}

'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile, BacklogItem } from '@/types'


const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: '⊞', href: '/dashboard' },
  { id: 'orders',    label: 'My Orders',  icon: '◈', href: '/orders' },
  { id: 'messages',  label: 'Messages',   icon: '◎', href: '/messages' },
]

const STUDIO_NAV_ITEMS = [
  { id: 'studio', label: 'Studio Dashboard', icon: '⚙', href: '/studio' },
  { id: 'pricing', label: 'Pricing Rules',     icon: '◈', href: '/studio/pricing' },
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

  // ── Phase backlog (studio only) ──────────────────────────
  const CURRENT_PHASE = 1
  const [backlogOpen, setBacklogOpen] = useState(false)
  const [backlogItems, setBacklogItems] = useState<BacklogItem[]>([])
  const [newItem, setNewItem] = useState('')
  const [addingItem, setAddingItem] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isStudio) return
    fetch(`/api/backlog?phase=${CURRENT_PHASE}`)
      .then(r => r.json())
      .then(({ data }) => data && setBacklogItems(data))
  }, [isStudio])

  async function toggleResolved(item: BacklogItem) {
    setBacklogItems(prev => prev.map(i => i.id === item.id ? { ...i, resolved: !i.resolved } : i))
    await fetch('/api/backlog', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id, resolved: !item.resolved }),
    })
  }

  async function addItem() {
    if (!newItem.trim()) return
    setAddingItem(true)
    const res = await fetch('/api/backlog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phase: CURRENT_PHASE, title: newItem.trim() }),
    })
    const { data } = await res.json()
    if (data) setBacklogItems(prev => [...prev, data])
    setNewItem('')
    setAddingItem(false)
  }

  async function deleteItem(id: string) {
    setBacklogItems(prev => prev.filter(i => i.id !== id))
    await fetch('/api/backlog', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
  }

  const pendingCount = backlogItems.filter(i => !i.resolved).length

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
          Customer Portal
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

        {/* Phase backlog — studio only */}
        {isStudio && (
          <div style={{ marginTop: '16px' }}>
            <div style={{ margin: '0 12px 8px', borderTop: '1px solid rgba(255,255,255,0.08)' }} />
            <button
              onClick={() => setBacklogOpen(o => !o)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                background: backlogOpen ? 'rgba(255,255,255,0.08)' : 'transparent',
                color: 'rgba(247,243,238,0.6)', fontSize: '14px', textAlign: 'left',
              }}
            >
              <span style={{ width: '18px', textAlign: 'center', fontSize: '16px', flexShrink: 0 }}>☑</span>
              <span style={{ flex: 1 }}>Phase {CURRENT_PHASE} Checklist</span>
              {pendingCount > 0 && (
                <span style={{
                  background: 'var(--gold)', color: 'var(--brown)',
                  fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '10px',
                }}>
                  {pendingCount}
                </span>
              )}
              <span style={{ fontSize: '10px', opacity: 0.5, transform: backlogOpen ? 'rotate(180deg)' : 'none', display: 'inline-block', transition: 'transform 0.2s' }}>▼</span>
            </button>

            {backlogOpen && (
              <div style={{ padding: '4px 12px 8px' }}>
                {backlogItems.length === 0 && (
                  <p style={{ fontSize: '12px', color: 'rgba(247,243,238,0.35)', fontStyle: 'italic', padding: '4px 0 8px 4px', margin: 0 }}>
                    No items — add things to resolve before Phase {CURRENT_PHASE + 1}
                  </p>
                )}
                {backlogItems.map(item => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <input
                      type="checkbox"
                      checked={item.resolved}
                      onChange={() => toggleResolved(item)}
                      style={{ marginTop: '3px', accentColor: 'var(--sage)', flexShrink: 0, cursor: 'pointer' }}
                    />
                    <span style={{
                      fontSize: '12px', flex: 1, lineHeight: '1.4',
                      color: item.resolved ? 'rgba(247,243,238,0.3)' : 'rgba(247,243,238,0.75)',
                      textDecoration: item.resolved ? 'line-through' : 'none',
                    }}>
                      {item.title}
                    </span>
                    <button
                      onClick={() => deleteItem(item.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(247,243,238,0.2)', fontSize: '12px', padding: '0 2px', flexShrink: 0, lineHeight: 1 }}
                      title="Remove"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {/* Add item input */}
                <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                  <input
                    ref={inputRef}
                    value={newItem}
                    onChange={e => setNewItem(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addItem()}
                    placeholder="Add item…"
                    style={{
                      flex: 1, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '6px', padding: '6px 8px', fontSize: '12px',
                      color: 'var(--cream)', outline: 'none',
                    }}
                  />
                  <button
                    onClick={addItem}
                    disabled={addingItem || !newItem.trim()}
                    style={{
                      padding: '6px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                      background: newItem.trim() ? 'var(--terracotta)' : 'rgba(255,255,255,0.1)',
                      color: 'white', fontSize: '13px', fontWeight: 700, flexShrink: 0,
                    }}
                  >
                    +
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
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

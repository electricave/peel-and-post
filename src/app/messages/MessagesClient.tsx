'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import NewOrderModal from '@/components/orders/NewOrderModal'
import { useMessages } from '@/hooks/useRealtime'
import type { Profile, Conversation, Message } from '@/types'

export default function MessagesClient({ profile, conversations, stats, userId }: {
  profile: Profile | null
  conversations: Conversation[]
  stats: { activeOrders: number; proofsToReview: number; unreadMessages: number }
  userId: string
}) {
  const [orderModalOpen, setOrderModalOpen] = useState(false)
  const [activeConv, setActiveConv] = useState<Conversation | null>(conversations[0] ?? null)
  const router = useRouter()

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar profile={profile} unreadMessages={stats.unreadMessages} pendingProofs={stats.proofsToReview} />

      <main style={{ marginLeft: '260px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Topbar pendingProofs={stats.proofsToReview} onNewOrder={() => setOrderModalOpen(true)} hideNewOrder={profile?.role === 'studio'} />

        <div style={{ padding: '36px 40px 0', flexShrink: 0 }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '28px', fontWeight: 700, color: 'var(--brown)', marginBottom: '16px' }}>Messages</h2>
        </div>

        <div style={{ margin: '0 40px 40px', flex: 1, display: 'grid', gridTemplateColumns: '270px 1fr', background: 'var(--white)', borderRadius: '16px', border: '1px solid var(--cream-dark)', boxShadow: 'var(--shadow-card)', overflow: 'hidden', height: 'calc(100vh - 216px)', minHeight: '500px' }}>

          {/* Thread list */}
          <div style={{ borderRight: '1px solid var(--cream-dark)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--cream-dark)' }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '15px', fontWeight: 600, color: 'var(--brown)', marginBottom: '10px' }}>Conversations</h3>
              <input
                type="text"
                placeholder="Search…"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid var(--cream-dark)', background: 'var(--cream)', fontSize: '13px', color: 'var(--brown)', outline: 'none' }}
              />
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {conversations.length === 0 ? (
                <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--brown-light)', fontSize: '13px' }}>
                  No conversations yet.<br />Place an order to start chatting.
                </div>
              ) : conversations.map(conv => {
                const order = conv.orders as any
                const messages = (conv.messages as any[]) ?? []
                const lastMsg = messages[messages.length - 1]
                const isActive = activeConv?.id === conv.id

                return (
                  <div
                    key={conv.id}
                    onClick={() => setActiveConv(conv)}
                    style={{
                      padding: '14px 16px', borderBottom: '1px solid var(--cream-dark)', cursor: 'pointer',
                      background: isActive ? 'var(--terracotta-pale)' : 'transparent',
                      borderRight: isActive ? '3px solid var(--terracotta)' : '3px solid transparent',
                      transition: 'background 0.15s', position: 'relative',
                    }}
                  >
                    <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--terracotta)', background: 'var(--terracotta-pale)', padding: '2px 8px', borderRadius: '8px', display: 'inline-block', marginBottom: '4px' }}>
                      Order #{order?.order_number}
                    </span>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--brown)' }}>{order?.product}</div>
                      <div style={{ fontSize: '11px', color: 'var(--brown-light)' }}>
                        {lastMsg ? new Date(lastMsg.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                      </div>
                    </div>
                    {lastMsg && (
                      <div style={{ fontSize: '12px', color: 'var(--brown-light)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {lastMsg.profiles?.role === 'studio' ? 'Studio: ' : 'You: '}{lastMsg.content}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Chat area */}
          {activeConv ? (
            <ChatArea conv={activeConv} userId={userId} />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brown-light)', fontSize: '14px' }}>
              Select a conversation to start messaging
            </div>
          )}
        </div>
      </main>

      <NewOrderModal open={orderModalOpen} onClose={() => setOrderModalOpen(false)} onSuccess={() => { setOrderModalOpen(false); router.refresh() }} />
    </div>
  )
}

function ChatArea({ conv, userId }: { conv: Conversation; userId: string }) {
  const order = conv.orders as any
  const { messages, loading, sendMessage } = useMessages(conv.id)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    const content = text.trim()
    if (!content || sending) return
    setSending(true)
    setText('')
    await sendMessage(content)
    setSending(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Chat header */}
      <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--cream-dark)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--terracotta)', marginBottom: '3px' }}>Order #{order?.order_number}</div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '16px', fontWeight: 600, color: 'var(--brown)' }}>{order?.product}</div>
          <div style={{ fontSize: '12px', color: 'var(--brown-light)', marginTop: '2px' }}>Peel & Post Studio</div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', background: 'var(--cream)' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--brown-light)', fontSize: '13px' }}>Loading messages…</div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--brown-light)', fontSize: '13px', marginTop: '40px' }}>
            No messages yet. Say hello to the studio!
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMe = msg.sender_id === userId
            const sender = msg.profiles as any
            const showDate = i === 0 || new Date(msg.created_at).toDateString() !== new Date(messages[i-1].created_at).toDateString()

            return (
              <div key={msg.id}>
                {showDate && (
                  <div style={{ textAlign: 'center', position: 'relative', fontSize: '11px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--brown-light)', margin: '8px 0' }}>
                    <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: 'var(--cream-dark)' }} />
                    <span style={{ position: 'relative', background: 'var(--cream)', padding: '0 12px' }}>
                      {new Date(msg.created_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </span>
                  </div>
                )}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flexDirection: isMe ? 'row-reverse' : 'row' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: isMe ? 'var(--brown-mid)' : 'var(--terracotta)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Playfair Display', serif", fontSize: '13px', fontWeight: 700, color: 'white', flexShrink: 0 }}>
                    {isMe ? (sender?.full_name?.charAt(0) ?? 'Y') : '🌿'}
                  </div>
                  <div style={{ maxWidth: '68%', display: 'flex', flexDirection: 'column', gap: '5px', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--brown-light)', padding: '0 4px' }}>
                      {isMe ? 'You' : 'Peel & Post Studio'}
                    </div>
                    <div style={{
                      padding: '11px 15px', borderRadius: '16px', fontSize: '14px', lineHeight: 1.6,
                      background: isMe ? 'var(--terracotta)' : 'var(--white)',
                      color: isMe ? 'white' : 'var(--brown)',
                      boxShadow: '0 1px 4px rgba(74,55,40,0.07)',
                      borderBottomLeftRadius: isMe ? '16px' : '4px',
                      borderBottomRightRadius: isMe ? '4px' : '16px',
                    }}>
                      {msg.content}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--brown-light)', padding: '0 4px' }}>
                      {new Date(msg.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div style={{ padding: '14px 18px', borderTop: '1px solid var(--cream-dark)', display: 'flex', gap: '10px', alignItems: 'flex-end', background: 'var(--white)', flexShrink: 0 }}>
        <div style={{ flex: 1, background: 'var(--cream)', borderRadius: '12px', border: '1.5px solid var(--cream-dark)', padding: '10px 14px' }}>
          <textarea
            value={text}
            onChange={e => { setText(e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
            onKeyDown={handleKeyDown}
            placeholder="Message the studio…"
            rows={1}
            style={{ background: 'transparent', border: 'none', outline: 'none', width: '100%', fontSize: '14px', color: 'var(--brown)', resize: 'none', minHeight: '36px', maxHeight: '120px', lineHeight: 1.5 }}
          />
        </div>
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          style={{ width: '44px', height: '44px', borderRadius: '10px', background: text.trim() ? 'var(--terracotta)' : 'var(--cream-dark)', border: 'none', color: text.trim() ? 'white' : 'var(--brown-light)', fontSize: '18px', cursor: text.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
        >
          ➤
        </button>
      </div>
    </div>
  )
}

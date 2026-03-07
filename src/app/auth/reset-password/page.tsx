'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [linkError, setLinkError] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  // Supabase PKCE flow: the reset link arrives as ?code=...&type=recovery
  // We exchange the code explicitly on mount — the PASSWORD_RECOVERY event can
  // fire before the onAuthStateChange listener registers (race condition).
  useEffect(() => {
    async function bootstrap() {
      const code = new URLSearchParams(window.location.search).get('code')

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
          setReady(true)
          window.history.replaceState({}, '', window.location.pathname)
          return
        }
        // Code exchange failed — expired, already used, or opened in a different browser
        setLinkError(true)
        return
      }

      // No code in URL — check if a recovery session is already active
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setReady(true)
        return
      }

      // Nothing usable — treat as an invalid/expired link
      setLinkError(true)
    }

    bootstrap()

    // Belt-and-suspenders: catch PASSWORD_RECOVERY if it fires asynchronously
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      toast.error('Passwords don\'t match')
      return
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      toast.success('Password updated — signing you in')
      router.push('/dashboard')
    } catch (err: any) {
      toast.error(err.message ?? 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F7F3EE',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Lato', sans-serif",
      padding: '20px',
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Lato:wght@300;400;700&display=swap" rel="stylesheet" />

      <div style={{
        background: 'white',
        borderRadius: '20px',
        padding: '48px',
        width: '100%',
        maxWidth: '440px',
        boxShadow: '0 4px 40px rgba(74,55,40,0.12)',
        border: '1px solid #EDE7DC',
      }}>
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', color: '#A8896E', marginBottom: '6px' }}>
            Customer Portal
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '26px', fontWeight: 700, color: '#4A3728', margin: 0 }}>
            Peel & <span style={{ color: '#D98A65' }}>Post</span> Studio
          </h1>
        </div>

        {linkError ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', color: '#4A3728', margin: '0 0 12px' }}>
              Link expired or already used
            </h2>
            <p style={{ fontSize: '14px', color: '#A8896E', margin: '0 0 24px', lineHeight: 1.5 }}>
              Reset links can only be used once and expire after an hour. Request a fresh one below.
            </p>
            <a
              href="/auth/forgot-password"
              style={{ color: '#C4714A', fontWeight: 700, fontSize: '14px', textDecoration: 'none' }}
            >
              Request a new link →
            </a>
          </div>
        ) : !ready ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔐</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', color: '#4A3728', margin: '0 0 12px' }}>
              Verifying your link…
            </h2>
            <p style={{ fontSize: '14px', color: '#A8896E', margin: '0 0 24px', lineHeight: 1.5 }}>
              Just a moment while we verify your reset link.
            </p>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '28px' }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', color: '#4A3728', margin: '0 0 8px' }}>
                Set a new password
              </h2>
              <p style={{ fontSize: '14px', color: '#A8896E', margin: 0, lineHeight: 1.5 }}>
                Choose a strong password — at least 8 characters.
              </p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#A8896E' }}>
                  New Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoFocus
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid #EDE7DC',
                    background: '#F7F3EE',
                    fontFamily: "'Lato', sans-serif",
                    fontSize: '14px',
                    color: '#4A3728',
                    outline: 'none',
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#A8896E' }}>
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: `1.5px solid ${confirm && confirm !== password ? '#E8A0A0' : '#EDE7DC'}`,
                    background: '#F7F3EE',
                    fontFamily: "'Lato', sans-serif",
                    fontSize: '14px',
                    color: '#4A3728',
                    outline: 'none',
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                />
                {confirm && confirm !== password && (
                  <span style={{ fontSize: '12px', color: '#B03030' }}>Passwords don't match</span>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !password || password !== confirm}
                style={{
                  marginTop: '8px',
                  padding: '13px',
                  borderRadius: '10px',
                  border: 'none',
                  background: (loading || !password || password !== confirm) ? '#EDE7DC' : '#C4714A',
                  color: (loading || !password || password !== confirm) ? '#A8896E' : 'white',
                  fontFamily: "'Lato', sans-serif",
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: (loading || !password || password !== confirm) ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                {loading ? 'Updating…' : 'Update Password →'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

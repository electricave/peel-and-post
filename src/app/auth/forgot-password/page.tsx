'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const redirectTo = `${window.location.origin}/auth/reset-password`
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
      if (error) throw error
      setSent(true)
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

        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📬</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', color: '#4A3728', margin: '0 0 12px' }}>
              Check your inbox
            </h2>
            <p style={{ fontSize: '14px', color: '#A8896E', margin: '0 0 28px', lineHeight: 1.6 }}>
              We sent a reset link to <strong style={{ color: '#4A3728' }}>{email}</strong>. It may take a minute to arrive — check your spam folder if it doesn't show up.
            </p>
            <a
              href="/auth/login"
              style={{
                display: 'inline-block',
                padding: '12px 28px',
                borderRadius: '10px',
                background: '#C4714A',
                color: 'white',
                fontWeight: 700,
                fontSize: '14px',
                textDecoration: 'none',
                fontFamily: "'Lato', sans-serif",
              }}
            >
              Back to Sign In
            </a>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '28px' }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', color: '#4A3728', margin: '0 0 8px' }}>
                Reset your password
              </h2>
              <p style={{ fontSize: '14px', color: '#A8896E', margin: 0, lineHeight: 1.5 }}>
                Enter your email and we'll send you a link to set a new password.
              </p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#A8896E' }}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@company.com"
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

              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: '8px',
                  padding: '13px',
                  borderRadius: '10px',
                  border: 'none',
                  background: loading ? '#EDE7DC' : '#C4714A',
                  color: loading ? '#A8896E' : 'white',
                  fontFamily: "'Lato', sans-serif",
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                {loading ? 'Sending…' : 'Send Reset Link →'}
              </button>
            </form>

            <p style={{ textAlign: 'center', fontSize: '12px', color: '#A8896E', marginTop: '24px' }}>
              Remember your password?{' '}
              <a href="/auth/login" style={{ color: '#C4714A', fontWeight: 700, textDecoration: 'none' }}>
                Sign in
              </a>
            </p>
          </>
        )}
      </div>
    </div>
  )
}

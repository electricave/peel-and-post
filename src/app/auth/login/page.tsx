'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        // Full reload so the session cookie is set before the server component renders.
        // router.push() causes a hydration mismatch because the cookie isn't propagated yet.
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
        window.location.href = profile?.role === 'studio' ? '/studio' : '/dashboard'
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName, company_name: companyName },
          },
        })
        if (error) throw error
        toast.success('Account created! Check your email to verify.')
        setMode('login')
      }
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

        {/* Toggle */}
        <div style={{
          display: 'flex',
          background: '#F7F3EE',
          borderRadius: '10px',
          padding: '4px',
          marginBottom: '28px',
          gap: '4px',
        }}>
          {(['login', 'signup'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '7px',
                border: 'none',
                cursor: 'pointer',
                fontFamily: "'Lato', sans-serif",
                fontSize: '13px',
                fontWeight: 700,
                background: mode === m ? '#C4714A' : 'transparent',
                color: mode === m ? 'white' : '#A8896E',
                transition: 'all 0.15s',
              }}
            >
              {m === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {mode === 'signup' && (
            <>
              <Field label="Full Name" value={fullName} onChange={setFullName} placeholder="Jordan Kim" />
              <Field label="Company Name" value={companyName} onChange={setCompanyName} placeholder="Bloom & Co." />
            </>
          )}
          <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@company.com" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#A8896E' }}>
                Password
              </label>
              {mode === 'login' && (
                <a href="/auth/forgot-password" style={{ fontSize: '11px', color: '#C4714A', fontWeight: 700, textDecoration: 'none' }}>
                  Forgot password?
                </a>
              )}
            </div>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
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
            {mode === 'signup' && (
              <p style={{ margin: 0, fontSize: '11px', color: '#A8896E', fontFamily: "'Lato', sans-serif" }}>
                Minimum 8 characters.
              </p>
            )}
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
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign In →' : 'Create Account →'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '12px', color: '#A8896E', marginTop: '24px' }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            style={{ background: 'none', border: 'none', color: '#C4714A', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}
          >
            {mode === 'login' ? 'Create one' : 'Sign in'}
          </button>
        </p>

        <div style={{ borderTop: '1px solid #EDE7DC', marginTop: '20px', paddingTop: '20px', textAlign: 'center' }}>
          <a
            href="/quote"
            style={{ fontSize: '12px', color: '#A8896E', textDecoration: 'none', fontFamily: "'Lato', sans-serif" }}
          >
            Just want a price? <span style={{ color: '#C4714A', fontWeight: 700 }}>Continue as guest →</span>
          </a>
        </div>
      </div>
    </div>
  )
}

function Field({
  label, value, onChange, type = 'text', placeholder
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#A8896E' }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required
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
  )
}

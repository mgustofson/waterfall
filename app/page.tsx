'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const T = {
  teal: '#00b8a9', tealMid: '#00a396', tealLight: '#e6f9f7',
  ink: '#1a2332', ink2: '#3d4f63', slate: '#8492a6',
  white: '#ffffff', bg: '#f5f7fa', border: '#e8edf2',
  shadow: '0 2px 12px rgba(26,35,50,0.07)',
  shadowLg: '0 8px 40px rgba(26,35,50,0.12)',
}

export default function HomePage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    setSent(true)
  }

  const features = [
    { icon: '🌊', title: 'Waterfall method', desc: 'Know the exact right order to put your money to work — not just where, but when.' },
    { icon: '💳', title: 'Debt payoff ranker', desc: 'Avalanche vs snowball — see which method saves you more and by how much.' },
    { icon: '🏠', title: 'Real estate equity', desc: 'Track your property equity as part of your full financial picture.' },
    { icon: '📬', title: 'Monthly check-ins', desc: 'A nudge every 30 days to update your numbers and see if your step has changed.' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: T.bg }}>
      <style>{`
        .nav-link { color: ${T.slate}; text-decoration: none; font-size: 14px; font-weight: 500; transition: color .15s; }
        .nav-link:hover { color: ${T.teal}; }
        .feature-card { background: ${T.white}; border-radius: 16px; padding: 24px; box-shadow: ${T.shadow}; border: 1px solid ${T.border}; transition: all .2s; }
        .feature-card:hover { transform: translateY(-2px); box-shadow: ${T.shadowLg}; }
        .primary-btn { background: linear-gradient(135deg, ${T.teal}, ${T.tealMid}); border: none; border-radius: 12px; padding: 14px 28px; color: white; font-size: 15px; font-weight: 600; cursor: pointer; font-family: inherit; box-shadow: 0 4px 16px ${T.teal}44; transition: all .15s; width: 100%; }
        .primary-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px ${T.teal}55; }
        .primary-btn:disabled { opacity: .7; cursor: default; }
        .email-input { width: 100%; background: white; border: 2px solid ${T.border}; border-radius: 12px; padding: 13px 16px; font-size: 15px; color: ${T.ink}; font-family: inherit; transition: border-color .2s; }
        .email-input:focus { border-color: ${T.teal}; outline: none; box-shadow: 0 0 0 4px ${T.teal}18; }
      `}</style>

      {/* Nav */}
      <nav style={{ borderBottom: `1px solid ${T.border}`, background: `rgba(245,247,250,.92)`, backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: T.teal, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>🌊</div>
            <span style={{ fontWeight: 700, fontSize: 16, color: T.ink, letterSpacing: '-.3px' }}>Waterfall</span>
          </div>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <a href="#how-it-works" className="nav-link">How it works</a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '80px 24px 60px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: T.tealLight, borderRadius: 20, padding: '5px 12px', marginBottom: 28 }}>
          <span style={{ fontSize: 12 }}>✨</span>
          <span style={{ color: T.teal, fontSize: 12, fontWeight: 600, letterSpacing: '.04em' }}>CFO Andrew Framework</span>
        </div>
        <h1 style={{ fontSize: 'clamp(36px, 6vw, 60px)', fontWeight: 700, color: T.ink, lineHeight: 1.1, letterSpacing: '-.5px', marginBottom: 18 }}>
          Know exactly where<br />to put every dollar.
        </h1>
        <p style={{ color: T.slate, fontSize: 17, lineHeight: 1.75, marginBottom: 48 }}>
          Answer a few honest questions. Get a personalized monthly financial plan — with the right priority order for your situation.
        </p>

        {/* Sign-in card */}
        <div style={{ background: T.white, borderRadius: 20, padding: '32px 28px', boxShadow: T.shadowLg, border: `1px solid ${T.border}`, textAlign: 'left' }}>
          {!sent ? (
            <>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: T.ink, marginBottom: 6, letterSpacing: '-.3px' }}>Get your free plan</h2>
              <p style={{ color: T.slate, fontSize: 14, marginBottom: 22, lineHeight: 1.6 }}>Enter your email and we'll send you a magic link — no password needed.</p>
              <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input
                  className="email-input"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
                {error && <p style={{ color: '#ff6b6b', fontSize: 13 }}>{error}</p>}
                <button className="primary-btn" type="submit" disabled={loading}>
                  {loading ? 'Sending…' : 'Send my magic link →'}
                </button>
              </form>
              <p style={{ color: '#c5cdd6', fontSize: 12, marginTop: 14, textAlign: 'center' }}>No password. No spam. Just a link.</p>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>📬</div>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: T.ink, marginBottom: 8 }}>Check your inbox</h3>
              <p style={{ color: T.slate, fontSize: 14, lineHeight: 1.65 }}>
                We sent a magic link to <strong style={{ color: T.ink2 }}>{email}</strong>.<br />
                Click it to start building your plan.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Features */}
      <div id="how-it-works" style={{ maxWidth: 900, margin: '0 auto', padding: '20px 24px 80px' }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, color: T.ink, textAlign: 'center', marginBottom: 40, letterSpacing: '-.3px' }}>How it works</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {features.map((f, i) => (
            <div key={i} className="feature-card">
              <div style={{ fontSize: 28, marginBottom: 12 }}>{f.icon}</div>
              <div style={{ fontWeight: 600, fontSize: 15, color: T.ink, marginBottom: 6 }}>{f.title}</div>
              <div style={{ color: T.slate, fontSize: 13, lineHeight: 1.65 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: `1px solid ${T.border}`, padding: '24px', textAlign: 'center' }}>
        <p style={{ color: '#c5cdd6', fontSize: 12 }}>Educational framework only · Not personalized financial advice</p>
      </div>
    </div>
  )
}

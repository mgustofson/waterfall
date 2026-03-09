'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// Origin-inspired: dark, editorial, serif+sans mix, lots of space
const T = {
  bg: '#0a0c10',
  bgCard: '#111318',
  bgCardHover: '#161922',
  border: 'rgba(255,255,255,0.08)',
  borderHover: 'rgba(255,255,255,0.16)',
  white: '#ffffff',
  offWhite: '#e8eaf0',
  muted: 'rgba(255,255,255,0.45)',
  faint: 'rgba(255,255,255,0.18)',
  teal: '#4fd1c5',
  tealDim: 'rgba(79,209,197,0.12)',
  tealGlow: 'rgba(79,209,197,0.25)',
  coral: '#fc8181',
  amber: '#f6ad55',
  purple: '#b794f4',
  blue: '#63b3ed',
  green: '#68d391',
}

const STEPS = [
  { num: '01', color: T.coral,  label: 'Eliminate high-interest debt',        desc: 'Credit cards and high-rate loans cost more than almost any investment earns. Clearing them is the highest guaranteed return available to you.' },
  { num: '02', color: T.amber,  label: 'Build your emergency fund',           desc: 'Without a cash cushion, any setback forces you back into debt. Your emergency fund is what keeps a bad month from becoming a bad year.' },
  { num: '03', color: T.amber,  label: 'Start investing for retirement',      desc: 'Once your cushion is half-funded, split savings between filling it and retirement accounts. Time in the market beats waiting for the perfect moment.' },
  { num: '04', color: T.purple, label: 'Max out retirement accounts',         desc: 'Tax-advantaged accounts like your 401(k) or IRA compound faster than taxable investing. Maxing them first is almost always the right move.' },
  { num: '05', color: T.teal,   label: 'Balance your investment portfolio',   desc: 'At this stage you\'re building lasting wealth. The right mix of stable and growth assets shifts with your age and risk tolerance.' },
]

const BENEFITS = [
  { num: '01', title: 'Order matters more than amount',    desc: 'Saving $500/mo in the right sequence outperforms $1,000/mo in the wrong one. Sequence is the most impactful financial decision most people never make.' },
  { num: '02', title: 'Eliminates decision fatigue',       desc: 'Most people lose money not from bad investments, but from indecision. The waterfall removes that paralysis — permanently.' },
  { num: '03', title: 'Evolves as your life does',         desc: 'A raise, a new house, a paid-off car — life changes mean your plan changes. Your waterfall recalculates correctly whenever your situation shifts.' },
  { num: '04', title: 'A clear finish line at every step', desc: 'Vague goals like "save more" don\'t work. Each step has a concrete completion condition. When you hit it, you advance.' },
]

export default function HomePage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    setSent(true)
  }

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.offWhite, fontFamily: "'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        html{scroll-behavior:smooth;}
        body{-webkit-font-smoothing:antialiased;background:${T.bg};}
        ::selection{background:${T.tealGlow};color:${T.white};}

        .nav-link{color:${T.muted};text-decoration:none;font-size:13px;font-weight:500;letter-spacing:.03em;transition:color .2s;}
        .nav-link:hover{color:${T.white};}

        .serif-italic{font-family:'DM Serif Display',Georgia,serif;font-style:italic;}
        .serif{font-family:'DM Serif Display',Georgia,serif;}
        .mono{font-family:'DM Mono',monospace;}

        .step-row{border-top:1px solid ${T.border};padding:28px 0;display:flex;gap:32px;transition:all .2s;cursor:default;}
        .step-row:hover{border-top-color:${T.borderHover};}
        .step-row:last-child{border-bottom:1px solid ${T.border};}
        .step-row:last-child:hover{border-bottom-color:${T.borderHover};}

        .benefit-card{background:${T.bgCard};border:1px solid ${T.border};border-radius:12px;padding:28px;transition:all .2s;}
        .benefit-card:hover{background:${T.bgCardHover};border-color:${T.borderHover};transform:translateY(-1px);}

        .primary-btn{background:${T.white};border:none;border-radius:6px;padding:13px 28px;color:${T.bg};font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;letter-spacing:.04em;text-transform:uppercase;transition:all .15s;width:100%;}
        .primary-btn:hover:not(:disabled){background:${T.offWhite};transform:translateY(-1px);}
        .primary-btn:disabled{opacity:.6;cursor:default;transform:none;}

        .email-input{width:100%;background:rgba(255,255,255,0.06);border:1px solid ${T.border};border-radius:6px;padding:13px 16px;font-size:15px;color:${T.white};font-family:inherit;transition:all .2s;outline:none;}
        .email-input:focus{border-color:${T.teal};background:rgba(255,255,255,0.08);box-shadow:0 0 0 3px ${T.tealGlow};}
        .email-input::placeholder{color:${T.faint};}

        .hero-cta{display:inline-block;background:${T.white};border-radius:6px;padding:14px 36px;color:${T.bg};font-weight:700;font-size:13px;text-decoration:none;letter-spacing:.06em;text-transform:uppercase;transition:all .15s;font-family:inherit;}
        .hero-cta:hover{background:${T.offWhite};transform:translateY(-1px);}

        .ghost-btn{display:inline-block;border:1px solid ${T.border};border-radius:6px;padding:13px 28px;color:${T.muted};font-weight:500;font-size:13px;text-decoration:none;letter-spacing:.04em;transition:all .15s;font-family:inherit;}
        .ghost-btn:hover{border-color:${T.borderHover};color:${T.white};}

        .divider{width:100%;height:1px;background:${T.border};}

        @keyframes fadeUp{from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);}}
        .fade-up{animation:fadeUp .6s ease both;}
      `}</style>

      {/* Nav */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, borderBottom: `1px solid ${T.border}`, background: 'rgba(10,12,16,0.85)', backdropFilter: 'blur(16px)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: "'DM Serif Display',Georgia,serif", fontSize: 28, color: T.teal, lineHeight: 1, fontStyle: 'italic' }}>~</span>
            <span style={{ fontWeight: 700, fontSize: 15, color: T.white, letterSpacing: '-.2px' }}>Waterfall</span>
          </div>
          <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
            <a href="#the-method" className="nav-link">The method</a>
            <a href="#why-it-works" className="nav-link">Why it works</a>
            <a href="#get-started" className="hero-cta" style={{ padding: '9px 20px', fontSize: 12 }}>Get started →</a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '120px 32px 80px', position: 'relative', overflow: 'hidden' }}>
        {/* Subtle gradient orb */}
        <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%,-50%)', width: 600, height: 600, background: `radial-gradient(circle, ${T.tealGlow} 0%, transparent 70%)`, pointerEvents: 'none' }} />

        <div className="fade-up" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: `1px solid ${T.border}`, borderRadius: 20, padding: '5px 14px', marginBottom: 40 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: T.teal }} />
            <span style={{ color: T.muted, fontSize: 12, fontWeight: 500, letterSpacing: '.08em', textTransform: 'uppercase' as const }}>Personal financial planning</span>
          </div>

          <h1 style={{ fontSize: 'clamp(52px,8vw,100px)', fontWeight: 400, lineHeight: 1.0, letterSpacing: '-2px', marginBottom: 28, maxWidth: 900 }}>
            <span className="serif-italic" style={{ color: T.white }}>Know</span>
            <span style={{ color: T.white }}> exactly where</span>
            <br />
            <span style={{ color: T.white }}>every dollar </span>
            <span className="serif-italic" style={{ color: T.teal }}>goes.</span>
          </h1>

          <p style={{ color: T.muted, fontSize: 18, lineHeight: 1.8, maxWidth: 480, margin: '0 auto 48px', fontWeight: 300 }}>
            The waterfall method gives you a sequenced plan for your money — not just where to save, but in what order. Sequence changes everything.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' as const }}>
            <a href="#get-started" className="hero-cta">Build my free plan →</a>
            <a href="#the-method" className="ghost-btn">See how it works</a>
          </div>

          <p style={{ color: T.faint, fontSize: 12, marginTop: 24, letterSpacing: '.04em' }}>Free forever · No credit card · 5 minutes</p>
        </div>
      </div>

      {/* What is the waterfall */}
      <div id="the-method" style={{ borderTop: `1px solid ${T.border}`, padding: '100px 32px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ marginBottom: 64 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.16em', textTransform: 'uppercase' as const, color: T.teal, marginBottom: 20 }}>The method</div>
            <h2 style={{ fontSize: 'clamp(32px,5vw,58px)', fontWeight: 400, color: T.white, letterSpacing: '-1.5px', lineHeight: 1.1, marginBottom: 20 }}>
              <span className="serif-italic">Five steps.</span> One clear sequence.
            </h2>
            <p style={{ color: T.muted, fontSize: 16, lineHeight: 1.85, maxWidth: 520, fontWeight: 300 }}>
              A waterfall plan is a prioritized system for your savings. Each step must be complete — or well underway — before money flows to the next. Like water filling a vessel before spilling over.
            </p>
          </div>

          <div>
            {STEPS.map((step, i) => (
              <div key={i} className="step-row">
                <div style={{ flexShrink: 0, paddingTop: 2 }}>
                  <span className="mono" style={{ fontSize: 11, color: step.color, letterSpacing: '.1em', opacity: 0.8 }}>{step.num}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 16, color: T.white, marginBottom: 8, letterSpacing: '-.2px' }}>{step.label}</div>
                  <div style={{ color: T.muted, fontSize: 14, lineHeight: 1.75, fontWeight: 300 }}>{step.desc}</div>
                </div>
                <div style={{ flexShrink: 0, paddingTop: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: step.color, opacity: 0.6 }} />
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 40, border: `1px solid ${T.border}`, borderRadius: 10, padding: '20px 24px', background: T.tealDim, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: T.teal, flexShrink: 0, marginTop: 6 }} />
            <p style={{ color: T.muted, fontSize: 14, lineHeight: 1.8, fontWeight: 300 }}>
              <span style={{ color: T.teal, fontWeight: 500 }}>Your plan is personal.</span> Emergency fund size, step duration, and advancement conditions are calculated from your income, family, job stability, and existing balances — not a generic template.
            </p>
          </div>
        </div>
      </div>

      {/* Why it works */}
      <div id="why-it-works" style={{ borderTop: `1px solid ${T.border}`, padding: '100px 32px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ marginBottom: 64 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.16em', textTransform: 'uppercase' as const, color: T.teal, marginBottom: 20 }}>The long game</div>
            <h2 style={{ fontSize: 'clamp(32px,5vw,58px)', fontWeight: 400, color: T.white, letterSpacing: '-1.5px', lineHeight: 1.1, maxWidth: 600 }}>
              Why this works<br /><span className="serif-italic">over the long term.</span>
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 72 }}>
            {BENEFITS.map((b, i) => (
              <div key={i} className="benefit-card">
                <div className="mono" style={{ fontSize: 11, color: T.teal, letterSpacing: '.1em', marginBottom: 16, opacity: 0.7 }}>{b.num}</div>
                <div style={{ fontWeight: 600, fontSize: 15, color: T.white, marginBottom: 10, letterSpacing: '-.2px', lineHeight: 1.3 }}>{b.title}</div>
                <div style={{ color: T.muted, fontSize: 13, lineHeight: 1.75, fontWeight: 300 }}>{b.desc}</div>
              </div>
            ))}
          </div>

          {/* Quote */}
          <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 64, textAlign: 'center' }}>
            <blockquote style={{ fontSize: 'clamp(20px,3vw,32px)', fontWeight: 400, color: T.white, lineHeight: 1.5, letterSpacing: '-.5px', maxWidth: 640, margin: '0 auto 24px', fontFamily: "'DM Serif Display',Georgia,serif", fontStyle: 'italic' }}>
              "Most people aren't bad at saving money. They're bad at knowing what to do with it once they save it."
            </blockquote>
            <div style={{ color: T.faint, fontSize: 12, letterSpacing: '.06em', textTransform: 'uppercase' as const }}>The Waterfall Method</div>
          </div>
        </div>
      </div>

      {/* Who it's for */}
      <div style={{ borderTop: `1px solid ${T.border}`, padding: '100px 32px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(28px,4vw,48px)', fontWeight: 400, color: T.white, letterSpacing: '-1px', lineHeight: 1.15, marginBottom: 16 }}>
            Built for people who are<br /><span className="serif-italic">doing okay and want to do better.</span>
          </h2>
          <p style={{ color: T.muted, fontSize: 16, lineHeight: 1.8, maxWidth: 480, marginBottom: 48, fontWeight: 300 }}>
            You don't need to be a financial expert or debt-free. You just need to be honest with a few numbers and willing to follow a clear sequence.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 1, border: `1px solid ${T.border}`, borderRadius: 12, overflow: 'hidden' }}>
            {[
              { icon: '💼', text: 'Working and saving something each month' },
              { icon: '🏔️', text: 'Carrying debt you want to pay off strategically' },
              { icon: '🕰️', text: 'Behind on retirement and unsure how to catch up' },
              { icon: '🧩', text: 'Juggling goals and unsure which to prioritize' },
            ].map((item, i) => (
              <div key={i} style={{ background: T.bgCard, padding: '24px 20px', borderRight: i < 3 ? `1px solid ${T.border}` : 'none' }}>
                <div style={{ fontSize: 22, marginBottom: 12 }}>{item.icon}</div>
                <div style={{ color: T.muted, fontSize: 13, lineHeight: 1.7, fontWeight: 300 }}>{item.text}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sign-in CTA */}
      <div id="get-started" style={{ borderTop: `1px solid ${T.border}`, padding: '100px 32px 120px' }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 'clamp(32px,5vw,52px)', fontWeight: 400, color: T.white, letterSpacing: '-1.5px', lineHeight: 1.1, marginBottom: 16 }}>
              Ready to see<br /><span className="serif-italic">your plan?</span>
            </h2>
            <p style={{ color: T.muted, fontSize: 15, lineHeight: 1.8, fontWeight: 300 }}>
              Enter your numbers honestly. We'll tell you exactly what step you're on and where every dollar should go this month.
            </p>
          </div>

          <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 12, padding: '32px' }}>
            {!sent ? (
              <>
                <p style={{ color: T.muted, fontSize: 14, marginBottom: 20, lineHeight: 1.6, fontWeight: 300 }}>
                  Enter your email and we'll send a magic link — no password needed.
                </p>
                <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
                  <input className="email-input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
                  {error && <p style={{ color: T.coral, fontSize: 13 }}>{error}</p>}
                  <button className="primary-btn" type="submit" disabled={loading}>
                    {loading ? 'Sending…' : 'Send my magic link →'}
                  </button>
                </form>
                <p style={{ color: T.faint, fontSize: 12, marginTop: 16, textAlign: 'center' as const, letterSpacing: '.03em' }}>Free forever · No credit card · No spam</p>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 22 }}>📬</div>
                <h3 style={{ fontSize: 20, fontWeight: 600, color: T.white, marginBottom: 10, letterSpacing: '-.3px' }}>Check your inbox</h3>
                <p style={{ color: T.muted, fontSize: 14, lineHeight: 1.75, fontWeight: 300 }}>
                  We sent a magic link to <span style={{ color: T.white }}>{email}</span>.<br />
                  Open it in the same browser to sign in.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: `1px solid ${T.border}`, padding: '28px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: "'DM Serif Display',Georgia,serif", fontSize: 22, color: T.teal, fontStyle: 'italic', lineHeight: 1 }}>~</span>
          <span style={{ fontWeight: 600, fontSize: 13, color: T.white }}>Waterfall</span>
        </div>
        <p style={{ color: T.faint, fontSize: 12, letterSpacing: '.03em' }}>Educational framework only · Not personalized financial advice</p>
      </div>
    </div>
  )
}

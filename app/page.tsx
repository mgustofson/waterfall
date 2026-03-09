'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const T = {
  teal: '#00b8a9', tealMid: '#00a396', tealLight: '#e6f9f7',
  ink: '#1a2332', ink2: '#3d4f63', slate: '#8492a6',
  white: '#ffffff', bg: '#f5f7fa', border: '#e8edf2',
  shadow: '0 2px 12px rgba(26,35,50,0.07)',
  shadowMd: '0 4px 24px rgba(26,35,50,0.10)',
  shadowLg: '0 8px 40px rgba(26,35,50,0.12)',
  coral: '#ff6b6b', coralLight: '#fff0f0',
  amber: '#f5a623', amberLight: '#fff8ee',
  green: '#27ae60', greenLight: '#edfaf3',
  purple: '#7c5cbf', purpleLight: '#f3eeff',
  slateLight: '#f5f7fa',
}

const STEPS = [
  { num: 1, color: T.coral,  bg: T.coralLight,  icon: '💳', label: 'Eliminate high-interest debt',       desc: 'Credit cards and high-rate loans cost more in interest than almost any investment earns. Clearing them first is the highest guaranteed return available to you.' },
  { num: 2, color: T.amber,  bg: T.amberLight,  icon: '🛡️', label: 'Build your emergency fund',          desc: 'Without a cash cushion, any setback — a job loss, a medical bill, a car repair — forces you into new debt. Your emergency fund is what keeps a bad month from becoming a bad year.' },
  { num: 3, color: T.amber,  bg: T.amberLight,  icon: '🌱', label: 'Start investing for retirement',     desc: 'Once your cushion is half-funded, you split contributions between filling it and starting retirement accounts. Time in the market matters — starting small beats waiting.' },
  { num: 4, color: T.purple, bg: T.purpleLight, icon: '📈', label: 'Max out retirement accounts',        desc: 'Tax-advantaged accounts like your 401(k) or IRA are among the most powerful wealth-building tools available. Maxing them before taxable investing is almost always the right move.' },
  { num: 5, color: T.teal,   bg: T.tealLight,   icon: '⚖️', label: 'Balance enduring vs. opportunistic', desc: 'At this stage you\'re building lasting wealth. The right mix of stable and growth assets depends on your age and risk tolerance — and the plan adjusts as you get older.' },
]

const BENEFITS = [
  { icon: '🧭', title: 'No more decision fatigue', desc: 'Most people lose money not from bad investments, but from indecision — cash sitting in checking, unsure whether to pay off debt or invest. The waterfall eliminates that paralysis permanently.' },
  { icon: '📐', title: 'Order matters more than amount', desc: 'Investing $500/mo in the right sequence will outperform $1,000/mo in the wrong one. Getting the priority order right is the most impactful financial decision most people never make.' },
  { icon: '🔁', title: 'It evolves as you do', desc: 'A raise, a new house, a paid-off car — life changes mean your plan changes. The waterfall recalculates whenever your situation shifts, rather than going stale like a spreadsheet.' },
  { icon: '🏁', title: 'A finish line for every step', desc: 'Vague goals like "save more" don\'t work. Each step has a clear completion condition. When you hit it, you advance. Progress is visible, measurable, and worth celebrating.' },
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
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: "'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", color: T.ink }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{-webkit-font-smoothing:antialiased;}
        .nav-link{color:${T.slate};text-decoration:none;font-size:14px;font-weight:500;transition:color .15s;}
        .nav-link:hover{color:${T.teal};}
        .primary-btn{background:linear-gradient(135deg,${T.teal},${T.tealMid});border:none;border-radius:12px;padding:14px 28px;color:white;font-size:15px;font-weight:600;cursor:pointer;font-family:inherit;box-shadow:0 4px 16px ${T.teal}44;transition:all .15s;width:100%;}
        .primary-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 20px ${T.teal}55;}
        .primary-btn:disabled{opacity:.7;cursor:default;}
        .email-input{width:100%;background:white;border:2px solid ${T.border};border-radius:12px;padding:13px 16px;font-size:15px;color:${T.ink};font-family:inherit;transition:all .2s;outline:none;}
        .email-input:focus{border-color:${T.teal};box-shadow:0 0 0 4px ${T.teal}18;}
        .benefit-card{background:${T.white};border-radius:16px;padding:24px;box-shadow:${T.shadow};border:1px solid ${T.border};transition:all .2s;}
        .benefit-card:hover{transform:translateY(-2px);box-shadow:${T.shadowMd};}
        .step-row{border-radius:14px;transition:background .15s;cursor:default;}
        .step-row:hover{background:#fafbfc;}
        .hero-cta{display:inline-block;background:linear-gradient(135deg,${T.teal},${T.tealMid});border-radius:12px;padding:15px 36px;color:white;font-weight:600;font-size:16px;text-decoration:none;box-shadow:0 4px 16px ${T.teal}44;transition:all .15s;font-family:inherit;}
        .hero-cta:hover{transform:translateY(-1px);box-shadow:0 6px 24px ${T.teal}55;}
      `}</style>

      {/* Nav */}
      <nav style={{ borderBottom: `1px solid ${T.border}`, background: 'rgba(245,247,250,.95)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: 1020, margin: '0 auto', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: T.teal, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>🌊</div>
            <span style={{ fontWeight: 700, fontSize: 16, color: T.ink, letterSpacing: '-.3px' }}>Waterfall</span>
          </div>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <a href="#the-method" className="nav-link">The method</a>
            <a href="#why-it-works" className="nav-link">Why it works</a>
            <a href="#get-started" className="nav-link" style={{ color: T.teal, fontWeight: 600 }}>Get started</a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '96px 24px 80px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 'clamp(38px,6vw,66px)', fontWeight: 700, color: T.ink, lineHeight: 1.07, letterSpacing: '-.7px', marginBottom: 24 }}>
          Stop guessing where<br />to put your money.
        </h1>
        <p style={{ color: T.slate, fontSize: 18, lineHeight: 1.8, maxWidth: 520, margin: '0 auto 36px' }}>
          Most people juggle debt, savings, and investing without a clear order. The waterfall method gives you that order — and it turns out, sequence is everything.
        </p>
        <a href="#get-started" className="hero-cta">Build my free plan →</a>
        <p style={{ color: '#c5cdd6', fontSize: 12, marginTop: 16 }}>Free forever · No credit card · Takes 5 minutes</p>
      </div>

      {/* What is the waterfall */}
      <div id="the-method" style={{ background: T.white, borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}`, padding: '80px 24px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase' as const, color: T.teal, marginBottom: 12 }}>The method</div>
            <h2 style={{ fontSize: 'clamp(26px,4vw,40px)', fontWeight: 700, color: T.ink, letterSpacing: '-.4px', lineHeight: 1.15, marginBottom: 16 }}>What is a waterfall financial plan?</h2>
            <p style={{ color: T.slate, fontSize: 16, lineHeight: 1.8, maxWidth: 540, margin: '0 auto' }}>
              A waterfall plan is a sequenced system for allocating your savings. Each step must be complete — or well underway — before money flows to the next. Like water filling a vessel before spilling over, no step gets skipped.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 2 }}>
            {STEPS.map((step, i) => (
              <div key={i} className="step-row" style={{ display: 'flex', gap: 20, padding: '20px 18px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', flexShrink: 0 }}>
                  <div style={{ width: 46, height: 46, borderRadius: 14, background: step.bg, border: `2px solid ${step.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                    {step.icon}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div style={{ width: 2, flex: 1, minHeight: 20, background: `linear-gradient(${step.color}55,${STEPS[i+1].color}55)`, borderRadius: 1, margin: '5px 0' }} />
                  )}
                </div>
                <div style={{ paddingTop: 6, flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: step.color, fontFamily: 'DM Mono, monospace', letterSpacing: '.06em', marginBottom: 5 }}>STEP {step.num}</div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: T.ink, marginBottom: 6, letterSpacing: '-.2px' }}>{step.label}</div>
                  <div style={{ color: T.slate, fontSize: 14, lineHeight: 1.75 }}>{step.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: T.tealLight, borderRadius: 16, padding: '20px 24px', marginTop: 36, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 22, flexShrink: 0, lineHeight: 1 }}>💡</span>
            <p style={{ color: T.ink2, fontSize: 14, lineHeight: 1.75 }}>
              <strong style={{ color: T.tealMid }}>Your plan is personal.</strong> The size of your emergency fund, how long each step takes, and when you advance are all calculated from your specific income, family situation, job stability, and existing balances — not a one-size-fits-all template.
            </p>
          </div>
        </div>
      </div>

      {/* Why it works */}
      <div id="why-it-works" style={{ padding: '80px 24px', background: T.bg }}>
        <div style={{ maxWidth: 920, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase' as const, color: T.teal, marginBottom: 12 }}>The long game</div>
            <h2 style={{ fontSize: 'clamp(26px,4vw,40px)', fontWeight: 700, color: T.ink, letterSpacing: '-.4px', lineHeight: 1.15, marginBottom: 16 }}>Why this approach works<br />over the long term</h2>
            <p style={{ color: T.slate, fontSize: 16, lineHeight: 1.8, maxWidth: 480, margin: '0 auto' }}>
              The waterfall isn't a budget. It's a framework for making every financial decision for the rest of your life.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16, marginBottom: 52 }}>
            {BENEFITS.map((b, i) => (
              <div key={i} className="benefit-card">
                <div style={{ fontSize: 30, marginBottom: 14 }}>{b.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: T.ink, marginBottom: 8, letterSpacing: '-.2px' }}>{b.title}</div>
                <div style={{ color: T.slate, fontSize: 13, lineHeight: 1.75 }}>{b.desc}</div>
              </div>
            ))}
          </div>

          {/* Quote */}
          <div style={{ background: T.white, borderRadius: 20, padding: '36px 40px', boxShadow: T.shadowMd, border: `1px solid ${T.border}`, textAlign: 'center', maxWidth: 600, margin: '0 auto' }}>
            <div style={{ fontSize: 36, marginBottom: 18, lineHeight: 1 }}>💬</div>
            <blockquote style={{ fontSize: 'clamp(16px,2.5vw,20px)', fontWeight: 500, color: T.ink, lineHeight: 1.65, letterSpacing: '-.2px', marginBottom: 18, fontStyle: 'italic' }}>
              "Most people aren't bad at saving money. They're bad at knowing what to do with it once they save it. The waterfall solves that."
            </blockquote>
            <div style={{ color: T.slate, fontSize: 13 }}>The Waterfall Method</div>
          </div>
        </div>
      </div>

      {/* Who it's for */}
      <div style={{ background: T.white, borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}`, padding: '72px 24px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(24px,3.5vw,36px)', fontWeight: 700, color: T.ink, letterSpacing: '-.4px', marginBottom: 14, lineHeight: 1.2 }}>Built for people who are doing okay<br />and want to do better.</h2>
          <p style={{ color: T.slate, fontSize: 16, lineHeight: 1.8, maxWidth: 520, margin: '0 auto 40px' }}>
            You don't need to be a financial expert. You don't need to be debt-free. You just need to be honest with a few numbers and willing to follow a clear sequence.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
            {[
              { emoji: '💼', text: 'Working and saving something each month' },
              { emoji: '🏔️', text: 'Carrying debt you want to pay off strategically' },
              { emoji: '🕰️', text: 'Behind on retirement and wondering how to catch up' },
              { emoji: '🧩', text: 'Juggling goals and unsure which to prioritize first' },
            ].map((item, i) => (
              <div key={i} style={{ background: T.slateLight, borderRadius: 14, padding: '20px 16px', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 26 }}>{item.emoji}</span>
                <span style={{ color: T.ink2, fontSize: 13, lineHeight: 1.65, textAlign: 'center' as const }}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sign-in CTA */}
      <div id="get-started" style={{ padding: '84px 24px 100px', background: T.bg }}>
        <div style={{ maxWidth: 460, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(26px,4vw,38px)', fontWeight: 700, color: T.ink, letterSpacing: '-.4px', marginBottom: 12, lineHeight: 1.15 }}>Ready to see your plan?</h2>
          <p style={{ color: T.slate, fontSize: 15, marginBottom: 36, lineHeight: 1.8 }}>
            It takes about 5 minutes. Enter your numbers honestly and we'll tell you exactly what step you're on and where every dollar should go this month.
          </p>

          <div style={{ background: T.white, borderRadius: 20, padding: '32px 28px', boxShadow: T.shadowLg, border: `1px solid ${T.border}`, textAlign: 'left' }}>
            {!sent ? (
              <>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: T.ink, marginBottom: 6, letterSpacing: '-.3px' }}>Get your free plan</h3>
                <p style={{ color: T.slate, fontSize: 14, marginBottom: 22, lineHeight: 1.6 }}>Enter your email and we'll send a magic link — no password needed.</p>
                <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column' as const, gap: 12 }}>
                  <input className="email-input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
                  {error && <p style={{ color: '#ff6b6b', fontSize: 13 }}>{error}</p>}
                  <button className="primary-btn" type="submit" disabled={loading}>
                    {loading ? 'Sending…' : 'Send my magic link →'}
                  </button>
                </form>
                <p style={{ color: '#c5cdd6', fontSize: 12, marginTop: 14, textAlign: 'center' as const }}>Free forever · No credit card · No spam</p>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <div style={{ fontSize: 44, marginBottom: 16 }}>📬</div>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: T.ink, marginBottom: 8 }}>Check your inbox</h3>
                <p style={{ color: T.slate, fontSize: 14, lineHeight: 1.7 }}>
                  We sent a magic link to <strong style={{ color: T.ink2 }}>{email}</strong>.<br />
                  Open it in the same browser to sign in.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: `1px solid ${T.border}`, padding: '28px 24px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: T.teal, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>🌊</div>
          <span style={{ fontWeight: 700, fontSize: 13, color: T.ink }}>Waterfall</span>
        </div>
        <p style={{ color: '#c5cdd6', fontSize: 12 }}>Educational framework only · Not personalized financial advice</p>
      </div>
    </div>
  )
}

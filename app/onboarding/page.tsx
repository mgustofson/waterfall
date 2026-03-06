'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { calcEmergencyTarget, num, fmt, type Profile } from '@/lib/engine'

// ─── Design tokens ─────────────────────────────────────────────────────────
const T = {
  teal: '#00b8a9', tealMid: '#00a396', tealLight: '#e6f9f7',
  blue: '#4f8ef7', blueLight: '#eef4ff',
  coral: '#ff6b6b', coralLight: '#fff0f0',
  amber: '#f5a623', amberLight: '#fff8ee',
  green: '#27ae60', greenLight: '#edfaf3',
  purple: '#7c5cbf', purpleLight: '#f3eeff',
  slate: '#8492a6', slateLight: '#f5f7fa',
  ink: '#1a2332', ink2: '#3d4f63',
  white: '#ffffff', bg: '#f5f7fa', border: '#e8edf2',
  shadow: '0 2px 12px rgba(26,35,50,0.07)',
  shadowMd: '0 4px 24px rgba(26,35,50,0.10)',
  r: '16px', rSm: '10px', rLg: '24px',
}

const EMPTY_PROFILE: Profile = {
  ageBand: 'r3040', annualIncome: '', monthlySavings: '',
  has401k: false, selfEmployed: false,
  emergencyFund: '', retirementBalance: '',
  creditCards: [], studentLoans: '', studentLoanRate: '',
  realEstate: [], enduringBalance: '', opportunisticBalance: '',
  married: false, jobSecurity: 'moderate', kids: [], lifeContext: [],
}

const FLOW = [
  { id: 'welcome', type: 'welcome' },
  { id: 'ageBand', type: 'choice', q: 'How old are you?', hint: 'Shapes your emergency fund target and investment ratios.', cols: 2,
    opts: [{ v: 'u30', l: 'Under 30', s: 'Building foundation' }, { v: 'r3040', l: '30–40', s: 'Prime earning years' }, { v: 'r4055', l: '40–55', s: 'Accelerating growth' }, { v: 'r5565', l: '55–65', s: 'Near the finish line' }, { v: 'o65', l: 'Over 65', s: 'Retirement phase' }] },
  { id: 'annualIncome', type: 'number', q: 'What\'s your annual income?', hint: 'Gross household income, before taxes.', prefix: '$', ph: '120,000' },
  { id: 'monthlySavings', type: 'number', q: 'How much can you save each month?', hint: 'After all bills and minimum debt payments.', prefix: '$', ph: '1,500' },
  { id: 'employment', type: 'choice', q: 'What\'s your work situation?', hint: 'Determines the right retirement account for you.', cols: 1,
    opts: [{ v: 'employed_401k', l: 'Employed with a 401(k)', s: 'Your company has a retirement plan' }, { v: 'employed_no401k', l: 'Employed, no 401(k)', s: 'You\'ll use an IRA' }, { v: 'self', l: 'Self-employed / Freelance', s: 'SEP IRA — up to 25% of net income' }] },
  { id: 'jobSecurity', type: 'choice', q: 'How stable is your income?', hint: 'Variable income means you need a bigger cushion.', cols: 2,
    opts: [{ v: 'low', l: 'Very stable', s: 'Government or tenured' }, { v: 'moderate', l: 'Pretty steady', s: 'Regular salaried job' }, { v: 'extreme', l: 'Variable', s: 'Commission or contract' }, { v: 'self', l: 'Self-employed', s: 'It fluctuates' }] },
  { id: 'lifeContext', type: 'multi', q: 'A bit about your life.', hint: 'Check everything that applies.',
    opts: [{ v: 'married', l: 'Married or partnered', icon: '💑' }, { v: 'kids_young', l: 'Kids under 10', icon: '👶' }, { v: 'kids_older', l: 'Kids aged 10–22', icon: '🧒' }] },
  { id: 'emergencyFund', type: 'number', q: 'What\'s in your emergency fund?', hint: 'Cash in a savings or money market account.', prefix: '$', ph: '5,000' },
  { id: 'retirementBalance', type: 'number', q: 'What are your retirement accounts worth?', hint: 'All 401(k)s, IRAs, SEP IRAs combined.', prefix: '$', ph: '42,000' },
  { id: 'debt', type: 'debt', q: 'Do you have any high-interest debt?', hint: 'Credit cards, personal loans, or student loans.' },
  { id: 'realEstate', type: 'realEstate', q: 'Do you own any real estate?', hint: 'We\'ll calculate your equity and add it to your net worth.' },
  { id: 'investments', type: 'investments', q: 'Any other investments?', hint: 'Taxable brokerage accounts outside your retirement.' },
  { id: 'ready', type: 'ready' },
]

export default function OnboardingPage() {
  const [stepIdx, setStepIdx] = useState(0)
  const [dir, setDir] = useState(1)
  const [visible, setVisible] = useState(true)
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE)
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const set = useCallback((k: keyof Profile, v: any) => setProfile(p => ({ ...p, [k]: v })), [])

  const navigate = (delta: number) => {
    setDir(delta); setVisible(false)
    setTimeout(() => { setStepIdx(i => i + delta); setVisible(true) }, 180)
  }

  const handleChoice = (id: string, val: string) => {
    if (id === 'employment') {
      set('has401k', val === 'employed_401k')
      set('selfEmployed', val === 'self')
      if (val === 'self') set('jobSecurity', 'self')
    } else {
      set(id as keyof Profile, val)
    }
    setTimeout(() => navigate(1), 150)
  }

  const handleLife = (vals: string[]) => {
    set('married', vals.includes('married'))
    const kids: number[] = []
    if (vals.includes('kids_young')) kids.push(3)
    if (vals.includes('kids_older')) kids.push(14)
    set('kids', kids)
    set('lifeContext', vals)
  }

  const handleFinish = async () => {
    setSaving(true)
    await fetch('/api/save-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile }),
    })
    // Store profile in sessionStorage so /plan can read it immediately
    sessionStorage.setItem('wf_profile', JSON.stringify(profile))
    router.push('/plan')
  }

  const step = FLOW[stepIdx]
  const showProgress = step.type !== 'welcome' && step.type !== 'ready'
  const progress = stepIdx / (FLOW.length - 1)

  return (
    <div style={{ minHeight: '100vh', background: T.bg }}>
      <style>{`
        .choice-card{transition:all .15s;cursor:pointer;} .choice-card:hover{transform:translateY(-2px);box-shadow:${T.shadowMd}!important;}
        .choice-card.sel{border-color:${T.teal}!important;background:${T.tealLight}!important;}
        .del-btn:hover{color:${T.coral}!important;}
        .add-row:hover{background:#f0f9f8!important;border-color:${T.teal}!important;}
        .primary-btn{background:linear-gradient(135deg,${T.teal},${T.tealMid});border:none;border-radius:${T.r};padding:15px 28px;color:white;font-size:15px;font-weight:600;cursor:pointer;font-family:inherit;letter-spacing:-.1px;display:block;width:100%;box-shadow:0 4px 16px ${T.teal}44;transition:all .15s;}
        .primary-btn:hover{transform:translateY(-1px);} .primary-btn:disabled{opacity:.7;cursor:default;transform:none;}
      `}</style>

      {/* Progress bar */}
      {showProgress && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 3, background: T.border, zIndex: 50 }}>
          <div style={{ height: '100%', width: `${progress * 100}%`, background: `linear-gradient(90deg,${T.teal},#4ecdc4)`, transition: 'width .4s ease', borderRadius: '0 2px 2px 0' }} />
        </div>
      )}

      {/* Header */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40, background: 'rgba(245,247,250,.92)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${T.border}` }}>
        <div style={{ maxWidth: 500, margin: '0 auto', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: T.teal, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🌊</div>
            <span style={{ fontWeight: 700, fontSize: 15, color: T.ink }}>Waterfall</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {stepIdx > 0 && step.type !== 'ready' && (
              <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: T.slate, fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                ← Back
              </button>
            )}
            {showProgress && <span style={{ color: T.slate, fontSize: 12, fontFamily: 'DM Mono, monospace' }}>{stepIdx}/{FLOW.length - 2}</span>}
          </div>
        </div>
      </div>

      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 20px 40px' }}>
        {visible && (
          <div key={stepIdx} className={dir > 0 ? 'anim-up' : 'anim-down'} style={{ width: '100%', maxWidth: 480 }}>
            {step.type === 'welcome'     && <WelcomeStep onNext={() => navigate(1)} />}
            {step.type === 'choice'      && <ChoiceStep step={step as any} profile={profile} onChoice={handleChoice} />}
            {step.type === 'number'      && <NumberStep step={step as any} profile={profile} set={set} onNext={() => navigate(1)} />}
            {step.type === 'multi'       && <MultiStep step={step as any} profile={profile} onSave={handleLife} onNext={() => navigate(1)} />}
            {step.type === 'debt'        && <DebtStep profile={profile} set={set} onNext={() => navigate(1)} />}
            {step.type === 'realEstate'  && <RealEstateStep profile={profile} set={set} onNext={() => navigate(1)} />}
            {step.type === 'investments' && <InvestmentsStep profile={profile} set={set} onNext={() => navigate(1)} />}
            {step.type === 'ready'       && <ReadyStep profile={profile} saving={saving} onFinish={handleFinish} />}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Step components ──────────────────────────────────────────────────────────
function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ width: 72, height: 72, borderRadius: 22, background: `linear-gradient(135deg,${T.teal},#4ecdc4)`, margin: '0 auto 28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, boxShadow: `0 8px 32px ${T.teal}44` }}>🌊</div>
      <h1 style={{ fontSize: 'clamp(28px,5vw,40px)', fontWeight: 700, color: T.ink, marginBottom: 14, letterSpacing: '-.5px', lineHeight: 1.15 }}>Your personal<br />financial roadmap.</h1>
      <p style={{ color: T.slate, fontSize: 16, lineHeight: 1.75, maxWidth: 360, margin: '0 auto 36px' }}>Answer a few questions. Get the exact right order to put every dollar you save.</p>
      <button className="primary-btn" onClick={onNext}>Let's get started →</button>
      <p style={{ color: '#c5cdd6', fontSize: 12, marginTop: 16 }}>Educational framework · Not financial advice</p>
    </div>
  )
}

function ChoiceStep({ step, profile, onChoice }: any) {
  const current = step.id === 'employment'
    ? (profile.has401k ? 'employed_401k' : profile.selfEmployed ? 'self' : profile.monthlySavings ? 'employed_no401k' : null)
    : (profile as any)[step.id]
  return (
    <div>
      <StepQ text={step.q} hint={step.hint} />
      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: step.cols === 2 && step.opts.length > 3 ? '1fr 1fr' : '1fr' }}>
        {step.opts.map((o: any) => (
          <button key={o.v} className={`choice-card ${current === o.v ? 'sel' : ''}`} onClick={() => onChoice(step.id, o.v)}
            style={{ background: current === o.v ? T.tealLight : T.white, border: `2px solid ${current === o.v ? T.teal : T.border}`, borderRadius: T.r, padding: '16px 18px', textAlign: 'left', boxShadow: T.shadow, color: 'inherit' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: current === o.v ? T.tealMid : T.ink, marginBottom: o.s ? 3 : 0 }}>{o.l}</div>
                {o.s && <div style={{ fontSize: 12, color: T.slate }}>{o.s}</div>}
              </div>
              <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${current === o.v ? T.teal : T.border}`, background: current === o.v ? T.teal : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {current === o.v && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'white' }} />}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function NumberStep({ step, profile, set, onNext }: any) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { setTimeout(() => ref.current?.focus(), 120) }, [step.id])
  const val = (profile as any)[step.id]
  const canGo = num(val) > 0
  return (
    <div>
      <StepQ text={step.q} hint={step.hint} />
      <div style={{ background: T.white, border: `2px solid ${canGo ? T.teal : T.border}`, borderRadius: T.rLg, padding: '4px 24px', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, boxShadow: canGo ? `0 0 0 4px ${T.teal}18` : T.shadow, transition: 'all .2s' }}>
        <span style={{ color: T.slate, fontSize: 22, fontFamily: 'DM Mono, monospace' }}>{step.prefix}</span>
        <input ref={ref} value={val} onChange={e => set(step.id, e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && canGo) onNext() }}
          placeholder={step.ph}
          style={{ flex: 1, background: 'none', border: 'none', fontSize: 'clamp(32px,6vw,48px)', color: T.ink, fontFamily: 'DM Mono, monospace', fontWeight: 500, padding: '16px 0' }} />
      </div>
      {canGo && <button className="primary-btn" onClick={onNext}>Continue →</button>}
    </div>
  )
}

function MultiStep({ step, profile, onSave, onNext }: any) {
  const [sel, setSel] = useState<string[]>(profile.lifeContext || [])
  const toggle = (v: string) => setSel(s => s.includes(v) ? s.filter(x => x !== v) : [...s, v])
  return (
    <div>
      <StepQ text={step.q} hint={step.hint} />
      <div style={{ display: 'grid', gap: 10, marginBottom: 24 }}>
        {step.opts.map((o: any) => {
          const on = sel.includes(o.v)
          return (
            <button key={o.v} className="choice-card" onClick={() => toggle(o.v)}
              style={{ background: on ? T.tealLight : T.white, border: `2px solid ${on ? T.teal : T.border}`, borderRadius: T.r, padding: '15px 18px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: T.shadow, color: 'inherit' }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${on ? T.teal : T.border}`, background: on ? T.teal : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {on && <svg width="10" height="8" viewBox="0 0 10 8"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>}
              </div>
              <span style={{ fontSize: 14, fontWeight: 500, color: on ? T.tealMid : T.ink }}>{o.icon} {o.l}</span>
            </button>
          )
        })}
      </div>
      <button className="primary-btn" onClick={() => { onSave(sel); onNext() }}>
        {sel.length === 0 ? 'None of these — continue →' : 'Continue →'}
      </button>
    </div>
  )
}

function DebtStep({ profile, set, onNext }: any) {
  const [mode, setMode] = useState(profile.creditCards?.length > 0 ? 'cards' : null)
  const cards = profile.creditCards || []
  const addCard = () => set('creditCards', [...cards, { id: Date.now(), name: '', balance: '', rate: '', min: '' }])
  const upd = (id: number, f: string, v: string) => set('creditCards', cards.map((c: any) => c.id === id ? { ...c, [f]: v } : c))
  const rm = (id: number) => set('creditCards', cards.filter((c: any) => c.id !== id))
  return (
    <div>
      <StepQ text="Do you carry any debt?" hint="Credit cards, personal loans, or student loans." />
      {mode === null && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <TileBtn icon="💳" label="Yes, I do" sub="Let's rank the payoff" onClick={() => { setMode('cards'); if (cards.length === 0) set('creditCards', [{ id: Date.now(), name: '', balance: '', rate: '', min: '' }]) }} />
          <TileBtn icon="✅" label="No debt" sub="Skip this step" onClick={() => { set('creditCards', []); set('studentLoans', ''); onNext() }} />
        </div>
      )}
      {mode === 'cards' && (
        <div>
          <SLabel>Credit Cards &amp; Loans</SLabel>
          {cards.map((card: any, i: number) => (
            <div key={card.id} style={{ background: T.white, borderRadius: T.r, padding: '14px 16px', marginBottom: 10, boxShadow: T.shadow, border: `1px solid ${T.border}`, position: 'relative' }}>
              <button className="del-btn" onClick={() => rm(card.id)} style={{ position: 'absolute', top: 10, right: 12, background: 'none', border: 'none', color: T.border, fontSize: 20, transition: 'color .15s' }}>×</button>
              <FInput value={card.name} onChange={(v: string) => upd(card.id, 'name', v)} placeholder={`Card ${i + 1} name`} style={{ marginBottom: 8 }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <MField prefix="$" value={card.balance} onChange={(v: string) => upd(card.id, 'balance', v)} placeholder="Balance" />
                <MField suffix="%" value={card.rate} onChange={(v: string) => upd(card.id, 'rate', v)} placeholder="Rate" />
                <MField prefix="$" value={card.min} onChange={(v: string) => upd(card.id, 'min', v)} placeholder="Min pmt" />
              </div>
            </div>
          ))}
          <button className="add-row" onClick={addCard} style={{ width: '100%', background: 'transparent', border: `1.5px dashed ${T.border}`, borderRadius: T.r, padding: '12px', color: T.slate, fontSize: 13, fontWeight: 500, marginBottom: 16, transition: 'all .15s' }}>+ Add another card</button>
          <SLabel>Student Loans (optional)</SLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <MField prefix="$" value={profile.studentLoans} onChange={(v: string) => set('studentLoans', v)} placeholder="Total balance" />
            <MField suffix="%" value={profile.studentLoanRate} onChange={(v: string) => set('studentLoanRate', v)} placeholder="Interest rate" />
          </div>
          {num(profile.studentLoanRate) > 7 && <Callout color={T.coral} bg={T.coralLight} icon="⚠️">Over 7% — treated as high-priority consumer debt</Callout>}
          <button className="primary-btn" onClick={onNext} style={{ marginTop: 16 }}>Continue →</button>
        </div>
      )}
    </div>
  )
}

function RealEstateStep({ profile, set, onNext }: any) {
  const [mode, setMode] = useState(profile.realEstate?.length > 0 ? 'props' : null)
  const props = profile.realEstate || []
  const addProp = () => set('realEstate', [...props, { id: Date.now(), name: '', currentValue: '', mortgageOwed: '', purchasePrice: '' }])
  const upd = (id: number, f: string, v: string) => set('realEstate', props.map((p: any) => p.id === id ? { ...p, [f]: v } : p))
  const rm = (id: number) => set('realEstate', props.filter((p: any) => p.id !== id))
  return (
    <div>
      <StepQ text="Do you own any real estate?" hint="We'll calculate your equity and add it to your net worth." />
      {mode === null && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <TileBtn icon="🏠" label="Yes, I do" sub="Home, rental, etc." onClick={() => { setMode('props'); if (props.length === 0) addProp() }} />
          <TileBtn icon="👋" label="Not yet" sub="Skip this" onClick={() => { set('realEstate', []); onNext() }} />
        </div>
      )}
      {mode === 'props' && (
        <div>
          <Callout color={T.teal} bg={T.tealLight} icon="💡">Look up your current value on <strong>Zillow</strong> or <strong>Redfin</strong> first.</Callout>
          <div style={{ marginTop: 12 }}>
            {props.map((prop: any) => {
              const equity = Math.max(0, num(prop.currentValue) - num(prop.mortgageOwed))
              const ltv = num(prop.currentValue) > 0 ? num(prop.mortgageOwed) / num(prop.currentValue) : 0
              const gain = num(prop.purchasePrice) > 0 ? ((num(prop.currentValue) - num(prop.purchasePrice)) / num(prop.purchasePrice)) * 100 : null
              return (
                <div key={prop.id} style={{ background: T.white, borderRadius: T.r, padding: '14px 16px', marginBottom: 10, boxShadow: T.shadow, border: `1px solid ${T.border}`, position: 'relative' }}>
                  <button className="del-btn" onClick={() => rm(prop.id)} style={{ position: 'absolute', top: 10, right: 12, background: 'none', border: 'none', color: T.border, fontSize: 20, transition: 'color .15s' }}>×</button>
                  <FInput value={prop.name} onChange={(v: string) => upd(prop.id, 'name', v)} placeholder="Property address or name" style={{ marginBottom: 8 }} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: equity > 0 ? 10 : 0 }}>
                    <MField prefix="$" value={prop.currentValue} onChange={(v: string) => upd(prop.id, 'currentValue', v)} placeholder="Est. value" />
                    <MField prefix="$" value={prop.mortgageOwed} onChange={(v: string) => upd(prop.id, 'mortgageOwed', v)} placeholder="Owed" />
                    <MField prefix="$" value={prop.purchasePrice} onChange={(v: string) => upd(prop.id, 'purchasePrice', v)} placeholder="Paid" />
                  </div>
                  {equity > 0 && (
                    <div style={{ background: T.greenLight, borderRadius: T.rSm, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: T.green, fontSize: 13, fontWeight: 500 }}>Equity</span>
                      <div style={{ display: 'flex', gap: 12 }}>
                        <span style={{ color: T.green, fontFamily: 'DM Mono, monospace', fontSize: 14, fontWeight: 600 }}>{fmt(equity)}</span>
                        {ltv > 0 && <span style={{ color: T.slate, fontSize: 11, fontFamily: 'DM Mono, monospace' }}>{Math.round(ltv * 100)}% LTV</span>}
                        {gain !== null && <span style={{ color: gain >= 0 ? T.green : T.coral, fontSize: 11, fontFamily: 'DM Mono, monospace' }}>{gain >= 0 ? '+' : ''}{Math.round(gain)}%</span>}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
            <button className="add-row" onClick={addProp} style={{ width: '100%', background: 'transparent', border: `1.5px dashed ${T.border}`, borderRadius: T.r, padding: '12px', color: T.slate, fontSize: 13, fontWeight: 500, marginBottom: 16 }}>+ Add another property</button>
          </div>
          <button className="primary-btn" onClick={onNext}>Continue →</button>
        </div>
      )}
    </div>
  )
}

function InvestmentsStep({ profile, set, onNext }: any) {
  const [mode, setMode] = useState<string | null>(null)
  return (
    <div>
      <StepQ text="Any other investments?" hint="Taxable brokerage accounts outside your retirement." />
      {mode === null && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <TileBtn icon="📊" label="Yes" sub="Stocks, funds, etc." onClick={() => setMode('yes')} />
          <TileBtn icon="👋" label="Not yet" sub="Skip this" onClick={() => { set('enduringBalance', ''); set('opportunisticBalance', ''); onNext() }} />
        </div>
      )}
      {mode === 'yes' && (
        <div>
          <SLabel>Enduring (stable) investments</SLabel>
          <FInput prefix="$" value={profile.enduringBalance} onChange={(v: string) => set('enduringBalance', v)} placeholder="0" style={{ marginBottom: 4 }} />
          <p style={{ color: T.slate, fontSize: 12, marginBottom: 16 }}>Bonds-heavy, low-risk brokerage accounts</p>
          <SLabel>Opportunistic (growth) assets</SLabel>
          <FInput prefix="$" value={profile.opportunisticBalance} onChange={(v: string) => set('opportunisticBalance', v)} placeholder="0" style={{ marginBottom: 4 }} />
          <p style={{ color: T.slate, fontSize: 12, marginBottom: 20 }}>Stocks &gt;20%, startups, crypto, RSUs</p>
          <button className="primary-btn" onClick={onNext}>Continue →</button>
        </div>
      )}
    </div>
  )
}

function ReadyStep({ profile, saving, onFinish }: any) {
  const efTarget = calcEmergencyTarget(profile)
  const totalDebt = (profile.creditCards || []).reduce((s: number, c: any) => s + num(c.balance), 0) + num(profile.studentLoans)
  const totalEquity = (profile.realEstate || []).reduce((s: number, p: any) => s + Math.max(0, num(p.currentValue) - num(p.mortgageOwed)), 0)
  const stats = [
    { l: 'Annual income', v: fmt(num(profile.annualIncome)), color: T.teal },
    { l: 'Monthly savings', v: fmt(num(profile.monthlySavings)), color: T.teal },
    { l: 'Emergency fund target', v: fmt(efTarget), color: T.amber },
    { l: 'Retirement vehicle', v: profile.has401k ? '401(k)' : profile.selfEmployed ? 'SEP IRA' : 'IRA', color: T.purple },
    ...(totalDebt > 0 ? [{ l: 'Total debt', v: fmt(totalDebt), color: T.coral }] : []),
    ...(totalEquity > 0 ? [{ l: 'Real estate equity', v: fmt(totalEquity), color: T.green }] : []),
  ]
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ width: 64, height: 64, borderRadius: 20, background: `linear-gradient(135deg,${T.teal},#4ecdc4)`, margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, boxShadow: `0 8px 28px ${T.teal}44` }}>🌊</div>
      <h2 style={{ fontSize: 'clamp(24px,4vw,34px)', fontWeight: 700, color: T.ink, marginBottom: 8, letterSpacing: '-.4px' }}>You're all set.</h2>
      <p style={{ color: T.slate, fontSize: 15, marginBottom: 28, lineHeight: 1.7 }}>Here's what we're working with:</p>
      <div style={{ background: T.white, borderRadius: T.rLg, marginBottom: 28, boxShadow: T.shadowMd, textAlign: 'left' }}>
        {stats.map((s, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 20px', borderBottom: i < stats.length - 1 ? `1px solid ${T.border}` : 'none' }}>
            <span style={{ color: T.slate, fontSize: 13 }}>{s.l}</span>
            <span style={{ color: s.color, fontFamily: 'DM Mono, monospace', fontSize: 13, fontWeight: 600 }}>{s.v}</span>
          </div>
        ))}
      </div>
      <button className="primary-btn" onClick={onFinish} disabled={saving}>{saving ? 'Saving your plan…' : 'Show my plan →'}</button>
    </div>
  )
}

// ─── Shared atoms ─────────────────────────────────────────────────────────────
function StepQ({ text, hint }: { text: string; hint?: string }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 'clamp(22px,4vw,32px)', fontWeight: 700, color: T.ink, lineHeight: 1.2, letterSpacing: '-.4px', marginBottom: hint ? 8 : 0 }}>{text}</h2>
      {hint && <p style={{ color: T.slate, fontSize: 14, lineHeight: 1.65 }}>{hint}</p>}
    </div>
  )
}
function TileBtn({ icon, label, sub, onClick }: any) {
  return (
    <button className="choice-card" onClick={onClick} style={{ background: T.white, border: `2px solid ${T.border}`, borderRadius: T.r, padding: '18px 16px', textAlign: 'left', boxShadow: T.shadow, color: 'inherit' }}>
      <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 12, color: T.slate }}>{sub}</div>
    </button>
  )
}
function SLabel({ children }: any) { return <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' as const, color: T.slate, marginBottom: 8 }}>{children}</div> }
function FInput({ prefix, value, onChange, placeholder, style = {} }: any) {
  return (
    <div style={{ background: T.slateLight, borderRadius: T.rSm, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, ...style }}>
      {prefix && <span style={{ color: T.slate, fontFamily: 'DM Mono, monospace', fontSize: 14 }}>{prefix}</span>}
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ background: 'none', border: 'none', outline: 'none', color: T.ink, fontSize: 15, fontFamily: 'DM Mono, monospace', flex: 1 }} />
    </div>
  )
}
function MField({ prefix, suffix, value, onChange, placeholder }: any) {
  return (
    <div style={{ background: T.slateLight, borderRadius: 8, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
      {prefix && <span style={{ color: T.slate, fontFamily: 'DM Mono, monospace', fontSize: 12 }}>{prefix}</span>}
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ background: 'none', border: 'none', outline: 'none', color: T.ink, fontSize: 13, fontFamily: 'DM Mono, monospace', flex: 1, minWidth: 0 }} />
      {suffix && <span style={{ color: T.slate, fontFamily: 'DM Mono, monospace', fontSize: 12 }}>{suffix}</span>}
    </div>
  )
}
function Callout({ color, bg, icon, children }: any) {
  return (
    <div style={{ background: bg, borderRadius: T.rSm, padding: '10px 14px', display: 'flex', gap: 8, marginBottom: 4 }}>
      <span style={{ fontSize: 14, lineHeight: 1.5, flexShrink: 0 }}>{icon}</span>
      <span style={{ color, fontSize: 13, lineHeight: 1.55 }}>{children}</span>
    </div>
  )
}

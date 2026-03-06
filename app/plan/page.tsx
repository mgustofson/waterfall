'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  computeWaterfall, calcNetWorth, buildPayoffPlan, calcInterestSaved,
  calcEmergencyTarget, fmt, fmtPct, num,
  type Profile, type WaterfallResult
} from '@/lib/engine'

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

const STEPS_META = [
  { label: 'Pay Off Debt',              sub: 'Get to zero on high-interest debt',          color: '#ff6b6b', bg: '#fff0f0', icon: '💳' },
  { label: 'Build Emergency Fund',      sub: '50% of your target amount first',            color: '#f5a623', bg: '#fff8ee', icon: '🛡️' },
  { label: 'Emergency + Retirement',   sub: 'Fill the cushion, start the future',          color: '#f5a623', bg: '#fff8ee', icon: '🌱' },
  { label: 'Max Retirement + Enduring', sub: 'Max accounts, then taxable investing',       color: '#7c5cbf', bg: '#f3eeff', icon: '📈' },
  { label: 'Balance Your Portfolio',    sub: 'Enduring vs Opportunistic ratio',            color: '#00b8a9', bg: '#e6f9f7', icon: '⚖️' },
]

export default function PlanPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [result, setResult] = useState<WaterfallResult | null>(null)
  const [snapshots, setSnapshots] = useState<any[]>([])
  const [debtMethod, setDebtMethod] = useState<'avalanche' | 'snowball'>('avalanche')
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }

      // Try sessionStorage first (fresh from onboarding) then fall back to DB
      const cached = sessionStorage.getItem('wf_profile')
      let profileData: Profile | null = cached ? JSON.parse(cached) : null

      if (!profileData) {
        const { data } = await supabase
          .from('profiles')
          .select('profile_data')
          .eq('id', user.id)
          .single()
        profileData = data?.profile_data ?? null
      }

      if (!profileData) { router.push('/onboarding'); return }

      // Load last 6 snapshots for trend data
      const { data: snaps } = await supabase
        .from('snapshots')
        .select('waterfall_step, net_worth, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(6)

      setProfile(profileData)
      setResult(computeWaterfall(profileData))
      setSnapshots(snaps ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const handleSignOut = async () => {
    sessionStorage.removeItem('wf_profile')
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return <LoadingScreen />
  if (!profile || !result) return null

  const active = STEPS_META[result.currentStep]
  const cards = profile.creditCards || []
  const hasCards = cards.filter(c => num(c.balance) > 0).length > 0
  const extraDebt = result.currentStep === 0 ? num(profile.monthlySavings) * (result.consumerDebt / num(profile.annualIncome) <= 0.3 ? 1 : 0.75) : 0
  const payoffPlan = buildPayoffPlan(cards, extraDebt, debtMethod)
  const saved = calcInterestSaved(cards, extraDebt)
  const realEstate = profile.realEstate || []
  const realEstateEquity = result.realEstateEquity || 0
  const totalOpp = num(profile.opportunisticBalance) + realEstateEquity
  const totalDebt = result.consumerDebt
  const studentLoans = num(profile.studentLoans)
  const studentRate = num(profile.studentLoanRate) || 5
  const retLabel = profile.has401k ? '401(k)' : profile.selfEmployed ? 'SEP IRA' : 'IRA'
  const retMax = profile.selfEmployed && !profile.has401k ? Math.min(num(profile.annualIncome) * 0.25, 66000) : profile.has401k ? 23000 : 7000
  const ratios: Record<string, [number, number]> = { u30: [1, 2], r3040: [1, 1.75], r4055: [1, 1.5], r5565: [1, 1.25], o65: [2, 1] }
  const [eR, oR] = ratios[profile.ageBand] ?? [1, 1.75]
  const netWorth = calcNetWorth(profile)

  const netItems = [
    { l: 'Emergency Fund',      v: num(profile.emergencyFund),    c: T.amber  },
    { l: retLabel,              v: num(profile.retirementBalance), c: T.purple },
    { l: 'Enduring',            v: num(profile.enduringBalance),   c: T.teal   },
    { l: 'Liquid Opportunistic',v: num(profile.opportunisticBalance), c: T.blue },
    ...(realEstateEquity > 0   ? [{ l: 'Real Estate Equity', v: realEstateEquity, c: T.green }] : []),
    ...(totalDebt > 0          ? [{ l: 'Consumer Debt',      v: -totalDebt,       c: T.coral }] : []),
    ...(studentLoans > 0 && studentRate <= 7 ? [{ l: 'Student Loans', v: -studentLoans, c: T.coral }] : []),
  ]

  return (
    <div style={{ minHeight: '100vh', background: T.bg }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: #e0e6ed; border-radius: 4px; }
        .rank-row:not(:last-child) { border-bottom: 1px solid ${T.border}; }
        .method-pill { transition: all .15s; cursor: pointer; }
        .nav-btn { transition: all .15s; cursor: pointer; }
        .nav-btn:hover { background: ${T.tealLight} !important; color: ${T.teal} !important; }
        .chip { display: inline-block; border-radius: 20px; font-size: 11px; font-weight: 500; padding: 3px 8px; }
      `}</style>

      {/* Nav */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: 'rgba(245,247,250,.95)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${T.border}` }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '13px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: T.teal, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🌊</div>
            <span style={{ fontWeight: 700, fontSize: 15, color: T.ink }}>Waterfall</span>
            <span style={{ color: T.border, margin: '0 4px' }}>·</span>
            <span style={{ color: T.slate, fontSize: 13 }}>{fmt(num(profile.monthlySavings))}/mo</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="nav-btn" onClick={() => router.push('/checkin')}
              style={{ background: T.tealLight, border: 'none', borderRadius: T.rSm, padding: '7px 14px', color: T.teal, fontSize: 13, fontWeight: 600 }}>
              Update plan
            </button>
            <button className="nav-btn" onClick={handleSignOut}
              style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: T.rSm, padding: '7px 14px', color: T.slate, fontSize: 13 }}>
              Sign out
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '28px 20px 60px' }}>

        {/* Hero */}
        <div style={{ background: `linear-gradient(135deg, ${active.color}, ${active.color}cc)`, borderRadius: T.rLg, padding: '24px 28px', marginBottom: 24, color: 'white', boxShadow: `0 8px 32px ${active.color}44` }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', opacity: 0.75, marginBottom: 6 }}>Your focus right now</div>
          <div style={{ fontSize: 'clamp(20px,3vw,28px)', fontWeight: 700, marginBottom: 12, letterSpacing: '-.3px' }}>{active.icon} {active.label}</div>
          {result.flags.map((f, i) => (
            <div key={i} style={{ fontSize: 14, opacity: 0.88, lineHeight: 1.65, marginBottom: 4, paddingLeft: 12, borderLeft: '2px solid rgba(255,255,255,.3)' }}>{f}</div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' }}>
          <div>

            {/* Monthly allocation */}
            <Card title="Monthly savings breakdown">
              <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', gap: 2, marginBottom: 18 }}>
                {result.allocations.map((a, i) => <div key={i} style={{ flex: a.pct, background: a.color, borderRadius: 3, minWidth: 4 }} />)}
              </div>
              {result.allocations.map((a, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: i < result.allocations.length - 1 ? `1px solid ${T.border}` : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: a.color, flexShrink: 0 }} />
                    <span style={{ color: T.ink2, fontSize: 14 }}>{a.label}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: T.slate, fontSize: 12, fontFamily: 'DM Mono, monospace' }}>{fmtPct(a.pct)}</span>
                    <span style={{ color: T.ink, fontSize: 15, fontFamily: 'DM Mono, monospace', fontWeight: 600, minWidth: 70, textAlign: 'right' }}>{fmt(a.amount)}</span>
                  </div>
                </div>
              ))}
            </Card>

            {/* Credit card ranker */}
            {hasCards && (
              <Card title="Credit card payoff plan">
                <div style={{ display: 'flex', background: T.slateLight, borderRadius: T.rSm, padding: 3, marginBottom: 14, width: 'fit-content', gap: 2 }}>
                  {(['avalanche', 'snowball'] as const).map(m => (
                    <button key={m} className="method-pill" onClick={() => setDebtMethod(m)}
                      style={{ background: debtMethod === m ? T.white : 'transparent', border: 'none', borderRadius: 8, padding: '7px 16px', color: debtMethod === m ? T.ink : T.slate, fontWeight: debtMethod === m ? 600 : 400, fontSize: 13, fontFamily: 'inherit', boxShadow: debtMethod === m ? T.shadow : 'none' }}>
                      {m === 'avalanche' ? '⚡ Avalanche' : '❄️ Snowball'}
                    </button>
                  ))}
                </div>
                <p style={{ color: T.slate, fontSize: 13, marginBottom: 14, lineHeight: 1.55 }}>
                  {debtMethod === 'avalanche' ? 'Highest interest rate first — minimizes total interest paid.' : 'Smallest balance first — faster wins to build momentum.'}
                </p>
                {saved > 200 && debtMethod === 'avalanche' && (
                  <div style={{ background: T.greenLight, borderRadius: T.rSm, padding: '10px 14px', marginBottom: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 14 }}>💰</span>
                    <span style={{ color: T.green, fontSize: 13 }}>Avalanche saves you <strong style={{ fontFamily: 'DM Mono, monospace' }}>{fmt(saved)}</strong> in interest vs snowball.</span>
                  </div>
                )}
                {payoffPlan.map((card, i) => (
                  <div key={i} className="rank-row" style={{ padding: '14px 0', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: i === 0 ? T.coral : i === 1 ? T.amber : T.slateLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: i < 2 ? 'white' : T.slate, fontWeight: 700, fontSize: 13, fontFamily: 'DM Mono, monospace' }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontWeight: 600, fontSize: 14, color: T.ink }}>{card.name || `Card ${i + 1}`}</span>
                        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 14, color: T.coral, fontWeight: 600 }}>{fmt(card.balance)}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                        <Chip color={T.coral} bg={T.coralLight}>{card.rate}% APR</Chip>
                        <Chip color={T.teal} bg={T.tealLight}>{fmt(card.payment)}/mo</Chip>
                        {card.months < 999 && <Chip color={T.green} bg={T.greenLight}>{card.months}mo to pay off</Chip>}
                        {card.interest != null && <Chip color={T.amber} bg={T.amberLight}>{fmt(card.interest)} interest</Chip>}
                      </div>
                      <div style={{ height: 4, background: T.slateLight, borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(100, card.balance / Math.max(...cards.map((c: any) => num(c.balance)), 1) * 100)}%`, background: i === 0 ? T.coral : i === 1 ? T.amber : '#cbd5e0', borderRadius: 2 }} />
                      </div>
                    </div>
                  </div>
                ))}
                {studentLoans > 0 && (
                  <div style={{ marginTop: 10, paddingTop: 12, borderTop: `1px solid ${T.border}`, color: T.slate, fontSize: 13 }}>
                    Student loans ({studentRate}%): <span style={{ fontFamily: 'DM Mono, monospace', color: T.ink2 }}>{fmt(studentLoans)}</span>
                    {studentRate > 7 ? <span style={{ color: T.coral }}> — treated as consumer debt</span> : <span> — pay minimums while building other steps</span>}
                  </div>
                )}
              </Card>
            )}

            {/* Real estate */}
            {realEstate.filter(p => num(p.currentValue) > 0).length > 0 && (
              <Card title="Real estate equity">
                {realEstate.filter(p => num(p.currentValue) > 0).map((prop, i) => {
                  const val = num(prop.currentValue), owed = num(prop.mortgageOwed), equity = Math.max(0, val - owed)
                  const ltv = val > 0 ? owed / val : 0
                  const gain = num(prop.purchasePrice) > 0 ? ((val - num(prop.purchasePrice)) / num(prop.purchasePrice)) * 100 : null
                  return (
                    <div key={i} style={{ marginBottom: i < realEstate.length - 1 ? 16 : 0, paddingBottom: i < realEstate.length - 1 ? 16 : 0, borderBottom: i < realEstate.length - 1 ? `1px solid ${T.border}` : 'none' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: 14, color: T.ink }}>{prop.name || 'Property'}</span>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 15, color: T.green, fontWeight: 600 }}>{fmt(equity)}</div>
                          <div style={{ fontSize: 11, color: T.slate }}>equity</div>
                        </div>
                      </div>
                      <div style={{ height: 8, borderRadius: 4, background: T.slateLight, overflow: 'hidden', marginBottom: 8, display: 'flex' }}>
                        <div style={{ width: `${Math.min(100, ltv * 100)}%`, background: `${T.coral}88`, borderRadius: 4 }} />
                        <div style={{ width: `${Math.min(100, (1 - ltv) * 100)}%`, background: `${T.green}66`, borderRadius: 4 }} />
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <Chip color={T.ink2} bg={T.slateLight}>Value: {fmt(val)}</Chip>
                        {owed > 0 && <Chip color={T.coral} bg={T.coralLight}>Owed: {fmt(owed)}</Chip>}
                        {owed > 0 && <Chip color={ltv < 0.8 ? T.green : T.amber} bg={ltv < 0.8 ? T.greenLight : T.amberLight}>{Math.round(ltv * 100)}% LTV</Chip>}
                        {gain !== null && <Chip color={gain >= 0 ? T.green : T.coral} bg={gain >= 0 ? T.greenLight : T.coralLight}>{gain >= 0 ? '+' : ''}{Math.round(gain)}% gain</Chip>}
                      </div>
                    </div>
                  )
                })}
                <div style={{ background: T.greenLight, borderRadius: T.rSm, padding: '10px 14px', marginTop: 14, display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: T.green, fontSize: 13, fontWeight: 500 }}>Total equity</span>
                  <span style={{ fontFamily: 'DM Mono, monospace', color: T.green, fontSize: 14, fontWeight: 700 }}>{fmt(realEstateEquity)}</span>
                </div>
                <p style={{ color: T.slate, fontSize: 12, marginTop: 8 }}>Counts toward your Opportunistic asset category.</p>
              </Card>
            )}

            {/* Roadmap */}
            <Card title="Your waterfall roadmap">
              {STEPS_META.map((s, i) => {
                const done = i < result.currentStep, cur = i === result.currentStep
                return (
                  <div key={i} style={{ display: 'flex', gap: 14, position: 'relative', paddingBottom: i < STEPS_META.length - 1 ? 20 : 0 }}>
                    {i < STEPS_META.length - 1 && <div style={{ position: 'absolute', left: 15, top: 36, width: 2, bottom: 0, background: done ? s.color + '44' : T.border, borderRadius: 1 }} />}
                    <div style={{ width: 32, height: 32, borderRadius: 10, flexShrink: 0, background: done ? s.color : cur ? s.bg : T.slateLight, border: `2px solid ${done || cur ? s.color : T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, zIndex: 1 }}>
                      {done ? <svg width="12" height="10" viewBox="0 0 12 10"><path d="M1 5l4 4L11 1" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg> : s.icon}
                    </div>
                    <div style={{ flex: 1, paddingTop: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <span style={{ fontSize: 14, fontWeight: cur ? 700 : 500, color: cur ? T.ink : done ? T.slate : '#8492a6' }}>{s.label}</span>
                        {done && <span style={{ background: T.greenLight, color: T.green, fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 20 }}>DONE</span>}
                        {cur && <span style={{ background: s.bg, color: s.color, fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 20 }}>NOW</span>}
                      </div>
                      <div style={{ fontSize: 12, color: done ? T.border : T.slate }}>{s.sub}</div>
                    </div>
                  </div>
                )
              })}
            </Card>

            {/* History */}
            {snapshots.length > 1 && (
              <Card title="Net worth over time">
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 80 }}>
                  {[...snapshots].reverse().map((s, i) => {
                    const max = Math.max(...snapshots.map(x => Math.abs(x.net_worth)))
                    const h = max > 0 ? Math.max(8, Math.abs(s.net_worth) / max * 72) : 8
                    const pos = s.net_worth >= 0
                    return (
                      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <div style={{ fontSize: 9, color: T.slate, fontFamily: 'DM Mono, monospace' }}>{fmt(s.net_worth)}</div>
                        <div style={{ width: '100%', height: h, background: pos ? T.teal : T.coral, borderRadius: '4px 4px 0 0', opacity: i === snapshots.length - 1 ? 1 : 0.5 + (i / snapshots.length) * 0.4 }} />
                        <div style={{ fontSize: 9, color: T.slate }}>{new Date(s.created_at).toLocaleDateString('en-US', { month: 'short' })}</div>
                      </div>
                    )
                  })}
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div style={{ display: 'grid', gap: 14 }}>
            <SideCard>
              <SideLabel color={T.amber}>Emergency Fund</SideLabel>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <div><div style={{ fontSize: 20, fontFamily: 'DM Mono, monospace', fontWeight: 600, color: T.ink }}>{fmt(num(profile.emergencyFund))}</div><div style={{ fontSize: 11, color: T.slate }}>current</div></div>
                <div style={{ textAlign: 'right' }}><div style={{ fontSize: 20, fontFamily: 'DM Mono, monospace', color: T.slate }}>{fmt(calcEmergencyTarget(profile))}</div><div style={{ fontSize: 11, color: T.slate }}>target</div></div>
              </div>
              <div style={{ height: 8, background: T.slateLight, borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(100, (num(profile.emergencyFund) / calcEmergencyTarget(profile)) * 100)}%`, background: `linear-gradient(90deg,${T.amber},#f7c948)`, borderRadius: 4, transition: 'width .8s ease' }} />
              </div>
              <div style={{ color: T.slate, fontSize: 12, marginTop: 6, textAlign: 'right' }}>{fmtPct(Math.min(1, num(profile.emergencyFund) / calcEmergencyTarget(profile)))} funded</div>
            </SideCard>

            <SideCard>
              <SideLabel color={T.purple}>{retLabel}</SideLabel>
              <div style={{ fontSize: 22, fontFamily: 'DM Mono, monospace', fontWeight: 600, color: T.ink, marginBottom: 4 }}>{fmt(num(profile.retirementBalance))}</div>
              <div style={{ fontSize: 12, color: T.slate }}>Annual max: {fmt(retMax)}{profile.selfEmployed && !profile.has401k ? ' (25% of net)' : ''}</div>
            </SideCard>

            {totalDebt > 0 && (
              <SideCard>
                <SideLabel color={T.coral}>Debt</SideLabel>
                {cards.filter(c => num(c.balance) > 0).map((c: any, i: number) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ color: T.slate, fontSize: 12 }}>{c.name || `Card ${i + 1}`}</span>
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: T.coral }}>{fmt(num(c.balance))}</span>
                  </div>
                ))}
                {studentLoans > 0 && studentRate > 7 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ color: T.slate, fontSize: 12 }}>Student loans</span>
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: T.coral }}>{fmt(studentLoans)}</span>
                  </div>
                )}
                <div style={{ borderTop: `1px solid ${T.border}`, marginTop: 6, paddingTop: 6, display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: T.ink2, fontSize: 12, fontWeight: 600 }}>Total</span>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, color: T.coral, fontWeight: 700 }}>{fmt(totalDebt)}</span>
                </div>
              </SideCard>
            )}

            <SideCard>
              <SideLabel color={T.blue}>Opportunistic · {eR}:{oR}</SideLabel>
              {realEstateEquity > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span style={{ color: T.slate, fontSize: 12 }}>Real estate equity</span><span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: T.green }}>{fmt(realEstateEquity)}</span></div>}
              {num(profile.opportunisticBalance) > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span style={{ color: T.slate, fontSize: 12 }}>Liquid investments</span><span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: T.blue }}>{fmt(num(profile.opportunisticBalance))}</span></div>}
              <div style={{ borderTop: `1px solid ${T.border}`, marginTop: 6, paddingTop: 6, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: T.ink2, fontSize: 12, fontWeight: 600 }}>Total</span>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, color: T.blue, fontWeight: 700 }}>{fmt(totalOpp)}</span>
              </div>
            </SideCard>

            <SideCard>
              <SideLabel color={T.slate}>Net Worth</SideLabel>
              {netItems.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: T.slate, fontSize: 12 }}>{item.l}</span>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: item.v < 0 ? T.coral : item.c }}>{item.v < 0 ? `(${fmt(-item.v)})` : fmt(item.v)}</span>
                </div>
              ))}
              <div style={{ borderTop: `1px solid ${T.border}`, marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: T.ink2, fontSize: 13, fontWeight: 700 }}>Total</span>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 18, color: netWorth >= 0 ? T.ink : T.coral, fontWeight: 700 }}>{netWorth < 0 ? `(${fmt(-netWorth)})` : fmt(netWorth)}</span>
              </div>
            </SideCard>
          </div>
        </div>
      </div>
    </div>
  )
}

function LoadingScreen() {
  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f7fa' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: '#00b8a9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, margin: '0 auto 16px', boxShadow: '0 8px 24px #00b8a944' }}>🌊</div>
        <div style={{ color: '#8492a6', fontSize: 14 }}>Loading your plan…</div>
      </div>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#ffffff', borderRadius: '24px', padding: '20px 22px', marginBottom: 16, boxShadow: '0 2px 12px rgba(26,35,50,.07)', border: '1px solid #e8edf2' }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#8492a6', marginBottom: 16 }}>{title}</div>
      {children}
    </div>
  )
}

function SideCard({ children }: { children: React.ReactNode }) {
  return <div style={{ background: '#ffffff', borderRadius: '16px', padding: '16px 18px', boxShadow: '0 2px 12px rgba(26,35,50,.07)', border: '1px solid #e8edf2' }}>{children}</div>
}

function SideLabel({ color, children }: { color: string; children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color, marginBottom: 12 }}>{children}</div>
}

function Chip({ color, bg, children }: { color: string; bg: string; children: React.ReactNode }) {
  return <span className="chip" style={{ background: bg, color }}>{children}</span>
}

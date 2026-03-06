'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { computeWaterfall, calcNetWorth, calcEmergencyTarget, fmt, num, type Profile } from '@/lib/engine'

const T = {
  teal: '#00b8a9', tealMid: '#00a396', tealLight: '#e6f9f7',
  coral: '#ff6b6b', coralLight: '#fff0f0',
  amber: '#f5a623', amberLight: '#fff8ee',
  green: '#27ae60', greenLight: '#edfaf3',
  purple: '#7c5cbf', purpleLight: '#f3eeff',
  slate: '#8492a6', slateLight: '#f5f7fa',
  ink: '#1a2332', ink2: '#3d4f63',
  white: '#ffffff', border: '#e8edf2',
  shadow: '0 2px 12px rgba(26,35,50,0.07)',
  shadowMd: '0 4px 24px rgba(26,35,50,0.10)',
  r: '16px', rSm: '10px', rLg: '24px',
}

// Fields users are likely to update monthly
const CHECKIN_FIELDS = [
  { key: 'monthlySavings',    label: 'Monthly savings',         prefix: '$', hint: 'Has this changed?' },
  { key: 'emergencyFund',     label: 'Emergency fund balance',  prefix: '$', hint: 'Your current savings balance' },
  { key: 'retirementBalance', label: 'Retirement accounts',     prefix: '$', hint: 'All 401k/IRA balances combined' },
]

export default function CheckinPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [updates, setUpdates] = useState<Partial<Profile>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [previousStep, setPreviousStep] = useState<number | null>(null)
  const [newStep, setNewStep] = useState<number | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      const { data } = await supabase.from('profiles').select('profile_data').eq('id', user.id).single()
      if (!data?.profile_data) { router.push('/onboarding'); return }

      // Also grab last snapshot step for comparison
      const { data: snap } = await supabase
        .from('snapshots')
        .select('waterfall_step')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      setProfile(data.profile_data)
      setPreviousStep(snap?.waterfall_step ?? null)
      setLoading(false)
    }
    load()
  }, [])

  const merged = profile ? { ...profile, ...updates } : null

  const handleUpdate = (key: string, val: string) => {
    setUpdates(u => ({ ...u, [key]: val }))
  }

  const handleSave = async () => {
    if (!merged) return
    setSaving(true)
    const result = computeWaterfall(merged)
    const netWorth = calcNetWorth(merged)
    setNewStep(result.currentStep)

    await fetch('/api/save-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile: merged }),
    })

    sessionStorage.setItem('wf_profile', JSON.stringify(merged))
    setSaving(false)
    setDone(true)
  }

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f7fa' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🌊</div>
        <div style={{ color: T.slate, fontSize: 14 }}>Loading your check-in…</div>
      </div>
    </div>
  )

  if (!profile || !merged) return null

  const currentResult = computeWaterfall(merged)
  const efTarget = calcEmergencyTarget(merged)
  const efBalance = num(merged.emergencyFund)
  const STEPS = ['Pay Off Debt', 'Build Emergency Fund', 'Emergency + Retirement', 'Max Retirement + Enduring', 'Balance Portfolio']
  const stepChanged = previousStep !== null && newStep !== null && previousStep !== newStep
  const movedUp = newStep !== null && previousStep !== null && newStep > previousStep

  if (done) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f7fa', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ maxWidth: 440, width: '100%', textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: 22, background: `linear-gradient(135deg,${T.teal},#4ecdc4)`, margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, boxShadow: `0 8px 32px ${T.teal}44` }}>
            {stepChanged ? (movedUp ? '🎉' : '📉') : '✅'}
          </div>
          <h2 style={{ fontSize: 28, fontWeight: 700, color: T.ink, marginBottom: 10, letterSpacing: '-.4px' }}>Plan updated.</h2>

          {stepChanged && newStep !== null ? (
            <div style={{ background: movedUp ? T.greenLight : T.amberLight, borderRadius: T.r, padding: '14px 18px', marginBottom: 20, border: `1px solid ${movedUp ? T.green : T.amber}33` }}>
              <p style={{ color: movedUp ? T.green : T.amber, fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
                {movedUp ? '🎉 You moved up a step!' : 'Your focus has shifted.'}
              </p>
              <p style={{ color: T.ink2, fontSize: 13, lineHeight: 1.6 }}>
                {previousStep !== null && `From: ${STEPS[previousStep]}`}<br />
                {`To: ${STEPS[newStep]}`}
              </p>
            </div>
          ) : (
            <p style={{ color: T.slate, fontSize: 15, marginBottom: 20, lineHeight: 1.7 }}>
              You're still on step {(newStep ?? 0) + 1}: <strong style={{ color: T.ink }}>{STEPS[newStep ?? 0]}</strong>. Keep going — your next check-in is in 30 days.
            </p>
          )}

          <button onClick={() => router.push('/plan')}
            style={{ background: `linear-gradient(135deg,${T.teal},${T.tealMid})`, border: 'none', borderRadius: T.r, padding: '15px 28px', color: 'white', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'block', width: '100%', boxShadow: `0 4px 16px ${T.teal}44`, marginBottom: 12 }}>
            View my full plan →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f7fa' }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', -apple-system, sans-serif; }
        .update-input { background: white; border: 2px solid ${T.border}; border-radius: ${T.r}; padding: '4px 16px'; display: flex; align-items: center; transition: border-color .2s, box-shadow .2s; }
        .update-input:focus-within { border-color: ${T.teal}; box-shadow: 0 0 0 4px ${T.teal}18; }
        .save-btn { background: linear-gradient(135deg,${T.teal},${T.tealMid}); border: none; border-radius: ${T.r}; padding: 15px 28px; color: white; font-size: 15px; font-weight: 600; cursor: pointer; font-family: inherit; display: block; width: 100%; box-shadow: 0 4px 16px ${T.teal}44; transition: all .15s; }
        .save-btn:hover { transform: translateY(-1px); }
        .save-btn:disabled { opacity: .7; cursor: default; transform: none; }
      `}</style>

      {/* Nav */}
      <div style={{ borderBottom: `1px solid ${T.border}`, background: 'rgba(245,247,250,.95)', backdropFilter: 'blur(12px)' }}>
        <div style={{ maxWidth: 500, margin: '0 auto', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: T.teal, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🌊</div>
            <span style={{ fontWeight: 700, fontSize: 15, color: T.ink }}>Monthly check-in</span>
          </div>
          <button onClick={() => router.push('/plan')} style={{ background: 'none', border: 'none', color: T.slate, fontSize: 13, cursor: 'pointer' }}>← Back to plan</button>
        </div>
      </div>

      <div style={{ maxWidth: 500, margin: '0 auto', padding: '40px 20px' }}>
        <p style={{ color: T.slate, fontSize: 15, lineHeight: 1.7, marginBottom: 32 }}>
          Update a few numbers and we'll recalculate your plan. Takes about 2 minutes.
        </p>

        {/* Quick update fields */}
        <div style={{ display: 'grid', gap: 16, marginBottom: 28 }}>
          {CHECKIN_FIELDS.map(field => {
            const current = (profile as any)[field.key]
            const updated = (updates as any)[field.key]
            const val = updated ?? current
            const changed = updated !== undefined && updated !== current
            return (
              <div key={field.key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: T.ink2 }}>{field.label}</label>
                  {changed && <span style={{ fontSize: 11, color: T.teal, fontWeight: 600 }}>Updated</span>}
                </div>
                <div className="update-input" style={{ display: 'flex', alignItems: 'center', padding: '4px 16px', border: `2px solid ${changed ? T.teal : T.border}`, borderRadius: T.r, boxShadow: changed ? `0 0 0 4px ${T.teal}18` : 'none', background: T.white, transition: 'all .2s' }}>
                  <span style={{ color: T.slate, fontSize: 18, fontFamily: 'DM Mono, monospace', marginRight: 8 }}>{field.prefix}</span>
                  <input
                    value={val}
                    onChange={e => handleUpdate(field.key, e.target.value)}
                    style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 28, color: T.ink, fontFamily: 'DM Mono, monospace', fontWeight: 500, padding: '12px 0' }}
                  />
                </div>
                <p style={{ color: T.slate, fontSize: 12, marginTop: 5 }}>{field.hint}</p>
              </div>
            )
          })}
        </div>

        {/* Debt balances if they have any */}
        {profile.creditCards && profile.creditCards.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: T.slate, marginBottom: 14 }}>Credit card balances</div>
            {profile.creditCards.map((card, i) => {
              const cardUpdates = (updates as any).creditCards ?? profile.creditCards
              const currentBalance = cardUpdates[i]?.balance ?? card.balance
              return (
                <div key={card.id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <span style={{ color: T.ink2, fontSize: 13, flex: 1 }}>{card.name || `Card ${i + 1}`}</span>
                  <div style={{ display: 'flex', alignItems: 'center', background: T.slateLight, borderRadius: T.rSm, padding: '8px 12px', gap: 6 }}>
                    <span style={{ color: T.slate, fontFamily: 'DM Mono, monospace', fontSize: 13 }}>$</span>
                    <input
                      value={currentBalance}
                      onChange={e => {
                        const newCards = [...(profile.creditCards || [])]
                        newCards[i] = { ...newCards[i], balance: e.target.value }
                        setUpdates(u => ({ ...u, creditCards: newCards }))
                      }}
                      style={{ background: 'none', border: 'none', outline: 'none', fontSize: 14, fontFamily: 'DM Mono, monospace', color: T.ink, width: 90 }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Live preview */}
        <div style={{ background: T.white, borderRadius: T.rLg, padding: '16px 20px', marginBottom: 28, boxShadow: T.shadow, border: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: T.slate, marginBottom: 14 }}>Live preview</div>
          <div style={{ display: 'flex', gap: 4, height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 14 }}>
            {currentResult.allocations.map((a, i) => <div key={i} style={{ flex: a.pct, background: a.color, borderRadius: 3 }} />)}
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, marginBottom: 4 }}>
            Step {currentResult.currentStep + 1}: {['Pay Off Debt', 'Build Emergency Fund', 'Emergency + Retirement', 'Max Retirement + Enduring', 'Balance Portfolio'][currentResult.currentStep]}
          </div>
          <div style={{ display: 'flex', gap: 4, height: 6, borderRadius: 3, overflow: 'hidden', background: T.slateLight, marginTop: 10 }}>
            <div style={{ width: `${Math.min(100, (efBalance / efTarget) * 100)}%`, background: `linear-gradient(90deg,${T.amber},#f7c948)`, borderRadius: 3 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ color: T.slate, fontSize: 11 }}>Emergency fund</span>
            <span style={{ color: T.slate, fontSize: 11, fontFamily: 'DM Mono, monospace' }}>{fmt(efBalance)} / {fmt(efTarget)}</span>
          </div>
        </div>

        <button className="save-btn" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save check-in →'}
        </button>
        <p style={{ textAlign: 'center', color: '#c5cdd6', fontSize: 12, marginTop: 14 }}>Your next check-in will be scheduled in 30 days.</p>
      </div>
    </div>
  )
}

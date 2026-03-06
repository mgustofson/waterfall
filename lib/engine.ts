// ─── Types ────────────────────────────────────────────────────────────────────
export interface CreditCard {
  id: number
  name: string
  balance: string
  rate: string
  min: string
}

export interface RealEstateProperty {
  id: number
  name: string
  currentValue: string
  mortgageOwed: string
  purchasePrice: string
}

export interface Profile {
  ageBand: 'u30' | 'r3040' | 'r4055' | 'r5565' | 'o65'
  annualIncome: string
  monthlySavings: string
  has401k: boolean
  selfEmployed: boolean
  emergencyFund: string
  retirementBalance: string
  creditCards: CreditCard[]
  studentLoans: string
  studentLoanRate: string
  realEstate: RealEstateProperty[]
  enduringBalance: string
  opportunisticBalance: string
  married: boolean
  jobSecurity: 'low' | 'moderate' | 'extreme' | 'self'
  kids: number[]
  lifeContext: string[]
}

export interface Allocation {
  label: string
  amount: number
  pct: number
  color: string
}

export interface WaterfallResult {
  efTarget: number
  currentStep: number
  allocations: Allocation[]
  flags: string[]
  consumerDebt: number
  realEstateEquity: number
}

export interface CardPayoffRow extends CreditCard {
  balance: any
  rate: any
  min: any
  payment: number
  months: number
  interest: number | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
export const fmt = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

export const fmtPct = (n: number) => `${Math.round(n * 100)}%`

export const num = (s: string | number | undefined) =>
  parseFloat(String(s ?? '').replace(/[^0-9.]/g, '')) || 0

// ─── Payoff math ──────────────────────────────────────────────────────────────
export function monthsToPayoff(balance: number, rate: number, payment: number): number {
  if (balance <= 0) return 0
  const r = rate / 100 / 12
  if (r === 0) return Math.ceil(balance / payment)
  if (payment <= balance * r) return 999
  return Math.ceil(-Math.log(1 - (balance * r) / payment) / Math.log(1 + r))
}

export function totalInterest(balance: number, rate: number, payment: number): number {
  const r = rate / 100 / 12
  if (r === 0) return 0
  const m = monthsToPayoff(balance, rate, payment)
  if (m >= 999) return Infinity
  return Math.max(0, payment * m - balance)
}

export function buildPayoffPlan(
  cards: CreditCard[],
  extraMonthly: number,
  method: 'avalanche' | 'snowball'
): CardPayoffRow[] {
  if (!cards || cards.length === 0) return []
  const active = cards
    .filter(c => num(c.balance) > 0)
    .map(c => ({
      ...c,
      balance: num(c.balance),
      rate: num(c.rate) || 20,
      min: num(c.min) || Math.max(25, num(c.balance) * 0.02),
    }))
  if (active.length === 0) return []
  const sorted = [...active].sort((a, b) =>
    method === 'avalanche' ? b.rate - a.rate : a.balance - b.balance
  )
  return sorted.map((card, i) => {
    const payment = card.min + (i === 0 ? extraMonthly : 0)
    const mo = monthsToPayoff(card.balance, card.rate, payment)
    const interest = totalInterest(card.balance, card.rate, payment)
    return { ...card, payment, months: mo, interest: isFinite(interest) ? interest : null }
  })
}

export function calcInterestSaved(cards: CreditCard[], extra: number): number {
  if (!cards || cards.length < 2) return 0
  const tA = buildPayoffPlan(cards, extra, 'avalanche').reduce((s, c) => s + (c.interest || 0), 0)
  const tS = buildPayoffPlan(cards, extra, 'snowball').reduce((s, c) => s + (c.interest || 0), 0)
  return Math.max(0, tS - tA)
}

// ─── Emergency fund ───────────────────────────────────────────────────────────
export function calcEmergencyTarget(profile: Profile): number {
  const BASE: Record<string, Record<string, number>> = {
    u30:   { u50: 10000, m100: 15000, m150: 20000, m250: 25000, o250: 35000 },
    r3040: { u50: 15000, m100: 20000, m150: 30000, m250: 40000, o250: 50000 },
    r4055: { u50: 20000, m100: 25000, m150: 40000, m250: 50000, o250: 75000 },
    r5565: { u50: 25000, m100: 30000, m150: 50000, m250: 60000, o250: 85000 },
    o65:   { u50: 30000, m100: 35000, m150: 75000, m250: 85000, o250: 100000 },
  }
  const inc = num(profile.annualIncome)
  const b = inc < 50000 ? 'u50' : inc <= 100000 ? 'm100' : inc <= 150000 ? 'm150' : inc <= 250000 ? 'm250' : 'o250'
  let base = (BASE[profile.ageBand] ?? BASE.r3040)[b]
  let mult = 1
  ;(profile.kids || []).forEach(k => {
    if (k < 5) mult += 0.05
    else if (k <= 11) mult += 0.05
    else if (k <= 15) mult += 0.07
    else if (k <= 22) mult += 0.1
  })
  const jf: Record<string, number> = { extreme: 0.15, moderate: 0.1, low: 0.05, self: 0.15 }
  mult += jf[profile.jobSecurity] ?? 0
  if (profile.married) mult += 0.1
  return Math.round((base * mult) / 1000) * 1000
}

// ─── Main waterfall engine ────────────────────────────────────────────────────
export function computeWaterfall(profile: Profile): WaterfallResult {
  const inc = num(profile.annualIncome)
  const monthly = num(profile.monthlySavings)
  const efBalance = num(profile.emergencyFund)
  const totalCardDebt = (profile.creditCards || []).reduce((s, c) => s + num(c.balance), 0)
  const studentLoans = num(profile.studentLoans)
  const studentRate = num(profile.studentLoanRate) || 5
  const highRateStudent = studentRate > 7 ? studentLoans : 0
  const consumerDebt = totalCardDebt + highRateStudent
  const retBalance = num(profile.retirementBalance)
  const enduringBalance = num(profile.enduringBalance)
  const realEstateEquity = (profile.realEstate || []).reduce(
    (s, p) => s + Math.max(0, num(p.currentValue) - num(p.mortgageOwed)),
    0
  )
  const efTarget = calcEmergencyTarget(profile)
  const retLabel = profile.has401k ? '401(k)' : profile.selfEmployed ? 'SEP IRA' : 'IRA'
  const retMax = profile.has401k ? 500 : 583

  const r: WaterfallResult = {
    efTarget, currentStep: 0, allocations: [], flags: [], consumerDebt, realEstateEquity,
  }

  if (consumerDebt > 0) {
    const dp = consumerDebt / inc
    r.currentStep = 0
    if (dp <= 0.3) {
      r.allocations = [{ label: 'Consumer Debt', amount: monthly, pct: 1, color: '#ff6b6b' }]
      r.flags.push('Debt is under 30% of income — put 100% toward payoff.')
    } else {
      r.allocations = [
        { label: 'Consumer Debt', amount: monthly * 0.75, pct: 0.75, color: '#ff6b6b' },
        { label: 'Emergency Fund', amount: monthly * 0.25, pct: 0.25, color: '#f5a623' },
      ]
      r.flags.push('Debt exceeds 30% of income — split 75% debt, 25% emergency fund.')
    }
    r.flags.push(`All debt cleared in ~${Math.ceil(consumerDebt / (monthly * (dp <= 0.3 ? 1 : 0.75)))} months at this pace.`)
    return r
  }

  if (efBalance < efTarget * 0.5) {
    r.currentStep = 1
    r.allocations = [{ label: 'Emergency Fund', amount: monthly, pct: 1, color: '#f5a623' }]
    const needed = efTarget * 0.5 - efBalance
    r.flags.push(`Your emergency fund is ${fmtPct(efBalance / efTarget)} full. Need ${fmt(needed)} more to hit 50%.`)
    r.flags.push(`At ${fmt(monthly)}/mo, you'll get there in ~${Math.ceil(needed / monthly)} months.`)
    return r
  }

  if (efBalance < efTarget) {
    r.currentStep = 2
    const efMo = Math.min(monthly * 0.5, efTarget - efBalance)
    const retMo = Math.min(monthly * 0.5, retMax)
    const extra = monthly - efMo - retMo
    r.allocations = [
      { label: 'Emergency Fund', amount: efMo, pct: efMo / monthly, color: '#f5a623' },
      { label: retLabel, amount: retMo, pct: retMo / monthly, color: '#7c5cbf' },
    ]
    if (extra > 0) r.allocations.push({ label: 'Extra to Retirement', amount: extra, pct: extra / monthly, color: '#9b7dd4' })
    r.flags.push(`Split evenly between your emergency fund and ${retLabel} until the emergency fund is fully funded.`)
    r.flags.push(`Emergency fund: ${fmt(efBalance)} of ${fmt(efTarget)} (${fmtPct(efBalance / efTarget)})`)
    return r
  }

  const enduringThreshold = Math.max(inc, retBalance * 2)
  if (enduringBalance < enduringThreshold) {
    r.currentStep = 3
    const studentExtra = studentLoans > 0 && studentRate <= 7 ? Math.min(monthly * 0.1, 300) : 0
    const enduring = Math.max(0, monthly - retMax - studentExtra)
    r.allocations = [{ label: `${retLabel} (max)`, amount: retMax, pct: retMax / monthly, color: '#7c5cbf' }]
    if (studentExtra > 0) r.allocations.push({ label: 'Extra Student Loan', amount: studentExtra, pct: studentExtra / monthly, color: '#ff6b6b' })
    if (enduring > 0) r.allocations.push({ label: 'Enduring Investments', amount: enduring, pct: enduring / monthly, color: '#00b8a9' })
    r.flags.push(`Max out your ${retLabel} first, then send the rest to your taxable investment account.`)
    r.flags.push(`Enduring target: ${fmt(enduringBalance)} of ${fmt(enduringThreshold)} (${fmtPct(Math.min(1, enduringBalance / enduringThreshold))})`)
    return r
  }

  r.currentStep = 4
  const ratios: Record<string, [number, number]> = {
    u30: [1, 2], r3040: [1, 1.75], r4055: [1, 1.5], r5565: [1, 1.25], o65: [2, 1],
  }
  const [eR, oR] = ratios[profile.ageBand] ?? [1, 1.75]
  const tot = eR + oR
  r.allocations = [
    { label: 'Enduring Investments', amount: monthly * (eR / tot), pct: eR / tot, color: '#00b8a9' },
    { label: 'Opportunistic Assets', amount: monthly * (oR / tot), pct: oR / tot, color: '#4f8ef7' },
  ]
  r.flags.push(`Your target ratio is ${eR} Enduring to ${oR} Opportunistic for your age group.`)
  const targetOpp = enduringBalance * (oR / eR)
  r.flags.push(
    num(profile.opportunisticBalance) < targetOpp
      ? `Opportunistic needs ${fmt(targetOpp - num(profile.opportunisticBalance))} more to hit target.`
      : 'Your Enduring/Opportunistic ratio looks balanced. Keep it up.'
  )
  return r
}

// ─── Net worth calculation ────────────────────────────────────────────────────
export function calcNetWorth(profile: Profile): number {
  const efBalance = num(profile.emergencyFund)
  const retBalance = num(profile.retirementBalance)
  const enduringBal = num(profile.enduringBalance)
  const oppBal = num(profile.opportunisticBalance)
  const realEstateEquity = (profile.realEstate || []).reduce(
    (s, p) => s + Math.max(0, num(p.currentValue) - num(p.mortgageOwed)), 0
  )
  const totalDebt = (profile.creditCards || []).reduce((s, c) => s + num(c.balance), 0) + num(profile.studentLoans)
  return efBalance + retBalance + enduringBal + oppBal + realEstateEquity - totalDebt
}

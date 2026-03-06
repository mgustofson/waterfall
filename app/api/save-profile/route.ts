import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { computeWaterfall, calcNetWorth } from '@/lib/engine'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { profile } = body

  if (!profile) {
    return NextResponse.json({ error: 'Missing profile' }, { status: 400 })
  }

  // Compute the result for snapshotting
  const result = computeWaterfall(profile)
  const netWorth = calcNetWorth(profile)

  // Upsert the profile
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      email: user.email,
      profile_data: profile,
      onboarding_complete: true,
      next_checkin_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  // Save a snapshot for historical tracking
  const { error: snapError } = await supabase
    .from('snapshots')
    .insert({
      user_id: user.id,
      profile_data: profile,
      result_data: result,
      waterfall_step: result.currentStep,
      net_worth: netWorth,
    })

  if (snapError) {
    console.error('Snapshot error:', snapError)
    // Non-fatal — profile was saved
  }

  return NextResponse.json({ success: true })
}

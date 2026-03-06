import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function GET(request: NextRequest) {
  // Verify this is called by Vercel cron (or manually with the secret)
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  // Find all users whose check-in is due
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, email, profile_data, next_checkin_at')
    .lte('next_checkin_at', new Date().toISOString())
    .eq('onboarding_complete', true)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No check-ins due' })
  }

  let sent = 0
  const appUrl = process.env.NEXT_PUBLIC_APP_URL

  for (const profile of profiles) {
    const profileData = profile.profile_data as any
    const stepNames = [
      'paying off debt',
      'building your emergency fund',
      'balancing emergency fund + retirement',
      'maxing retirement and building investments',
      'optimizing your portfolio balance',
    ]

    // Get their last snapshot to show progress
    const { data: lastSnapshot } = await supabase
      .from('snapshots')
      .select('waterfall_step, net_worth, created_at')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(2)

    const currentStep = lastSnapshot?.[0]?.waterfall_step ?? 0
    const previousNetWorth = lastSnapshot?.[1]?.net_worth
    const currentNetWorth = lastSnapshot?.[0]?.net_worth
    const netWorthChange = previousNetWorth != null && currentNetWorth != null
      ? currentNetWorth - previousNetWorth : null

    const stepName = stepNames[currentStep] ?? 'building your plan'
    const monthlySavings = profileData?.monthlySavings
      ? `$${Number(profileData.monthlySavings).toLocaleString()}/mo` : ''

    const netWorthLine = netWorthChange != null
      ? `<p style="margin:0 0 12px;color:#3d4f63;font-size:14px;">Net worth ${netWorthChange >= 0 ? '↑' : '↓'} <strong>${netWorthChange >= 0 ? '+' : ''}$${Math.abs(netWorthChange).toLocaleString()}</strong> since last check-in.</p>`
      : ''

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f7fa;margin:0;padding:0;">
  <div style="max-width:480px;margin:40px auto;padding:0 16px;">

    <!-- Logo -->
    <div style="text-align:center;margin-bottom:28px;">
      <div style="display:inline-flex;align-items:center;gap:8px;background:white;border-radius:12px;padding:8px 16px;box-shadow:0 2px 8px rgba(0,0,0,.06);">
        <span style="font-size:18px;">🌊</span>
        <span style="font-weight:700;font-size:16px;color:#1a2332;">Waterfall</span>
      </div>
    </div>

    <!-- Card -->
    <div style="background:white;border-radius:20px;padding:32px;box-shadow:0 4px 24px rgba(26,35,50,.10);border:1px solid #e8edf2;">
      <p style="margin:0 0 6px;color:#8492a6;font-size:13px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;">Monthly check-in</p>
      <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#1a2332;line-height:1.2;">Time to update your plan.</h1>
      <p style="margin:0 0 12px;color:#3d4f63;font-size:14px;line-height:1.65;">
        Right now you're focused on <strong>${stepName}</strong>${monthlySavings ? ` with ${monthlySavings} saved each month` : ''}.
      </p>
      ${netWorthLine}
      <p style="margin:0 0 24px;color:#3d4f63;font-size:14px;line-height:1.65;">
        It only takes 2 minutes to update a few numbers and see if your step has changed.
      </p>
      <a href="${appUrl}/checkin" style="display:block;background:linear-gradient(135deg,#00b8a9,#00a396);border-radius:12px;padding:14px 24px;text-align:center;color:white;font-weight:600;font-size:15px;text-decoration:none;box-shadow:0 4px 16px rgba(0,184,169,.35);">
        Update my plan →
      </a>
    </div>

    <!-- Footer -->
    <p style="text-align:center;color:#c5cdd6;font-size:12px;margin-top:24px;line-height:1.6;">
      Waterfall · Educational framework, not financial advice<br>
      <a href="${appUrl}/plan" style="color:#c5cdd6;">View your full plan</a>
    </p>
  </div>
</body>
</html>`

    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL!,
        to: profile.email,
        subject: `Your monthly Waterfall check-in 🌊`,
        html,
      })

      // Update next check-in date (30 days from now)
      await supabase
        .from('profiles')
        .update({ next_checkin_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() })
        .eq('id', profile.id)

      sent++
    } catch (err) {
      console.error(`Failed to send to ${profile.email}:`, err)
    }
  }

  return NextResponse.json({ sent, total: profiles.length })
}

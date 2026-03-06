# 🌊 Waterfall — Personal Financial Planner

A full-stack web app built with Next.js, Supabase, and Resend. Users sign in with a magic link, complete a financial onboarding flow, and receive a personalized monthly waterfall plan with automated email check-ins.

---

## Stack

| Layer       | Tool                          |
|-------------|-------------------------------|
| Framework   | Next.js 14 (App Router)       |
| Database    | Supabase (Postgres + Auth)    |
| Hosting     | Vercel                        |
| Email       | Resend                        |
| Fonts       | DM Sans + DM Mono (Google)    |

---

## Project Structure

```
waterfall-app/
├── app/
│   ├── page.tsx                  ← Landing + magic link sign-in
│   ├── onboarding/page.tsx       ← Step-by-step onboarding flow
│   ├── plan/page.tsx             ← Full dashboard with waterfall plan
│   ├── checkin/page.tsx          ← Monthly update screen
│   ├── auth/callback/route.ts    ← Magic link redirect handler
│   └── api/
│       ├── save-profile/route.ts ← Saves profile + creates snapshot
│       └── send-reminder/route.ts← Cron job: sends monthly emails
├── components/                   ← (add shared UI components here)
├── lib/
│   ├── engine.ts                 ← Waterfall calculator (pure TypeScript)
│   └── supabase/
│       ├── client.ts             ← Browser Supabase client
│       └── server.ts             ← Server + service role clients
├── supabase/
│   └── schema.sql                ← Run this in Supabase SQL editor
└── vercel.json                   ← Cron job config (daily at 2pm UTC)
```

---

## Setup — Step by Step

### 1. Clone and install

```bash
git clone <your-repo-url>
cd waterfall-app
npm install
```

### 2. Set up Supabase

1. Go to [supabase.com](https://supabase.com) → New project
2. Name it `waterfall` (or anything)
3. Pick a region close to your users
4. Wait ~2 minutes for it to provision
5. Go to **SQL Editor** → **New query**
6. Paste the entire contents of `supabase/schema.sql`
7. Click **Run**

Get your credentials:
- **Settings → API** → copy `Project URL` and `anon public` key
- **Settings → API** → copy `service_role` key (keep this secret)

Configure Auth:
- **Authentication → URL Configuration**
- Set **Site URL** to `http://localhost:3000` for dev (update to your Vercel URL after deploying)
- Add `http://localhost:3000/auth/callback` to **Redirect URLs**

### 3. Set up Resend

1. Go to [resend.com](https://resend.com) → create account
2. **API Keys** → Create API key → copy it
3. For sending email you have two options:
   - **Free/fast:** Use `onboarding@resend.dev` as the from address (works immediately, sends to your verified email only)
   - **Production:** Add and verify your own domain under **Domains**

### 4. Configure environment variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM_EMAIL=onboarding@resend.dev   # or your verified domain

NEXT_PUBLIC_APP_URL=http://localhost:3000

# Generate with: openssl rand -hex 32
CRON_SECRET=your-random-secret-here
```

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Enter your email, click the magic link in your inbox, and complete onboarding.

---

## Deploy to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
gh repo create waterfall-app --public --push
# or create manually at github.com and push
```

### 2. Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repo
3. Vercel auto-detects Next.js — no config needed
4. **Before deploying**, add all environment variables under **Environment Variables**:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY
RESEND_FROM_EMAIL
NEXT_PUBLIC_APP_URL        ← set to https://yourapp.vercel.app
CRON_SECRET
```

5. Click **Deploy**

### 3. Update Supabase redirect URL

After you have your Vercel URL (e.g. `waterfall-planner.vercel.app`):

- Supabase → **Authentication → URL Configuration**
- Add `https://yourapp.vercel.app/auth/callback` to Redirect URLs
- Update Site URL to your Vercel domain

---

## Monthly Email Cron Job

`vercel.json` configures a cron that hits `/api/send-reminder` daily at 2pm UTC. The endpoint checks for users whose `next_checkin_at` has passed and sends them a personalized email via Resend.

The route is protected by `CRON_SECRET` — Vercel automatically passes this header when invoking cron jobs. You can also trigger it manually:

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://yourapp.vercel.app/api/send-reminder
```

**Note:** Cron jobs require Vercel's **Hobby plan or above** (free tier includes them).

---

## How the data flows

```
User signs in via magic link
        ↓
/auth/callback exchanges code for session
        ↓
If new user → /onboarding
If returning → /plan (loads from Supabase)
        ↓
Onboarding complete → POST /api/save-profile
  - Upserts profiles table
  - Inserts row in snapshots (for history)
  - Sets next_checkin_at = now + 30 days
        ↓
30 days later, Vercel cron fires
  → Queries users with next_checkin_at <= now
  → Sends personalized email via Resend
  → Updates next_checkin_at + 30 days
        ↓
User clicks email link → /checkin
  → Updates a few numbers
  → POST /api/save-profile again
  → If waterfall step changed, shows celebration screen
  → Redirects to /plan
```

---

## Customization

### Change the "from" email name
In `app/api/send-reminder/route.ts`, update:
```ts
from: 'Waterfall <reminders@yourdomain.com>'
```

### Change check-in frequency
In `api/save-profile/route.ts` and `api/send-reminder/route.ts`, change `30 days` to any interval. Also update `vercel.json` cron schedule.

### Add more check-in fields
Edit the `CHECKIN_FIELDS` array in `app/checkin/page.tsx`.

---

## Local email testing

Resend doesn't have a local sandbox, but you can:
1. Use your own email as `RESEND_FROM_EMAIL` and send to yourself
2. Or hit the endpoint directly and check the Resend dashboard logs:

```bash
curl -H "Authorization: Bearer $(grep CRON_SECRET .env.local | cut -d= -f2)" \
  http://localhost:3000/api/send-reminder
```

---

## Costs at scale

| Service  | Free tier                          | Paid             |
|----------|------------------------------------|------------------|
| Vercel   | Hobby: unlimited deploys + cron    | Pro: $20/mo      |
| Supabase | 500MB DB, 50k auth users           | Pro: $25/mo      |
| Resend   | 3,000 emails/mo, 100/day           | $20/mo → 50k     |

At small scale (< 1,000 users): **$0/mo**.

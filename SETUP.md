# Rebrief Finances Dashboard — Setup Guide

## 1. Create a Supabase Project (Free)

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project (name it "rebrief-finances" or similar)
3. Once created, go to **Settings → API** and copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`
4. Go to the **SQL Editor** and run each file in `supabase/migrations/` in order (`0001_initial.sql`, then `0002_no_hst_default.sql`)

## 2. Set Your Dashboard Password

Pick a shared password for your team to access the dashboard. Generate the bcrypt hash:

```bash
cd Rebrief_Dashboard
npm install
node -e "require('bcryptjs').hash('your-password-here', 12).then(h => console.log(h))"
```

Copy the output (starts with `$2a$12$...`) — this is your `DASHBOARD_PASSWORD_HASH`.

## 3. Generate Secrets

Generate two random strings for JWT and cron auth:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Use the first as `JWT_SECRET` and the second as `CRON_SECRET`.

## 4. Set Up Email Reminders (Optional)

1. Create a free account at [resend.com](https://resend.com)
2. Add and verify your domain (rebrief.ca)
3. Copy your API key → `RESEND_API_KEY`

## 5. Create `.env.local`

```bash
cp .env.example .env.local
```

Fill in all the values from steps 1–4.

## 6. Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with your password.

## 7. Deploy to Vercel

### Option A: Via Vercel Dashboard
1. Push `Rebrief_Dashboard/` to a GitHub repo (or a subdirectory of your existing repo)
2. Import the project in [vercel.com/new](https://vercel.com/new)
3. If it's a subdirectory, set **Root Directory** to `Rebrief_Dashboard`
4. Add all environment variables from `.env.local` to the Vercel project settings
5. For the cron to work, add `CRON_SECRET` and set the Vercel cron authorization header in the dashboard

### Option B: Via CLI
```bash
npx vercel
npx vercel env add NEXT_PUBLIC_SUPABASE_URL
# ... repeat for each env var
npx vercel --prod
```

### Cron Setup
The `vercel.json` configures a daily 9 AM UTC cron job at `/api/cron/reminders`.
On Vercel Pro/Enterprise, this runs automatically. On the free plan, you can trigger it manually or use an external cron service (like [cron-job.org](https://cron-job.org)) to hit:

```
GET https://your-dashboard.vercel.app/api/cron/reminders
Authorization: Bearer YOUR_CRON_SECRET
```

## Architecture

- **Next.js 15** — App Router, Server Components, Server Actions
- **Supabase** — PostgreSQL database (free tier: 500MB)
- **Resend** — Email delivery (free tier: 100 emails/day)
- **Vercel** — Hosting + cron jobs
- **Auth** — Shared password → bcrypt → JWT session cookie (24h expiry)

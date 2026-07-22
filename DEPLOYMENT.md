# Deploying Hearth

Adapted from HEARTH_ENGINEERING_SPEC.md §7.8 (written for Vercel) to **Netlify**, which is where this app is actually deployed. `vercel.json` is left in place for portability but isn't used by the Netlify path below.

## 1. Supabase project

1. Create a project at supabase.com.
2. In the SQL editor, run in order:
   - `supabase/schema.sql`
   - `supabase/policies.sql`
   - `supabase/storage.sql`
3. From Project Settings → API, copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (never expose client-side)
   - JWT Secret → `SUPABASE_JWT_SECRET`

## 2. Google Cloud

1. Create a project → enable the **Google Calendar API**.
2. OAuth consent screen: External, add family members as test users (or publish once verified).
3. Create an **OAuth 2.0 Client ID** (Web application).
   - Authorized redirect URI (local dev): `http://localhost:3000/api/auth/callback/google`
   - Add the production URI once the Netlify site exists: `https://<your-site>.netlify.app/api/auth/callback/google`
4. Copy Client ID / Secret → `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`.

## 3. Secrets

Generate:

```bash
# AUTH_SECRET
openssl rand -base64 32
# TOKEN_ENCRYPTION_KEY (must be exactly 64 hex chars = 32 bytes)
openssl rand -hex 32
# CRON_SECRET (any random string)
openssl rand -hex 24
```

Fill in `hearth/.env.local` from `.env.local.example` for local dev.

## 4. Deploy to Netlify

The app uses `@netlify/plugin-nextjs` (declared in `netlify.toml`) for SSR/API routes, and two **Netlify Scheduled Functions** (`netlify/functions/sync-cron.mts`, `daily-cron.mts`) standing in for Vercel Cron — they just call the existing `/api/sync` and `/api/cron/daily` route handlers on a schedule, so no server logic is duplicated.

1. Push this repo to GitHub (see below if it isn't already).
2. In Netlify: **Add new site → Import an existing project**, pick the repo. Base directory `hearth` if the repo root isn't `hearth/` itself; otherwise leave blank. Build command and publish directory come from `netlify.toml` — don't need to set them manually.
3. Site settings → Environment variables: set every var from `.env.local.example` (`AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `TOKEN_ENCRYPTION_KEY`, `CRON_SECRET`). Leave `GOOGLE_WEBHOOK_URL` for step 6.
4. Deploy. Note the assigned `https://<name>.netlify.app` URL (or set a custom domain first if you have one).
5. Add that URL's `/api/auth/callback/google` as an authorized redirect URI on the Google OAuth client (step 2).
6. Set `GOOGLE_WEBHOOK_URL` to `https://<your-site>.netlify.app/api/google/webhook` and redeploy — new calendar links register push channels automatically from then on (`lib/google/watch.ts`). The `/api/sync` scheduled function (every 10 min) is the safety net regardless of webhook status.

Netlify Scheduled Functions run in UTC — `daily-cron` fires at 03:00 UTC, not 03:00 family-local. Adjust the cron expression in `netlify/functions/daily-cron.mts` if that matters.

## 5. Wall hardware

Per spec §2.3 (MVP): Amazon Fire Max 11 + wall mount + **Fully Kiosk Browser**, start URL `https://<your-site>.netlify.app/hub`, kiosk mode on, screen always on.

## 6. iPhone / family devices

Safari → Share → Add to Home Screen. The app is a PWA (`public/manifest.json`, `src/app/sw.ts` via serwist) — offline read cache works once installed.

## Verification checklist before calling a deploy done

- [ ] `npm run build` passes with the real env vars present (a missing/placeholder Supabase URL will fail differently in prod than in dev)
- [ ] Two Google accounts can sign in and land in the same family (M1 test)
- [ ] An event created on a phone's native Google Calendar appears in Hearth within ~1 min (webhook) or ~10 min (cron fallback)
- [ ] RLS cross-family isolation: create a second test family, confirm it cannot read the first family's rows
- [ ] Lighthouse PWA installability check and an axe accessibility scan against the deployed URL (not run as part of this build — needs a live deployment)

# Deploying Orbit

Production lives on Vercel as project **orbit-hub**, public URL:

**https://orbit-family.vercel.app**

(The Vercel project was renamed from `grucza-hearth` → `orbit-hub`. Use `orbit-family.vercel.app` — not any `grucza-*` hostname.)

`vercel.json` configures framework/cron. Netlify files (`netlify.toml`, `netlify/functions/`) remain for portability but are not the primary path.

## 1. Supabase project

1. Create a project at supabase.com.
2. In the SQL editor, run in order:
   - `supabase/schema.sql`
   - `supabase/policies.sql`
   - `supabase/storage.sql`
   - then any numbered files in `supabase/migrations/` that have not been applied yet
3. From Project Settings → API, copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (never expose client-side)
   - JWT Secret → `SUPABASE_JWT_SECRET`

## 2. Google Cloud

1. Create a project → enable the **Google Calendar API**.
2. OAuth consent screen: External, add family members as test users (or publish once verified).
3. Create an **OAuth 2.0 Client ID** (Web application).
   - Authorized JavaScript origins: `http://localhost:3000` and `https://orbit-family.vercel.app`
   - Authorized redirect URIs:
     - Local: `http://localhost:3000/api/auth/callback/google`
     - Production: `https://orbit-family.vercel.app/api/auth/callback/google`
4. Copy Client ID / Secret → `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`.

Whenever the production hostname changes, update both the origin and the redirect URI in Google Cloud Console.

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

Fill in `.env.local` from `.env.local.example` for local dev.

## 4. Deploy to Vercel

1. Push this repo to GitHub (`tgrucza/skylight` — app root is the repo root / `hearth` folder depending on how the project is linked).
2. Vercel project **orbit-hub** (team Grucza Projects) should already be linked. Production alias: `orbit-family.vercel.app`.
3. Environment variables (Production): set every var from `.env.local.example`, and specifically:
   - `GOOGLE_WEBHOOK_URL=https://orbit-family.vercel.app/api/google/webhook`
   - `AUTH_URL=https://orbit-family.vercel.app` (Auth.js production base URL)
4. Deploy (push to `main` once the owner has approved, or `npx vercel --prod` from a linked checkout).
5. Confirm Google OAuth redirect URI matches the live URL (step 2).

Vercel Cron (see `vercel.json`) calls `/api/sync` and `/api/cron/daily` with `Authorization: Bearer $CRON_SECRET` when `CRON_SECRET` is set.

## 5. Wall hardware

Amazon Fire Max 11 + wall mount + **Fully Kiosk Browser**, start URL `https://orbit-family.vercel.app/hub`, kiosk mode on, screen always on.

## 6. iPhone / family devices

Safari → Share → Add to Home Screen. PWA assets live in `public/manifest.json` and `public/icons/` (Orbit mark, 192–512 PNGs + maskable). Theme color is terracotta `#BF6544`.

## Verification checklist before calling a deploy done

- [ ] `npm run build` passes with the real env vars present
- [ ] Two Google accounts can sign in and land in the same family
- [ ] An event created on a phone's native Google Calendar appears in Orbit within ~1 min (webhook) or ~10 min (cron fallback)
- [ ] RLS cross-family isolation: create a second test family, confirm it cannot read the first family's rows
- [ ] Lighthouse PWA installability check and an axe accessibility scan against `https://orbit-family.vercel.app`

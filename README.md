# Orbit — Family Command Center

The calm center of a busy home: shared calendar (two-way Google sync), chores with star rewards, meal planning, grocery/checklists, photos, and a wall-mounted "Home Hub" dashboard with an idle/ambient photo-frame mode.

Built to `HEARTH_ENGINEERING_SPEC.md` and the accompanying design docs (kept under their original filenames; the app was renamed Hearth → Orbit after they were written). Next.js 15 (App Router) + TypeScript strict + Tailwind v4 + Supabase (Postgres/RLS/Realtime/Storage) + Auth.js v5 + Google Calendar API.

## Getting started

1. Copy `.env.local.example` to `.env.local` and fill it in — see [DEPLOYMENT.md](DEPLOYMENT.md) for where each value comes from (Supabase project, Google Cloud OAuth client, generated secrets).
2. Run the two SQL files in `supabase/` (`schema.sql`, `policies.sql`, `storage.sql`) against your Supabase project.
3. `npm install`
4. `npm run dev` → http://localhost:3000

## Project structure

- `src/app/` — routes: `(auth)/signin`, `(setup)/onboarding`, `(app)/hub` (wall dashboard, no chrome), `(app)/(shell)/*` (calendar/chores/meals/lists/photos/family/settings, with Rail/TopBar/BottomNav), `api/*` (Google sync, onboarding, events, cron)
- `src/components/ui/` — design-system primitives (Button, Card, Modal, Toast, …) — one of each, variants via props
- `src/components/{hub,calendar,chores,meals,lists,photos,layout}/` — feature components
- `src/lib/` — `google/` (OAuth, sync engine, watch channels, token encryption), `supabase/` (RLS-scoped + admin clients, the Auth.js↔Supabase JWT bridge), `rrule.ts`, `dates.ts` (timezone-safe date math)
- `src/hooks/` — TanStack Query hooks per feature, plus `useSupabaseClient`, `useIdle`, `useWakeLock`
- `supabase/` — schema, RLS policies, storage bucket policies

## Commands

- `npm run dev` — dev server
- `npm run build` — production build (also type-checks + lints; run this before considering any change done)
- `npm run lint`

## Deploying

See [DEPLOYMENT.md](DEPLOYMENT.md).

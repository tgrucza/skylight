# Hearth v2 — Production Readiness & Integrations Spec

**Handoff document for the implementing model. Read fully before writing code.**

This is the successor to `HEARTH_ENGINEERING_SPEC.md` (the v1 spec, one directory up — read it for architecture context; its §7 build rules all still apply). v1 (milestones M1–M6) is complete and deployed. This spec covers milestones **M7–M12**: closing production gaps, integrations (Apple Notes import, AI voice assistant, shopping-cart handoff, Home Assistant), UX polish, and migration from Netlify to Vercel.

**The bar:** this is not a proof of concept. Every screen must be fully operable — no dead ends, no unreachable states, no "you can't edit that." The owner's family will use this daily. §9 is the audit checklist; the app is not done until every line passes.

---

## 0. Current state (verified, don't rediscover)

- Live at https://hearth-command-center.netlify.app (Netlify, auto-deploys from `main` of github.com/tgrucza/skylight). **Vercel replaces this in M12.**
- Supabase project `skylight` (ref `icowjxgbvdztqhtwkxeh`): `supabase/schema.sql`, `policies.sql`, `storage.sql` are applied. **Never edit those files — new DDL goes in numbered files under `supabase/migrations/` (§7.4 of v1 spec) that the owner runs in the SQL editor.**
- Google Cloud project `hearth-503203`: Calendar API on, OAuth client "Hearth Web" with localhost + Netlify redirect URIs, consent screen **published to Production (unverified)** — users see a one-time "unverified app" warning; that's accepted.
- Auth: Auth.js v5 JWT sessions, `trustHost: true`, Google tokens ride in the session JWT, calendar link persists them AES-encrypted into `calendar_integrations`. RLS via a signed Supabase-compatible JWT (`src/lib/supabase/jwt.ts`).
- All v1 features work: calendar + 2-way Google sync, hub with idle mode, chores/rewards/PINs, meals, lists (realtime), photos, notifications bell, settings, family page with add/remove member and post-hoc calendar linking.

### Known holes (verified by code audit — these are facts, not guesses)

| # | Hole | Where |
|---|------|-------|
| H1 | **No sign-out anywhere.** `signOut` is exported from `src/lib/auth.ts` and never called by any UI. | TopBar, hub, settings |
| H2 | **A second adult signing in creates a duplicate family.** `(app)/layout.tsx` bounces membership-less users to `/onboarding`, which only creates new families. No invite/join path exists. This breaks the core "shared household" premise the moment the spouse signs in. | onboarding + auth flow |
| H3 | **No member editing.** Can't change a member's name, color, role, or PIN after creation. No avatar photos (schema has `avatar_url`; `Avatar.tsx` ignores it and always renders initials). | family page |
| H4 | **No family editing.** Can't rename the family or change its timezone after onboarding. | settings |
| H5 | **Session dies silently after 30 days** (Auth.js default). The wall tablet must stay signed in indefinitely. | `src/lib/auth.ts` |
| H6 | `/style-guide` and the `(dev)` route group ship to production and are in middleware `PUBLIC_PATHS`. | middleware, app tree |
| H7 | Recurring-event editor offers "this event / all events" but not "this and following" (v1 spec §6.4). | EventEditor |
| H8 | No custom error/404 pages; unhandled route errors show the Next.js default. | app tree |

---

## 1. House rules for the implementing model

These are additions to v1 spec §7 (which still applies: tokens-only styling, one component per primitive, zod on every API input, RLS as the security boundary, `npm run build` before calling anything done).

1. **Deployment policy — non-negotiable.** After M7–M11 are implemented and verified locally, deploy to Vercel **once** (M12). After that first deploy, **never trigger another deployment (git push to `main` included, once Vercel auto-deploy is connected) without the owner's explicit go-ahead in that conversation.** Do feature work on a branch or hold commits locally; the owner tests on `npm run dev` first, then approves the push.
2. **Secrets:** user-supplied API keys (AI provider, Home Assistant token) are stored per-family in Postgres, encrypted with the existing `encryptToken`/`decryptToken` (AES-256-GCM, `src/lib/google/tokens.ts` — move these helpers to `src/lib/crypto.ts` and re-export from the old path). Keys are **write-only from the client's perspective**: API responses must never echo a stored key back; return `{ configured: true }` booleans instead.
3. **Migrations:** every DDL change in this spec is collected in §2 as `supabase/migrations/001_v2.sql`. Write it exactly once, tell the owner to run it in the Supabase SQL editor before testing, and never modify it after they have.
4. **Local verification first:** every milestone ends with its Test checklist run against `npm run dev` (dev server config exists in `.claude/launch.json`, name `hearth-dev`) plus a clean `npm run build`.
5. **Honesty about integrations:** the Apple Notes, cart, and Home Assistant features have real-world constraints documented in §5/§6. Implement what's specified; do not silently stub or fake behavior that can't work, and do not over-promise in UI copy.

---

## 2. Database migration (write once: `supabase/migrations/001_v2.sql`)

```sql
-- ============ M7: membership linking + member profiles ============
-- Email-matched join: an adult adds a member with their Gmail; when that
-- person signs in, they're linked to the existing row instead of being
-- sent to create a new family.
alter table family_members add column invite_email text;
create index on family_members (invite_email) where invite_email is not null;

-- Birthday for countdown chips (M11)
alter table family_members add column birthday date;

-- ============ M8: Apple Notes / Shortcuts import ============
-- Per-family bearer token so an iOS Shortcut can POST grocery items
-- without a browser session. Generated server-side, shown in Settings.
alter table settings add column import_token text;

-- ============ M9/M10: integration credentials (encrypted at rest) ============
create table integration_settings (
  family_id uuid primary key references families(id) on delete cascade,
  ai_provider text check (ai_provider in ('anthropic','openai')),
  ai_api_key_enc text,
  ha_base_url text,
  ha_token_enc text,
  updated_at timestamptz default now()
);
alter table integration_settings enable row level security;
-- Adults may know whether integrations are configured; keys themselves are
-- only ever decrypted in route handlers (service role), never sent to clients.
create policy "integration_settings_select_adult" on integration_settings
  for select using (is_family_adult(family_id));
create policy "integration_settings_write_adult" on integration_settings
  for all using (is_family_adult(family_id)) with check (is_family_adult(family_id));
create trigger set_updated_at before update on integration_settings
  for each row execute function set_updated_at();

-- ============ M10: Home Assistant quick-action buttons ============
create table ha_buttons (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  label text not null,
  icon text not null default 'zap',           -- lucide icon name
  entity_id text not null,                    -- e.g. scene.movie_night, script.bedtime
  service text not null,                      -- e.g. scene.turn_on, script.turn_on, light.toggle
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index on ha_buttons (family_id);
alter table ha_buttons enable row level security;
create policy "ha_buttons_select" on ha_buttons
  for select using (is_family_member(family_id));
create policy "ha_buttons_write_adult" on ha_buttons
  for all using (is_family_adult(family_id)) with check (is_family_adult(family_id));
create trigger set_updated_at before update on ha_buttons
  for each row execute function set_updated_at();
```

Avatar photos need **no** schema change (`family_members.avatar_url` exists) and no storage change: upload to the existing private `photos` bucket at path `{family_id}/avatars/{member_id}.jpg` — the path-prefix RLS in `storage.sql` already authorizes it. Use signed URLs like `usePhotos` does.

---

## 3. M7 — Account & member management (CRITICAL: do first; unblocks showing the app to the spouse)

### 3.1 Sign out (H1)
- `TopBar`: the avatar becomes a dropdown menu (reuse `DropdownMenu` from `ui/Select.tsx`): **My profile** (opens own edit-member modal), **Settings** (link), **Sign out**.
- Sign out calls a server action wrapping `signOut()` from `src/lib/auth.ts` with `redirectTo: "/signin"`.
- Also add a sign-out item under `/settings` (an "Account" card) so it's reachable on the wall where the TopBar may be missed, and add the same account menu to the hub header nav pill (a small avatar button at the end of the pill).

### 3.2 Join-family flow (H2) — the most important fix in this spec
- "Add member" modal on `/family`: when role = adult, add an optional **"Their Google email"** field → stored as `invite_email` (lowercased, trimmed) on the created `family_members` row.
- New server logic (put in `src/lib/family.ts`, called from `(app)/layout.tsx` **before** the membership check): `linkPendingMembership(userId, email)` — service-role query for `family_members` where `invite_email = email` and `user_id is null`; if found, set `user_id = userId`, clear `invite_email`, return the membership. Use the service-role client (`supabaseAdmin()`): the signing-in user has no membership yet, so RLS would return zero rows.
- `/onboarding` gets a guard: if the signed-in user's email matches a pending invite, skip the wizard entirely (the layout will have linked them) — and if they reach onboarding anyway, show a "You've been added to {family name} — Continue" screen instead of the create-family wizard when a pending invite exists.
- Retrofit: also run the link check inside `/api/family` GET so an already-stuck duplicate-family user can be repaired manually later; document in the PR notes that a duplicate family created before this fix must be deleted by the owner in Supabase (families table cascade handles the rest).
- **Test:** second Google account added by email → signs in → lands on `/hub` inside the same family, sees the same lists/calendar. This exact flow must pass before M7 is called done.

### 3.3 Edit member + avatar photos (H3)
- `PATCH /api/family/members/[id]` (zod: name?, role?, colorHex?, pin? (4 digits, null clears), birthday?, inviteEmail?). Guard: requester must be an adult in the member's family (RLS enforces the family; check role in the route like other adult-guarded routes). Hash pin with `hashPin`. An adult may not demote **themselves** to child if they are the family's only adult (check and 400).
- Family page: clicking a member card opens **EditMemberModal** — same fields as add (name, role, color, PIN for children, birthday, invite email for unlinked adults) pre-filled, plus:
  - **Photo**: file input → `resizeImageFile` (exists, `src/lib/imageResize.ts`, cap at 512px for avatars — add an options param) → client uploads via the RLS Supabase client to `photos` bucket path above (upsert: true) → PATCH `avatar_url` with the storage path (store the **path**, not a signed URL).
  - **Remove photo** button (deletes object, nulls `avatar_url`).
- `Avatar.tsx`: accept optional `src`; when present render the image (`object-cover rounded-full`) with initials as loading/error fallback. Add a small `useAvatarUrl(path)` hook (or batch into `useFamily`) that resolves storage paths to signed URLs (1h TTL, cached via TanStack Query). Every existing `Avatar` call site passes the member's resolved URL — hub stack, chore chart, profile switcher, TopBar, family page.
- The delete-member confirm modal already exists; keep it, but also null `avatar_url`'s storage object on delete (best-effort).

### 3.4 Edit family (H4)
- `/settings` gains a "Family" card (adult-only): rename family, change timezone (reuse `COMMON_TIMEZONES` select). PATCH via RLS client directly (families update policy exists).

### 3.5 Session longevity (H5)
- `src/lib/auth.ts`: `session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 365, updateAge: 60 * 60 * 24 }` — one-year rolling session so the wall tablet never logs out in practice.

### 3.6 Production hardening (H6, H8)
- Remove `/style-guide` from middleware `PUBLIC_PATHS`; gate the `(dev)` group out of production entirely (simplest: in `(dev)/style-guide/page.tsx`, `notFound()` when `process.env.NODE_ENV === "production"` — keeps it for local visual diffing).
- Add `src/app/not-found.tsx` and `src/app/error.tsx` (client) using `EmptyState`/`ErrorState` primitives, warm-paper styled, with a "Back to Hearth" link to `/hub`.
- `/signin` when already authenticated already redirects (middleware) — verify.

**M7 test checklist:** sign out from TopBar/settings/hub and land on `/signin` · second account joins via invite email (3.2 test) · edit every member field incl. photo, see it everywhere avatars render · only-adult demotion blocked · rename family + timezone, calendar day boundaries follow · style-guide 404s in prod build · custom 404/error pages render · `npm run build` clean.

---

## 4. M8 — Grocery power-ups + Apple Notes import

### 4.1 Apple Notes shared-note import (honest design)
**Constraint:** Apple Notes has no public API — no server can read a Note. The reliable bridge is an **iOS Shortcut** on either phone that reads the shared note and POSTs its lines to Hearth. One-way (Notes → Hearth). Two-way sync is not feasible; don't pretend otherwise in UI copy. (Long-term the family should let Hearth become the list of record — realtime + wall display is the selling point.)

- Token: `GET/POST /api/import/token` (adult) — returns `settings.import_token`, generating (32-hex random) on first request; POST regenerates (invalidation).
- `POST /api/import/grocery`: **no session** — auth by header `X-Import-Token` matched to `settings.import_token` (service-role lookup; 401 on miss; per-token rate-limit ~10/min via existing `rateLimit.ts`). Body (zod): `{ items: string[] }` (the Shortcut sends the note split by newline). Server normalizes: trim, drop empties, strip leading `- [ ]`, `-`, `•`, `*` bullets and checked `- [x]` lines; case-insensitive de-dupe against **unchecked** items in the family's grocery list (kind `grocery`, first by sort_order); insert the rest with `categorize()` and `added_by: null`. Respond `{ added: n, skipped: n }`.
- Settings → new **Integrations** page (`/settings/integrations`, adult-only, linked from a card on `/settings`) → "Apple Notes import" section: shows the endpoint URL + token (copy buttons), a Regenerate button, and collapsible numbered instructions for building the Shortcut:
  1. Shortcuts app → **+** → name it "Send groceries to Hearth".
  2. Add action **Find Notes** where Name is [the shared note] → **Get Text from** note.
  3. Add **Split Text** by New Lines.
  4. Add **Get Contents of URL**: the shown URL, Method POST, Headers `X-Import-Token: <token>` + `Content-Type: application/json`, Request Body JSON `{"items": <Split Text variable>}`.
  5. Run manually, from the share sheet, or add a daily Automation.
- Hub `GroceriesWidget` needs no change — invalidation is unnecessary cross-device; the wall already refetches (verify the hub grocery query has a sane `staleTime`/refetch or add `refetchInterval: 60_000`).

### 4.2 List quality-of-life
- **Autocomplete from history** (v1 spec §6.8): `AddItemBar` suggests previously-added labels (distinct labels for the family's grocery lists, case-insensitive prefix match, max 6, keyboard + tap selectable).
- **Clear checked** button on grocery lists (deletes checked items after a confirm).
- **Edit item label** inline (tap label → input, Enter/blur commits) and quantity field.

### 4.3 Cart handoff (phase A — links, honest scope)
Real automated cart-filling for Walmart/Amazon requires partner APIs (Walmart affiliate item IDs; Amazon PA-API with an approved associates account) or brittle scraping. **Phase A ships something genuinely useful without approvals:** a "Shop this list" sheet on the grocery list page:
- Builds per-item deep links: Walmart `https://www.walmart.com/search?q={item}`, Amazon `https://www.amazon.com/s?k={item}`, and (if AI is configured, M9) first passes the raw list through the model to normalize/merge items ("2% milk" + "milk" → one line) and expand vague entries.
- "Open all in Walmart / Amazon" opens the links (grouped; warn it opens N tabs) — the human adds to cart and checks out. **Never automate checkout.**
- UI copy must say "opens searches — add to cart yourself." Phase B (true add-to-cart links via Walmart affiliate API or Instacart's developer shopping-list API) is documented as a stretch goal behind API-key settings; only attempt if the owner obtains credentials.

**M8 test checklist:** POST with token adds/dedupes items and they appear on wall in ≤60s · bad token 401s · regenerate invalidates old token · Shortcut instructions followed on a real iPhone import the real shared note · autocomplete, inline edit, clear-checked work on mobile · shop-sheet links open with correct queries · build clean.

---

## 5. M9 — Integrations settings + AI voice assistant

### 5.1 Integrations settings (foundation for M9/M10)
- `GET /api/integrations` (adult): `{ ai: { provider, configured }, ha: { baseUrl, configured } }` — **never** the keys.
- `PUT /api/integrations` (adult, zod): any of `aiProvider` (`anthropic`|`openai`), `aiApiKey` (string, encrypt → `ai_api_key_enc`), `haBaseUrl` (url), `haToken` (encrypt). Empty-string key = clear.
- `/settings/integrations` UI: "AI Assistant" card — provider select (Claude = `claude-sonnet-4-5`, ChatGPT = `gpt-4o` as fixed defaults), password-type key input showing only "Configured ✓ (replace to change)" state, **Test** button → `POST /api/integrations/test-ai` (sends a trivial prompt server-side, returns ok/error message).

### 5.2 Assistant endpoint
`POST /api/assistant` (session-authed family member): `{ transcript: string }` → server loads family context (members with ids/names, today's date in family TZ, list names/ids), decrypts the key, calls the provider with **tool definitions** and a system prompt ("You are Hearth's family assistant… use tools; ask nothing; if ambiguous pick the sensible default; never invent members").

Tools (implement each as a server function reusing existing route logic — extract shared helpers rather than HTTP-calling own API):
| tool | args | behavior |
|---|---|---|
| `add_event` | title, memberName?, date, startTime?, endTime?, recurring? (daily/weekdays/weekly/monthly) | maps memberName→id (fuzzy, case-insensitive), builds rrule via `buildRRule`, writes through the same path as `POST /api/events` (Google-first when integration exists) |
| `add_grocery_items` | items[] | insert into grocery list with categorize() |
| `add_todo` | text | insert into To-Do checklist |
| `add_chore` | title, memberNames[], days[] (0–6), stars? | create chore + assignments |
| `plan_meal` | date, slot, title | upsert meal_plan_entries |
| `ha_call_service` | buttonLabel | only if HA configured: match against `ha_buttons.label`, invoke via §6 helper |
| `answer` | text | terminal tool for pure Q&A ("what's on Saturday?" → server pre-fetches the next 7 days of events into the prompt context) |

Run a bounded tool loop (max 5 iterations), collect executed actions, respond `{ reply, actions: [{ tool, summary }] }`. Errors from a tool go back into the loop once, then surface.

### 5.3 Mic UI
- New `components/assistant/AssistantButton.tsx`: prominent mic button added to the hub QuickActions row and the TopBar. Uses Web Speech API (`webkitSpeechRecognition ?? SpeechRecognition`, lang en-US, interim results shown in a modal). **Fallback:** if the API is unavailable (some webviews) or mic permission denied, the same modal shows a text input — the assistant must be fully usable by typing.
- Flow: tap → modal with pulsing mic + live transcript → auto-stop on silence or tap-to-stop → POST → show reply + action chips ("✓ Added Soccer practice · Tue 4pm — Leo") → invalidate the relevant TanStack queries so the hub/calendar update instantly.
- If no AI key configured: the button opens a modal explaining setup with a link to `/settings/integrations` (visible to adults; children see "Ask a grown-up to set up the assistant").

**M9 test checklist:** key save/replace/clear never echoes key · test button gives clear success/failure for a bad key · by voice on the wall: create an event (verify it hits Google Calendar), add 3 groceries (wall updates live), plan a dinner, ask "what's tomorrow" · same flows by typed fallback · unconfigured state is graceful · build clean.

---

## 6. M10 — Home Assistant

**Constraint (honest):** the owner's HA is at a **LAN address** (`http://192.168.68.x:8123`). Vercel functions cannot reach it. So: when `ha_base_url` is a private/loopback address, calls go **client-direct from the browser** (works for wall tablet + phones on home Wi-Fi; requires HA CORS config); when it's a public URL (e.g. Nabu Casa), calls go through a server proxy. Detect by hostname (private IPv4 ranges / `.local` / `localhost`).

- Server proxy: `GET /api/ha/entities` (adult; lists `scene.*`, `script.*`, `switch.*`, `light.*`, `automation.*` from HA `/api/states` for the button picker) and `POST /api/ha/service` `{ buttonId }` (member; loads button, calls `POST {base}/api/services/{domain}/{service}` with entity_id). Both decrypt the token server-side and 502 with a clear message if HA is unreachable.
- Client-direct mode: `GET /api/ha/client-token` (member-authed) returns `{ baseUrl, token }` decrypted **only when** the base URL is private-range — the token never leaves the household's authenticated clients, and this is the documented tradeoff for LAN mode. The browser then calls HA directly. The entities picker and button presses share one `src/lib/ha.ts` client helper that picks proxy vs direct.
- Settings → Integrations → "Home Assistant" card: base URL + token inputs, **Test connection** (uses the same mode logic; on CORS failure in direct mode, show the fix: add the Hearth origin to `http: cors_allowed_origins` in HA's `configuration.yaml`, with a copyable snippet).
- Button management on the same card (adult): list + add/edit/delete `ha_buttons` — label, lucide icon picker (curated ~20 home icons), entity picker (from entities endpoint, searchable), service auto-derived from entity domain (`scene.*`→`scene.turn_on`, `script.*`→`script.turn_on`, `light.*`/`switch.*`→`homeassistant.toggle`), sort order.
- Hub: when buttons exist, a **Home** row of `ha_buttons` renders under QuickActions (same tile styling, icon in secondary-soft). Tap → invoke → success/fail toast. Voice tool `ha_call_service` (M9) uses the same helper — note: when the assistant runs server-side against a LAN HA it must return an instruction the client executes (`actions` entry `{ tool: "ha_call_service", clientInvoke: buttonId }`) rather than failing — implement that bridge.

**M10 test checklist:** test-connection passes against real HA on LAN (after CORS snippet applied) · buttons CRUD · tapping a scene button on the wall fires the scene · voice "movie night" fires it too · public-URL mode exercised at least with a mocked 200 (no Nabu Casa available) · unreachable HA gives a clear toast, not a spinner · build clean.

---

## 7. M11 — UX polish pack

In priority order (all shippable independently; stop only if the owner cuts scope):

1. **Weather on hub** (v1 spec fast-follow): `settings` gains `latitude`/`longitude` (add to the migration §2 — `alter table settings add column latitude double precision; add column longitude double precision;`) set on `/settings` via a "Use my location" geolocation button + manual fields. Hub header + idle screen fetch Open-Meteo (no key) client-side, 30-min cache: temp + condition icon mapped from weather codes.
2. **Countdown chips** (design doc "Grandma's bday in 3d"): member birthdays (M7 field) + all-day events within 14 days render as warm chips in the hub reminder slot (`GroceriesWidget` reminder area) — soonest first, max 2.
3. **Hub greeting**: time-of-day serif greeting ("Good morning" / "afternoon" / "evening") above Today's Schedule when the schedule is light (calm-day feel per Home Hub design).
4. **Event reminders → notifications**: extend `/api/cron/daily` (and hub client on load) to insert `notifications` rows for events starting in the next 24h (kind `event_reminder`, dedupe on family+title+day via a `where not exists` check).
5. **Recipes v1** (v1 spec fast-follow): recipes CRUD on `/meals` (title, url, ingredients as simple lines), attach to a meal cell, **"Add ingredients to Groceries"** button.
6. **PWA niceties**: install hint banner on mobile Safari (dismissable, localStorage), offline banner when `navigator.onLine` is false.

**M11 test checklist:** weather correct for set location and survives refresh · birthday chip math correct across year boundary · reminder notifications appear once, not daily duplicates · recipe ingredients land in groceries categorized · build clean.

---

## 8. M12 — Vercel migration (ONE deploy, then lockdown)

Do this only after M7–M11 pass their checklists locally and **the owner confirms he has tested locally and says go.**

1. Repo already contains `vercel.json` (crons for `/api/sync` */10min and `/api/cron/daily` 03:00 UTC — Vercel Cron picks these up natively; the `netlify/` functions folder becomes dead code: delete it and `netlify.toml`, and remove `@netlify/*` devDependencies).
2. Vercel dashboard (owner is logged in; his GitHub is connected): **Add New Project → import `tgrucza/skylight`** (framework auto-detects Next.js; no base-dir needed — repo root is the app).
3. Environment variables (Production): copy every var from `hearth/.env.local` **except** set `GOOGLE_WEBHOOK_URL=https://<project>.vercel.app/api/google/webhook`. Note Vercel Cron sends its own auth — our routes check `CRON_SECRET` bearer; configure the cron jobs' auth by keeping `CRON_SECRET` set (Vercel automatically adds the `Authorization: Bearer $CRON_SECRET` header when that env var exists).
4. Deploy once. Then:
   - Google OAuth client: add `https://<project>.vercel.app` origin + `/api/auth/callback/google` redirect URI.
   - Verify checklist: sign-in → hub · second-account join · calendar event syncs from phone Google Calendar ≤10min · grocery realtime across two devices · voice assistant round-trip · photos upload · PWA installable (Lighthouse) · idle mode on the wall URL.
   - Netlify: lock auto-publish (or delete the site) so pushes don't double-deploy there.
5. **Post-deploy lockdown:** since Vercel auto-deploys `main`, from now on all work stays on a branch (suggest `dev`) or uncommitted until the owner approves; merging/pushing to `main` **is** a deployment and requires the same explicit approval. Record this rule in `AGENTS.md` (done — see repo).

---

## 9. No-holes production audit (run last; every line must pass)

For **every** page (`/hub`, `/calendar`, `/chores`, `/meals`, `/lists`, `/photos`, `/family`, `/settings`, `/settings/integrations`, `/signin`, `/onboarding`):
- [ ] Loading state (skeleton, not blank/spinner-only), empty state with guidance, error state with retry — per v1 spec §7.3.
- [ ] Every entity is fully CRUD-complete where it appears: events (incl. "this and following" — close H7 here if not done in M7), chores, rewards, meals, recipes, lists, list items, photos, members, family, HA buttons, integrations.
- [ ] Works at 1280×800 (wall), 1160 desktop, and 390px mobile; touch targets ≥44px.
- [ ] Adult/child permissions correct (child: no settings/family/integrations mutation paths visible).
- [ ] Sign-out reachable from every layout (shell TopBar, hub, settings).
- [ ] No dead buttons, no `console.error` in normal flows, no unhandled promise toasts.
- [ ] `npm run build` zero errors; Lighthouse PWA installable on the deployed URL.
- [ ] Cross-family isolation spot-check (second test family sees zero rows of the first — v1 spec §7.5).

---

## 10. Suggested milestone order & sizing

| Milestone | Est. sessions | Blocks |
|---|---|---|
| M7 account/member mgmt + hardening | 2 | everything (do first) |
| M8 grocery + Notes import | 1–2 | — |
| M9 AI assistant | 2 | M10 voice tool |
| M10 Home Assistant | 1–2 | — |
| M11 polish pack | 1–2 | — |
| M12 Vercel + audit (§9) | 1 | all above |

M7 alone is demo-able; if the owner wants to show the spouse early, M7 can be followed by an owner-approved interim deploy — ask him.

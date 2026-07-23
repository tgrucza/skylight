<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Orbit house rules

- **Naming:** the app was renamed Hearth → Orbit. User-facing copy, `package.json`, the PWA manifest, and page titles say "Orbit." The spec files below keep their original filenames and "Hearth" wording since they're a historical record of what was built — don't rewrite them for the rename. Internal-only identifiers (the `events.source` enum value `"hearth"`, the `--ease-hearth` CSS variable, the `hearth-wall-profile` localStorage key) are also left as-is; they're not user-visible and renaming them buys nothing.
- **Specs:** `../HEARTH_ENGINEERING_SPEC.md` (v1, architecture + build rules) and `HEARTH_V2_SPEC.md` (current work: M7–M12). Read both before changing anything.
- **DEPLOYMENT POLICY:** production deploys require the owner's explicit approval *in the current conversation* — every time, no exceptions. Once Vercel is connected to `main` (spec M12), pushing/merging to `main` IS a deploy: keep work on a branch or uncommitted until the owner has tested locally (`npm run dev`) and says go.
- **Database:** `supabase/schema.sql` / `policies.sql` / `storage.sql` are applied and frozen — new DDL only via numbered files in `supabase/migrations/`, run by the owner in the Supabase SQL editor. Never edit an applied migration.
- **Secrets:** user-supplied keys (AI, Home Assistant) are AES-encrypted per family in Postgres; API responses return `configured` booleans, never key material. `.env.local` never gets committed.
- **Definition of done:** `npm run build` passes clean and the milestone's test checklist in the spec has been run against the dev server. No feature is "done" untested.

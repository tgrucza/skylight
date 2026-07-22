-- Fixes a silent Google Calendar sync failure: syncIntegration() upserts events with
-- onConflict "integration_id,google_event_id", but schema.sql never defined a unique
-- constraint on those columns (only a plain index on family_id,starts_at). Every synced
-- event has been silently rejected by Postgres (42P10) since this feature was built —
-- the upsert's error was never checked, so it failed with no error, no log, no event.
--
-- Must be a non-partial index: supabase-js's onConflict target doesn't repeat a WHERE
-- predicate, and Postgres can't infer a conflict target against a partial index without
-- a matching predicate on the statement itself. Non-partial is safe here anyway — Postgres
-- treats NULLs as distinct in unique indexes, so Hearth-only events (google_event_id null)
-- never collide with each other.
drop index if exists events_integration_google_event_id_key;
create unique index events_integration_google_event_id_key
  on events (integration_id, google_event_id);

-- Hearth v2 migration (M7-M11). Run once in the Supabase SQL editor.
-- Do not modify after running — see AGENTS.md.

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

-- ============ M11: weather location ============
alter table settings add column latitude double precision;
alter table settings add column longitude double precision;

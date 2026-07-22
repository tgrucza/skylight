-- Hearth database schema
-- Source of truth: HEARTH_ENGINEERING_SPEC.md §3
-- Postgres via Supabase. RLS is enabled in policies.sql (must run after this file).

create extension if not exists "pgcrypto";

-- ============ IDENTITY ============
create table families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  timezone text not null default 'America/New_York',
  theme text not null default 'hearth',
  created_at timestamptz default now()
);

create table users (               -- one row per authenticated Google account (Auth.js)
  id uuid primary key default gen_random_uuid(), -- our own id; the stable "auth user id" everything else references
  email text unique not null,
  display_name text,
  avatar_url text,
  created_at timestamptz default now()
);

create table family_members (      -- people in the household (may or may not have a login)
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  user_id uuid references users(id) on delete set null,  -- null for young kids
  name text not null,
  role text not null check (role in ('adult','child')),
  color_hex text not null,                                 -- per-person wayfinding color
  avatar_url text,
  pin_hash text,                                           -- wall profile PIN (kids)
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index on family_members (family_id);

-- ============ CALENDAR ============
create table calendar_integrations ( -- one per linked Google calendar
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  member_id uuid not null references family_members(id) on delete cascade,
  provider text not null default 'google',
  google_calendar_id text not null,
  access_token_enc text not null,      -- AES-encrypted, server-only
  refresh_token_enc text not null,
  sync_token text,                     -- incremental sync cursor
  watch_channel_id text,
  watch_expires_at timestamptz,
  status text not null default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (member_id, google_calendar_id)
);
create index on calendar_integrations (family_id);
create index on calendar_integrations (member_id);

create table events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  member_id uuid references family_members(id) on delete set null, -- owner/color
  integration_id uuid references calendar_integrations(id) on delete cascade,
  google_event_id text,                -- null for Hearth-only events
  title text not null,
  location text,
  notes text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  all_day boolean default false,
  rrule text,                          -- RFC 5545 recurrence, null if single
  recurrence_parent_id uuid references events(id) on delete cascade, -- exception instances
  source text not null default 'hearth' check (source in ('hearth','google')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);
create index on events (family_id, starts_at);
create index on events (member_id);
create index on events (integration_id);
create index on events (recurrence_parent_id);
create unique index on events (integration_id, google_event_id) where google_event_id is not null;

create table event_attendees (
  event_id uuid references events(id) on delete cascade,
  member_id uuid references family_members(id) on delete cascade,
  primary key (event_id, member_id)
);
create index on event_attendees (member_id);

-- ============ CHORES & REWARDS ============
create table chores (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  title text not null,
  icon text,
  star_value int not null default 1,
  schedule_days int[] not null default '{}',  -- 0=Sun..6=Sat; empty = one-off
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index on chores (family_id);

create table chore_assignments (
  id uuid primary key default gen_random_uuid(),
  chore_id uuid not null references chores(id) on delete cascade,
  member_id uuid not null references family_members(id) on delete cascade,
  created_at timestamptz default now(),
  unique (chore_id, member_id)
);
create index on chore_assignments (chore_id);
create index on chore_assignments (member_id);

create table chore_completions (
  id uuid primary key default gen_random_uuid(),
  chore_id uuid not null references chores(id) on delete cascade,
  member_id uuid not null references family_members(id) on delete cascade,
  completed_on date not null,
  stars int not null default 1,
  created_at timestamptz default now(),
  unique (chore_id, member_id, completed_on)
);
create index on chore_completions (member_id, completed_on);
create index on chore_completions (chore_id);

create table rewards (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  title text not null,
  star_cost int not null,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index on rewards (family_id);

create table reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  reward_id uuid not null references rewards(id) on delete cascade,
  member_id uuid not null references family_members(id) on delete cascade,
  redeemed_at timestamptz default now(),
  approved_by uuid references family_members(id)
);
create index on reward_redemptions (reward_id);
create index on reward_redemptions (member_id);
create index on reward_redemptions (approved_by);

-- ============ MEALS ============
create table recipes (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  title text not null,
  url text,
  notes text,
  ingredients jsonb default '[]',     -- [{name, qty}]
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index on recipes (family_id);

create table meal_plan_entries (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  date date not null,
  slot text not null default 'dinner' check (slot in ('breakfast','lunch','dinner','snack')),
  title text,                          -- freeform OR recipe
  recipe_id uuid references recipes(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (family_id, date, slot)
);
create index on meal_plan_entries (family_id, date);
create index on meal_plan_entries (recipe_id);

-- ============ LISTS ============
create table lists (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  name text not null,                  -- 'Groceries', 'To-Do', custom
  kind text not null default 'checklist' check (kind in ('grocery','checklist')),
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index on lists (family_id);

create table list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references lists(id) on delete cascade,
  label text not null,
  quantity text,
  category text,                       -- produce, dairy… for grocery grouping
  checked boolean default false,
  added_by uuid references family_members(id),
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index on list_items (list_id, checked);
create index on list_items (added_by);

-- ============ PHOTOS ============
create table photos (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  storage_path text not null,
  caption text,
  uploaded_by uuid references family_members(id),
  taken_at timestamptz,
  in_slideshow boolean default true,
  created_at timestamptz default now()
);
create index on photos (family_id, in_slideshow);
create index on photos (uploaded_by);

-- ============ NOTIFICATIONS & SETTINGS ============
create table notifications (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  member_id uuid references family_members(id) on delete cascade, -- null = whole family
  kind text not null,                  -- chore_due, event_reminder, list_note, system
  title text not null,
  body text,
  read_at timestamptz,
  created_at timestamptz default now()
);
create index on notifications (family_id, created_at desc);
create index on notifications (member_id);

create table settings (
  family_id uuid primary key references families(id) on delete cascade,
  idle_timeout_seconds int default 15,
  ambient_start time,                  -- e.g. 21:00 warm-dark mode
  ambient_end time,
  slideshow_interval_seconds int default 20,
  week_starts_on int default 0,
  default_hub_view text default 'busy',
  updated_at timestamptz default now()
);

-- ============ updated_at trigger ============
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'family_members','calendar_integrations','events','chores','rewards',
      'recipes','meal_plan_entries','lists','list_items','settings'
    ])
  loop
    execute format(
      'create trigger set_updated_at before update on %I for each row execute function set_updated_at()',
      t
    );
  end loop;
end $$;

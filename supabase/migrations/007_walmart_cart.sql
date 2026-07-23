-- Walmart cart v1 (experimental): family kill switch + preferred product memory.
-- Orbit never places orders — preferences only speed up manual Walmart search links.

alter table settings
  add column if not exists walmart_cart_enabled boolean not null default false;

create table if not exists walmart_preferences (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  list_label text not null,
  preferred_title text not null,
  search_query text not null,
  walmart_url text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (family_id, list_label)
);

create index if not exists walmart_preferences_family_idx on walmart_preferences (family_id);

alter table walmart_preferences enable row level security;

create policy "walmart_preferences_select" on walmart_preferences
  for select using (is_family_member(family_id));

create policy "walmart_preferences_write" on walmart_preferences
  for all using (is_family_member(family_id)) with check (is_family_member(family_id));

create trigger set_updated_at before update on walmart_preferences
  for each row execute function set_updated_at();

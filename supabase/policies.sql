-- Hearth Row-Level Security policies
-- Run after schema.sql. Source of truth: HEARTH_ENGINEERING_SPEC.md §3 / §7.5.
--
-- Security model:
--   Every Supabase Auth session belongs to an ADULT (children have no Google
--   account — they act through an adult's authenticated wall session after a
--   PIN-gated profile switch at the application layer, per §2.2 and §6.6).
--   So RLS's job is FAMILY ISOLATION: a signed-in adult may only read/write
--   rows belonging to a family they are a member of. Cross-family reads must
--   return zero rows (§7.5 test).
--
--   The finer adult-vs-child permission matrix (§3 "Permissions model" —
--   child may complete own chores / check+add list items / view everything,
--   but may not edit calendar integrations, family, rewards, or settings) is
--   enforced in API route guards (lib/auth.ts) against the *active wall
--   profile*, because that distinction does not exist at the Postgres
--   session level. Privileged server jobs (sync, webhooks, cron) use the
--   Supabase service-role key, which bypasses RLS entirely — never expose
--   that key to the client.

alter table families enable row level security;
alter table users enable row level security;
alter table family_members enable row level security;
alter table calendar_integrations enable row level security;
alter table events enable row level security;
alter table event_attendees enable row level security;
alter table chores enable row level security;
alter table chore_assignments enable row level security;
alter table chore_completions enable row level security;
alter table rewards enable row level security;
alter table reward_redemptions enable row level security;
alter table recipes enable row level security;
alter table meal_plan_entries enable row level security;
alter table lists enable row level security;
alter table list_items enable row level security;
alter table photos enable row level security;
alter table notifications enable row level security;
alter table settings enable row level security;

-- ============ HELPERS ============
-- SECURITY DEFINER + fixed search_path so the helper can read family_members
-- regardless of the caller's own row-level access, without being hijackable
-- via search_path injection.
create or replace function public.is_family_member(target_family uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from family_members
    where family_id = target_family
      and user_id = auth.uid()
  );
$$;

create or replace function public.is_family_adult(target_family uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from family_members
    where family_id = target_family
      and user_id = auth.uid()
      and role = 'adult'
  );
$$;

-- ============ FAMILIES ============
create policy "families_select_member" on families
  for select using (is_family_member(id));

create policy "families_update_adult" on families
  for update using (is_family_adult(id)) with check (is_family_adult(id));

-- Family creation happens via a server route using the service-role key
-- (onboarding must create the family before any family_members row exists,
-- so no authenticated-client INSERT policy is needed or offered).

-- ============ USERS ============
create policy "users_select_self_or_family" on users
  for select using (
    id = auth.uid()
    or id in (
      select fm2.user_id from family_members fm1
      join family_members fm2 on fm2.family_id = fm1.family_id
      where fm1.user_id = auth.uid() and fm2.user_id is not null
    )
  );

create policy "users_update_self" on users
  for update using (id = auth.uid()) with check (id = auth.uid());

-- ============ FAMILY MEMBERS ============
create policy "family_members_select" on family_members
  for select using (is_family_member(family_id));

create policy "family_members_write_adult" on family_members
  for all using (is_family_adult(family_id)) with check (is_family_adult(family_id));

-- ============ CALENDAR INTEGRATIONS (adult-only; tokens are ciphertext) ============
create policy "calendar_integrations_adult" on calendar_integrations
  for all using (is_family_adult(family_id)) with check (is_family_adult(family_id));

-- ============ EVENTS ============
create policy "events_select" on events
  for select using (is_family_member(family_id));

create policy "events_write_adult" on events
  for all using (is_family_adult(family_id)) with check (is_family_adult(family_id));

create policy "event_attendees_select" on event_attendees
  for select using (
    exists (select 1 from events e where e.id = event_id and is_family_member(e.family_id))
  );

create policy "event_attendees_write_adult" on event_attendees
  for all using (
    exists (select 1 from events e where e.id = event_id and is_family_adult(e.family_id))
  ) with check (
    exists (select 1 from events e where e.id = event_id and is_family_adult(e.family_id))
  );

-- ============ CHORES ============
create policy "chores_select" on chores
  for select using (is_family_member(family_id));

create policy "chores_write_adult" on chores
  for all using (is_family_adult(family_id)) with check (is_family_adult(family_id));

create policy "chore_assignments_select" on chore_assignments
  for select using (
    exists (select 1 from chores c where c.id = chore_id and is_family_member(c.family_id))
  );

create policy "chore_assignments_write_adult" on chore_assignments
  for all using (
    exists (select 1 from chores c where c.id = chore_id and is_family_adult(c.family_id))
  ) with check (
    exists (select 1 from chores c where c.id = chore_id and is_family_adult(c.family_id))
  );

-- Completions: any signed-in family member (adult session, possibly acting
-- for a child profile at the app layer) may record/remove a completion —
-- this is the "tap to complete, no nagging" flow and must stay low-friction.
create policy "chore_completions_select" on chore_completions
  for select using (
    exists (select 1 from chores c where c.id = chore_id and is_family_member(c.family_id))
  );

create policy "chore_completions_write_member" on chore_completions
  for all using (
    exists (select 1 from chores c where c.id = chore_id and is_family_member(c.family_id))
  ) with check (
    exists (select 1 from chores c where c.id = chore_id and is_family_member(c.family_id))
  );

-- ============ REWARDS ============
create policy "rewards_select" on rewards
  for select using (is_family_member(family_id));

create policy "rewards_write_adult" on rewards
  for all using (is_family_adult(family_id)) with check (is_family_adult(family_id));

create policy "reward_redemptions_select" on reward_redemptions
  for select using (
    exists (select 1 from rewards r where r.id = reward_id and is_family_member(r.family_id))
  );

-- A member may request a redemption; approval (approved_by set) is an
-- adult-only API-guarded action but the row itself is member-writable so a
-- kid can redeem from the wall.
create policy "reward_redemptions_write_member" on reward_redemptions
  for all using (
    exists (select 1 from rewards r where r.id = reward_id and is_family_member(r.family_id))
  ) with check (
    exists (select 1 from rewards r where r.id = reward_id and is_family_member(r.family_id))
  );

-- ============ RECIPES / MEAL PLAN ============
create policy "recipes_select" on recipes
  for select using (is_family_member(family_id));

create policy "recipes_write_adult" on recipes
  for all using (is_family_adult(family_id)) with check (is_family_adult(family_id));

create policy "meal_plan_entries_select" on meal_plan_entries
  for select using (is_family_member(family_id));

create policy "meal_plan_entries_write_adult" on meal_plan_entries
  for all using (is_family_adult(family_id)) with check (is_family_adult(family_id));

-- ============ LISTS ============
create policy "lists_select" on lists
  for select using (is_family_member(family_id));

create policy "lists_write_adult" on lists
  for all using (is_family_adult(family_id)) with check (is_family_adult(family_id));

-- list_items: any family member may check items and add items (spec §3
-- permissions model); deleting/reordering items also kept member-level so
-- shopping-list cleanup isn't gated behind an adult.
create policy "list_items_select" on list_items
  for select using (
    exists (select 1 from lists l where l.id = list_id and is_family_member(l.family_id))
  );

create policy "list_items_write_member" on list_items
  for all using (
    exists (select 1 from lists l where l.id = list_id and is_family_member(l.family_id))
  ) with check (
    exists (select 1 from lists l where l.id = list_id and is_family_member(l.family_id))
  );

-- ============ PHOTOS ============
create policy "photos_select" on photos
  for select using (is_family_member(family_id));

create policy "photos_write_member" on photos
  for all using (is_family_member(family_id)) with check (is_family_member(family_id));

-- ============ NOTIFICATIONS ============
create policy "notifications_select" on notifications
  for select using (is_family_member(family_id));

create policy "notifications_update_member" on notifications
  for update using (is_family_member(family_id)) with check (is_family_member(family_id));

-- Notifications are otherwise created by server-side jobs (service role).

-- ============ SETTINGS ============
create policy "settings_select" on settings
  for select using (is_family_member(family_id));

create policy "settings_write_adult" on settings
  for all using (is_family_adult(family_id)) with check (is_family_adult(family_id));

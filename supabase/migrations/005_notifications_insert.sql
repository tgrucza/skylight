-- Allow family members to insert notifications (event reminders from hub load).
-- Cron uses the service role and already bypasses RLS.

create policy "notifications_insert_member" on notifications
  for insert with check (is_family_member(family_id));

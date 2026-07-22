-- Photos storage bucket + RLS (spec §2.2 "Signed URLs"; run after schema.sql/policies.sql).
-- Objects are stored at `{family_id}/{photo_id}.jpg` so path-prefix RLS can
-- reuse the same public.is_family_member() helper as every other table.

insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;

create policy "photos_bucket_select" on storage.objects
  for select using (
    bucket_id = 'photos'
    and public.is_family_member((storage.foldername(name))[1]::uuid)
  );

create policy "photos_bucket_insert" on storage.objects
  for insert with check (
    bucket_id = 'photos'
    and public.is_family_member((storage.foldername(name))[1]::uuid)
  );

create policy "photos_bucket_delete" on storage.objects
  for delete using (
    bucket_id = 'photos'
    and public.is_family_member((storage.foldername(name))[1]::uuid)
  );

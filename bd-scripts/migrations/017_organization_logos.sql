-- 017_organization_logos.sql — company logo storage (W-CH24)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'organization-logos',
  'organization-logos',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

drop policy if exists organization_logos_storage_insert_owner on storage.objects;
create policy organization_logos_storage_insert_owner
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'organization-logos'
    and exists (
      select 1
      from public.organizations o
      where o.id = ((storage.foldername(name))[1])::uuid
        and o.owner_id = auth.uid()
    )
  );

drop policy if exists organization_logos_storage_update_owner on storage.objects;
create policy organization_logos_storage_update_owner
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'organization-logos'
    and exists (
      select 1
      from public.organizations o
      where o.id = ((storage.foldername(name))[1])::uuid
        and o.owner_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'organization-logos'
    and exists (
      select 1
      from public.organizations o
      where o.id = ((storage.foldername(name))[1])::uuid
        and o.owner_id = auth.uid()
    )
  );

drop policy if exists organization_logos_storage_delete_owner on storage.objects;
create policy organization_logos_storage_delete_owner
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'organization-logos'
    and exists (
      select 1
      from public.organizations o
      where o.id = ((storage.foldername(name))[1])::uuid
        and o.owner_id = auth.uid()
    )
  );

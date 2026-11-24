-- 075_organization_logos_storage_company_admin.sql
-- Company logo storage: user-scoped paths (same pattern as 013 avatars) + SELECT for upsert.

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
drop policy if exists organization_logos_storage_update_owner on storage.objects;
drop policy if exists organization_logos_storage_delete_owner on storage.objects;
drop policy if exists organization_logos_storage_select_manager on storage.objects;
drop policy if exists organization_logos_storage_select_public on storage.objects;
drop policy if exists organization_logos_storage_insert_own on storage.objects;
drop policy if exists organization_logos_storage_select_own on storage.objects;
drop policy if exists organization_logos_storage_update_own on storage.objects;
drop policy if exists organization_logos_storage_delete_own on storage.objects;

-- Path: {auth.uid()}/company-logo.{ext}
create policy organization_logos_storage_insert_own
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'organization-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Required for storage upsert (replace logo) via authenticated API
create policy organization_logos_storage_select_own
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'organization-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy organization_logos_storage_update_own
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'organization-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'organization-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy organization_logos_storage_delete_own
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'organization-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy organization_logos_storage_select_public
  on storage.objects
  for select
  to public
  using (bucket_id = 'organization-logos');

drop function if exists public.user_can_manage_organization_logo(uuid);

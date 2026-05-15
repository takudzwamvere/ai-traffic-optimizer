-- ============================================================
-- Storage RLS Policies for the 'avatars' bucket
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================
-- Without these policies, any authenticated user can overwrite
-- another user's avatar by guessing their UUID, since the
-- bucket is set to Public.

-- Allow users to UPLOAD files only inside their own folder
create policy "Users can upload their own avatar"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to UPDATE (overwrite) only their own files
create policy "Users can update their own avatar"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to DELETE only their own files
create policy "Users can delete their own avatar"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow ANYONE to read avatars (needed because the bucket is Public
-- and profile images must be viewable without authentication)
create policy "Avatar images are publicly readable"
on storage.objects
for select
using (bucket_id = 'avatars');

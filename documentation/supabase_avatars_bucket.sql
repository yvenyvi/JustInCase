-- Run this once in the Supabase SQL editor to enable profile picture uploads.

-- 1. Create the public 'avatars' storage bucket
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- 2. Allow authenticated users to upload their own avatar
create policy "Users can upload their own avatar"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. Allow authenticated users to update (overwrite) their own avatar
create policy "Users can update their own avatar"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. Allow anyone to read avatars (they're public profile pictures)
create policy "Avatars are publicly readable"
on storage.objects for select
to public
using (bucket_id = 'avatars');

-- 5. Add avatar_url column to the users table if it doesn't exist yet
alter table public.users
  add column if not exists avatar_url text;

-- Run in Supabase SQL Editor once.
-- Adds pronunciation fields + allows logged-in users to insert words.

alter table public.words
  add column if not exists phonetic text,
  add column if not exists audio_url text;

drop policy if exists "Authenticated users can insert words" on public.words;
create policy "Authenticated users can insert words"
  on public.words for insert
  to authenticated
  with check (true);

drop policy if exists "Authenticated users can update words" on public.words;
create policy "Authenticated users can update words"
  on public.words for update
  to authenticated
  using (true)
  with check (true);

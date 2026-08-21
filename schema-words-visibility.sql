-- Private vs global word uploads.
-- Run once in Supabase SQL editor (optional until you want sharing).

alter table public.words
  add column if not exists is_global boolean not null default true,
  add column if not exists created_by uuid references public.profiles (id) on delete set null,
  add column if not exists uploader_username text,
  add column if not exists uploader_avatar_url text;

create index if not exists words_is_global_idx on public.words (is_global);
create index if not exists words_created_by_idx on public.words (created_by);

-- Existing seed/system rows stay global and anonymous.
update public.words
set is_global = true
where created_by is null;

-- Readable: global words for everyone, private only for creator.
drop policy if exists "Words are publicly readable" on public.words;
create policy "Words are publicly readable"
  on public.words for select
  to anon, authenticated
  using (is_global = true or created_by = auth.uid());

drop policy if exists "Authenticated users can insert words" on public.words;
create policy "Authenticated users can insert words"
  on public.words for insert
  to authenticated
  with check (created_by is null or created_by = auth.uid());

drop policy if exists "Authenticated users can update words" on public.words;
create policy "Authenticated users can update words"
  on public.words for update
  to authenticated
  using (created_by is null or created_by = auth.uid())
  with check (created_by is null or created_by = auth.uid());

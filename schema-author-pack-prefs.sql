-- Author-configurable pack quiz pass score (floor 70%).
-- Run once in Supabase SQL Editor if not applied via migration.

create table if not exists public.author_pack_prefs (
  author_id uuid primary key references public.profiles (id) on delete cascade,
  quiz_pass_score numeric(5, 2) not null default 80
    check (quiz_pass_score >= 70 and quiz_pass_score <= 100),
  updated_at timestamptz not null default now()
);

alter table public.author_pack_prefs enable row level security;

drop policy if exists "Anyone authenticated can read pack prefs" on public.author_pack_prefs;
create policy "Anyone authenticated can read pack prefs"
  on public.author_pack_prefs for select
  to authenticated
  using (true);

drop policy if exists "Authors manage own pack prefs" on public.author_pack_prefs;
create policy "Authors manage own pack prefs"
  on public.author_pack_prefs for all
  to authenticated
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

drop policy if exists "Public can read pack prefs" on public.author_pack_prefs;
create policy "Public can read pack prefs"
  on public.author_pack_prefs for select
  to anon
  using (true);

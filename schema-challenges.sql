-- MIMO 1v1 challenges (Realtime)
-- Run once in the Supabase SQL Editor.
-- Also enable Realtime for public.challenges (Database → Replication → challenges).

create table if not exists public.challenges (
  id bigserial primary key,
  challenger_id uuid not null references public.profiles (id) on delete cascade,
  opponent_id uuid not null references public.profiles (id) on delete cascade,
  module text not null check (module in ('match', 'word_check')),
  status text not null default 'pending'
    check (status in ('pending', 'declined', 'active', 'finished', 'cancelled')),
  seed_words jsonb not null default '[]'::jsonb,
  challenger_score int not null default 0,
  opponent_score int not null default 0,
  winner_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  check (challenger_id <> opponent_id)
);

create index if not exists challenges_challenger_idx on public.challenges (challenger_id);
create index if not exists challenges_opponent_idx on public.challenges (opponent_id);
create index if not exists challenges_status_idx on public.challenges (status);

alter table public.challenges enable row level security;

drop policy if exists "Participants can view challenges" on public.challenges;
create policy "Participants can view challenges"
  on public.challenges for select
  to authenticated
  using (auth.uid() = challenger_id or auth.uid() = opponent_id);

drop policy if exists "Users can create challenges" on public.challenges;
create policy "Users can create challenges"
  on public.challenges for insert
  to authenticated
  with check (auth.uid() = challenger_id and status = 'pending');

drop policy if exists "Participants can update challenges" on public.challenges;
create policy "Participants can update challenges"
  on public.challenges for update
  to authenticated
  using (auth.uid() = challenger_id or auth.uid() = opponent_id)
  with check (auth.uid() = challenger_id or auth.uid() = opponent_id);

-- Realtime (ignore error if already added)
do $$
begin
  alter publication supabase_realtime add table public.challenges;
exception
  when duplicate_object then null;
end $$;

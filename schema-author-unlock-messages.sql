-- MIMO: unlock messaging (and later legacy notes) by passing an author's word-pack quiz.
-- Run once in the Supabase SQL Editor (or via MCP apply_migration).

-- ── Unlocks ──────────────────────────────────────────────────────────────
create table if not exists public.author_pack_unlocks (
  id bigserial primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  best_score numeric(5, 2) not null default 0
    check (best_score >= 0 and best_score <= 100),
  attempt_count integer not null default 1
    check (attempt_count >= 1),
  check (user_id <> author_id),
  unique (user_id, author_id)
);

create index if not exists author_pack_unlocks_user_idx
  on public.author_pack_unlocks (user_id);
create index if not exists author_pack_unlocks_author_idx
  on public.author_pack_unlocks (author_id);

alter table public.author_pack_unlocks enable row level security;

drop policy if exists "Users can view own unlocks" on public.author_pack_unlocks;
create policy "Users can view own unlocks"
  on public.author_pack_unlocks for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own unlocks" on public.author_pack_unlocks;
create policy "Users can insert own unlocks"
  on public.author_pack_unlocks for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own unlocks" on public.author_pack_unlocks;
create policy "Users can update own unlocks"
  on public.author_pack_unlocks for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Authors can see who unlocked them (for message inbox context).
drop policy if exists "Authors can view unlocks of their pack" on public.author_pack_unlocks;
create policy "Authors can view unlocks of their pack"
  on public.author_pack_unlocks for select
  to authenticated
  using (auth.uid() = author_id);

-- ── Direct messages ──────────────────────────────────────────────────────
create table if not exists public.direct_messages (
  id bigserial primary key,
  thread_key text not null,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now(),
  check (sender_id <> recipient_id)
);

create index if not exists direct_messages_thread_idx
  on public.direct_messages (thread_key, created_at);
create index if not exists direct_messages_recipient_idx
  on public.direct_messages (recipient_id, created_at desc);
create index if not exists direct_messages_sender_idx
  on public.direct_messages (sender_id, created_at desc);

alter table public.direct_messages enable row level security;

drop policy if exists "Participants can read messages" on public.direct_messages;
create policy "Participants can read messages"
  on public.direct_messages for select
  to authenticated
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

-- Insert allowed only when the pair has an unlock (either direction from unlocker's view:
-- unlocker unlocked author, so either may message).
drop policy if exists "Unlocked pairs can send messages" on public.direct_messages;
create policy "Unlocked pairs can send messages"
  on public.direct_messages for insert
  to authenticated
  with check (
    auth.uid() = sender_id
    and exists (
      select 1
      from public.author_pack_unlocks u
      where (
        (u.user_id = sender_id and u.author_id = recipient_id)
        or (u.user_id = recipient_id and u.author_id = sender_id)
      )
    )
  );

-- ── Author legacy notes (phase 2) ────────────────────────────────────────
create table if not exists public.author_legacies (
  author_id uuid primary key references public.profiles (id) on delete cascade,
  title text not null default 'Hazırlık anım'
    check (char_length(title) between 1 and 80),
  body text not null
    check (char_length(body) between 1 and 2000),
  period_label text null
    check (period_label is null or char_length(period_label) <= 40),
  updated_at timestamptz not null default now()
);

alter table public.author_legacies enable row level security;

-- Authors manage their own note.
drop policy if exists "Authors manage own legacy" on public.author_legacies;
create policy "Authors manage own legacy"
  on public.author_legacies for all
  to authenticated
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

-- Readers who unlocked the author's pack can read the note.
drop policy if exists "Unlocked readers can view legacy" on public.author_legacies;
create policy "Unlocked readers can view legacy"
  on public.author_legacies for select
  to authenticated
  using (
    auth.uid() = author_id
    or exists (
      select 1
      from public.author_pack_unlocks u
      where u.user_id = auth.uid() and u.author_id = author_legacies.author_id
    )
  );

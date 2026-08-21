-- MIMO — Friends (request / accept / reject)
-- Run once in the Supabase SQL Editor.

-- Allow authenticated users to look up others by username (needed for add-friend search).
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Authenticated users can view profiles" on public.profiles;
create policy "Authenticated users can view profiles"
  on public.profiles for select
  to authenticated
  using (true);

create table if not exists public.friendships (
  id bigserial primary key,
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_id <> addressee_id)
);

-- One relationship per unordered pair (blocks A→B and B→A duplicates).
create unique index if not exists friendships_pair_unique
  on public.friendships (
    least(requester_id, addressee_id),
    greatest(requester_id, addressee_id)
  );

create index if not exists friendships_requester_idx on public.friendships (requester_id);
create index if not exists friendships_addressee_idx on public.friendships (addressee_id);
create index if not exists friendships_status_idx on public.friendships (status);

alter table public.friendships enable row level security;

drop policy if exists "Participants can view friendships" on public.friendships;
create policy "Participants can view friendships"
  on public.friendships for select
  to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

drop policy if exists "Users can send friend requests" on public.friendships;
create policy "Users can send friend requests"
  on public.friendships for insert
  to authenticated
  with check (auth.uid() = requester_id and status = 'pending');

drop policy if exists "Addressee can respond to requests" on public.friendships;
create policy "Addressee can respond to requests"
  on public.friendships for update
  to authenticated
  using (auth.uid() = addressee_id)
  with check (auth.uid() = addressee_id);

drop policy if exists "Participants can manage friendship rows" on public.friendships;
create policy "Participants can manage friendship rows"
  on public.friendships for delete
  to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- Optional: username search helper (case-insensitive)
create index if not exists profiles_username_lower_idx
  on public.profiles (lower(username));

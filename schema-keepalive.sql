-- Keep-alive heartbeat for free-tier Supabase (prevent project pause).
-- Run once in Supabase SQL editor after deploy.

create table if not exists public.system_heartbeat (
  id integer primary key default 1 check (id = 1),
  last_ping_at timestamptz not null default now(),
  last_ok boolean not null default true,
  latency_ms integer,
  source text default 'cron'
);

insert into public.system_heartbeat (id, last_ping_at, last_ok, source)
values (1, now(), true, 'seed')
on conflict (id) do nothing;

alter table public.system_heartbeat enable row level security;

drop policy if exists "Public can read system heartbeat" on public.system_heartbeat;
create policy "Public can read system heartbeat"
  on public.system_heartbeat
  for select
  to anon, authenticated
  using (true);

-- Writes only via service role (bypasses RLS). No insert/update policies for anon.

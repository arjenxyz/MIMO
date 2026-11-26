-- MIMO profile setup fields for first-time registration
-- Safe to re-run in the Supabase SQL Editor.

alter table public.profiles
  add column if not exists display_name text,
  add column if not exists age integer,
  add column if not exists profile_completed_at timestamptz;

alter table public.profiles
  drop constraint if exists profiles_age_check;

alter table public.profiles
  add constraint profiles_age_check
  check (age is null or (age >= 5 and age <= 120));

-- Only mark complete when name + username + age are all present.
update public.profiles
set profile_completed_at = coalesce(profile_completed_at, now())
where profile_completed_at is null
  and display_name is not null
  and length(trim(display_name)) >= 2
  and username is not null
  and length(trim(username)) >= 3
  and age is not null;

-- Older bulk migrations may have set completed_at without real fields — reopen those.
update public.profiles
set profile_completed_at = null
where (
    display_name is null
    or length(trim(display_name)) < 2
    or username is null
    or length(trim(username)) < 3
    or age is null
  );

-- New signups: leave profile incomplete.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name, age, profile_completed_at)
  values (
    new.id,
    null,
    null,
    null,
    null
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

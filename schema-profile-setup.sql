-- MIMO profile setup fields for first-time registration
-- Run once in the Supabase SQL Editor.

alter table public.profiles
  add column if not exists display_name text,
  add column if not exists age integer,
  add column if not exists profile_completed_at timestamptz;

alter table public.profiles
  drop constraint if exists profiles_age_check;

alter table public.profiles
  add constraint profiles_age_check
  check (age is null or (age >= 5 and age <= 120));

-- Existing accounts should not be forced through setup again.
update public.profiles
set profile_completed_at = coalesce(profile_completed_at, now())
where profile_completed_at is null;

-- New signups: leave profile incomplete (username may still be prefilled by trigger).
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

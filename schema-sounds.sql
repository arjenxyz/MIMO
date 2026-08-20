-- Run in Supabase SQL Editor to add the Sounds module.
-- Safe to re-run.

create table if not exists public.sounds (
  id bigserial primary key,
  ipa text not null unique,
  example_word text not null,
  category text not null check (category in ('vowel', 'consonant')),
  sort_order integer not null default 0
);

create table if not exists public.sound_pairs (
  id bigserial primary key,
  sound_id bigint not null references public.sounds (id) on delete cascade,
  word_a text not null,
  word_b text not null,
  correct text not null check (correct in ('a', 'b'))
);

create table if not exists public.user_sounds (
  id bigserial primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  sound_id bigint not null references public.sounds (id) on delete cascade,
  mastery integer not null default 0 check (mastery between 0 and 100),
  correct_count integer not null default 0,
  seen_count integer not null default 0,
  last_answered date not null default current_date,
  unique (user_id, sound_id)
);

alter table public.sounds enable row level security;
alter table public.sound_pairs enable row level security;
alter table public.user_sounds enable row level security;

drop policy if exists "Sounds are publicly readable" on public.sounds;
create policy "Sounds are publicly readable"
  on public.sounds for select
  using (true);

drop policy if exists "Sound pairs are publicly readable" on public.sound_pairs;
create policy "Sound pairs are publicly readable"
  on public.sound_pairs for select
  using (true);

drop policy if exists "Users can view own sounds" on public.user_sounds;
create policy "Users can view own sounds"
  on public.user_sounds for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own sounds" on public.user_sounds;
create policy "Users can insert own sounds"
  on public.user_sounds for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own sounds" on public.user_sounds;
create policy "Users can update own sounds"
  on public.user_sounds for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own sounds" on public.user_sounds;
create policy "Users can delete own sounds"
  on public.user_sounds for delete
  using (auth.uid() = user_id);

insert into public.sounds (ipa, example_word, category, sort_order) values
  ('ɑ', 'hot', 'vowel', 1),
  ('æ', 'cat', 'vowel', 2),
  ('ʌ', 'but', 'vowel', 3),
  ('ɛ', 'bed', 'vowel', 4),
  ('eɪ', 'say', 'vowel', 5),
  ('ɚ', 'bird', 'vowel', 6),
  ('ɪ', 'ship', 'vowel', 7),
  ('i', 'sheep', 'vowel', 8),
  ('ə', 'about', 'vowel', 9),
  ('oʊ', 'boat', 'vowel', 10),
  ('ʊ', 'foot', 'vowel', 11),
  ('u', 'food', 'vowel', 12),
  ('aʊ', 'cow', 'vowel', 13),
  ('aɪ', 'my', 'vowel', 14),
  ('ɔɪ', 'boy', 'vowel', 15),
  ('p', 'pen', 'consonant', 16),
  ('b', 'bag', 'consonant', 17),
  ('t', 'top', 'consonant', 18),
  ('d', 'dog', 'consonant', 19),
  ('k', 'cat', 'consonant', 20),
  ('g', 'go', 'consonant', 21),
  ('θ', 'think', 'consonant', 22),
  ('ð', 'this', 'consonant', 23),
  ('ʃ', 'ship', 'consonant', 24),
  ('tʃ', 'chair', 'consonant', 25)
on conflict (ipa) do nothing;

insert into public.sound_pairs (sound_id, word_a, word_b, correct)
select s.id, v.word_a, v.word_b, v.correct
from (values
  ('ɑ', 'dock', 'deck', 'a'),
  ('ɑ', 'hot', 'hat', 'a'),
  ('æ', 'cat', 'cut', 'a'),
  ('æ', 'bad', 'bed', 'a'),
  ('ʌ', 'but', 'bat', 'a'),
  ('ʌ', 'cut', 'cat', 'a'),
  ('ɛ', 'bed', 'bad', 'a'),
  ('ɛ', 'pen', 'pan', 'a'),
  ('eɪ', 'say', 'see', 'a'),
  ('eɪ', 'late', 'let', 'a'),
  ('ɚ', 'bird', 'bed', 'a'),
  ('ɚ', 'hurt', 'hat', 'a'),
  ('ɪ', 'ship', 'sheep', 'a'),
  ('ɪ', 'bit', 'beat', 'a'),
  ('i', 'sheep', 'ship', 'a'),
  ('i', 'beat', 'bit', 'a'),
  ('ə', 'about', 'a boat', 'a'),
  ('oʊ', 'boat', 'boot', 'a'),
  ('oʊ', 'note', 'not', 'a'),
  ('ʊ', 'foot', 'food', 'a'),
  ('ʊ', 'pull', 'pool', 'a'),
  ('u', 'food', 'foot', 'a'),
  ('u', 'pool', 'pull', 'a'),
  ('aʊ', 'cow', 'coo', 'a'),
  ('aɪ', 'my', 'me', 'a'),
  ('ɔɪ', 'boy', 'buy', 'a'),
  ('p', 'pen', 'ben', 'a'),
  ('b', 'bag', 'back', 'a'),
  ('t', 'top', 'dop', 'a'),
  ('d', 'dog', 'tog', 'a'),
  ('k', 'cap', 'gap', 'a'),
  ('g', 'got', 'cot', 'a'),
  ('θ', 'think', 'sink', 'a'),
  ('ð', 'this', 'dis', 'a'),
  ('ʃ', 'ship', 'sip', 'a'),
  ('tʃ', 'chair', 'share', 'a')
) as v(ipa, word_a, word_b, correct)
join public.sounds s on s.ipa = v.ipa
where not exists (
  select 1 from public.sound_pairs sp
  where sp.sound_id = s.id and sp.word_a = v.word_a and sp.word_b = v.word_b
);

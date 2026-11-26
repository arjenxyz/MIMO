-- MIMO â€” Supabase schema, RLS policies, and seed data
-- Run this entire file in the Supabase SQL Editor.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text,
  daily_streak integer not null default 0,
  last_active date not null default current_date,
  total_lessons integer not null default 0,
  daily_quest_bonus_date date
);

-- Remove legacy XP / profile-level columns if an older schema still has them.
alter table public.profiles drop column if exists xp;
alter table public.profiles drop column if exists level;

create table if not exists public.words (
  id bigserial primary key,
  english text not null unique,
  turkish text not null,
  example_sentence text,
  difficulty integer not null default 1 check (difficulty between 1 and 5),
  phonetic text,
  audio_url text
);

create table if not exists public.user_words (
  id bigserial primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  word_id bigint not null references public.words (id) on delete cascade,
  ease_factor double precision not null default 2.5,
  repetition integer not null default 0,
  interval integer not null default 1,
  next_review date not null default current_date,
  correct_count integer not null default 0,
  wrong_count integer not null default 0,
  last_answered date not null default current_date,
  unique (user_id, word_id)
);

create table if not exists public.grammar_rules (
  id bigserial primary key,
  title text not null,
  difficulty integer not null default 1 check (difficulty between 1 and 5),
  question text not null,
  correct_answer text not null,
  explanation text,
  example text
);

create table if not exists public.user_grammar (
  id bigserial primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  grammar_id bigint not null references public.grammar_rules (id) on delete cascade,
  ease_factor double precision not null default 2.5,
  repetition integer not null default 0,
  interval integer not null default 1,
  next_review date not null default current_date,
  correct_count integer not null default 0,
  wrong_count integer not null default 0,
  last_answered date not null default current_date,
  unique (user_id, grammar_id)
);

create table if not exists public.stories (
  id bigserial primary key,
  level integer not null default 1,
  title text not null,
  content text not null,
  question1 text not null,
  question2 text not null,
  question3 text not null,
  answer1 text not null,
  answer2 text not null,
  answer3 text not null,
  image_prompt text
);

create table if not exists public.user_stories (
  id bigserial primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  story_id bigint not null references public.stories (id) on delete cascade,
  score integer not null default 0 check (score between 0 and 3),
  completed_at date not null default current_date
);

-- ---------------------------------------------------------------------------
-- New user trigger: create a profile row on signup
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.words enable row level security;
alter table public.user_words enable row level security;
alter table public.grammar_rules enable row level security;
alter table public.user_grammar enable row level security;
alter table public.stories enable row level security;
alter table public.user_stories enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Words are publicly readable" on public.words;
create policy "Words are publicly readable"
  on public.words for select
  using (true);

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

drop policy if exists "Grammar is publicly readable" on public.grammar_rules;
create policy "Grammar is publicly readable"
  on public.grammar_rules for select
  using (true);

drop policy if exists "Stories are publicly readable" on public.stories;
create policy "Stories are publicly readable"
  on public.stories for select
  using (true);

drop policy if exists "Users can view own words" on public.user_words;
create policy "Users can view own words"
  on public.user_words for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own words" on public.user_words;
create policy "Users can insert own words"
  on public.user_words for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own words" on public.user_words;
create policy "Users can update own words"
  on public.user_words for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own words" on public.user_words;
create policy "Users can delete own words"
  on public.user_words for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can view own grammar" on public.user_grammar;
create policy "Users can view own grammar"
  on public.user_grammar for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own grammar" on public.user_grammar;
create policy "Users can insert own grammar"
  on public.user_grammar for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own grammar" on public.user_grammar;
create policy "Users can update own grammar"
  on public.user_grammar for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own grammar" on public.user_grammar;
create policy "Users can delete own grammar"
  on public.user_grammar for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can view own stories" on public.user_stories;
create policy "Users can view own stories"
  on public.user_stories for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own stories" on public.user_stories;
create policy "Users can insert own stories"
  on public.user_stories for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own stories" on public.user_stories;
create policy "Users can update own stories"
  on public.user_stories for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own stories" on public.user_stories;
create policy "Users can delete own stories"
  on public.user_stories for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Seed: words (32)
-- ---------------------------------------------------------------------------

insert into public.words (english, turkish, example_sentence, difficulty) values
  ('apple', 'elma', 'I eat an apple every morning.', 1),
  ('book', 'kitap', 'This book is very interesting.', 1),
  ('car', 'araba', 'My father has a new car.', 1),
  ('house', 'ev', 'They live in a small house.', 1),
  ('school', 'okul', 'The children walk to school.', 1),
  ('happy', 'mutlu', 'She looks happy today.', 1),
  ('water', 'su', 'Please drink more water.', 1),
  ('friend', 'arkadaÅŸ', 'He is my best friend.', 1),
  ('food', 'yemek', 'The food in this restaurant is great.', 1),
  ('time', 'zaman', 'I do not have much time.', 1),
  ('day', 'gÃ¼n', 'Have a nice day!', 1),
  ('night', 'gece', 'The stars are bright at night.', 1),
  ('city', 'ÅŸehir', 'Istanbul is a big city.', 1),
  ('family', 'aile', 'I love my family.', 1),
  ('work', 'iÅŸ', 'She goes to work at eight.', 1),
  ('love', 'sevgi', 'Love makes people kind.', 1),
  ('music', 'mÃ¼zik', 'I listen to music every day.', 1),
  ('dog', 'kÃ¶pek', 'The dog is playing in the garden.', 1),
  ('cat', 'kedi', 'The cat is sleeping on the sofa.', 1),
  ('tree', 'aÄŸaÃ§', 'There is a tall tree in the park.', 1),
  ('sun', 'gÃ¼neÅŸ', 'The sun is shining today.', 1),
  ('moon', 'ay', 'The moon looks beautiful tonight.', 1),
  ('rain', 'yaÄŸmur', 'I like walking in the rain.', 1),
  ('walk', 'yÃ¼rÃ¼mek', 'We walk to the beach on Sundays.', 1),
  ('eat', 'yemek', 'They eat breakfast together.', 1),
  ('drink', 'iÃ§mek', 'Would you like to drink tea?', 1),
  ('sleep', 'uyumak', 'Babies sleep a lot.', 1),
  ('learn', 'Ã¶ÄŸrenmek', 'I want to learn English.', 1),
  ('speak', 'konuÅŸmak', 'Can you speak English?', 1),
  ('write', 'yazmak', 'Please write your name here.', 1),
  ('read', 'okumak', 'I read a book before bed.', 1),
  ('listen', 'dinlemek', 'Listen to the teacher carefully.', 1)
on conflict (english) do nothing;

-- ---------------------------------------------------------------------------
-- Seed: grammar rules (5)
-- ---------------------------------------------------------------------------

create unique index if not exists grammar_rules_title_idx on public.grammar_rules (title);
create unique index if not exists stories_title_idx on public.stories (title);

insert into public.grammar_rules (title, difficulty, question, correct_answer, explanation, example) values
  (
    'Simple Present',
    1,
    'She ___ (go) to school every day.',
    'goes',
    'Simple Present, he/she/it Ã¶znesinde fiile -s/-es eklenir.',
    'She goes to school every day.'
  ),
  (
    'Present Continuous',
    1,
    'They ___ (play) football right now.',
    'are playing',
    'Present Continuous: am/is/are + fiil-ing. Åu anda olan eylemler iÃ§in kullanÄ±lÄ±r.',
    'They are playing football right now.'
  ),
  (
    'Simple Past',
    2,
    'I ___ (watch) a movie last night.',
    'watched',
    'Simple Past, dÃ¼zenli fiillerde -ed alÄ±r. Zaman belirteci: last night, yesterday.',
    'I watched a movie last night.'
  ),
  (
    'Present Perfect',
    3,
    'She ___ (live) in London since 2010.',
    'has lived',
    'Since + geÃ§miÅŸ zaman belirteci Present Perfect ister. have/has + V3.',
    'I have lived here for 3 years.'
  ),
  (
    'Future Tense',
    2,
    'We ___ (visit) our grandparents tomorrow.',
    'will visit',
    'Gelecek zaman iÃ§in will + fiil (yalÄ±n hali) kullanÄ±lÄ±r.',
    'We will visit our grandparents tomorrow.'
  )
on conflict (title) do nothing;

-- ---------------------------------------------------------------------------
-- Seed: stories (Level 1)
-- ---------------------------------------------------------------------------

insert into public.stories (
  level, title, content,
  question1, question2, question3,
  answer1, answer2, answer3,
  image_prompt
) values
  (
    1,
    'A Day at School',
    'Mina is a student. She wakes up early and eats breakfast. Then she walks to school with her friend Ali. At school they read a book and learn new English words. After class they play in the garden. Mina is happy because she loves school.',
    'Who walks to school with Mina?',
    'What do they do at school?',
    'Where do they play after class?',
    'Ali',
    'They read a book',
    'In the garden',
    'A cheerful girl walking to school with a friend, cartoon style'
  ),
  (
    1,
    'The Red Apple',
    'Tom is hungry. He goes to the kitchen and sees a red apple on the table. He washes the apple and eats it. It is sweet and fresh. Tom smiles and says, "I like apples!" Then he drinks a glass of water.',
    'What color is the apple?',
    'Where does Tom see the apple?',
    'What does Tom drink after the apple?',
    'Red',
    'On the table',
    'Water',
    'A boy eating a shiny red apple in a kitchen, cartoon style'
  ),
  (
    1,
    'My Family',
    'This is my family. My mother is a teacher and my father works in a hospital. I have a little brother. His name is Ege. We have a small dog called Pamuk. In the evening we eat dinner together and listen to music. I love my family very much.',
    'What is the mother''s job?',
    'What is the dog''s name?',
    'What do they do in the evening?',
    'Teacher',
    'Pamuk',
    'Eat dinner and listen to music',
    'A happy family at the dinner table with a small white dog, cartoon style'
  )
on conflict (title) do nothing;


-- Optional: drop legacy sounds module if it still exists on older databases.
alter table if exists public.user_sounds drop constraint if exists user_sounds_sound_id_fkey;
drop table if exists public.user_sounds;
drop table if exists public.sound_pairs;
drop table if exists public.sounds;


-- Topic-based grammar drills (hazırlık).
-- Run once in Supabase SQL editor.

create table if not exists public.grammar_topics (
  id bigint generated always as identity primary key,
  slug text not null unique,
  title text not null,
  summary text not null,
  tip_tr text,
  example text,
  difficulty integer not null default 1 check (difficulty between 1 and 5),
  created_at timestamptz not null default now()
);

create table if not exists public.grammar_items (
  id bigint generated always as identity primary key,
  topic_id bigint not null references public.grammar_topics (id) on delete cascade,
  question text not null,
  correct_answer text not null,
  explanation text,
  example text,
  difficulty integer not null default 1 check (difficulty between 1 and 5),
  sort_order integer not null default 0
);

create index if not exists grammar_items_topic_id_idx on public.grammar_items (topic_id);

alter table public.grammar_topics enable row level security;
alter table public.grammar_items enable row level security;

drop policy if exists "Grammar topics are publicly readable" on public.grammar_topics;
create policy "Grammar topics are publicly readable"
  on public.grammar_topics for select
  to anon, authenticated
  using (true);

drop policy if exists "Grammar items are publicly readable" on public.grammar_items;
create policy "Grammar items are publicly readable"
  on public.grammar_items for select
  to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- Seed topics
-- ---------------------------------------------------------------------------

insert into public.grammar_topics (slug, title, summary, tip_tr, example, difficulty) values
  (
    'in-on-at',
    'Prepositions: in / on / at',
    'Use in for enclosed spaces and longer periods, on for surfaces and days/dates, at for exact points and clock times.',
    'in = içinde / ay-yıl · on = üzerinde / gün-tarih · at = noktada / saat',
    'She is at school. The book is on the table. We met in July.',
    1
  ),
  (
    'present-simple',
    'Present Simple',
    'Use Present Simple for habits, routines, and facts. Add -s/-es with he/she/it.',
    'Alışkanlık ve gerçekler: I work / she works.',
    'She goes to school every day.',
    1
  ),
  (
    'present-continuous',
    'Present Continuous',
    'Use am/is/are + verb-ing for actions happening now or around now.',
    'Şu an: am/is/are + V-ing',
    'They are playing football right now.',
    1
  ),
  (
    'past-simple',
    'Past Simple',
    'Use Past Simple for finished actions in the past. Regular verbs take -ed; many verbs are irregular.',
    'Bitmiş geçmiş: V2 (worked / went)',
    'I watched a movie last night.',
    2
  ),
  (
    'articles-a-an-the',
    'Articles: a / an / the',
    'a/an = one (not specific). Use an before vowel sounds. the = specific / known.',
    'a/an = belirsiz · the = belirli',
    'I bought an apple and the apple was sweet.',
    1
  ),
  (
    'present-perfect',
    'Present Perfect',
    'Use have/has + past participle for life experience and actions with a link to now (for/since).',
    'have/has + V3 · for / since',
    'She has lived in London since 2010.',
    3
  )
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Seed items (lookup topic_id by slug)
-- ---------------------------------------------------------------------------

-- in-on-at
insert into public.grammar_items (topic_id, question, correct_answer, explanation, example, difficulty, sort_order)
select t.id, q.question, q.correct_answer, q.explanation, q.example, q.difficulty, q.sort_order
from public.grammar_topics t
cross join (values
  ('She is ___ school right now.', 'at', 'Exact place/point → at school.', 'She is at school.', 1, 1),
  ('The keys are ___ the table.', 'on', 'Surface → on the table.', 'The keys are on the table.', 1, 2),
  ('We live ___ Ankara.', 'in', 'City/country → in.', 'We live in Ankara.', 1, 3),
  ('The meeting starts ___ 9 o''clock.', 'at', 'Clock time → at.', 'It starts at 9 o''clock.', 1, 4),
  ('I was born ___ 2005.', 'in', 'Year → in.', 'I was born in 2005.', 1, 5),
  ('See you ___ Monday.', 'on', 'Day of week → on.', 'See you on Monday.', 1, 6),
  ('There is a photo ___ the wall.', 'on', 'Surface (wall) → on.', 'A photo is on the wall.', 1, 7),
  ('He sat ___ the sofa.', 'on', 'Surface you sit on → on.', 'He sat on the sofa.', 1, 8),
  ('They arrived ___ the airport early.', 'at', 'Point/place → at the airport.', 'They arrived at the airport.', 1, 9),
  ('She works ___ a hospital.', 'in', 'Inside a building/institution → in.', 'She works in a hospital.', 1, 10),
  ('Let''s meet ___ the weekend.', 'at', 'at the weekend (BrE). on the weekend is also common (AmE).', 'Let''s meet at the weekend.', 2, 11),
  ('Put the milk ___ the fridge.', 'in', 'Inside → in.', 'Put the milk in the fridge.', 1, 12)
) as q(question, correct_answer, explanation, example, difficulty, sort_order)
where t.slug = 'in-on-at'
  and not exists (select 1 from public.grammar_items gi where gi.topic_id = t.id);

-- present-simple
insert into public.grammar_items (topic_id, question, correct_answer, explanation, example, difficulty, sort_order)
select t.id, q.question, q.correct_answer, q.explanation, q.example, q.difficulty, q.sort_order
from public.grammar_topics t
cross join (values
  ('She ___ (go) to school every day.', 'goes', 'he/she/it → verb + s/es.', 'She goes to school every day.', 1, 1),
  ('I ___ (like) coffee in the morning.', 'like', 'I/you/we/they → base verb.', 'I like coffee.', 1, 2),
  ('He ___ (watch) TV after dinner.', 'watches', 'watch → watches (ch + es).', 'He watches TV.', 1, 3),
  ('They ___ (not / live) near here.', 'do not live/don''t live', 'Negative: do/does not + base verb.', 'They don''t live near here.', 1, 4),
  ('___ she work on Sundays?', 'Does', 'Questions: Do/Does + subject + base verb.', 'Does she work on Sundays?', 1, 5),
  ('Water ___ (boil) at 100°C.', 'boils', 'Facts also use Present Simple.', 'Water boils at 100°C.', 1, 6),
  ('My brother ___ (study) English.', 'studies', 'study → studies (y → ies).', 'My brother studies English.', 1, 7),
  ('We ___ (have) lunch at noon.', 'have', 'Habit/routine.', 'We have lunch at noon.', 1, 8),
  ('The shop ___ (close) at 8 pm.', 'closes', 'he/she/it + s.', 'The shop closes at 8 pm.', 1, 9),
  ('___ you speak Turkish?', 'Do', 'Do + you + base verb.', 'Do you speak Turkish?', 1, 10)
) as q(question, correct_answer, explanation, example, difficulty, sort_order)
where t.slug = 'present-simple'
  and not exists (select 1 from public.grammar_items gi where gi.topic_id = t.id);

-- present-continuous
insert into public.grammar_items (topic_id, question, correct_answer, explanation, example, difficulty, sort_order)
select t.id, q.question, q.correct_answer, q.explanation, q.example, q.difficulty, q.sort_order
from public.grammar_topics t
cross join (values
  ('They ___ (play) football right now.', 'are playing', 'are + V-ing.', 'They are playing football.', 1, 1),
  ('I ___ (write) an email at the moment.', 'am writing', 'I + am + V-ing.', 'I am writing an email.', 1, 2),
  ('Look! It ___ (rain).', 'is raining', 'Happening now.', 'It is raining.', 1, 3),
  ('She ___ (not / sleep) now.', 'is not sleeping/isn''t sleeping', 'Negative: is/are not + V-ing.', 'She isn''t sleeping.', 1, 4),
  ('___ you listening to me?', 'Are', 'Are + subject + V-ing?', 'Are you listening?', 1, 5),
  ('We ___ (study) for the exam this week.', 'are studying', 'Around now / temporary.', 'We are studying this week.', 1, 6),
  ('He ___ (sit) next to the window.', 'is sitting', 'sit → sitting (double t).', 'He is sitting by the window.', 1, 7),
  ('The baby ___ (cry).', 'is crying', 'cry → crying.', 'The baby is crying.', 1, 8),
  ('Please be quiet. I ___ (try) to focus.', 'am trying', 'try → trying.', 'I am trying to focus.', 1, 9),
  ('They ___ (wait) for the bus.', 'are waiting', 'are + waiting.', 'They are waiting for the bus.', 1, 10)
) as q(question, correct_answer, explanation, example, difficulty, sort_order)
where t.slug = 'present-continuous'
  and not exists (select 1 from public.grammar_items gi where gi.topic_id = t.id);

-- past-simple
insert into public.grammar_items (topic_id, question, correct_answer, explanation, example, difficulty, sort_order)
select t.id, q.question, q.correct_answer, q.explanation, q.example, q.difficulty, q.sort_order
from public.grammar_topics t
cross join (values
  ('I ___ (watch) a movie last night.', 'watched', 'Regular verb + ed.', 'I watched a movie.', 1, 1),
  ('She ___ (go) to Izmir yesterday.', 'went', 'go → went (irregular).', 'She went to Izmir.', 1, 2),
  ('They ___ (not / come) to the party.', 'did not come/didn''t come', 'Negative: did not + base verb.', 'They didn''t come.', 1, 3),
  ('___ you see the match?', 'Did', 'Did + subject + base verb?', 'Did you see the match?', 1, 4),
  ('He ___ (buy) a new phone last week.', 'bought', 'buy → bought.', 'He bought a phone.', 2, 5),
  ('We ___ (study) hard for the test.', 'studied', 'study → studied.', 'We studied hard.', 1, 6),
  ('The train ___ (leave) at 6.', 'left', 'leave → left.', 'The train left at 6.', 2, 7),
  ('I ___ (be) tired after class.', 'was', 'I/he/she/it → was.', 'I was tired.', 1, 8),
  ('They ___ (be) at home on Sunday.', 'were', 'you/we/they → were.', 'They were at home.', 1, 9),
  ('She ___ (write) three emails.', 'wrote', 'write → wrote.', 'She wrote three emails.', 2, 10)
) as q(question, correct_answer, explanation, example, difficulty, sort_order)
where t.slug = 'past-simple'
  and not exists (select 1 from public.grammar_items gi where gi.topic_id = t.id);

-- articles
insert into public.grammar_items (topic_id, question, correct_answer, explanation, example, difficulty, sort_order)
select t.id, q.question, q.correct_answer, q.explanation, q.example, q.difficulty, q.sort_order
from public.grammar_topics t
cross join (values
  ('I bought ___ apple.', 'an', 'Vowel sound → an.', 'I bought an apple.', 1, 1),
  ('She is ___ teacher.', 'a', 'Job (singular) → a/an.', 'She is a teacher.', 1, 2),
  ('Please close ___ door.', 'the', 'Specific door → the.', 'Close the door.', 1, 3),
  ('He wants ___ orange juice.', 'an/some', 'an before vowel sound; some also OK for uncountable.', 'He wants an orange juice.', 2, 4),
  ('___ sun is hot today.', 'The', 'Unique things → the.', 'The sun is hot.', 1, 5),
  ('I need ___ umbrella.', 'an', 'umbrella starts with vowel sound.', 'I need an umbrella.', 1, 6),
  ('This is ___ best film of the year.', 'the', 'Superlative → the.', 'the best film', 2, 7),
  ('She has ___ honest friend.', 'an', 'honest → vowel sound /ɒ/.', 'an honest friend', 2, 8),
  ('We saw ___ cat in the garden. ___ cat was black.', 'a / the', 'First mention a; known next → the.', 'a cat … the cat', 2, 9),
  ('___ Mount Everest is very high.', '—/The', 'Often no article with Mount + name; The also appears in some styles. Prefer empty or The.', 'Mount Everest is high.', 3, 10)
) as q(question, correct_answer, explanation, example, difficulty, sort_order)
where t.slug = 'articles-a-an-the'
  and not exists (select 1 from public.grammar_items gi where gi.topic_id = t.id);

-- present-perfect
insert into public.grammar_items (topic_id, question, correct_answer, explanation, example, difficulty, sort_order)
select t.id, q.question, q.correct_answer, q.explanation, q.example, q.difficulty, q.sort_order
from public.grammar_topics t
cross join (values
  ('She ___ (live) in London since 2010.', 'has lived', 'has + V3 + since.', 'She has lived in London since 2010.', 2, 1),
  ('I ___ (never / see) that film.', 'have never seen', 'have + never + V3.', 'I have never seen that film.', 2, 2),
  ('___ you finished your homework?', 'Have', 'Have/Has + subject + V3?', 'Have you finished?', 2, 3),
  ('He ___ (be) ill for three days.', 'has been', 'for + period.', 'He has been ill for three days.', 2, 4),
  ('We ___ (just / arrive).', 'have just arrived', 'just + Present Perfect.', 'We have just arrived.', 2, 5),
  ('They ___ (not / visit) us yet.', 'have not visited/haven''t visited', 'yet often with negative/questions.', 'They haven''t visited yet.', 2, 6),
  ('She ___ (lose) her keys.', 'has lost', 'Result now → Present Perfect.', 'She has lost her keys.', 2, 7),
  ('I ___ (know) him for years.', 'have known', 'know → known.', 'I have known him for years.', 2, 8),
  ('___ she ever been abroad?', 'Has', 'Has + she + V3?', 'Has she ever been abroad?', 2, 9),
  ('The train ___ (already / leave).', 'has already left', 'already + Present Perfect.', 'The train has already left.', 2, 10)
) as q(question, correct_answer, explanation, example, difficulty, sort_order)
where t.slug = 'present-perfect'
  and not exists (select 1 from public.grammar_items gi where gi.topic_id = t.id);

-- MIMO DET (Duolingo English Test) — Read and Complete
-- Supabase SQL Editor'da çalıştır.

-- 1. Soru Tipleri (sabit liste)
CREATE TABLE IF NOT EXISTS public.det_question_types (
  id SERIAL PRIMARY KEY,
  type_name TEXT UNIQUE NOT NULL,
  description TEXT
);

-- 2. Read and Complete Soru Havuzu
CREATE TABLE IF NOT EXISTS public.det_exercises (
  id SERIAL PRIMARY KEY,
  question_type_id INTEGER REFERENCES public.det_question_types(id),
  question_text TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  difficulty INTEGER DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),
  topic TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Kullanıcının Cevapları
CREATE TABLE IF NOT EXISTS public.user_det_answers (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  exercise_id INTEGER REFERENCES public.det_exercises(id) ON DELETE CASCADE,
  user_answer TEXT,
  is_correct BOOLEAN DEFAULT FALSE,
  answered_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_det_answers_user_id_idx ON public.user_det_answers (user_id);
CREATE INDEX IF NOT EXISTS det_exercises_type_id_idx ON public.det_exercises (question_type_id);

-- Başlangıç: soru tipleri
INSERT INTO public.det_question_types (type_name, description) VALUES
  ('read_complete', 'Fill in the missing word/phrase in the sentence.'),
  ('read_select', 'Select the correct word from given options.'),
  ('listen_type', 'Listen and type what you hear.'),
  ('write_photo', 'Write about the photo.'),
  ('speak_photo', 'Speak about the photo.')
ON CONFLICT (type_name) DO NOTHING;

-- RLS
ALTER TABLE public.det_question_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.det_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_det_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "DET question types are publicly readable" ON public.det_question_types;
CREATE POLICY "DET question types are publicly readable"
  ON public.det_question_types FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "DET exercises are publicly readable" ON public.det_exercises;
CREATE POLICY "DET exercises are publicly readable"
  ON public.det_exercises FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can view own DET answers" ON public.user_det_answers;
CREATE POLICY "Users can view own DET answers"
  ON public.user_det_answers FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own DET answers" ON public.user_det_answers;
CREATE POLICY "Users can insert own DET answers"
  ON public.user_det_answers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Örnek Read and Complete soruları (type_name = read_complete)
INSERT INTO public.det_exercises (question_type_id, question_text, correct_answer, difficulty, topic)
SELECT t.id, q.question_text, q.correct_answer, q.difficulty, q.topic
FROM public.det_question_types t
CROSS JOIN (
  VALUES
    ('The ___ of the experiment was surprising.', 'outcome', 4, 'Science'),
    ('Researchers failed to ___ for confounding variables.', 'account', 5, 'Science'),
    ('The committee reached a ___ after lengthy deliberation.', 'consensus', 4, 'Politics'),
    ('Economic growth may ___ environmental degradation if unchecked.', 'exacerbate', 5, 'Environment'),
    ('Her argument lacks ___ evidence to support the claim.', 'empirical', 4, 'Education')
) AS q(question_text, correct_answer, difficulty, topic)
WHERE t.type_name = 'read_complete'
  AND NOT EXISTS (
    SELECT 1 FROM public.det_exercises e
    WHERE e.question_text = q.question_text
  );

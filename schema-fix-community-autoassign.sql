-- Fix: community uploads were auto-assigned onto every user's practice list
-- via assignNewWords(), so Account B saw Account A's words + uploader name.
--
-- Run once in Supabase SQL Editor.

-- 1) Drop other users' links to community-uploaded words (keep creator's own list).
delete from public.user_words uw
using public.words w
where uw.word_id = w.id
  and w.created_by is not null
  and w.created_by <> uw.user_id;

-- 2) Tighten word updates: only creator (or system seed rows) may edit.
drop policy if exists "Authenticated users can update words" on public.words;
create policy "Authenticated users can update words"
  on public.words for update
  to authenticated
  using (created_by is null or created_by = auth.uid())
  with check (created_by is null or created_by = auth.uid());

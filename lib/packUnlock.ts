import type { SupabaseClient } from "@supabase/supabase-js";
import type { Word } from "@/types";

export const PACK_QUIZ_MIN_QUESTIONS = 10;
/** Default pass score when author has not set a preference. */
export const PACK_QUIZ_PASS_SCORE = 80;
/** Authors cannot set a pass score below this floor. */
export const PACK_QUIZ_PASS_SCORE_FLOOR = 70;
export const PACK_QUIZ_PASS_SCORE_CEILING = 100;

export function clampPassScore(raw: number): number {
  if (!Number.isFinite(raw)) return PACK_QUIZ_PASS_SCORE;
  return Math.min(
    PACK_QUIZ_PASS_SCORE_CEILING,
    Math.max(PACK_QUIZ_PASS_SCORE_FLOOR, Math.round(raw))
  );
}

export async function getAuthorPassScore(
  supabase: SupabaseClient,
  authorId: string
): Promise<number> {
  const { data, error } = await supabase
    .from("author_pack_prefs")
    .select("quiz_pass_score")
    .eq("author_id", authorId)
    .maybeSingle();

  if (error) {
    if (/author_pack_prefs|schema cache|does not exist/i.test(error.message || "")) {
      return PACK_QUIZ_PASS_SCORE;
    }
    throw error;
  }
  if (!data) return PACK_QUIZ_PASS_SCORE;
  return clampPassScore(Number(data.quiz_pass_score));
}

export async function setAuthorPassScore(
  supabase: SupabaseClient,
  authorId: string,
  score: number
): Promise<number> {
  const quiz_pass_score = clampPassScore(score);
  const { data, error } = await supabase
    .from("author_pack_prefs")
    .upsert(
      {
        author_id: authorId,
        quiz_pass_score,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "author_id" }
    )
    .select("quiz_pass_score")
    .single();

  if (error) throw error;
  return clampPassScore(Number(data.quiz_pass_score));
}

export type AuthorPackUnlock = {
  user_id: string;
  author_id: string;
  unlocked_at: string;
  best_score: number;
  attempt_count: number;
};

export type PackAuthorInfo = {
  id: string;
  username: string;
  wordCount: number;
};

export function threadKeyFor(a: string, b: string): string {
  return [a, b].sort().join(":");
}

export async function getAuthorGlobalWords(
  supabase: SupabaseClient,
  authorId: string,
  limit = 80
): Promise<Word[]> {
  const { data, error } = await supabase
    .from("words")
    .select(
      "id, english, turkish, example_sentence, difficulty, phonetic, audio_url, is_global, created_by, uploader_username, uploader_avatar_url"
    )
    .eq("created_by", authorId)
    .eq("is_global", true)
    .order("id", { ascending: true })
    .limit(limit);

  if (error) {
    if (/is_global|created_by/i.test(error.message || "")) return [];
    throw error;
  }
  return (data ?? []) as Word[];
}

export async function getPackAuthorInfo(
  supabase: SupabaseClient,
  authorId: string
): Promise<PackAuthorInfo | null> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, username")
    .eq("id", authorId)
    .maybeSingle();

  if (error) throw error;
  if (!profile) return null;

  const words = await getAuthorGlobalWords(supabase, authorId, 500);
  return {
    id: profile.id as string,
    username: (profile.username as string) || "öğrenci",
    wordCount: words.length,
  };
}

export async function getUnlock(
  supabase: SupabaseClient,
  userId: string,
  authorId: string
): Promise<AuthorPackUnlock | null> {
  const { data, error } = await supabase
    .from("author_pack_unlocks")
    .select("user_id, author_id, unlocked_at, best_score, attempt_count")
    .eq("user_id", userId)
    .eq("author_id", authorId)
    .maybeSingle();

  if (error) {
    if (/author_pack_unlocks|schema cache|does not exist/i.test(error.message || "")) {
      return null;
    }
    throw error;
  }
  if (!data) return null;
  return {
    user_id: data.user_id,
    author_id: data.author_id,
    unlocked_at: data.unlocked_at,
    best_score: Number(data.best_score),
    attempt_count: data.attempt_count,
  };
}

export async function listMyUnlocks(
  supabase: SupabaseClient,
  userId: string
): Promise<AuthorPackUnlock[]> {
  const { data, error } = await supabase
    .from("author_pack_unlocks")
    .select("user_id, author_id, unlocked_at, best_score, attempt_count")
    .eq("user_id", userId)
    .order("unlocked_at", { ascending: false });

  if (error) {
    if (/author_pack_unlocks|schema cache|does not exist/i.test(error.message || "")) {
      return [];
    }
    throw error;
  }
  return (data ?? []).map((row) => ({
    user_id: row.user_id,
    author_id: row.author_id,
    unlocked_at: row.unlocked_at,
    best_score: Number(row.best_score),
    attempt_count: row.attempt_count,
  }));
}

/** True if either side unlocked the other for messaging. */
export async function canMessagePair(
  supabase: SupabaseClient,
  userA: string,
  userB: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("author_pack_unlocks")
    .select("id, user_id, author_id")
    .or(`user_id.eq.${userA},user_id.eq.${userB}`)
    .limit(20);

  if (error) {
    if (/author_pack_unlocks|schema cache|does not exist/i.test(error.message || "")) {
      return false;
    }
    throw error;
  }
  return (data ?? []).some(
    (row) =>
      (row.user_id === userA && row.author_id === userB) ||
      (row.user_id === userB && row.author_id === userA)
  );
}

export type QuizSubmitResult = {
  score: number;
  passed: boolean;
  unlocked: boolean;
  bestScore: number;
  attemptCount: number;
  correctCount: number;
  total: number;
};

/**
 * Server-side scoring: client sends answered word ids + choices; we re-check against DB.
 */
export async function submitPackQuiz(
  supabase: SupabaseClient,
  userId: string,
  authorId: string,
  answers: Array<{ wordId: number; selectedTurkish: string }>
): Promise<QuizSubmitResult> {
  if (userId === authorId) {
    throw new Error("Kendi paketinden kilit açılmaz.");
  }

  const packWords = await getAuthorGlobalWords(supabase, authorId, 200);
  if (packWords.length < PACK_QUIZ_MIN_QUESTIONS) {
    throw new Error(
      `Bu pakette en az ${PACK_QUIZ_MIN_QUESTIONS} kelime olmalı (şu an ${packWords.length}).`
    );
  }

  if (!Array.isArray(answers) || answers.length < PACK_QUIZ_MIN_QUESTIONS) {
    throw new Error(`En az ${PACK_QUIZ_MIN_QUESTIONS} soru yanıtlanmalı.`);
  }

  const byId = new Map(packWords.map((w) => [w.id, w]));
  let correctCount = 0;
  const seen = new Set<number>();

  for (const ans of answers) {
    const word = byId.get(ans.wordId);
    if (!word || seen.has(ans.wordId)) continue;
    seen.add(ans.wordId);
    const correct = word.turkish.split(/[/|,;]/)[0]?.trim() || word.turkish.trim();
    const selected = (ans.selectedTurkish || "").trim();
    if (selected.toLowerCase() === correct.toLowerCase()) {
      correctCount += 1;
    }
  }

  const total = Math.max(answers.length, PACK_QUIZ_MIN_QUESTIONS);
  const scoredTotal = Math.min(Math.max(seen.size, PACK_QUIZ_MIN_QUESTIONS), answers.length);
  const denom = scoredTotal > 0 ? scoredTotal : total;
  const score = Math.round((correctCount / denom) * 1000) / 10;
  const passScore = await getAuthorPassScore(supabase, authorId);
  const passed = score >= passScore && seen.size >= PACK_QUIZ_MIN_QUESTIONS;

  const existing = await getUnlock(supabase, userId, authorId);

  if (!passed) {
    return {
      score,
      passed: false,
      unlocked: Boolean(existing),
      bestScore: existing?.best_score ?? score,
      attemptCount: existing?.attempt_count ?? 0,
      correctCount,
      total: denom,
    };
  }

  if (existing) {
    const best = Math.max(existing.best_score, score);
    const { data, error } = await supabase
      .from("author_pack_unlocks")
      .update({
        best_score: best,
        attempt_count: existing.attempt_count + 1,
      })
      .eq("user_id", userId)
      .eq("author_id", authorId)
      .select("best_score, attempt_count")
      .single();
    if (error) throw error;
    return {
      score,
      passed: true,
      unlocked: true,
      bestScore: Number(data.best_score),
      attemptCount: data.attempt_count,
      correctCount,
      total: denom,
    };
  }

  const { data, error } = await supabase
    .from("author_pack_unlocks")
    .insert({
      user_id: userId,
      author_id: authorId,
      best_score: score,
      attempt_count: 1,
    })
    .select("best_score, attempt_count")
    .single();

  if (error) throw error;

  return {
    score,
    passed: true,
    unlocked: true,
    bestScore: Number(data.best_score),
    attemptCount: data.attempt_count,
    correctCount,
    total: denom,
  };
}

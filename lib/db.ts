import { format, subDays } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  DailyQuests,
  DueGrammarItem,
  DueWordItem,
  Profile,
  Quality,
  Story,
} from "@/types";
import { calculateSM2, calculateXP, checkLevelUp } from "@/lib/srs";

export function todayISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export async function getProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data as Profile | null;
}

export function nextStreak(lastActive: string, currentStreak: number) {
  const today = todayISO();
  const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
  if (lastActive === today) {
    return { daily_streak: currentStreak, last_active: today };
  }
  if (lastActive === yesterday) {
    return { daily_streak: currentStreak + 1, last_active: today };
  }
  return { daily_streak: 1, last_active: today };
}

export async function syncDailyStreak(
  supabase: SupabaseClient,
  profile: Profile
): Promise<Profile> {
  const updates = nextStreak(profile.last_active, profile.daily_streak);
  if (
    updates.daily_streak === profile.daily_streak &&
    updates.last_active === profile.last_active
  ) {
    return profile;
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", profile.id)
    .select("*")
    .single();

  if (error) throw error;
  return data as Profile;
}

export async function updateProfileXP(
  supabase: SupabaseClient,
  profile: Profile,
  gainedXP: number
): Promise<{ profile: Profile; leveledUp: boolean; previousLevel: number }> {
  const previousLevel = profile.level;
  const newXP = profile.xp + gainedXP;
  const newLevel = checkLevelUp(newXP);

  const { data, error } = await supabase
    .from("profiles")
    .update({
      xp: newXP,
      level: newLevel,
      total_lessons: profile.total_lessons + 1,
    })
    .eq("id", profile.id)
    .select("*")
    .single();

  if (error) throw error;
  return {
    profile: data as Profile,
    leveledUp: newLevel > previousLevel,
    previousLevel,
  };
}

export async function getDueWords(
  supabase: SupabaseClient,
  userId: string
): Promise<DueWordItem[]> {
  const { data, error } = await supabase
    .from("user_words")
    .select("*, words(*)")
    .eq("user_id", userId)
    .lte("next_review", todayISO())
    .order("next_review", { ascending: true });

  if (error) throw error;
  return (data ?? []) as DueWordItem[];
}

export async function getDueGrammar(
  supabase: SupabaseClient,
  userId: string
): Promise<DueGrammarItem[]> {
  const { data, error } = await supabase
    .from("user_grammar")
    .select("*, grammar_rules(*)")
    .eq("user_id", userId)
    .lte("next_review", todayISO())
    .order("next_review", { ascending: true });

  if (error) throw error;
  return (data ?? []) as DueGrammarItem[];
}

export async function assignNewWords(
  supabase: SupabaseClient,
  userId: string,
  count = 5
): Promise<void> {
  const { data: existing, error: existingError } = await supabase
    .from("user_words")
    .select("word_id")
    .eq("user_id", userId);

  if (existingError) throw existingError;
  const usedIds = new Set((existing ?? []).map((row) => row.word_id));

  const { data: pool, error: poolError } = await supabase
    .from("words")
    .select("id")
    .order("id", { ascending: true });

  if (poolError) throw poolError;

  const available = (pool ?? []).filter((word) => !usedIds.has(word.id));
  const shuffled = [...available].sort(() => Math.random() - 0.5).slice(0, count);

  if (shuffled.length === 0) return;

  const { error: insertError } = await supabase.from("user_words").insert(
    shuffled.map((word) => ({
      user_id: userId,
      word_id: word.id,
      next_review: todayISO(),
      last_answered: todayISO(),
    }))
  );

  if (insertError) throw insertError;
}

export async function assignNewGrammar(
  supabase: SupabaseClient,
  userId: string,
  count = 3
): Promise<void> {
  const { data: existing, error: existingError } = await supabase
    .from("user_grammar")
    .select("grammar_id")
    .eq("user_id", userId);

  if (existingError) throw existingError;
  const usedIds = new Set((existing ?? []).map((row) => row.grammar_id));

  const { data: pool, error: poolError } = await supabase
    .from("grammar_rules")
    .select("id")
    .order("id", { ascending: true });

  if (poolError) throw poolError;

  const available = (pool ?? []).filter((rule) => !usedIds.has(rule.id));
  const shuffled = [...available].sort(() => Math.random() - 0.5).slice(0, count);

  if (shuffled.length === 0) return;

  const { error: insertError } = await supabase.from("user_grammar").insert(
    shuffled.map((rule) => ({
      user_id: userId,
      grammar_id: rule.id,
      next_review: todayISO(),
      last_answered: todayISO(),
    }))
  );

  if (insertError) throw insertError;
}

export async function updateWordProgress(
  supabase: SupabaseClient,
  item: DueWordItem,
  quality: Quality,
  wasCorrect: boolean
) {
  const sm2 = calculateSM2(item.ease_factor, item.repetition, item.interval, quality);
  const { error } = await supabase
    .from("user_words")
    .update({
      ease_factor: sm2.easeFactor,
      repetition: sm2.repetition,
      interval: sm2.interval,
      next_review: sm2.nextReviewDate,
      correct_count: item.correct_count + (wasCorrect ? 1 : 0),
      wrong_count: item.wrong_count + (wasCorrect ? 0 : 1),
      last_answered: todayISO(),
    })
    .eq("id", item.id);

  if (error) throw error;
  return sm2;
}

export async function updateGrammarProgress(
  supabase: SupabaseClient,
  item: DueGrammarItem,
  quality: Quality,
  wasCorrect: boolean
) {
  const sm2 = calculateSM2(item.ease_factor, item.repetition, item.interval, quality);
  const { error } = await supabase
    .from("user_grammar")
    .update({
      ease_factor: sm2.easeFactor,
      repetition: sm2.repetition,
      interval: sm2.interval,
      next_review: sm2.nextReviewDate,
      correct_count: item.correct_count + (wasCorrect ? 1 : 0),
      wrong_count: item.wrong_count + (wasCorrect ? 0 : 1),
      last_answered: todayISO(),
    })
    .eq("id", item.id);

  if (error) throw error;
  return sm2;
}

export async function getDailyQuests(
  supabase: SupabaseClient,
  profile: Profile
): Promise<DailyQuests> {
  const today = todayISO();

  const { data: words, error: wordsError } = await supabase
    .from("user_words")
    .select("id, correct_count, wrong_count, last_answered")
    .eq("user_id", profile.id)
    .eq("last_answered", today);

  if (wordsError) throw wordsError;

  const { data: grammar, error: grammarError } = await supabase
    .from("user_grammar")
    .select("id, correct_count, wrong_count, last_answered")
    .eq("user_id", profile.id)
    .eq("last_answered", today);

  if (grammarError) throw grammarError;

  const { data: stories, error: storiesError } = await supabase
    .from("user_stories")
    .select("id")
    .eq("user_id", profile.id)
    .eq("completed_at", today);

  if (storiesError) throw storiesError;

  const wordsDone = (words ?? []).filter(
    (row) => row.correct_count + row.wrong_count > 0
  ).length;
  const grammarDone = (grammar ?? []).filter(
    (row) => row.correct_count + row.wrong_count > 0
  ).length;
  const storiesDone = (stories ?? []).length;

  const wordsTarget = 5;
  const grammarTarget = 3;
  const storiesTarget = 1;

  return {
    wordsDone: Math.min(wordsDone, wordsTarget),
    wordsTarget,
    grammarDone: Math.min(grammarDone, grammarTarget),
    grammarTarget,
    storiesDone: Math.min(storiesDone, storiesTarget),
    storiesTarget,
    allComplete:
      wordsDone >= wordsTarget &&
      grammarDone >= grammarTarget &&
      storiesDone >= storiesTarget,
    bonusClaimed: profile.daily_quest_bonus_date === today,
  };
}

export async function claimDailyQuestBonus(
  supabase: SupabaseClient,
  profile: Profile,
  quests: DailyQuests
): Promise<{ profile: Profile; claimed: boolean; leveledUp: boolean } | null> {
  if (!quests.allComplete || quests.bonusClaimed) return null;

  const previousLevel = profile.level;
  const newXP = profile.xp + 50;
  const newLevel = checkLevelUp(newXP);

  const { data, error } = await supabase
    .from("profiles")
    .update({
      xp: newXP,
      level: newLevel,
      daily_quest_bonus_date: todayISO(),
    })
    .eq("id", profile.id)
    .select("*")
    .single();

  if (error) throw error;
  return {
    profile: data as Profile,
    claimed: true,
    leveledUp: newLevel > previousLevel,
  };
}

export async function getStoriesForLevel(
  supabase: SupabaseClient,
  level: number
): Promise<Story[]> {
  const { data, error } = await supabase
    .from("stories")
    .select("*")
    .lte("level", Math.max(1, Math.min(level, 10)))
    .order("level", { ascending: true })
    .order("id", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Story[];
}

export async function saveStoryResult(
  supabase: SupabaseClient,
  userId: string,
  storyId: number,
  score: number
) {
  const { error } = await supabase.from("user_stories").insert({
    user_id: userId,
    story_id: storyId,
    score,
    completed_at: todayISO(),
  });

  if (error) throw error;
}

export { calculateXP };

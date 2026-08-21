import { format, subDays } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  DailyQuests,
  DueGrammarItem,
  DueWordItem,
  Profile,
  Quality,
  Sound,
  SoundSessionQuestion,
  SoundWithProgress,
  Story,
  Word,
} from "@/types";
import { calculateSM2 } from "@/lib/srs";
import {
  englishKeysMatch,
  englishLookupVariants,
  normalizeEnglishKey,
} from "@/lib/wordNormalize";

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

/** Words the user has already practiced — for speed match drills. */
export async function getLearnedWords(
  supabase: SupabaseClient,
  userId: string,
  minCount = 5
): Promise<DueWordItem[]> {
  const { data, error } = await supabase
    .from("user_words")
    .select("*, words(*)")
    .eq("user_id", userId)
    .or("correct_count.gt.0,repetition.gt.0")
    .order("correct_count", { ascending: false })
    .limit(80);

  if (error) throw error;

  let list = ((data ?? []) as DueWordItem[]).filter((row) => row.words?.english && row.words?.turkish);

  if (list.length < minCount) {
    const all = await getUserWords(supabase, userId);
    list = all.filter((row) => row.words?.english && row.words?.turkish);
  }

  return list;
}

/** All words on the user's list, newest activity first. */
export async function getUserWords(
  supabase: SupabaseClient,
  userId: string
): Promise<DueWordItem[]> {
  const { data, error } = await supabase
    .from("user_words")
    .select("*, words(*)")
    .eq("user_id", userId)
    .order("last_answered", { ascending: false });

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

/** Thorough scan: user's list + global words table (normalized / variants). */
export async function findExistingUserWord(
  supabase: SupabaseClient,
  userId: string,
  englishRaw: string
): Promise<{ word: Word; alreadyOwned: boolean } | null> {
  const key = normalizeEnglishKey(englishRaw);
  if (!key) return null;

  const variants = englishLookupVariants(englishRaw);

  const { data: ownedRows, error: ownedError } = await supabase
    .from("user_words")
    .select("id, words(*)")
    .eq("user_id", userId);

  if (ownedError) throw ownedError;

  for (const row of ownedRows ?? []) {
    const word = row.words as Word | Word[] | null | undefined;
    const w = Array.isArray(word) ? word[0] : word;
    if (!w?.english) continue;
    if (englishKeysMatch(w.english, englishRaw)) {
      return { word: w, alreadyOwned: true };
    }
  }

  // Exact / variant hit in global pool (not yet on user's list).
  const { data: poolHits, error: poolError } = await supabase
    .from("words")
    .select("*")
    .in("english", variants);

  if (poolError) throw poolError;

  if (poolHits && poolHits.length > 0) {
    const best =
      poolHits.find((w) => normalizeEnglishKey(w.english) === key) ?? poolHits[0];
    return { word: best as Word, alreadyOwned: false };
  }

  // Broader scan for spaced / punctuated mismatches not covered by variants.
  const { data: looseHits, error: looseError } = await supabase
    .from("words")
    .select("*")
    .ilike("english", `%${key.replace(/\s+/g, "%")}%`)
    .limit(40);

  if (looseError) throw looseError;

  for (const hit of looseHits ?? []) {
    if (englishKeysMatch(hit.english, englishRaw)) {
      return { word: hit as Word, alreadyOwned: false };
    }
  }

  return null;
}

export async function addWordToUserList(
  supabase: SupabaseClient,
  userId: string,
  input: {
    english: string;
    turkish: string;
    example_sentence?: string | null;
    phonetic?: string | null;
    audio_url?: string | null;
    difficulty?: number;
  }
): Promise<{ word: Word; alreadyHad: boolean }> {
  const english = normalizeEnglishKey(input.english);
  if (!english) {
    throw new Error("Geçerli bir İngilizce kelime gir.");
  }

  const existing = await findExistingUserWord(supabase, userId, english);
  if (existing?.alreadyOwned) {
    return { word: existing.word, alreadyHad: true };
  }

  let word = existing?.word ?? null;

  if (!word) {
    const { data: created, error: createError } = await supabase
      .from("words")
      .insert({
        english,
        turkish: input.turkish.trim(),
        example_sentence: input.example_sentence ?? null,
        phonetic: input.phonetic ?? null,
        audio_url: input.audio_url ?? null,
        difficulty: input.difficulty ?? 1,
      })
      .select("*")
      .single();

    if (createError) {
      // Unique race: another insert won — reuse that row.
      if (createError.code === "23505") {
        const again = await findExistingUserWord(supabase, userId, english);
        if (again?.alreadyOwned) return { word: again.word, alreadyHad: true };
        if (again?.word) word = again.word;
        else throw createError;
      } else {
        throw createError;
      }
    } else {
      word = created as Word;
    }
  } else {
    const patch: Record<string, string | null> = {};
    if (!word.turkish && input.turkish) patch.turkish = input.turkish.trim();
    if (!word.example_sentence && input.example_sentence) {
      patch.example_sentence = input.example_sentence;
    }
    if (!word.phonetic && input.phonetic) patch.phonetic = input.phonetic;
    if (!word.audio_url && input.audio_url) patch.audio_url = input.audio_url;
    if (Object.keys(patch).length > 0) {
      const { data: updated, error: updateError } = await supabase
        .from("words")
        .update(patch)
        .eq("id", word.id)
        .select("*")
        .single();
      if (updateError) throw updateError;
      word = updated as Word;
    }
  }

  const { data: link, error: linkError } = await supabase
    .from("user_words")
    .select("id")
    .eq("user_id", userId)
    .eq("word_id", word.id)
    .maybeSingle();

  if (linkError) throw linkError;

  if (link) {
    return { word, alreadyHad: true };
  }

  const { error: insertError } = await supabase.from("user_words").insert({
    user_id: userId,
    word_id: word.id,
    next_review: todayISO(),
    last_answered: todayISO(),
  });

  if (insertError) {
    if (insertError.code === "23505") {
      return { word, alreadyHad: true };
    }
    throw insertError;
  }
  return { word, alreadyHad: false };
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

  const { data: sounds, error: soundsError } = await supabase
    .from("user_sounds")
    .select("id")
    .eq("user_id", profile.id)
    .eq("last_answered", today);

  if (soundsError) throw soundsError;

  const wordsDone = (words ?? []).filter(
    (row) => row.correct_count + row.wrong_count > 0
  ).length;
  const grammarDone = (grammar ?? []).filter(
    (row) => row.correct_count + row.wrong_count > 0
  ).length;
  const storiesDone = (stories ?? []).length;
  const soundsDone = (sounds ?? []).length > 0 ? 1 : 0;

  const wordsTarget = 5;
  const grammarTarget = 3;
  const storiesTarget = 1;
  const soundsTarget = 1;

  return {
    wordsDone: Math.min(wordsDone, wordsTarget),
    wordsTarget,
    grammarDone: Math.min(grammarDone, grammarTarget),
    grammarTarget,
    storiesDone: Math.min(storiesDone, storiesTarget),
    storiesTarget,
    soundsDone,
    soundsTarget,
    allComplete:
      wordsDone >= wordsTarget &&
      grammarDone >= grammarTarget &&
      storiesDone >= storiesTarget &&
      soundsDone >= soundsTarget,
    bonusClaimed: profile.daily_quest_bonus_date === today,
  };
}

export async function claimDailyQuestBonus(
  supabase: SupabaseClient,
  profile: Profile,
  quests: DailyQuests
): Promise<{ profile: Profile; claimed: boolean } | null> {
  if (!quests.allComplete || quests.bonusClaimed) return null;

  const { data, error } = await supabase
    .from("profiles")
    .update({
      daily_quest_bonus_date: todayISO(),
    })
    .eq("id", profile.id)
    .select("*")
    .single();

  if (error) throw error;
  return {
    profile: data as Profile,
    claimed: true,
  };
}

export async function getStories(supabase: SupabaseClient): Promise<Story[]> {
  const { data, error } = await supabase
    .from("stories")
    .select("*")
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

export async function getSoundsWithProgress(
  supabase: SupabaseClient,
  userId: string
): Promise<SoundWithProgress[]> {
  const { data: sounds, error } = await supabase
    .from("sounds")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) throw error;

  const { data: progress, error: progressError } = await supabase
    .from("user_sounds")
    .select("sound_id, mastery")
    .eq("user_id", userId);

  if (progressError) throw progressError;

  const masteryById = new Map(
    (progress ?? []).map((row) => [row.sound_id as number, row.mastery as number])
  );

  return ((sounds ?? []) as Sound[]).map((sound) => ({
    ...sound,
    mastery: masteryById.get(sound.id) ?? 0,
  }));
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export async function getSoundSession(
  supabase: SupabaseClient,
  count = 8
): Promise<SoundSessionQuestion[]> {
  const { data, error } = await supabase
    .from("sound_pairs")
    .select("id, sound_id, word_a, word_b, correct, sounds(ipa)");

  if (error) throw error;

  const rows = (data ?? []) as Array<{
    id: number;
    sound_id: number;
    word_a: string;
    word_b: string;
    correct: "a" | "b";
    sounds: { ipa: string } | { ipa: string }[] | null;
  }>;

  const questions: SoundSessionQuestion[] = rows.map((row) => {
    const sound = Array.isArray(row.sounds) ? row.sounds[0] : row.sounds;
    const playWord = row.correct === "a" ? row.word_a : row.word_b;
    const options = shuffle([row.word_a, row.word_b]) as [string, string];
    return {
      id: row.id,
      soundId: row.sound_id,
      ipa: sound?.ipa ?? "",
      playWord,
      options,
      correct: playWord,
    };
  });

  return shuffle(questions).slice(0, Math.max(1, Math.min(count, questions.length)));
}

export async function recordSoundAnswer(
  supabase: SupabaseClient,
  userId: string,
  soundId: number,
  isCorrect: boolean
): Promise<{ mastery: number }> {
  const today = todayISO();
  const { data: existing, error: existingError } = await supabase
    .from("user_sounds")
    .select("*")
    .eq("user_id", userId)
    .eq("sound_id", soundId)
    .maybeSingle();

  if (existingError) throw existingError;

  if (!existing) {
    const mastery = isCorrect ? 20 : 5;
    const { data, error } = await supabase
      .from("user_sounds")
      .insert({
        user_id: userId,
        sound_id: soundId,
        mastery,
        correct_count: isCorrect ? 1 : 0,
        seen_count: 1,
        last_answered: today,
      })
      .select("mastery")
      .single();
    if (error) throw error;
    return { mastery: data.mastery as number };
  }

  const delta = isCorrect ? 12 : -6;
  const mastery = Math.max(0, Math.min(100, (existing.mastery as number) + delta));
  const { data, error } = await supabase
    .from("user_sounds")
    .update({
      mastery,
      correct_count: (existing.correct_count as number) + (isCorrect ? 1 : 0),
      seen_count: (existing.seen_count as number) + 1,
      last_answered: today,
    })
    .eq("id", existing.id)
    .select("mastery")
    .single();

  if (error) throw error;
  return { mastery: data.mastery as number };
}
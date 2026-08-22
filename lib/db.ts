import { format, subDays } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  DailyQuests,
  DueGrammarItem,
  DueWordItem,
  Profile,
  Quality,
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

  // Only system/seed words (no created_by). Never auto-assign community uploads —
  // those still carry another user's name and look like "wrong account" data.
  let pool: { id: number }[] | null = null;
  {
    const seeded = await supabase
      .from("words")
      .select("id")
      .is("created_by", null)
      .order("id", { ascending: true });

    if (seeded.error) {
      const msg = seeded.error.message || "";
      if (/created_by/i.test(msg) || seeded.error.code === "PGRST204") {
        const fallback = await supabase
          .from("words")
          .select("id")
          .order("id", { ascending: true });
        if (fallback.error) throw fallback.error;
        pool = fallback.data;
      } else {
        throw seeded.error;
      }
    } else {
      pool = seeded.data;
    }
  }

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

  async function resolveFromWords(words: Word[]): Promise<{ word: Word; alreadyOwned: boolean } | null> {
    const visible = words.filter(
      (w) => w.is_global !== false || !w.created_by || w.created_by === userId
    );
    const matched = visible.filter((w) => englishKeysMatch(w.english, englishRaw));
    if (matched.length === 0) return null;

    const best =
      matched.find((w) => normalizeEnglishKey(w.english) === key) ?? matched[0]!;
    const ids = matched.map((w) => w.id);

    const { data: links, error: linkError } = await supabase
      .from("user_words")
      .select("word_id")
      .eq("user_id", userId)
      .in("word_id", ids);

    if (linkError) throw linkError;

    const ownedIds = new Set((links ?? []).map((row) => row.word_id));
    return { word: best, alreadyOwned: ownedIds.has(best.id) };
  }

  const { data: poolHits, error: poolError } = await supabase
    .from("words")
    .select("*")
    .in("english", variants);

  if (poolError) throw poolError;

  const fromVariants = await resolveFromWords((poolHits ?? []) as Word[]);
  if (fromVariants) return fromVariants;

  const { data: looseHits, error: looseError } = await supabase
    .from("words")
    .select("*")
    .ilike("english", `%${key.replace(/\s+/g, "%")}%`)
    .limit(24);

  if (looseError) throw looseError;

  const fromLoose = await resolveFromWords((looseHits ?? []) as Word[]);
  if (fromLoose) return fromLoose;

  // Last resort: only fetch this user's words that loosely match (not the full list).
  const { data: ownedRows, error: ownedError } = await supabase
    .from("user_words")
    .select("id, words(*)")
    .eq("user_id", userId)
    .filter("words.english", "ilike", `%${key.replace(/\s+/g, "%")}%`)
    .limit(24);

  if (ownedError) throw ownedError;

  for (const row of ownedRows ?? []) {
    const word = row.words as Word | Word[] | null | undefined;
    const w = Array.isArray(word) ? word[0] : word;
    if (!w?.english) continue;
    if (englishKeysMatch(w.english, englishRaw)) {
      return { word: w, alreadyOwned: true };
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
    /** true = community pool; false = only this user. Default true for back-compat. */
    is_global?: boolean;
    uploader_username?: string | null;
    uploader_avatar_url?: string | null;
  }
): Promise<{ word: Word; alreadyHad: boolean }> {
  const english = normalizeEnglishKey(input.english);
  if (!english) {
    throw new Error("Geçerli bir İngilizce kelime gir.");
  }

  const isGlobal = input.is_global !== false;

  const existing = await findExistingUserWord(supabase, userId, english);
  if (existing?.alreadyOwned) {
    return { word: existing.word, alreadyHad: true };
  }

  let word = existing?.word ?? null;

  // Don't attach someone else's private word to this user via pool match.
  if (word && word.is_global === false && word.created_by && word.created_by !== userId) {
    word = null;
  }

  if (!word) {
    const baseRow = {
      english,
      turkish: input.turkish.trim(),
      example_sentence: input.example_sentence ?? null,
      phonetic: input.phonetic ?? null,
      audio_url: input.audio_url ?? null,
      difficulty: input.difficulty ?? 1,
    };
    const withVisibility = {
      ...baseRow,
      is_global: isGlobal,
      created_by: userId,
      uploader_username: isGlobal ? input.uploader_username ?? null : null,
      uploader_avatar_url: isGlobal ? input.uploader_avatar_url ?? null : null,
    };

    let created: Word | null = null;
    let createError: { code?: string; message?: string } | null = null;

    {
      const res = await supabase.from("words").insert(withVisibility).select("*").single();
      if (res.error) {
        // Columns may be missing before schema-words-visibility.sql is applied.
        const msg = res.error.message || "";
        if (/is_global|created_by|uploader_/i.test(msg) || res.error.code === "PGRST204") {
          const fallback = await supabase.from("words").insert(baseRow).select("*").single();
          if (fallback.error) createError = fallback.error;
          else created = fallback.data as Word;
        } else {
          createError = res.error;
        }
      } else {
        created = res.data as Word;
      }
    }

    if (createError) {
      if (createError.code === "23505") {
        const again = await findExistingUserWord(supabase, userId, english);
        if (again?.alreadyOwned) return { word: again.word, alreadyHad: true };
        if (again?.word) word = again.word;
        else throw createError;
      } else {
        throw createError;
      }
    } else if (created) {
      word = created;
    }
  } else {
    const patch: Record<string, string | null | boolean> = {};
    if (!word.turkish && input.turkish) patch.turkish = input.turkish.trim();
    if (!word.example_sentence && input.example_sentence) {
      patch.example_sentence = input.example_sentence;
    }
    if (!word.phonetic && input.phonetic) patch.phonetic = input.phonetic;
    if (!word.audio_url && input.audio_url) patch.audio_url = input.audio_url;
    // Promote to global if owner re-shares and columns exist.
    if (isGlobal && word.created_by === userId && word.is_global === false) {
      patch.is_global = true;
      if (input.uploader_username) patch.uploader_username = input.uploader_username;
      if (input.uploader_avatar_url) patch.uploader_avatar_url = input.uploader_avatar_url;
    }
    if (Object.keys(patch).length > 0) {
      const { data: updated, error: updateError } = await supabase
        .from("words")
        .update(patch)
        .eq("id", word.id)
        .select("*")
        .single();
      if (updateError) {
        const msg = updateError.message || "";
        if (!/is_global|uploader_/i.test(msg)) throw updateError;
      } else {
        word = updated as Word;
      }
    }
  }

  if (!word) throw new Error("Kelime kaydedilemedi.");

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

/** Community words not yet on the user's list (requires is_global column). */
export async function getCommunityGlobalWords(
  supabase: SupabaseClient,
  userId: string,
  limit = 40
): Promise<Word[]> {
  const { data: owned, error: ownedError } = await supabase
    .from("user_words")
    .select("word_id")
    .eq("user_id", userId);

  if (ownedError) throw ownedError;
  const ownedIds = new Set((owned ?? []).map((r) => r.word_id));

  const { data, error } = await supabase
    .from("words")
    .select("*")
    .eq("is_global", true)
    .not("created_by", "is", null)
    .order("id", { ascending: false })
    .limit(Math.max(limit * 2, 80));

  if (error) {
    // Schema not migrated yet — no community feed.
    if (/is_global|created_by/i.test(error.message || "")) return [];
    throw error;
  }

  return ((data ?? []) as Word[])
    .filter((w) => !ownedIds.has(w.id) && w.created_by && w.created_by !== userId)
    .slice(0, limit);
}

/** Remove a word from the user's practice list (does not delete the global pool row). */
export async function removeWordFromUserList(
  supabase: SupabaseClient,
  userId: string,
  userWordId: number
): Promise<void> {
  const { error } = await supabase
    .from("user_words")
    .delete()
    .eq("id", userWordId)
    .eq("user_id", userId);

  if (error) throw error;
}

/** Update word text fields for a word on the user's list. */
export async function updateUserListWord(
  supabase: SupabaseClient,
  userId: string,
  userWordId: number,
  patch: {
    english?: string;
    turkish?: string;
    phonetic?: string | null;
    example_sentence?: string | null;
  }
): Promise<Word> {
  const { data: link, error: linkError } = await supabase
    .from("user_words")
    .select("id, word_id, words(*)")
    .eq("id", userWordId)
    .eq("user_id", userId)
    .maybeSingle();

  if (linkError) throw linkError;
  if (!link) throw new Error("Kelime listende bulunamadı.");

  const updates: Record<string, string | null> = {};
  if (typeof patch.english === "string") {
    const english = normalizeEnglishKey(patch.english);
    if (!english) throw new Error("Geçerli bir İngilizce kelime gir.");
    updates.english = english;
  }
  if (typeof patch.turkish === "string") {
    const turkish = patch.turkish.trim();
    if (!turkish) throw new Error("Türkçe anlam gerekli.");
    updates.turkish = turkish;
  }
  if (patch.phonetic !== undefined) {
    updates.phonetic = patch.phonetic?.trim() || null;
  }
  if (patch.example_sentence !== undefined) {
    updates.example_sentence = patch.example_sentence?.trim() || null;
  }

  if (Object.keys(updates).length === 0) {
    const current = link.words as Word | Word[] | null;
    const word = Array.isArray(current) ? current[0] : current;
    if (!word) throw new Error("Kelime bulunamadı.");
    return word;
  }

  const { data: updated, error: updateError } = await supabase
    .from("words")
    .update(updates)
    .eq("id", link.word_id)
    .select("*")
    .single();

  if (updateError) {
    if (updateError.code === "23505") {
      throw new Error("Bu İngilizce kelime zaten sistemde var.");
    }
    throw updateError;
  }

  return updated as Word;
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
export async function listGrammarTopics(supabase: SupabaseClient) {
  const { data: topics, error } = await supabase
    .from("grammar_topics")
    .select("id, slug, title, summary, tip_tr, example, difficulty")
    .order("difficulty", { ascending: true })
    .order("id", { ascending: true });

  if (error) throw error;
  if (!topics?.length) return [];

  const { data: counts, error: countError } = await supabase
    .from("grammar_items")
    .select("topic_id");

  if (countError) throw countError;

  const countMap = new Map<number, number>();
  for (const row of counts ?? []) {
    const id = row.topic_id as number;
    countMap.set(id, (countMap.get(id) ?? 0) + 1);
  }

  return topics.map((t) => ({
    id: t.id as number,
    slug: t.slug as string,
    title: t.title as string,
    summary: t.summary as string,
    tip_tr: (t.tip_tr as string | null) ?? null,
    example: (t.example as string | null) ?? null,
    difficulty: t.difficulty as number,
    item_count: countMap.get(t.id as number) ?? 0,
  }));
}

export async function getGrammarTopicBySlug(supabase: SupabaseClient, slug: string) {
  const { data: topic, error } = await supabase
    .from("grammar_topics")
    .select("id, slug, title, summary, tip_tr, example, difficulty")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  if (!topic) return null;

  const { data: items, error: itemsError } = await supabase
    .from("grammar_items")
    .select(
      "id, topic_id, question, correct_answer, explanation, example, difficulty, sort_order"
    )
    .eq("topic_id", topic.id)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });

  if (itemsError) throw itemsError;

  const list = items ?? [];

  return {
    id: topic.id as number,
    slug: topic.slug as string,
    title: topic.title as string,
    summary: topic.summary as string,
    tip_tr: (topic.tip_tr as string | null) ?? null,
    example: (topic.example as string | null) ?? null,
    difficulty: topic.difficulty as number,
    item_count: list.length,
    items: list.map((item) => ({
      id: item.id as number,
      topic_id: item.topic_id as number,
      question: item.question as string,
      correct_answer: item.correct_answer as string,
      explanation: (item.explanation as string | null) ?? null,
      example: (item.example as string | null) ?? null,
      difficulty: item.difficulty as number,
      sort_order: item.sort_order as number,
    })),
  };
}

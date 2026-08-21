import type { SupabaseClient } from "@supabase/supabase-js";
import { getUserWords } from "@/lib/db";
import type {
  ChallengeModule,
  ChallengeRow,
  ChallengeSeedWord,
  ChallengeStatus,
  FriendProfile,
} from "@/types";

type ProfileRow = {
  id: string;
  username: string | null;
  daily_streak: number | null;
};

function asFriendProfile(row: ProfileRow | null | undefined): FriendProfile | null {
  if (!row?.id) return null;
  return {
    id: row.id,
    username: row.username?.trim() || "Öğrenci",
    daily_streak: row.daily_streak ?? 0,
  };
}

function oneProfile(
  row: ProfileRow | ProfileRow[] | null | undefined
): FriendProfile | null {
  return asFriendProfile(Array.isArray(row) ? row[0] : row);
}

function parseSeed(raw: unknown): ChallengeSeedWord[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const o = item as Record<string, unknown>;
      const english = typeof o.english === "string" ? o.english.trim() : "";
      const turkish = typeof o.turkish === "string" ? o.turkish.trim() : "";
      const id = Number(o.id);
      if (!english || !turkish || !Number.isFinite(id)) return null;
      return { id, english, turkish };
    })
    .filter((w): w is ChallengeSeedWord => Boolean(w));
}

function mapChallenge(row: {
  id: number;
  challenger_id: string;
  opponent_id: string;
  module: ChallengeModule;
  status: ChallengeStatus;
  seed_words: unknown;
  challenger_score: number;
  opponent_score: number;
  winner_id: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  challenger?: ProfileRow | ProfileRow[] | null;
  opponent?: ProfileRow | ProfileRow[] | null;
}): ChallengeRow {
  return {
    id: row.id,
    challenger_id: row.challenger_id,
    opponent_id: row.opponent_id,
    module: row.module,
    status: row.status,
    seed_words: parseSeed(row.seed_words),
    challenger_score: row.challenger_score ?? 0,
    opponent_score: row.opponent_score ?? 0,
    winner_id: row.winner_id,
    created_at: row.created_at,
    started_at: row.started_at,
    finished_at: row.finished_at,
    challenger: oneProfile(row.challenger),
    opponent: oneProfile(row.opponent),
  };
}

const SELECT =
  "id, challenger_id, opponent_id, module, status, seed_words, challenger_score, opponent_score, winner_id, created_at, started_at, finished_at, challenger:profiles!challenger_id(id, username, daily_streak), opponent:profiles!opponent_id(id, username, daily_streak)";

async function buildSeedWords(
  supabase: SupabaseClient,
  userId: string,
  module: ChallengeModule
): Promise<ChallengeSeedWord[]> {
  const rows = await getUserWords(supabase, userId);
  const seen = new Set<string>();
  const pool: ChallengeSeedWord[] = [];

  for (const row of rows) {
    const w = row.words;
    if (!w?.english?.trim() || !w.turkish?.trim()) continue;
    const key = w.english.trim().toLowerCase();
    if (seen.has(key)) continue;
    if (module === "word_check" && (key.includes(" ") || w.english.trim().length < 3)) {
      continue;
    }
    seen.add(key);
    pool.push({
      id: w.id,
      english: w.english.trim(),
      turkish: w.turkish.trim(),
    });
  }

  // Shuffle and cap for a fair duel length
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }

  const minNeeded = module === "match" ? 8 : 6;
  const maxTake = module === "match" ? 24 : 20;
  if (pool.length < minNeeded) {
    throw new Error(
      "Meydan okuma için yeterli kelime yok. Önce listeye daha fazla kelime ekle."
    );
  }
  return pool.slice(0, Math.min(maxTake, pool.length));
}

async function assertAreFriends(
  supabase: SupabaseClient,
  a: string,
  b: string
) {
  const { data, error } = await supabase
    .from("friendships")
    .select("id, status")
    .eq("status", "accepted")
    .or(
      `and(requester_id.eq.${a},addressee_id.eq.${b}),and(requester_id.eq.${b},addressee_id.eq.${a})`
    )
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Sadece arkadaşlarınla meydan okuyabilirsin.");
}

export async function createChallenge(
  supabase: SupabaseClient,
  challengerId: string,
  opponentId: string,
  module: ChallengeModule
) {
  if (challengerId === opponentId) {
    throw new Error("Kendine meydan okuyamazsın.");
  }
  await assertAreFriends(supabase, challengerId, opponentId);
  const seed_words = await buildSeedWords(supabase, challengerId, module);

  const { data, error } = await supabase
    .from("challenges")
    .insert({
      challenger_id: challengerId,
      opponent_id: opponentId,
      module,
      status: "pending",
      seed_words,
    })
    .select(SELECT)
    .single();

  if (error) throw error;
  return mapChallenge(data as Parameters<typeof mapChallenge>[0]);
}

export async function listChallengesForUser(
  supabase: SupabaseClient,
  userId: string
) {
  const { data, error } = await supabase
    .from("challenges")
    .select(SELECT)
    .or(`challenger_id.eq.${userId},opponent_id.eq.${userId}`)
    .in("status", ["pending", "active"])
    .order("created_at", { ascending: false })
    .limit(40);

  if (error) throw error;
  const rows = (data ?? []).map((row) =>
    mapChallenge(row as Parameters<typeof mapChallenge>[0])
  );

  return {
    incoming: rows.filter((r) => r.status === "pending" && r.opponent_id === userId),
    outgoing: rows.filter((r) => r.status === "pending" && r.challenger_id === userId),
    active: rows.filter((r) => r.status === "active"),
  };
}

export async function getChallenge(
  supabase: SupabaseClient,
  challengeId: number,
  userId: string
) {
  const { data, error } = await supabase
    .from("challenges")
    .select(SELECT)
    .eq("id", challengeId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Meydan okuma bulunamadı.");
  const row = mapChallenge(data as Parameters<typeof mapChallenge>[0]);
  if (row.challenger_id !== userId && row.opponent_id !== userId) {
    throw new Error("Bu maça erişimin yok.");
  }
  return row;
}

export async function acceptChallenge(
  supabase: SupabaseClient,
  userId: string,
  challengeId: number
) {
  const current = await getChallenge(supabase, challengeId, userId);
  if (current.opponent_id !== userId) {
    throw new Error("Sadece davet edilen kişi kabul edebilir.");
  }
  if (current.status !== "pending") {
    throw new Error("Bu davet artık geçerli değil.");
  }

  const { data, error } = await supabase
    .from("challenges")
    .update({
      status: "active",
      started_at: new Date().toISOString(),
    })
    .eq("id", challengeId)
    .eq("status", "pending")
    .select(SELECT)
    .single();

  if (error) throw error;
  return mapChallenge(data as Parameters<typeof mapChallenge>[0]);
}

export async function declineChallenge(
  supabase: SupabaseClient,
  userId: string,
  challengeId: number
) {
  const current = await getChallenge(supabase, challengeId, userId);
  if (current.opponent_id !== userId && current.challenger_id !== userId) {
    throw new Error("Bu daveti reddedemezsin.");
  }
  if (current.status !== "pending") {
    throw new Error("Bu davet artık bekleyen durumda değil.");
  }

  const status: ChallengeStatus =
    current.challenger_id === userId ? "cancelled" : "declined";

  const { data, error } = await supabase
    .from("challenges")
    .update({ status, finished_at: new Date().toISOString() })
    .eq("id", challengeId)
    .eq("status", "pending")
    .select(SELECT)
    .single();

  if (error) throw error;
  return mapChallenge(data as Parameters<typeof mapChallenge>[0]);
}

export async function applyChallengeScore(
  supabase: SupabaseClient,
  userId: string,
  challengeId: number,
  delta: number
) {
  if (delta === 0) {
    return getChallenge(supabase, challengeId, userId);
  }

  const current = await getChallenge(supabase, challengeId, userId);
  if (current.status !== "active") {
    throw new Error("Maç aktif değil.");
  }

  const isChallenger = current.challenger_id === userId;
  const patch = isChallenger
    ? { challenger_score: Math.max(0, current.challenger_score + delta) }
    : { opponent_score: Math.max(0, current.opponent_score + delta) };

  const { data, error } = await supabase
    .from("challenges")
    .update(patch)
    .eq("id", challengeId)
    .eq("status", "active")
    .select(SELECT)
    .single();

  if (error) throw error;
  return mapChallenge(data as Parameters<typeof mapChallenge>[0]);
}

export async function finishChallenge(
  supabase: SupabaseClient,
  userId: string,
  challengeId: number
) {
  const current = await getChallenge(supabase, challengeId, userId);
  if (current.status === "finished") return current;
  if (current.status !== "active") {
    throw new Error("Sadece aktif maçlar bitirilebilir.");
  }

  let winner_id: string | null = null;
  if (current.challenger_score > current.opponent_score) {
    winner_id = current.challenger_id;
  } else if (current.opponent_score > current.challenger_score) {
    winner_id = current.opponent_id;
  }

  const { data, error } = await supabase
    .from("challenges")
    .update({
      status: "finished",
      winner_id,
      finished_at: new Date().toISOString(),
    })
    .eq("id", challengeId)
    .eq("status", "active")
    .select(SELECT)
    .single();

  if (error) throw error;
  return mapChallenge(data as Parameters<typeof mapChallenge>[0]);
}

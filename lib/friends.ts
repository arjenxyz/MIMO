import type { SupabaseClient } from "@supabase/supabase-js";
import type { FriendProfile, FriendshipRow, FriendshipStatus } from "@/types";

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

function mapFriendship(
  row: {
    id: number;
    requester_id: string;
    addressee_id: string;
    status: FriendshipStatus;
    created_at: string;
    requester?: ProfileRow | ProfileRow[] | null;
    addressee?: ProfileRow | ProfileRow[] | null;
  },
  viewerId: string
): FriendshipRow {
  const requester = asFriendProfile(
    Array.isArray(row.requester) ? row.requester[0] : row.requester
  );
  const addressee = asFriendProfile(
    Array.isArray(row.addressee) ? row.addressee[0] : row.addressee
  );
  const other =
    row.requester_id === viewerId ? addressee : requester;

  return {
    id: row.id,
    requester_id: row.requester_id,
    addressee_id: row.addressee_id,
    status: row.status,
    created_at: row.created_at,
    requester,
    addressee,
    other,
    direction: row.requester_id === viewerId ? "outgoing" : "incoming",
  };
}

const SELECT =
  "id, requester_id, addressee_id, status, created_at, requester:profiles!requester_id(id, username, daily_streak), addressee:profiles!addressee_id(id, username, daily_streak)";

export async function listFriendships(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("friendships")
    .select(SELECT)
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const rows = (data ?? []).map((row) =>
    mapFriendship(row as Parameters<typeof mapFriendship>[0], userId)
  );

  return {
    friends: rows.filter((r) => r.status === "accepted"),
    incoming: rows.filter((r) => r.status === "pending" && r.direction === "incoming"),
    outgoing: rows.filter((r) => r.status === "pending" && r.direction === "outgoing"),
  };
}

export async function searchProfiles(
  supabase: SupabaseClient,
  userId: string,
  query: string,
  limit = 12
): Promise<FriendProfile[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, daily_streak")
    .ilike("username", `%${q}%`)
    .neq("id", userId)
    .limit(limit);

  if (error) throw error;
  return (data ?? [])
    .map((row) => asFriendProfile(row))
    .filter((row): row is FriendProfile => Boolean(row));
}

export async function sendFriendRequest(
  supabase: SupabaseClient,
  userId: string,
  addresseeId: string
) {
  if (userId === addresseeId) {
    throw new Error("Kendine istek gönderemezsin.");
  }

  const { data: existing, error: existingError } = await supabase
    .from("friendships")
    .select("id, status, requester_id, addressee_id")
    .or(
      `and(requester_id.eq.${userId},addressee_id.eq.${addresseeId}),and(requester_id.eq.${addresseeId},addressee_id.eq.${userId})`
    )
    .maybeSingle();

  if (existingError) throw existingError;

  if (existing) {
    if (existing.status === "accepted") {
      throw new Error("Zaten arkadaşsınız.");
    }
    if (existing.status === "pending") {
      throw new Error(
        existing.requester_id === userId
          ? "İstek zaten gönderildi."
          : "Bu kullanıcı sana istek göndermiş — İstekler sekmesinden yanıtla."
      );
    }
    // rejected → clear and re-send
    const { error: delError } = await supabase
      .from("friendships")
      .delete()
      .eq("id", existing.id);
    if (delError) throw delError;
  }

  const { error } = await supabase.from("friendships").insert({
    requester_id: userId,
    addressee_id: addresseeId,
    status: "pending",
  });

  if (error) {
    if (/duplicate|unique/i.test(error.message)) {
      throw new Error("Bu kullanıcıyla zaten bir ilişkiniz var.");
    }
    throw error;
  }
}

export async function respondToFriendRequest(
  supabase: SupabaseClient,
  userId: string,
  friendshipId: number,
  action: "accept" | "reject"
) {
  const { data, error: fetchError } = await supabase
    .from("friendships")
    .select("id, addressee_id, status")
    .eq("id", friendshipId)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!data) throw new Error("İstek bulunamadı.");
  if (data.addressee_id !== userId) throw new Error("Bu isteği yalnızca alıcı yanıtlayabilir.");
  if (data.status !== "pending") throw new Error("İstek artık bekleyen değil.");

  const { error } = await supabase
    .from("friendships")
    .update({
      status: action === "accept" ? "accepted" : "rejected",
      updated_at: new Date().toISOString(),
    })
    .eq("id", friendshipId)
    .eq("addressee_id", userId);

  if (error) throw error;
}

export async function cancelOrRemoveFriendship(
  supabase: SupabaseClient,
  userId: string,
  friendshipId: number
) {
  const { data, error: fetchError } = await supabase
    .from("friendships")
    .select("id, requester_id, addressee_id, status")
    .eq("id", friendshipId)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!data) throw new Error("Kayıt bulunamadı.");
  if (data.requester_id !== userId && data.addressee_id !== userId) {
    throw new Error("Yetkin yok.");
  }

  const { error } = await supabase.from("friendships").delete().eq("id", friendshipId);
  if (error) throw error;
}

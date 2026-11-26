import type { SupabaseClient } from "@supabase/supabase-js";
import { canMessagePair, threadKeyFor } from "@/lib/packUnlock";

export const MESSAGE_MAX_LENGTH = 500;

export type DirectMessage = {
  id: number;
  thread_key: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
};

export type MessageThreadPreview = {
  otherId: string;
  otherUsername: string;
  lastBody: string;
  lastAt: string;
  unlockedAsAuthor: boolean;
};

export async function listMessageThreads(
  supabase: SupabaseClient,
  userId: string
): Promise<MessageThreadPreview[]> {
  const { data, error } = await supabase
    .from("direct_messages")
    .select("id, thread_key, sender_id, recipient_id, body, created_at")
    .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    if (/direct_messages|schema cache|does not exist/i.test(error.message || "")) {
      return [];
    }
    throw error;
  }

  const rows = (data ?? []) as DirectMessage[];
  const byOther = new Map<string, DirectMessage>();
  for (const row of rows) {
    const otherId = row.sender_id === userId ? row.recipient_id : row.sender_id;
    if (!byOther.has(otherId)) byOther.set(otherId, row);
  }

  // Also include unlocks with no messages yet (as author or unlocker).
  const { data: unlocksAsUser } = await supabase
    .from("author_pack_unlocks")
    .select("author_id, unlocked_at")
    .eq("user_id", userId);
  const { data: unlocksAsAuthor } = await supabase
    .from("author_pack_unlocks")
    .select("user_id, unlocked_at")
    .eq("author_id", userId);

  for (const u of unlocksAsUser ?? []) {
    if (!byOther.has(u.author_id)) {
      byOther.set(u.author_id, {
        id: 0,
        thread_key: threadKeyFor(userId, u.author_id),
        sender_id: userId,
        recipient_id: u.author_id,
        body: "",
        created_at: u.unlocked_at,
      });
    }
  }
  for (const u of unlocksAsAuthor ?? []) {
    if (!byOther.has(u.user_id)) {
      byOther.set(u.user_id, {
        id: 0,
        thread_key: threadKeyFor(userId, u.user_id),
        sender_id: u.user_id,
        recipient_id: userId,
        body: "",
        created_at: u.unlocked_at,
      });
    }
  }

  const otherIds = Array.from(byOther.keys());
  if (otherIds.length === 0) return [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username")
    .in("id", otherIds);

  const nameById = new Map(
    (profiles ?? []).map((p) => [p.id as string, (p.username as string) || "öğrenci"])
  );

  const authorUnlockSet = new Set((unlocksAsAuthor ?? []).map((u) => u.user_id as string));

  return Array.from(byOther.entries())
    .map(([otherId, last]) => ({
      otherId,
      otherUsername: nameById.get(otherId) || "öğrenci",
      lastBody: last.body || "Sohbete başla",
      lastAt: last.created_at,
      unlockedAsAuthor: authorUnlockSet.has(otherId),
    }))
    .sort((a, b) => (a.lastAt < b.lastAt ? 1 : -1));
}

export async function listThreadMessages(
  supabase: SupabaseClient,
  userId: string,
  otherId: string
): Promise<DirectMessage[]> {
  const allowed = await canMessagePair(supabase, userId, otherId);
  if (!allowed) {
    throw new Error("Bu kişiyle mesajlaşmak için paket sınavını geçmen gerekir.");
  }

  const key = threadKeyFor(userId, otherId);
  const { data, error } = await supabase
    .from("direct_messages")
    .select("id, thread_key, sender_id, recipient_id, body, created_at")
    .eq("thread_key", key)
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) throw error;
  return (data ?? []) as DirectMessage[];
}

export async function sendDirectMessage(
  supabase: SupabaseClient,
  userId: string,
  recipientId: string,
  bodyRaw: string
): Promise<DirectMessage> {
  const body = bodyRaw.trim();
  if (!body) throw new Error("Mesaj boş olamaz.");
  if (body.length > MESSAGE_MAX_LENGTH) {
    throw new Error(`Mesaj en fazla ${MESSAGE_MAX_LENGTH} karakter olabilir.`);
  }
  if (userId === recipientId) throw new Error("Kendine mesaj gönderemezsin.");

  const allowed = await canMessagePair(supabase, userId, recipientId);
  if (!allowed) {
    throw new Error("Kilit açık değil. Önce paket sınavını geç.");
  }

  // Simple rate limit: max 20 messages in last minute.
  const since = new Date(Date.now() - 60_000).toISOString();
  const { count, error: countError } = await supabase
    .from("direct_messages")
    .select("id", { count: "exact", head: true })
    .eq("sender_id", userId)
    .gte("created_at", since);
  if (countError) throw countError;
  if ((count ?? 0) >= 20) {
    throw new Error("Çok hızlı yazıyorsun. Bir dakika bekle.");
  }

  const { data, error } = await supabase
    .from("direct_messages")
    .insert({
      thread_key: threadKeyFor(userId, recipientId),
      sender_id: userId,
      recipient_id: recipientId,
      body,
    })
    .select("id, thread_key, sender_id, recipient_id, body, created_at")
    .single();

  if (error) throw error;
  return data as DirectMessage;
}

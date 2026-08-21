"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import type { FriendshipRow, Word } from "@/types";

export type UploaderProfile = {
  id: string;
  name: string;
  avatarUrl: string | null;
  sampleWord: string;
};

type FriendRelation =
  | { kind: "loading" }
  | { kind: "self" }
  | { kind: "none" }
  | { kind: "friend" }
  | { kind: "outgoing"; friendshipId: number }
  | { kind: "incoming"; friendshipId: number }
  | { kind: "guest" };

export function profileFromWord(word: Word): UploaderProfile | null {
  if (!word.is_global || !word.created_by) return null;
  return {
    id: word.created_by,
    name: word.uploader_username?.trim() || "Bir kullanıcı",
    avatarUrl: word.uploader_avatar_url ?? null,
    sampleWord: word.english,
  };
}

export function UploaderBadge({
  word,
  onOpen,
  className = "",
  centered = false,
  overlay = false,
}: {
  word: Word;
  onOpen: (profile: UploaderProfile) => void;
  className?: string;
  centered?: boolean;
  /** Compact pill for photo corners (e.g. quiz). */
  overlay?: boolean;
}) {
  const profile = profileFromWord(word);
  if (!profile) return null;
  const initial = profile.name.charAt(0).toUpperCase();

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onOpen(profile);
      }}
      className={`flex max-w-[min(100%,11rem)] items-center gap-1.5 text-left transition ${
        overlay
          ? "rounded-full bg-black/45 py-1 pl-1 pr-2.5 text-white backdrop-blur-sm hover:bg-black/55"
          : `rounded-full py-0.5 pr-1 hover:bg-mimo-surface ${centered ? "mx-auto" : ""}`
      } ${className}`}
      aria-label={`${profile.name} profilini aç`}
    >
      <span
        className={`relative flex shrink-0 overflow-hidden rounded-full bg-[#fd860a] ${
          overlay ? "h-6 w-6 ring-1 ring-white/40" : "h-5 w-5 ring-1 ring-mimo-soft"
        }`}
      >
        {profile.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatarUrl}
            alt=""
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span
            className={`flex h-full w-full items-center justify-center font-black text-[#2a1600] ${
              overlay ? "text-[10px]" : "text-[9px]"
            }`}
          >
            {initial}
          </span>
        )}
      </span>
      <span
        className={`truncate font-bold underline-offset-2 hover:underline ${
          overlay ? "text-[11px] text-white" : "text-[11px] text-mimo-muted"
        }`}
      >
        {profile.name}
      </span>
    </button>
  );
}

function relationForUser(
  targetId: string,
  viewerId: string,
  lists: {
    friends: FriendshipRow[];
    incoming: FriendshipRow[];
    outgoing: FriendshipRow[];
  }
): FriendRelation {
  if (targetId === viewerId) return { kind: "self" };
  const friend = lists.friends.find((r) => r.other?.id === targetId);
  if (friend) return { kind: "friend" };
  const outgoing = lists.outgoing.find((r) => r.other?.id === targetId);
  if (outgoing) return { kind: "outgoing", friendshipId: outgoing.id };
  const incoming = lists.incoming.find((r) => r.other?.id === targetId);
  if (incoming) return { kind: "incoming", friendshipId: incoming.id };
  return { kind: "none" };
}

export function UploaderProfileCard({
  profile,
  onClose,
}: {
  profile: UploaderProfile;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [relation, setRelation] = useState<FriendRelation>({ kind: "loading" });
  const [busy, setBusy] = useState(false);
  const [friendError, setFriendError] = useState("");

  useEffect(() => {
    setMounted(true);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    async function loadRelation() {
      setRelation({ kind: "loading" });
      setFriendError("");
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          if (!cancelled) setRelation({ kind: "guest" });
          return;
        }
        if (user.id === profile.id) {
          if (!cancelled) setRelation({ kind: "self" });
          return;
        }
        const res = await fetch("/api/friends");
        const data = (await res.json()) as {
          friends?: FriendshipRow[];
          incoming?: FriendshipRow[];
          outgoing?: FriendshipRow[];
          error?: string;
        };
        if (!res.ok) throw new Error(data.error || "Arkadaş durumu alınamadı");
        if (!cancelled) {
          setRelation(
            relationForUser(profile.id, user.id, {
              friends: data.friends ?? [],
              incoming: data.incoming ?? [],
              outgoing: data.outgoing ?? [],
            })
          );
        }
      } catch (e) {
        if (!cancelled) {
          setFriendError(e instanceof Error ? e.message : "Arkadaş durumu alınamadı");
          setRelation({ kind: "none" });
        }
      }
    }
    void loadRelation();
    return () => {
      cancelled = true;
    };
  }, [profile.id]);

  async function postFriend(body: Record<string, unknown>) {
    const res = await fetch("/api/friends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) throw new Error(data.error || "İşlem başarısız");
  }

  async function sendRequest() {
    setBusy(true);
    setFriendError("");
    try {
      await postFriend({ action: "request", addresseeId: profile.id });
      setRelation({ kind: "outgoing", friendshipId: -1 });
    } catch (e) {
      setFriendError(e instanceof Error ? e.message : "İstek gönderilemedi");
    } finally {
      setBusy(false);
    }
  }

  async function acceptIncoming(friendshipId: number) {
    setBusy(true);
    setFriendError("");
    try {
      await postFriend({ action: "accept", friendshipId });
      setRelation({ kind: "friend" });
    } catch (e) {
      setFriendError(e instanceof Error ? e.message : "Onaylanamadı");
    } finally {
      setBusy(false);
    }
  }

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center bg-black/55 p-4 backdrop-blur-md"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="uploader-profile-title"
        className="relative z-[501] w-full max-w-sm rounded-2xl border border-mimo-border bg-mimo-card p-6 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto flex h-20 w-20 overflow-hidden rounded-full bg-[#fd860a] ring-4 ring-[#fff3e0] dark:ring-[#3a2208]">
          {profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatarUrl}
              alt={profile.name}
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-3xl font-black text-[#2a1600]">
              {profile.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <h3 id="uploader-profile-title" className="mt-4 text-xl font-black text-mimo-title">
          {profile.name}
        </h3>
        <p className="mt-1 text-sm font-bold text-mimo-muted">MIMO öğrencisi</p>
        <p className="mt-4 rounded-xl bg-mimo-surface px-3 py-2.5 text-sm font-semibold text-mimo-fg">
          Bu kullanıcı{" "}
          <span className="font-black text-[#7c3aed]">{profile.sampleWord}</span> kelimesini
          global sisteme yükledi.
        </p>

        {friendError ? (
          <p className="mt-3 text-xs font-bold text-[#b91c1c]">{friendError}</p>
        ) : null}

        <div className="mt-5 space-y-2">
          {relation.kind === "none" || relation.kind === "guest" ? (
            <button
              type="button"
              disabled={busy || relation.kind === "guest"}
              onClick={() => void sendRequest()}
              className="w-full rounded-2xl bg-[#fd860a] py-3 text-sm font-black text-[#2a1600] shadow-[0_3px_0_#c2410c] disabled:opacity-50"
            >
              {relation.kind === "guest" ? "Giriş yaparak ekle" : busy ? "Gönderiliyor…" : "Arkadaş Ekle"}
            </button>
          ) : null}
          {relation.kind === "incoming" ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void acceptIncoming(relation.friendshipId)}
              className="w-full rounded-2xl bg-[#58cc02] py-3 text-sm font-black text-[#14260a] disabled:opacity-50"
            >
              {busy ? "Onaylanıyor…" : "İsteği Onayla"}
            </button>
          ) : null}
          {relation.kind === "outgoing" ? (
            <p className="rounded-2xl border border-mimo-border bg-mimo-surface py-3 text-sm font-extrabold text-mimo-muted">
              İstek gönderildi
            </p>
          ) : null}
          {relation.kind === "friend" ? (
            <p className="rounded-2xl border border-mimo-border bg-mimo-surface py-3 text-sm font-extrabold text-[#15803d]">
              Arkadaşsınız
            </p>
          ) : null}
          {relation.kind === "loading" ? (
            <p className="py-2 text-sm font-bold text-mimo-muted">…</p>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl border border-mimo-border bg-mimo-surface py-3 text-sm font-extrabold text-mimo-fg"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/** Badge + profile modal for a single word context (e.g. quiz). */
export function WordUploaderAttribution({
  word,
  overlay = false,
  className = "",
}: {
  word: Word;
  overlay?: boolean;
  className?: string;
}) {
  const [profile, setProfile] = useState<UploaderProfile | null>(null);
  if (!profileFromWord(word) && !profile) return null;

  return (
    <>
      <UploaderBadge
        word={word}
        onOpen={setProfile}
        overlay={overlay}
        centered={!overlay}
        className={className || (overlay ? "" : "mt-2")}
      />
      {profile && (
        <UploaderProfileCard profile={profile} onClose={() => setProfile(null)} />
      )}
    </>
  );
}

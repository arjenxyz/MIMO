"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { ChallengeRow } from "@/types";

function moduleLabel(module: ChallengeRow["module"]) {
  return module === "match" ? "Hızlı eşleştir" : "Yazım doğru mu?";
}

/**
 * On the home page: when someone invites you to a 1v1, open an accept/decline modal.
 */
export function HomeChallengeInviteListener({ demo }: { demo: boolean }) {
  const router = useRouter();
  const [invite, setInvite] = useState<ChallengeRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dismissedRef = useRef<Set<number>>(new Set());
  const userIdRef = useRef<string | null>(null);

  const pickIncoming = useCallback((rows: ChallengeRow[]) => {
    const next = rows.find((r) => !dismissedRef.current.has(r.id)) ?? null;
    setInvite((prev) => {
      if (!next) return null;
      if (prev?.id === next.id) return prev;
      return next;
    });
  }, []);

  const refreshIncoming = useCallback(async () => {
    if (demo) return;
    try {
      const res = await fetch("/api/challenges");
      if (!res.ok) return;
      const data = (await res.json()) as { incoming?: ChallengeRow[] };
      pickIncoming(data.incoming ?? []);
    } catch {
      // ignore
    }
  }, [demo, pickIncoming]);

  useEffect(() => {
    if (demo) return;

    void refreshIncoming();
    const poll = window.setInterval(() => void refreshIncoming(), 4000);

    let cleanupRealtime: (() => void) | undefined;

    void (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        userIdRef.current = user.id;

        const channel = supabase
          .channel(`home-challenge-invites-${user.id}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "challenges",
              filter: `opponent_id=eq.${user.id}`,
            },
            (payload) => {
              const row = payload.new as Partial<ChallengeRow>;
              if (row.status !== "pending") return;
              void refreshIncoming();
            }
          )
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "challenges",
              filter: `opponent_id=eq.${user.id}`,
            },
            () => {
              void refreshIncoming();
            }
          )
          .subscribe();

        cleanupRealtime = () => {
          void supabase.removeChannel(channel);
        };
      } catch {
        // Realtime optional; polling covers invites
      }
    })();

    return () => {
      window.clearInterval(poll);
      cleanupRealtime?.();
    };
  }, [demo, refreshIncoming]);

  async function respond(action: "accept" | "decline") {
    if (!invite || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, challengeId: invite.id }),
      });
      const data = (await res.json()) as { challenge?: ChallengeRow; error?: string };
      if (!res.ok) throw new Error(data.error || "İşlem başarısız");

      dismissedRef.current.add(invite.id);
      if (action === "accept") {
        router.push(`/challenge/${invite.id}`);
        return;
      }
      setInvite(null);
      void refreshIncoming();
    } catch (e) {
      setError(e instanceof Error ? e.message : "İşlem başarısız");
    } finally {
      setBusy(false);
    }
  }

  if (!invite) return null;

  const fromName = invite.challenger?.username ?? "Bir arkadaşın";

  return (
    <div
      className="fixed inset-0 z-[520] flex items-center justify-center bg-black/55 p-4 backdrop-blur-md"
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="incoming-challenge-title"
        className="w-full max-w-sm rounded-2xl border border-mimo-border bg-mimo-card p-5 shadow-2xl"
      >
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#fd860a]">
          Oyun daveti
        </p>
        <h2
          id="incoming-challenge-title"
          className="mt-1 text-xl font-black text-mimo-title"
        >
          {fromName} seni meydan okuyor
        </h2>
        <p className="mt-2 text-sm font-semibold text-mimo-muted">
          {moduleLabel(invite.module)} · Aynı anda oynayın, yüksek skor kazanır.
        </p>

        {error ? (
          <p className="mt-3 text-sm font-bold text-[#b91c1c]">{error}</p>
        ) : null}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void respond("decline")}
            className="flex-1 rounded-xl border border-mimo-soft px-3 py-2.5 text-sm font-extrabold text-mimo-muted disabled:opacity-50"
          >
            Reddet
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void respond("accept")}
            className="flex-1 rounded-xl bg-[#58cc02] px-3 py-2.5 text-sm font-black text-[#14260a] shadow-[0_3px_0_#46a302] disabled:opacity-50"
          >
            {busy ? "…" : "Kabul et"}
          </button>
        </div>
      </div>
    </div>
  );
}

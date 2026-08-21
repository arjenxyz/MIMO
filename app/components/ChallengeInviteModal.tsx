"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ChallengeModule, FriendProfile } from "@/types";

type Props = {
  friend: FriendProfile;
  onClose: () => void;
  demo?: boolean;
};

const MODULES: { id: ChallengeModule; title: string; blurb: string }[] = [
  {
    id: "match",
    title: "Hızlı eşleştir",
    blurb: "İngilizce–Türkçe çiftleri eşleştir, doğru her eşleşme +1 puan.",
  },
  {
    id: "word_check",
    title: "Yazım doğru mu?",
    blurb: "Yazım doğru mu yanlış mı? Doğru cevap +1 puan.",
  },
];

export function ChallengeInviteModal({ friend, onClose, demo = false }: Props) {
  const router = useRouter();
  const [module, setModule] = useState<ChallengeModule>("match");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (demo) {
        router.push(`/challenge/demo?module=${module}&vs=${encodeURIComponent(friend.username)}`);
        return;
      }
      const res = await fetch("/api/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          opponentId: friend.id,
          module,
        }),
      });
      const data = (await res.json()) as { challenge?: { id: number }; error?: string };
      if (!res.ok || !data.challenge) {
        throw new Error(data.error || "Davet gönderilemedi");
      }
      router.push(`/challenge/${data.challenge.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Davet gönderilemedi");
      setBusy(false);
    }
  }

  return (
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
        aria-labelledby="challenge-invite-title"
        className="w-full max-w-sm rounded-2xl border border-mimo-border bg-mimo-card p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#fd860a]">
          Meydan okuma
        </p>
        <h2 id="challenge-invite-title" className="mt-1 text-lg font-black text-mimo-title">
          {friend.username} ile 1v1
        </h2>
        <p className="mt-1.5 text-sm font-semibold text-mimo-muted">
          Bir oyun seç ve davet gönder. Kabul edince aynı anda oynarsınız.
        </p>

        <div className="mt-4 space-y-2">
          {MODULES.map((m) => {
            const active = module === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setModule(m.id)}
                className={`w-full rounded-xl border px-3.5 py-3 text-left transition ${
                  active
                    ? "border-[#1cb0f6] bg-[#e8f6fe] ring-2 ring-[#1cb0f6]/25"
                    : "border-mimo-soft bg-mimo-surface hover:border-mimo-border"
                }`}
              >
                <p className="text-sm font-black text-mimo-title">{m.title}</p>
                <p className="mt-0.5 text-xs font-semibold text-mimo-muted">{m.blurb}</p>
              </button>
            );
          })}
        </div>

        {error ? <p className="mt-3 text-sm font-bold text-[#b91c1c]">{error}</p> : null}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-mimo-soft px-3 py-2.5 text-sm font-extrabold text-mimo-muted"
          >
            Vazgeç
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void send()}
            className="flex-1 rounded-xl bg-[#fd860a] px-3 py-2.5 text-sm font-black text-[#2a1600] shadow-[0_3px_0_#c2410c] disabled:opacity-50"
          >
            {busy ? "…" : "Davet et"}
          </button>
        </div>
      </div>
    </div>
  );
}

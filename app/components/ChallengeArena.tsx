"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PracticeExamGhostLink,
  PracticeExamMain,
  PracticeExamPrimaryButton,
} from "@/app/components/PracticeExamChrome";
import { playFeedback } from "@/lib/feedbackSound";
import { buildRealWordRound, type RealWordItem } from "@/lib/realWordQuiz";
import { createClient } from "@/lib/supabase/client";
import type { ChallengeRow, ChallengeSeedWord } from "@/types";

type Props = {
  initial: ChallengeRow;
  userId: string;
  demo?: boolean;
  demoVsName?: string;
};

type Fx = { id: number; kind: "plus" | "miss"; text: string };

function shuffleBoardSides(words: ChallengeSeedWord[]) {
  const en = [...words].sort(() => Math.random() - 0.5);
  let tr = [...words].sort(() => Math.random() - 0.5);
  for (let a = 0; a < 10; a++) {
    if (!en.some((w, i) => w.id === tr[i]?.id)) break;
    tr = [...tr].sort(() => Math.random() - 0.5);
  }
  return { en, tr };
}

export function ChallengeArena({ initial, userId, demo = false, demoVsName }: Props) {
  const router = useRouter();
  const [challenge, setChallenge] = useState(initial);
  const [fx, setFx] = useState<Fx[]>([]);
  const [pulseOpp, setPulseOpp] = useState(false);
  const fxSeq = useRef(0);
  const prevOppScore = useRef(
    userId === initial.challenger_id ? initial.opponent_score : initial.challenger_score
  );

  const isChallenger = userId === challenge.challenger_id;
  const myScore = isChallenger ? challenge.challenger_score : challenge.opponent_score;
  const oppScore = isChallenger ? challenge.opponent_score : challenge.challenger_score;
  const me = isChallenger ? challenge.challenger : challenge.opponent;
  const opp = isChallenger ? challenge.opponent : challenge.challenger;
  const oppName = opp?.username ?? demoVsName ?? "Rakip";
  const myName = me?.username ?? "Sen";

  const pushFx = useCallback((kind: "plus" | "miss", text: string) => {
    const id = ++fxSeq.current;
    setFx((prev) => [...prev, { id, kind, text }]);
    window.setTimeout(() => {
      setFx((prev) => prev.filter((f) => f.id !== id));
    }, 900);
  }, []);

  const reportScore = useCallback(
    async (correct: boolean) => {
      playFeedback(correct);
      pushFx(correct ? "plus" : "miss", correct ? "+1" : "Kaçırdın");
      if (!correct) return;
      if (demo) {
        setChallenge((c) =>
          userId === c.challenger_id
            ? { ...c, challenger_score: c.challenger_score + 1 }
            : { ...c, opponent_score: c.opponent_score + 1 }
        );
        return;
      }
      try {
        const res = await fetch("/api/challenges", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "score",
            challengeId: challenge.id,
            delta: 1,
          }),
        });
        const data = (await res.json()) as { challenge?: ChallengeRow };
        if (data.challenge) setChallenge(data.challenge);
      } catch {
        // ignore transient score errors
      }
    },
    [challenge.id, demo, pushFx, userId]
  );

  const finish = useCallback(async () => {
    if (demo) {
      setChallenge((c) => ({
        ...c,
        status: "finished",
        winner_id:
          c.challenger_score === c.opponent_score
            ? null
            : c.challenger_score > c.opponent_score
              ? c.challenger_id
              : c.opponent_id,
        finished_at: new Date().toISOString(),
      }));
      return;
    }
    try {
      const res = await fetch("/api/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "finish", challengeId: challenge.id }),
      });
      const data = (await res.json()) as { challenge?: ChallengeRow };
      if (data.challenge) setChallenge(data.challenge);
    } catch {
      // ignore
    }
  }, [challenge.id, demo]);

  // Realtime score sync
  useEffect(() => {
    if (demo || challenge.status === "finished" || challenge.status === "declined") {
      return;
    }
    let cancelled = false;
    try {
      const supabase = createClient();
      const channel = supabase
        .channel(`challenge-${challenge.id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "challenges",
            filter: `id=eq.${challenge.id}`,
          },
          (payload) => {
            if (cancelled) return;
            const row = payload.new as Partial<ChallengeRow>;
            setChallenge((prev) => ({
              ...prev,
              status: (row.status as ChallengeRow["status"]) ?? prev.status,
              challenger_score: row.challenger_score ?? prev.challenger_score,
              opponent_score: row.opponent_score ?? prev.opponent_score,
              winner_id:
                row.winner_id !== undefined ? row.winner_id : prev.winner_id,
              started_at: row.started_at ?? prev.started_at,
              finished_at: row.finished_at ?? prev.finished_at,
            }));
          }
        )
        .subscribe();

      return () => {
        cancelled = true;
        void supabase.removeChannel(channel);
      };
    } catch {
      return;
    }
  }, [challenge.id, challenge.status, demo]);

  // Pulse when opponent scores
  useEffect(() => {
    if (oppScore > prevOppScore.current) {
      setPulseOpp(true);
      const t = window.setTimeout(() => setPulseOpp(false), 600);
      prevOppScore.current = oppScore;
      return () => window.clearTimeout(t);
    }
    prevOppScore.current = oppScore;
  }, [oppScore]);

  // Poll while pending (accept)
  useEffect(() => {
    if (demo || challenge.status !== "pending") return;
    const t = window.setInterval(async () => {
      try {
        const res = await fetch(`/api/challenges?id=${challenge.id}`);
        const data = (await res.json()) as { challenge?: ChallengeRow };
        if (data.challenge) setChallenge(data.challenge);
      } catch {
        // ignore
      }
    }, 2500);
    return () => window.clearInterval(t);
  }, [challenge.id, challenge.status, demo]);

  if (challenge.status === "pending") {
    return (
      <PracticeExamMain className="flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-mimo-border bg-mimo-card p-6 text-center shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#fd860a]">
            Lobı
          </p>
          <h1 className="mt-2 text-2xl font-black text-mimo-title">Rakip bekleniyor…</h1>
          <p className="mt-2 text-sm font-semibold text-mimo-muted">
            {oppName} daveti kabul edince maç başlar. Bu sayfayı açık tut.
          </p>
          <p className="mt-4 text-xs font-bold text-mimo-muted">
            Modül:{" "}
            {challenge.module === "match" ? "Hızlı eşleştir" : "Yazım doğru mu?"}
          </p>
          <div className="mt-6">
            <PracticeExamGhostLink href="/friends">Arkadaşlara dön</PracticeExamGhostLink>
          </div>
        </div>
      </PracticeExamMain>
    );
  }

  if (challenge.status === "declined" || challenge.status === "cancelled") {
    return (
      <PracticeExamMain className="flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-mimo-border bg-mimo-card p-6 text-center">
          <h1 className="text-2xl font-black text-mimo-title">Davet kapandı</h1>
          <p className="mt-2 text-sm font-semibold text-mimo-muted">
            {challenge.status === "cancelled" ? "Davet iptal edildi." : "Davet reddedildi."}
          </p>
          <div className="mt-6">
            <PracticeExamGhostLink href="/friends">Arkadaşlara dön</PracticeExamGhostLink>
          </div>
        </div>
      </PracticeExamMain>
    );
  }

  if (challenge.status === "finished") {
    const won =
      challenge.winner_id === userId
        ? "win"
        : challenge.winner_id
          ? "lose"
          : "draw";
    return (
      <PracticeExamMain className="flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-mimo-border bg-mimo-card p-6 text-center shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#fd860a]">
            Sonuç
          </p>
          <h1 className="mt-2 text-3xl font-black text-mimo-title">
            {won === "win" ? "Kazandın!" : won === "lose" ? "Kaybettin" : "Berabere"}
          </h1>
          <p className="mt-4 text-lg font-black tabular-nums text-mimo-fg">
            {myScore} — {oppScore}
          </p>
          <p className="mt-1 text-sm font-semibold text-mimo-muted">
            {myName} vs {oppName}
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <PracticeExamPrimaryButton onClick={() => router.push("/friends")}>
              Arkadaşlara dön
            </PracticeExamPrimaryButton>
            <PracticeExamGhostLink href="/">Ana sayfa</PracticeExamGhostLink>
          </div>
        </div>
      </PracticeExamMain>
    );
  }

  return (
    <PracticeExamMain className="relative flex min-h-[100dvh] flex-col px-4 pb-8 pt-4">
      <ScoreHud
        myName={myName}
        oppName={oppName}
        myScore={myScore}
        oppScore={oppScore}
        pulseOpp={pulseOpp}
      />

      <div className="pointer-events-none absolute inset-x-0 top-24 z-30 flex justify-center">
        {fx.map((f) => (
          <span
            key={f.id}
            className={`mimo-score-float absolute text-2xl font-black ${
              f.kind === "plus" ? "text-[#58cc02]" : "text-[#ff4b4b]"
            }`}
          >
            {f.text}
          </span>
        ))}
      </div>

      <div className="mx-auto mt-4 w-full max-w-3xl flex-1">
        {challenge.module === "match" ? (
          <ChallengeMatchPlay
            words={challenge.seed_words}
            onCorrect={() => void reportScore(true)}
            onMiss={() => void reportScore(false)}
            onDone={() => void finish()}
          />
        ) : (
          <ChallengeWordCheckPlay
            words={challenge.seed_words}
            onCorrect={() => void reportScore(true)}
            onMiss={() => void reportScore(false)}
            onDone={() => void finish()}
          />
        )}
      </div>

      <div className="mx-auto mt-4 w-full max-w-3xl text-center">
        <Link href="/friends" className="text-xs font-bold text-mimo-muted hover:text-mimo-fg">
          Arenadan çık
        </Link>
      </div>
    </PracticeExamMain>
  );
}

function ScoreHud({
  myName,
  oppName,
  myScore,
  oppScore,
  pulseOpp,
}: {
  myName: string;
  oppName: string;
  myScore: number;
  oppScore: number;
  pulseOpp: boolean;
}) {
  return (
    <div className="mx-auto grid w-full max-w-3xl grid-cols-2 gap-3">
      <div className="rounded-2xl border border-[#58cc02]/40 bg-[#ecfce5] px-3 py-3 text-center dark:bg-[#052e16]/50">
        <p className="truncate text-[10px] font-black uppercase tracking-wide text-[#15803d]">
          {myName}
        </p>
        <p className="mt-1 text-3xl font-black tabular-nums text-[#14260a] dark:text-[#bbf7d0]">
          {myScore}
        </p>
      </div>
      <div
        className={`rounded-2xl border border-[#1cb0f6]/40 bg-[#e8f6fe] px-3 py-3 text-center transition dark:bg-[#0c4a6e]/40 ${
          pulseOpp ? "mimo-score-pulse ring-2 ring-[#1cb0f6]" : ""
        }`}
      >
        <p className="truncate text-[10px] font-black uppercase tracking-wide text-[#0369a1]">
          {oppName}
        </p>
        <p className="mt-1 text-3xl font-black tabular-nums text-[#0c4a6e] dark:text-[#7dd3fc]">
          {oppScore}
        </p>
      </div>
    </div>
  );
}

function ChallengeMatchPlay({
  words,
  onCorrect,
  onMiss,
  onDone,
}: {
  words: ChallengeSeedWord[];
  onCorrect: () => void;
  onMiss: () => void;
  onDone: () => void;
}) {
  const pool = useMemo(() => words.slice(0, 20), [words]);
  const [board, setBoard] = useState(() => shuffleBoardSides(pool.slice(0, 5)));
  const [selected, setSelected] = useState<{ side: "en" | "tr"; id: number } | null>(null);
  const [matches, setMatches] = useState(0);
  const [shake, setShake] = useState(false);
  const target = Math.min(12, pool.length);

  function onTap(side: "en" | "tr", id: number) {
    if (!selected) {
      setSelected({ side, id });
      return;
    }
    if (selected.side === side) {
      setSelected({ side, id });
      return;
    }
    if (selected.id === id) {
      onCorrect();
      setMatches((m) => {
        const next = m + 1;
        if (next >= target) {
          window.setTimeout(onDone, 600);
        }
        return next;
      });
      setBoard((prev) => {
        const used = new Set(
          [...prev.en, ...prev.tr].filter((w) => w.id !== id).map((w) => w.id)
        );
        const replacement = pool.find((w) => !used.has(w.id) && w.id !== id);
        const nextEn = prev.en.filter((w) => w.id !== id);
        const nextTr = prev.tr.filter((w) => w.id !== id);
        if (replacement && nextEn.length < 5) {
          nextEn.push(replacement);
          nextTr.push(replacement);
        }
        return shuffleBoardSides(
          Array.from(
            new Map([...nextEn, ...nextTr].map((w) => [w.id, w])).values()
          ).slice(0, 5)
        );
      });
      setSelected(null);
      return;
    }
    onMiss();
    setShake(true);
    window.setTimeout(() => setShake(false), 400);
    setSelected(null);
  }

  return (
    <div className={shake ? "mimo-shake" : undefined}>
      <p className="mb-3 text-center text-sm font-bold text-mimo-muted">
        Eşleşme {Math.min(matches, target)} / {target}
      </p>
      <div className="flex gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-center text-[10px] font-black uppercase tracking-wide text-mimo-muted">
            English
          </p>
          {board.en.map((w) => (
            <button
              key={`en-${w.id}`}
              type="button"
              onClick={() => onTap("en", w.id)}
              className={`flex min-h-[3.1rem] w-full items-center justify-center rounded-xl border px-2 py-2.5 text-sm font-extrabold ${
                selected?.side === "en" && selected.id === w.id
                  ? "border-[#1cb0f6] bg-[#e8f6fe]"
                  : "border-mimo-soft bg-mimo-card"
              }`}
            >
              {w.english}
            </button>
          ))}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-center text-[10px] font-black uppercase tracking-wide text-mimo-muted">
            Türkçe
          </p>
          {board.tr.map((w) => (
            <button
              key={`tr-${w.id}`}
              type="button"
              onClick={() => onTap("tr", w.id)}
              className={`flex min-h-[3.1rem] w-full items-center justify-center rounded-xl border px-2 py-2.5 text-sm font-extrabold ${
                selected?.side === "tr" && selected.id === w.id
                  ? "border-[#1cb0f6] bg-[#e8f6fe]"
                  : "border-mimo-soft bg-mimo-card"
              }`}
            >
              {w.turkish.split(/[/|,;]/)[0]?.trim() || w.turkish}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChallengeWordCheckPlay({
  words,
  onCorrect,
  onMiss,
  onDone,
}: {
  words: ChallengeSeedWord[];
  onCorrect: () => void;
  onMiss: () => void;
  onDone: () => void;
}) {
  const items = useMemo(
    () => buildRealWordRound(words.map((w) => w.english)),
    [words]
  );
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState<"ok" | "bad" | null>(null);
  const [shake, setShake] = useState(false);
  const current: RealWordItem | null = items[index] ?? null;

  function answer(isReal: boolean) {
    if (!current || feedback) return;
    const ok = isReal === current.isReal;
    setFeedback(ok ? "ok" : "bad");
    if (ok) onCorrect();
    else {
      onMiss();
      setShake(true);
      window.setTimeout(() => setShake(false), 400);
    }
    window.setTimeout(() => {
      setFeedback(null);
      setIndex((i) => {
        const next = i + 1;
        if (next >= items.length) {
          window.setTimeout(onDone, 400);
          return i;
        }
        return next;
      });
    }, 700);
  }

  if (!current) {
    return <p className="text-center text-sm font-bold text-mimo-muted">Hazırlanıyor…</p>;
  }

  return (
    <div className={`mx-auto max-w-lg ${shake ? "mimo-shake" : ""}`}>
      <p className="mb-3 text-center text-xs font-black uppercase tracking-wide text-mimo-muted">
        {index + 1} / {items.length}
      </p>
      <div
        className={`rounded-2xl border px-5 py-10 text-center shadow-sm ${
          feedback === "ok"
            ? "border-[#86efac] bg-[#f0fdf4]"
            : feedback === "bad"
              ? "border-[#fca5a5] bg-[#fef2f2]"
              : "border-mimo-border bg-mimo-card"
        }`}
      >
        <p className="text-lg font-black text-mimo-title">Bu yazım doğru mu?</p>
        <p className="mt-5 text-4xl font-semibold tracking-tight text-mimo-fg">{current.word}</p>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={Boolean(feedback)}
          onClick={() => answer(true)}
          className="rounded-2xl border border-mimo-soft bg-mimo-card py-6 text-base font-black text-mimo-title disabled:opacity-50"
        >
          Evet
        </button>
        <button
          type="button"
          disabled={Boolean(feedback)}
          onClick={() => answer(false)}
          className="rounded-2xl border border-mimo-soft bg-mimo-card py-6 text-base font-black uppercase text-mimo-title disabled:opacity-50"
        >
          Hayır
        </button>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  PracticeExamCard,
  PracticeExamEyebrow,
  PracticeExamGhostLink,
  PracticeExamMain,
  PracticeExamPrimaryButton,
} from "@/app/components/PracticeExamChrome";
import { formatTimer } from "@/lib/detCloze";

export type MatchWord = {
  id: number;
  english: string;
  turkish: string;
};

type Tile = {
  uid: string;
  wordId: number;
  text: string;
  side: "en" | "tr";
};

const SESSION_SECONDS = 120;
const BOARD_PAIRS = 5;
const MILESTONES = [5, 10, 35];

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function primaryTurkish(turkish: string) {
  return turkish.split(/[/|,;]/)[0]?.trim() || turkish.trim();
}

let tileSeq = 0;
function nextUid() {
  tileSeq += 1;
  return `t-${tileSeq}`;
}

function tilesFromWords(words: MatchWord[]): Tile[] {
  const tiles: Tile[] = [];
  for (const w of words) {
    tiles.push({ uid: nextUid(), wordId: w.id, text: w.english, side: "en" });
    tiles.push({
      uid: nextUid(),
      wordId: w.id,
      text: primaryTurkish(w.turkish),
      side: "tr",
    });
  }
  return shuffle(tiles);
}

function pickFreshWords(pool: MatchWord[], excludeIds: Set<number>, count: number) {
  const available = shuffle(pool.filter((w) => !excludeIds.has(w.id)));
  if (available.length >= count) return available.slice(0, count);
  // Not enough unused — allow reuse of off-board words only.
  return shuffle(pool).slice(0, Math.min(count, pool.length));
}

export function MatchPairsGame({ words }: { words: MatchWord[] }) {
  const pool = useMemo(
    () =>
      words.filter(
        (w) => w.english.trim() && primaryTurkish(w.turkish).length > 0
      ),
    [words]
  );

  const [phase, setPhase] = useState<"ready" | "running" | "done">("ready");
  const [secondsLeft, setSecondsLeft] = useState(SESSION_SECONDS);
  const [board, setBoard] = useState<Tile[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [flash, setFlash] = useState<Record<string, "ok" | "bad">>({});
  const [locked, setLocked] = useState(false);
  const [matches, setMatches] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [misses, setMisses] = useState(0);
  const boardWordIdsRef = useRef<Set<number>>(new Set());

  const startGame = useCallback(() => {
    const starter = pickFreshWords(pool, new Set(), BOARD_PAIRS);
    boardWordIdsRef.current = new Set(starter.map((w) => w.id));
    setBoard(tilesFromWords(starter));
    setSelected([]);
    setFlash({});
    setLocked(false);
    setMatches(0);
    setCombo(0);
    setBestCombo(0);
    setMisses(0);
    setSecondsLeft(SESSION_SECONDS);
    setPhase("running");
  }, [pool]);

  useEffect(() => {
    if (phase !== "running") return;
    if (secondsLeft <= 0) {
      setPhase("done");
      return;
    }
    const t = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [phase, secondsLeft]);

  const progressPct = useMemo(() => {
    const goal = MILESTONES[MILESTONES.length - 1];
    return Math.min(100, Math.round((matches / goal) * 100));
  }, [matches]);

  function onTap(tile: Tile) {
    if (phase !== "running" || locked || flash[tile.uid]) return;
    if (selected.includes(tile.uid)) {
      setSelected((prev) => prev.filter((id) => id !== tile.uid));
      return;
    }

    const next = [...selected, tile.uid];
    if (next.length === 1) {
      setSelected(next);
      return;
    }

    const [aId, bId] = next;
    const a = board.find((t) => t.uid === aId);
    const b = board.find((t) => t.uid === bId);
    if (!a || !b) {
      setSelected([]);
      return;
    }

    setLocked(true);

    if (a.wordId === b.wordId && a.side !== b.side) {
      setFlash({ [a.uid]: "ok", [b.uid]: "ok" });
      const nextCombo = combo + 1;
      setCombo(nextCombo);
      setBestCombo((c) => Math.max(c, nextCombo));
      setMatches((m) => m + 1);

      window.setTimeout(() => {
        setBoard((prev) => {
          const kept = prev.filter((t) => t.uid !== a.uid && t.uid !== b.uid);
          const onBoard = new Set(kept.map((t) => t.wordId));
          const replacement = pickFreshWords(pool, onBoard, 1)[0];
          if (!replacement) {
            boardWordIdsRef.current = onBoard;
            return kept;
          }
          onBoard.add(replacement.id);
          boardWordIdsRef.current = onBoard;
          return shuffle([...kept, ...tilesFromWords([replacement])]);
        });
        setFlash({});
        setSelected([]);
        setLocked(false);
      }, 320);
    } else {
      setFlash({ [a.uid]: "bad", [b.uid]: "bad" });
      setCombo(0);
      setMisses((n) => n + 1);
      window.setTimeout(() => {
        setFlash({});
        setSelected([]);
        setLocked(false);
      }, 420);
    }
  }

  if (pool.length < BOARD_PAIRS) {
    return (
      <PracticeExamMain>
        <div className="mx-auto max-w-lg px-4 py-8">
          <PracticeExamCard className="text-center">
            <PracticeExamEyebrow>Hızlı Eşleştir</PracticeExamEyebrow>
            <h1 className="mt-3 text-2xl font-black">Henüz yeterli kelime yok</h1>
            <p className="mt-2 text-sm font-semibold text-[#64748b]">
              Önce Kelimeler alıştırmasında en az {BOARD_PAIRS} kelime öğren, sonra burada hızlı
              tekrar yap.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <PracticeExamGhostLink href="/quiz">Kelime öğrenmeye git</PracticeExamGhostLink>
              <PracticeExamGhostLink href="/">Ana sayfa</PracticeExamGhostLink>
            </div>
          </PracticeExamCard>
        </div>
      </PracticeExamMain>
    );
  }

  if (phase === "ready") {
    return (
      <PracticeExamMain>
        <div className="mx-auto max-w-lg px-4 py-8">
          <PracticeExamCard className="text-center">
            <PracticeExamEyebrow>Hızlı Eşleştir</PracticeExamEyebrow>
            <h1 className="mt-3 text-2xl font-black text-[#1e3a5f]">Eşleşen çiftlere dokun</h1>
            <p className="mt-2 text-sm font-semibold text-[#64748b]">
              Öğrendiğin kelimeleri {SESSION_SECONDS / 60} dakikada hızlıca pekiştir. Doğru
              eşleşince yeni çift gelir — kombo seni yarışta tutar.
            </p>
            <p className="mt-3 text-xs font-bold text-[#94a3b8]">
              Havuz: {pool.length} kelime
            </p>
            <div className="mt-6 flex flex-col items-center gap-2">
              <PracticeExamPrimaryButton variant="green" onClick={startGame}>
                Başlat
              </PracticeExamPrimaryButton>
              <PracticeExamGhostLink href="/">Çık</PracticeExamGhostLink>
            </div>
          </PracticeExamCard>
        </div>
      </PracticeExamMain>
    );
  }

  if (phase === "done") {
    return (
      <PracticeExamMain>
        <div className="mx-auto max-w-lg px-4 py-8">
          <PracticeExamCard className="text-center">
            <PracticeExamEyebrow>Hızlı Eşleştir</PracticeExamEyebrow>
            <h1 className="mt-3 text-2xl font-black">Süre bitti!</h1>
            <div className="mt-6 grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-[#ecfce5] p-3">
                <p className="text-[10px] font-bold uppercase text-[#3f6212]">Eşleşme</p>
                <p className="mt-1 text-2xl font-black text-[#58cc02]">{matches}</p>
              </div>
              <div className="rounded-xl bg-[#e8f6fe] p-3">
                <p className="text-[10px] font-bold uppercase text-[#075985]">Kombo</p>
                <p className="mt-1 text-2xl font-black text-[#0ea5e9]">x{bestCombo}</p>
              </div>
              <div className="rounded-xl bg-[#ffe8e8] p-3">
                <p className="text-[10px] font-bold uppercase text-[#9f1239]">Hata</p>
                <p className="mt-1 text-2xl font-black text-[#ff4b4b]">{misses}</p>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-2">
              <PracticeExamPrimaryButton variant="green" onClick={startGame}>
                Tekrar oyna
              </PracticeExamPrimaryButton>
              <PracticeExamGhostLink href="/">Ana sayfa</PracticeExamGhostLink>
            </div>
          </PracticeExamCard>
        </div>
      </PracticeExamMain>
    );
  }

  return (
    <PracticeExamMain>
      <div className="mx-auto flex min-h-screen max-w-lg flex-col px-4 pb-8 pt-4">
        <div className="mb-4 flex items-center gap-3">
          <Link
            href="/"
            aria-label="Çık"
            className="flex h-10 w-10 items-center justify-center rounded-full text-2xl font-black text-[#94a3b8] hover:bg-white hover:text-[#0f172a]"
          >
            ×
          </Link>

          <div className="relative min-w-0 flex-1 pt-3">
            <div className="h-3 overflow-hidden rounded-full bg-[#e2e8f0]">
              <div
                className="h-full rounded-full bg-[#ff4b4b] transition-all duration-300"
                style={{ width: `${Math.max(4, progressPct)}%` }}
              />
            </div>
            <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-between text-[10px] font-black text-[#64748b]">
              {MILESTONES.map((m) => (
                <span key={m} className="translate-y-[-2px]">
                  {m}
                </span>
              ))}
            </div>
          </div>

          <p
            className={`shrink-0 text-lg font-black tabular-nums ${
              secondsLeft <= 20 ? "text-[#ff4b4b]" : "text-[#1e3a5f]"
            }`}
          >
            {formatTimer(secondsLeft)}
          </p>
        </div>

        <h1 className="text-center text-xl font-black text-[#0f172a] sm:text-2xl">
          Eşleşen çiftlere dokun
        </h1>
        <p className="mt-1 flex items-center justify-center gap-1.5 text-sm font-black uppercase tracking-wide text-[#64748b]">
          <span aria-hidden className="text-[#f59e0b]">
            ⚡
          </span>
          Kombo x{combo}
        </p>

        <div className="mt-5 grid flex-1 grid-cols-2 content-start gap-2.5 sm:gap-3">
          {board.map((tile) => {
            const isSel = selected.includes(tile.uid);
            const state = flash[tile.uid];
            let style =
              "border-[#e2e8f0] bg-white text-[#0f172a] hover:border-[#cbd5e1]";
            if (state === "ok") style = "border-[#58cc02] bg-[#ecfce5] text-[#15803d]";
            else if (state === "bad") style = "border-[#ff4b4b] bg-[#ffe8e8] text-[#b91c1c]";
            else if (isSel) style = "border-[#1cb0f6] bg-[#e8f6fe] text-[#0f172a]";

            return (
              <button
                key={tile.uid}
                type="button"
                disabled={locked && !state}
                onClick={() => onTap(tile)}
                className={`min-h-[3.25rem] rounded-xl border px-2 py-3 text-center text-[15px] font-extrabold leading-snug transition sm:min-h-[3.5rem] sm:text-base ${style}`}
              >
                {tile.text}
              </button>
            );
          })}
        </div>

        <p className="mt-4 text-center text-xs font-semibold text-[#94a3b8]">
          {matches} eşleşme · hedef {MILESTONES.join(" / ")}
        </p>
      </div>
    </PracticeExamMain>
  );
}

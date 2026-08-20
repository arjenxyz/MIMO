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

type Board = {
  en: Tile[];
  tr: Tile[];
};

const SESSION_SECONDS = 120;
const BOARD_PAIRS = 5;
const MILESTONES = [5, 10, 35];
const SHUFFLE_EVERY_SEC = 30;
const SHUFFLE_DURATION_MS = 2500;
const SHUFFLE_STEPS = 7;

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Independent column shuffles; avoid same-word same-row when possible. */
function deepShuffleBoard(board: Board): Board {
  const en = shuffle(board.en);
  let tr = shuffle(board.tr);

  for (let attempt = 0; attempt < 12; attempt++) {
    const aligned = en.some((tile, i) => tile.wordId === tr[i]?.wordId);
    if (!aligned) break;
    tr = shuffle(tr);
  }

  // Extra derange pass: swap any remaining aligned rows.
  for (let i = 0; i < tr.length; i++) {
    if (en[i]?.wordId !== tr[i]?.wordId) continue;
    const swapWith = tr.findIndex((t, j) => j !== i && t.wordId !== en[i].wordId && en[j]?.wordId !== tr[i].wordId);
    if (swapWith >= 0) {
      [tr[i], tr[swapWith]] = [tr[swapWith], tr[i]];
    }
  }

  return { en, tr };
}

function primaryTurkish(turkish: string) {
  return turkish.split(/[/|,;]/)[0]?.trim() || turkish.trim();
}

let tileSeq = 0;
function nextUid() {
  tileSeq += 1;
  return `t-${tileSeq}`;
}

function makeEnTile(word: MatchWord): Tile {
  return { uid: nextUid(), wordId: word.id, text: word.english, side: "en" };
}

function makeTrTile(word: MatchWord): Tile {
  return {
    uid: nextUid(),
    wordId: word.id,
    text: primaryTurkish(word.turkish),
    side: "tr",
  };
}

function boardFromWords(words: MatchWord[]): Board {
  return deepShuffleBoard({
    en: words.map(makeEnTile),
    tr: words.map(makeTrTile),
  });
}

function pickFreshWords(pool: MatchWord[], excludeIds: Set<number>, count: number) {
  const available = shuffle(pool.filter((w) => !excludeIds.has(w.id)));
  if (available.length >= count) return available.slice(0, count);
  return shuffle(pool).slice(0, Math.min(count, pool.length));
}

function findTile(board: Board, uid: string): Tile | undefined {
  return board.en.find((t) => t.uid === uid) ?? board.tr.find((t) => t.uid === uid);
}

export function MatchPairsGame({ words }: { words: MatchWord[] }) {
  const pool = useMemo(
    () => words.filter((w) => w.english.trim() && primaryTurkish(w.turkish).length > 0),
    [words]
  );

  const [phase, setPhase] = useState<"ready" | "running" | "shuffling" | "done">("ready");
  const [secondsLeft, setSecondsLeft] = useState(SESSION_SECONDS);
  const [shuffleIn, setShuffleIn] = useState(SHUFFLE_EVERY_SEC);
  const [board, setBoard] = useState<Board>({ en: [], tr: [] });
  const [selected, setSelected] = useState<string[]>([]);
  const [flash, setFlash] = useState<Record<string, "ok" | "bad">>({});
  const [locked, setLocked] = useState(false);
  const [matches, setMatches] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [misses, setMisses] = useState(0);
  const boardWordIdsRef = useRef<Set<number>>(new Set());
  const shuffleTimersRef = useRef<number[]>([]);

  const clearShuffleTimers = useCallback(() => {
    for (const id of shuffleTimersRef.current) window.clearTimeout(id);
    shuffleTimersRef.current = [];
  }, []);

  const runShuffleSequence = useCallback(() => {
    clearShuffleTimers();
    setSelected([]);
    setFlash({});
    setLocked(true);
    setPhase("shuffling");

    const stepMs = Math.floor(SHUFFLE_DURATION_MS / SHUFFLE_STEPS);

    for (let step = 0; step < SHUFFLE_STEPS; step++) {
      const id = window.setTimeout(() => {
        setBoard((prev) => deepShuffleBoard(prev));
      }, step * stepMs);
      shuffleTimersRef.current.push(id);
    }

    const doneId = window.setTimeout(() => {
      setBoard((prev) => deepShuffleBoard(prev));
      setShuffleIn(SHUFFLE_EVERY_SEC);
      setLocked(false);
      setPhase("running");
      shuffleTimersRef.current = [];
    }, SHUFFLE_DURATION_MS);
    shuffleTimersRef.current.push(doneId);
  }, [clearShuffleTimers]);

  const startGame = useCallback(() => {
    clearShuffleTimers();
    const starter = pickFreshWords(pool, new Set(), BOARD_PAIRS);
    boardWordIdsRef.current = new Set(starter.map((w) => w.id));
    setBoard(boardFromWords(starter));
    setSelected([]);
    setFlash({});
    setLocked(false);
    setMatches(0);
    setCombo(0);
    setBestCombo(0);
    setMisses(0);
    setSecondsLeft(SESSION_SECONDS);
    setShuffleIn(SHUFFLE_EVERY_SEC);
    setPhase("running");
  }, [clearShuffleTimers, pool]);

  useEffect(() => () => clearShuffleTimers(), [clearShuffleTimers]);

  // Main race timer — paused while shuffling.
  useEffect(() => {
    if (phase !== "running") return;
    if (secondsLeft <= 0) {
      setPhase("done");
      return;
    }
    const t = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [phase, secondsLeft]);

  // Visible 10s shuffle countdown — also paused while shuffling.
  useEffect(() => {
    if (phase !== "running") return;
    if (shuffleIn <= 0) {
      runShuffleSequence();
      return;
    }
    const t = window.setTimeout(() => setShuffleIn((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [phase, shuffleIn, runShuffleSequence]);

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

    if (selected.length === 1) {
      const first = findTile(board, selected[0]);
      if (first && first.side === tile.side) {
        setSelected([tile.uid]);
        return;
      }
    }

    const next = [...selected, tile.uid];
    if (next.length === 1) {
      setSelected(next);
      return;
    }

    const [aId, bId] = next;
    const a = findTile(board, aId);
    const b = findTile(board, bId);
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
          const enIdx = prev.en.findIndex((t) => t.uid === a.uid || t.uid === b.uid);
          const trIdx = prev.tr.findIndex((t) => t.uid === a.uid || t.uid === b.uid);
          if (enIdx < 0 || trIdx < 0) return prev;

          const onBoard = new Set(prev.en.map((t) => t.wordId));
          onBoard.delete(prev.en[enIdx].wordId);

          const replacement = pickFreshWords(pool, onBoard, 1)[0];
          if (!replacement) {
            boardWordIdsRef.current = onBoard;
            return {
              en: prev.en.filter((_, i) => i !== enIdx),
              tr: prev.tr.filter((_, i) => i !== trIdx),
            };
          }

          onBoard.add(replacement.id);
          boardWordIdsRef.current = onBoard;

          const nextEn = [...prev.en];
          const nextTr = [...prev.tr];
          nextEn[enIdx] = makeEnTile(replacement);
          nextTr[trIdx] = makeTrTile(replacement);
          return { en: nextEn, tr: nextTr };
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

  function renderColumn(tiles: Tile[], label: string) {
    return (
      <div className="min-w-0 flex-1 space-y-2.5">
        <p className="text-center text-[10px] font-black uppercase tracking-[0.14em] text-mimo-muted">
          {label}
        </p>
        {tiles.map((tile) => {
          const isSel = selected.includes(tile.uid);
          const state = flash[tile.uid];
          let style = "border-mimo-soft bg-mimo-card text-mimo-fg hover:border-mimo-border";
          if (state === "ok") style = "border-[#58cc02] bg-[#ecfce5] text-[#15803d]";
          else if (state === "bad") style = "border-[#ff4b4b] bg-[#ffe8e8] text-[#b91c1c]";
          else if (isSel) style = "border-[#1cb0f6] bg-[#e8f6fe] text-mimo-fg";
          else if (phase === "shuffling") {
            style = "border-mimo-border bg-mimo-surface text-[#334155] animate-pulse";
          }

          return (
            <button
              key={tile.uid}
              type="button"
              disabled={phase !== "running" || (locked && !state)}
              onClick={() => onTap(tile)}
              className={`flex min-h-[3.25rem] w-full items-center justify-center rounded-xl border px-2 py-3 text-center text-[15px] font-extrabold leading-snug transition sm:min-h-[3.5rem] sm:text-base ${style}`}
            >
              {tile.text}
            </button>
          );
        })}
      </div>
    );
  }

  if (pool.length < BOARD_PAIRS) {
    return (
      <PracticeExamMain>
        <div className="mx-auto max-w-lg px-4 py-8">
          <PracticeExamCard className="text-center">
            <PracticeExamEyebrow>Hızlı Eşleştir</PracticeExamEyebrow>
            <h1 className="mt-3 text-2xl font-black">Henüz yeterli kelime yok</h1>
            <p className="mt-2 text-sm font-semibold text-mimo-muted">
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
            <h1 className="mt-3 text-2xl font-black text-mimo-title">Eşleşen çiftlere dokun</h1>
            <p className="mt-2 text-sm font-semibold text-mimo-muted">
              Sol İngilizce, sağ Türkçe. Her 30 saniyede tahta karışır — süre durur, kombon kalır.
            </p>
            <p className="mt-3 text-xs font-bold text-mimo-muted">Havuz: {pool.length} kelime</p>
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

  const shuffling = phase === "shuffling";

  return (
    <PracticeExamMain>
      <div className="mx-auto flex min-h-screen max-w-lg flex-col px-4 pb-8 pt-4">
        <div className="mb-4 flex items-center gap-3">
          <Link
            href="/"
            aria-label="Çık"
            className="flex h-10 w-10 items-center justify-center rounded-full text-2xl font-black text-mimo-muted hover:bg-mimo-card hover:text-mimo-fg"
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
            <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-between text-[10px] font-black text-mimo-muted">
              {MILESTONES.map((m) => (
                <span key={m} className="translate-y-[-2px]">
                  {m}
                </span>
              ))}
            </div>
          </div>

          <p
            className={`shrink-0 text-lg font-black tabular-nums ${
              secondsLeft <= 20 ? "text-[#ff4b4b]" : "text-mimo-title"
            } ${shuffling ? "opacity-50" : ""}`}
          >
            {formatTimer(secondsLeft)}
          </p>
        </div>

        <h1 className="text-center text-xl font-black text-mimo-fg sm:text-2xl">
          {shuffling ? "Karıştırılıyor…" : "Eşleşen çiftlere dokun"}
        </h1>

        <div className="mt-2 flex items-center justify-center gap-4">
          <p className="flex items-center gap-1.5 text-sm font-black uppercase tracking-wide text-mimo-muted">
            <span aria-hidden className="text-[#f59e0b]">
              ⚡
            </span>
            Kombo x{combo}
          </p>

          <div
            className={`flex h-9 min-w-[2.5rem] items-center justify-center rounded-full border px-2.5 text-sm font-black tabular-nums ${
              shuffling
                ? "border-[#1cb0f6] bg-[#e8f6fe] text-[#0369a1]"
                : shuffleIn <= 3
                  ? "border-[#ff4b4b] bg-[#ffe8e8] text-[#b91c1c]"
                  : "border-mimo-soft bg-mimo-card text-mimo-title"
            }`}
            title="Sonraki karıştırma"
            aria-label={shuffling ? "Karıştırılıyor" : `${shuffleIn} saniye sonra karışır`}
          >
            {shuffling ? "…" : shuffleIn}
          </div>
        </div>

        <div className="relative mt-5 flex flex-1 gap-2.5 sm:gap-3">
          {renderColumn(board.en, "English")}
          {renderColumn(board.tr, "Türkçe")}

          {shuffling && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl bg-black/10 backdrop-blur-[1px] dark:bg-black/40">
              <div className="rounded-2xl border border-mimo-soft bg-mimo-card px-5 py-3 text-center shadow-sm">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#1cb0f6]">
                  Karıştırma
                </p>
                <p className="mt-1 text-sm font-black text-mimo-title">Süre durdu · kombo korunuyor</p>
              </div>
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-xs font-semibold text-mimo-muted">
          {matches} eşleşme · hedef {MILESTONES.join(" / ")}
          {!shuffling && ` · karışmaya ${shuffleIn}s`}
        </p>
      </div>
    </PracticeExamMain>
  );
}

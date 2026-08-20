"use client";

import { KeyboardEvent, useEffect, useMemo, useRef } from "react";
import { extractGaps, parseClozePassage, type ClozeGap } from "@/lib/detCloze";

type Props = {
  questionText: string;
  fallbackAnswer?: string;
  values: Record<string, string>;
  onChange: (gapId: string, value: string) => void;
  disabled?: boolean;
  showResults?: boolean;
};

function readChars(serialized: string, length: number) {
  return Array.from({ length }, (_, i) => {
    const c = serialized[i];
    return c && c !== "·" ? c : "";
  });
}

function writeChars(chars: string[]) {
  return chars.map((c) => c || "·").join("");
}

export function ClozePassage({
  questionText,
  fallbackAnswer,
  values,
  onChange,
  disabled,
  showResults,
}: Props) {
  const parts = useMemo(
    () => parseClozePassage(questionText, fallbackAnswer),
    [fallbackAnswer, questionText]
  );
  const gaps = useMemo(() => extractGaps(parts), [parts]);
  const inputRefs = useRef<Record<string, Array<HTMLInputElement | null>>>({});

  function focusCell(gapId: string, letterIndex: number) {
    requestAnimationFrame(() => {
      inputRefs.current[gapId]?.[letterIndex]?.focus();
      inputRefs.current[gapId]?.[letterIndex]?.select();
    });
  }

  useEffect(() => {
    const first = gaps[0];
    if (!first || disabled) return;
    focusCell(first.id, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only autofocus when passage changes
  }, [disabled, questionText]);

  function focusNext(gap: ClozeGap, letterIndex: number) {
    if (letterIndex < gap.missing.length - 1) {
      focusCell(gap.id, letterIndex + 1);
      return;
    }
    const gi = gaps.findIndex((g) => g.id === gap.id);
    const nextGap = gaps[gi + 1];
    if (nextGap) focusCell(nextGap.id, 0);
  }

  function focusPrev(gap: ClozeGap, letterIndex: number) {
    if (letterIndex > 0) {
      focusCell(gap.id, letterIndex - 1);
      return;
    }
    const gi = gaps.findIndex((g) => g.id === gap.id);
    const prevGap = gaps[gi - 1];
    if (prevGap) focusCell(prevGap.id, prevGap.missing.length - 1);
  }

  function setLetter(gap: ClozeGap, letterIndex: number, raw: string) {
    const ch = raw.replace(/[^a-zA-Z'-]/g, "").slice(-1).toLowerCase();
    const chars = readChars(values[gap.id] || "", gap.missing.length);
    chars[letterIndex] = ch;
    onChange(gap.id, writeChars(chars));
    if (ch) focusNext(gap, letterIndex);
  }

  function onKeyDown(gap: ClozeGap, letterIndex: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      focusNext(gap, letterIndex);
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusPrev(gap, letterIndex);
      return;
    }
    if (event.key !== "Backspace") return;

    const chars = readChars(values[gap.id] || "", gap.missing.length);
    if (chars[letterIndex]) {
      event.preventDefault();
      chars[letterIndex] = "";
      onChange(gap.id, writeChars(chars));
      return;
    }
    event.preventDefault();
    if (letterIndex > 0) {
      chars[letterIndex - 1] = "";
      onChange(gap.id, writeChars(chars));
      focusCell(gap.id, letterIndex - 1);
      return;
    }
    focusPrev(gap, letterIndex);
  }

  function gapStatus(gap: ClozeGap) {
    if (!showResults) return "plain" as const;
    const filled = (values[gap.id] || "").replace(/·/g, "");
    return filled.toLowerCase() === gap.missing.toLowerCase() ? ("ok" as const) : ("bad" as const);
  }

  const reviewGaps = showResults
    ? gaps.map((gap) => {
        const filled = (values[gap.id] || "").replace(/·/g, "");
        const ok = filled.toLowerCase() === gap.missing.toLowerCase();
        return { gap, ok, userMissing: filled };
      })
    : [];

  return (
    <div>
      <div className="text-[17px] font-semibold leading-[2] text-[#334155] sm:text-[18px] sm:leading-[2.05]">
        {parts.map((part, index) => {
          if (part.kind === "text") {
            return (
              <span key={`t-${index}`} className="whitespace-pre-wrap">
                {part.value}
              </span>
            );
          }

          const { gap } = part;
          const prefix = gap.answer.slice(0, gap.shown);
          const status = gapStatus(gap);
          // After check: reveal the correct letters so the learner can study them.
          const chars =
            showResults && status === "bad"
              ? gap.missing.split("")
              : readChars(values[gap.id] || "", gap.missing.length);
          const ring =
            status === "ok"
              ? "border-[#58cc02] bg-[#ecfce5]"
              : status === "bad"
                ? "border-[#1cb0f6] bg-[#e8f6fe]"
                : "border-[#94a3b8] bg-mimo-card";

          return (
            <span key={gap.id} className="inline whitespace-nowrap align-baseline">
              <span className="text-mimo-fg">{prefix}</span>
              {chars.map((display, letterIndex) => {
                const filled = Boolean(display);
                const revealed = showResults && status === "bad";
                const sizeClass = filled
                  ? "mx-px h-[1em] w-[0.7em] rounded-sm border-0 border-b border-[#64748b] bg-transparent p-0 text-[1em] leading-none align-baseline"
                  : "mx-[2px] h-8 w-7 rounded-md border sm:h-9 sm:w-8 align-[-0.2em]";
                return (
                  <input
                    key={`${gap.id}-${letterIndex}`}
                    ref={(el) => {
                      if (!inputRefs.current[gap.id]) inputRefs.current[gap.id] = [];
                      inputRefs.current[gap.id][letterIndex] = el;
                    }}
                    type="text"
                    inputMode="text"
                    autoComplete="off"
                    maxLength={1}
                    disabled={disabled}
                    value={display}
                    readOnly={Boolean(showResults)}
                    aria-label={`${gap.answer} letter ${letterIndex + 1}`}
                    onChange={(e) => setLetter(gap, letterIndex, e.target.value)}
                    onKeyDown={(e) => onKeyDown(gap, letterIndex, e)}
                    className={`inline-block appearance-none border-solid text-center font-semibold lowercase text-mimo-fg outline-none transition-all duration-150 focus:border-[#1cb0f6] focus:ring-1 focus:ring-[#1cb0f6]/25 disabled:opacity-90 ${sizeClass} ${
                      filled ? "" : ring
                    } ${
                      filled && status === "ok"
                        ? "border-b-[#58cc02] text-[#15803d]"
                        : revealed
                          ? "border-b-[#1cb0f6] text-[#0369a1]"
                          : filled && status === "bad"
                            ? "border-b-[#ff4b4b] text-[#b91c1c]"
                            : ""
                    }`}
                  />
                );
              })}
            </span>
          );
        })}
      </div>

      {showResults && reviewGaps.length > 0 && (
        <div className="mt-6 rounded-xl border border-mimo-soft bg-mimo-surface px-4 py-3 text-left">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-mimo-muted">
            Doğru kelimeler
          </p>
          <ul className="mt-2 space-y-1.5">
            {reviewGaps.map(({ gap, ok, userMissing }) => {
              const userWord = `${gap.answer.slice(0, gap.shown)}${userMissing}`;
              return (
                <li key={`review-${gap.id}`} className="text-sm font-semibold">
                  <span className={ok ? "text-[#15803d]" : "text-[#0369a1]"}>
                    {gap.answer}
                  </span>
                  {!ok && userMissing ? (
                    <span className="ml-2 text-xs font-bold text-mimo-muted line-through">
                      senin: {userWord}
                    </span>
                  ) : !ok ? (
                    <span className="ml-2 text-xs font-bold text-mimo-muted">boş bıraktın</span>
                  ) : (
                    <span className="ml-2 text-xs font-bold text-[#86efac]">doğru</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

export function scoreCloze(gaps: ClozeGap[], values: Record<string, string>) {
  let correct = 0;
  for (const gap of gaps) {
    const filled = (values[gap.id] || "").replace(/·/g, "").toLowerCase();
    if (filled === gap.missing.toLowerCase()) correct += 1;
  }
  return { correct, total: gaps.length, wrong: gaps.length - correct };
}

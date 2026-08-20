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

  return (
    <div className="text-[17px] font-semibold leading-[1.85] text-[#334155] sm:text-[18px] sm:leading-[1.9]">
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
        const chars = readChars(values[gap.id] || "", gap.missing.length);
        const status = gapStatus(gap);
        const ring =
          status === "ok"
            ? "border-[#58cc02] bg-[#ecfce5]"
            : status === "bad"
              ? "border-[#ff4b4b] bg-[#ffe8e8]"
              : "border-[#94a3b8] bg-white";

        return (
          <span key={gap.id} className="inline whitespace-nowrap align-baseline">
            <span className="text-[#0f172a]">{prefix}</span>
            {chars.map((display, letterIndex) => (
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
                aria-label={`${gap.answer} letter ${letterIndex + 1}`}
                onChange={(e) => setLetter(gap, letterIndex, e.target.value)}
                onKeyDown={(e) => onKeyDown(gap, letterIndex, e)}
                className={`mx-[1px] inline-block h-[1.15em] w-[0.92em] appearance-none rounded-[3px] border border-solid p-0 text-center text-[0.95em] font-semibold lowercase leading-none text-[#0f172a] align-[-0.12em] outline-none focus:border-[#1cb0f6] focus:ring-1 focus:ring-[#1cb0f6]/30 disabled:opacity-90 ${ring}`}
              />
            ))}
          </span>
        );
      })}
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

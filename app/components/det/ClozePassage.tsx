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

  useEffect(() => {
    const first = gaps[0];
    if (!first || disabled) return;
    inputRefs.current[first.id]?.[0]?.focus();
  }, [disabled, gaps, questionText]);

  function setLetter(gap: ClozeGap, letterIndex: number, raw: string) {
    const ch = raw.replace(/[^a-zA-Z'-]/g, "").slice(-1).toLowerCase();
    const chars = readChars(values[gap.id] || "", gap.missing.length);
    chars[letterIndex] = ch;
    onChange(gap.id, writeChars(chars));

    if (ch && letterIndex < gap.missing.length - 1) {
      inputRefs.current[gap.id]?.[letterIndex + 1]?.focus();
    } else if (ch) {
      const gi = gaps.findIndex((g) => g.id === gap.id);
      const nextGap = gaps[gi + 1];
      if (nextGap) inputRefs.current[nextGap.id]?.[0]?.focus();
    }
  }

  function onKeyDown(gap: ClozeGap, letterIndex: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Backspace") return;
    const chars = readChars(values[gap.id] || "", gap.missing.length);
    if (chars[letterIndex]) return;
    if (letterIndex === 0) return;
    event.preventDefault();
    chars[letterIndex - 1] = "";
    onChange(gap.id, writeChars(chars));
    inputRefs.current[gap.id]?.[letterIndex - 1]?.focus();
  }

  function gapStatus(gap: ClozeGap) {
    if (!showResults) return "plain" as const;
    const filled = (values[gap.id] || "").replace(/·/g, "");
    return filled.toLowerCase() === gap.missing.toLowerCase() ? ("ok" as const) : ("bad" as const);
  }

  return (
    <div className="text-[17px] font-semibold leading-[2.15] text-[#334155] sm:text-[18px]">
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
              : "border-[#c5ced6] bg-white";

        return (
          <span key={gap.id} className="mx-0.5 inline-flex items-end align-baseline">
            <span className="text-[#0f172a]">{prefix}</span>
            <span className="ml-0.5 inline-flex gap-[3px]">
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
                  className={`h-8 w-7 rounded-[6px] border text-center text-[15px] font-bold lowercase text-[#0f172a] outline-none focus:border-[#1cb0f6] focus:ring-2 focus:ring-[#1cb0f6]/20 disabled:opacity-90 sm:h-9 sm:w-8 ${ring}`}
                />
              ))}
            </span>
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

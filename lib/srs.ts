import { addDays, format } from "date-fns";
import type { Quality, SM2Result } from "@/types";

/**
 * SM-2 spaced repetition adapted for quality 0–3
 * 0 Again | 1 Hard | 2 Good | 3 Easy
 */
export function calculateSM2(
  easeFactor: number,
  repetition: number,
  interval: number,
  quality: Quality
): SM2Result {
  let nextEase = easeFactor;
  let nextRepetition = repetition;
  let nextInterval = interval;

  if (quality < 2) {
    nextRepetition = 0;
    nextInterval = 1;
    nextEase = Math.max(1.3, easeFactor - 0.2);
  } else {
    if (repetition === 0) {
      nextInterval = 1;
    } else if (repetition === 1) {
      nextInterval = quality === 3 ? 4 : 6;
    } else {
      const factor = quality === 3 ? nextEase * 1.3 : nextEase;
      nextInterval = Math.max(1, Math.round(interval * factor));
    }
    nextRepetition = repetition + 1;
    const q = quality === 2 ? 4 : 5;
    nextEase = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
    if (nextEase < 1.3) nextEase = 1.3;
  }

  const nextReviewDate =
    quality === 0
      ? format(new Date(), "yyyy-MM-dd")
      : format(addDays(new Date(), nextInterval), "yyyy-MM-dd");

  return {
    easeFactor: Number(nextEase.toFixed(2)),
    repetition: nextRepetition,
    interval: nextInterval,
    nextReviewDate,
  };
}

export function normalizeAnswer(value: string): string {
  return value
    .toLocaleLowerCase("tr")
    .trim()
    .replace(/[.,!?']/g, "")
    .replace(/\s+/g, " ");
}

export function answersMatch(input: string, expected: string): boolean {
  const a = normalizeAnswer(input);
  const b = normalizeAnswer(expected);
  if (a === b) return true;
  const variants = b.split("/").map((part) => part.trim());
  return variants.includes(a);
}

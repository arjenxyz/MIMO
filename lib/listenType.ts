import { normalizeEnglishKey } from "@/lib/wordNormalize";

export type ListenTypePrompt = {
  id: string;
  text: string;
  audioUrl?: string | null;
};

const FALLBACK_SENTENCES = [
  "Please leave your bags at the front desk.",
  "The meeting will start in fifteen minutes.",
  "She bought fresh vegetables from the market.",
  "Could you open the window a little?",
  "We decided to walk instead of taking the bus.",
  "His answer was both clear and honest.",
  "They moved to a quieter neighborhood last year.",
  "Remember to turn off the lights before you leave.",
  "I need to finish this report by Friday.",
  "The train arrived earlier than expected.",
  "Would you mind repeating that last sentence?",
  "Children were playing outside after school.",
];

/** Compare typed answer to target — ignore case, punctuation, extra spaces. */
export function normalizeDictation(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isDictationCorrect(answer: string, expected: string): boolean {
  return normalizeDictation(answer) === normalizeDictation(expected);
}

export function buildListenTypeRound(
  seed: Array<{ english: string; example_sentence?: string | null; audio_url?: string | null }>,
  count = 8
): ListenTypePrompt[] {
  const fromSeed: ListenTypePrompt[] = [];
  const seen = new Set<string>();

  for (const row of seed) {
    const sentence = row.example_sentence?.trim();
    const text = sentence && sentence.length >= 12 ? sentence : null;
    if (!text) continue;
    const key = normalizeDictation(text);
    if (seen.has(key)) continue;
    seen.add(key);
    fromSeed.push({
      id: `s-${fromSeed.length}-${normalizeEnglishKey(row.english)}`,
      text,
      audioUrl: row.audio_url ?? null,
    });
  }

  const prompts: ListenTypePrompt[] = [...fromSeed];

  for (const text of FALLBACK_SENTENCES) {
    if (prompts.length >= count) break;
    const key = normalizeDictation(text);
    if (seen.has(key)) continue;
    seen.add(key);
    prompts.push({ id: `f-${prompts.length}`, text, audioUrl: null });
  }

  // Shuffle
  for (let i = prompts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [prompts[i], prompts[j]] = [prompts[j]!, prompts[i]!];
  }

  return prompts.slice(0, count);
}

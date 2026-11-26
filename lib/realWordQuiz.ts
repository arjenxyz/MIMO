export type RealWordItem = {
  id: string;
  /** Shown on screen — correct spelling or a misspelling. */
  word: string;
  isReal: boolean;
  /** Learned word this question is based on. */
  sourceWord: string;
};

const DEMO_FALLBACK = [
  "friend",
  "mother",
  "father",
  "water",
  "school",
  "please",
  "because",
  "beautiful",
  "together",
  "important",
  "different",
  "language",
  "practice",
  "remember",
  "through",
  "enough",
  "although",
  "receive",
  "believe",
  "people",
];

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

function normalizeWord(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z'-]/g, "");
}

function swapAdjacent(word: string, i: number): string {
  if (i < 0 || i >= word.length - 1) return word;
  const chars = word.split("");
  [chars[i], chars[i + 1]] = [chars[i + 1]!, chars[i]!];
  return chars.join("");
}

function doubleLetter(word: string, i: number): string {
  if (i < 0 || i >= word.length) return word;
  return word.slice(0, i + 1) + word[i] + word.slice(i + 1);
}

function dropLetter(word: string, i: number): string {
  if (word.length < 4 || i < 0 || i >= word.length) return word;
  return word.slice(0, i) + word.slice(i + 1);
}

function replaceVowel(word: string, i: number): string {
  const vowels = "aeiou";
  const ch = word[i];
  if (!ch || !vowels.includes(ch)) return word;
  const alt = vowels.replace(ch, "");
  const next = alt[Math.floor(Math.random() * alt.length)]!;
  return word.slice(0, i) + next + word.slice(i + 1);
}

function insertLetter(word: string, i: number): string {
  const extras = "aeiourlnst";
  const ch = extras[Math.floor(Math.random() * extras.length)]!;
  const at = Math.max(1, Math.min(i, word.length - 1));
  return word.slice(0, at) + ch + word.slice(at);
}

function ieEiSwap(word: string): string | null {
  if (word.includes("ie")) return word.replace("ie", "ei");
  if (word.includes("ei")) return word.replace("ei", "ie");
  return null;
}

/**
 * Plausible misspelling of a learned word (e.g. friend → firiend).
 * Never returns the original spelling; avoids colliding with known words.
 */
export function misspellLearnedWord(
  word: string,
  blocked: Set<string>
): string | null {
  const w = normalizeWord(word);
  if (w.length < 4) return null;

  const attempts: Array<() => string | null> = [
    () => {
      const i = 1 + Math.floor(Math.random() * (w.length - 2));
      return swapAdjacent(w, i);
    },
    () => {
      const i = Math.floor(Math.random() * w.length);
      return doubleLetter(w, i);
    },
    () => {
      const i = 1 + Math.floor(Math.random() * (w.length - 2));
      return dropLetter(w, i);
    },
    () => {
      const vowelIdx = Array.from(w)
        .map((ch, i) => ("aeiou".includes(ch) ? i : -1))
        .filter((i) => i > 0 && i < w.length - 1);
      if (!vowelIdx.length) return null;
      return replaceVowel(w, vowelIdx[Math.floor(Math.random() * vowelIdx.length)]!);
    },
    () => insertLetter(w, 1 + Math.floor(Math.random() * (w.length - 1))),
    () => ieEiSwap(w),
    // friend-style: insert vowel after first vowel cluster
    () => {
      const m = w.match(/^[bcdfghjklmnpqrstvwxyz]+[aeiou]/);
      if (!m || m[0].length >= w.length) return null;
      return w.slice(0, m[0].length) + "i" + w.slice(m[0].length);
    },
  ];

  for (let n = 0; n < 24; n++) {
    const fn = attempts[n % attempts.length]!;
    const candidate = fn();
    if (!candidate) continue;
    const miss = candidate.toLowerCase().replace(/[^a-z'-]/g, "");
    if (miss.length < 3 || miss.length > w.length + 2) continue;
    if (miss === w) continue;
    if (blocked.has(miss)) continue;
    return miss;
  }

  // Deterministic last resort: swap middle pair
  const mid = Math.max(1, Math.floor(w.length / 2) - 1);
  const fallback = swapAdjacent(w, mid);
  if (fallback !== w && !blocked.has(fallback)) return fallback;
  return null;
}

export function buildRealWordRound(
  userWords: string[],
  /** Omit to use every eligible word once. */
  questionCount?: number
): RealWordItem[] {
  const seen = new Set<string>();
  const pool: string[] = [];

  for (const raw of userWords) {
    const w = normalizeWord(raw);
    if (!w || w.length < 3 || seen.has(w)) continue;
    // Prefer spellable single tokens (skip long phrases)
    if (w.includes(" ")) continue;
    seen.add(w);
    pool.push(w);
  }

  // Demo / thin lists: top up with familiar practice words only when needed
  if (pool.length < 6) {
    for (const w of DEMO_FALLBACK) {
      if (seen.has(w)) continue;
      seen.add(w);
      pool.push(w);
      if (pool.length >= 12) break;
    }
  }

  if (!pool.length) {
    const fallbackCount = questionCount ?? DEMO_FALLBACK.length;
    return DEMO_FALLBACK.slice(0, fallbackCount).map((word, i) => ({
      id: `q-${i}-${word}`,
      word,
      isReal: true,
      sourceWord: word,
    }));
  }

  const blocked = new Set(pool);
  const items: RealWordItem[] = [];
  const order = shuffle(pool);
  const limit =
    typeof questionCount === "number"
      ? Math.min(questionCount, order.length)
      : order.length;
  const sources = order.slice(0, limit);

  for (let i = 0; i < sources.length; i++) {
    const source = sources[i]!;
    const wantReal = Math.random() < 0.5;

    if (wantReal) {
      items.push({
        id: `q-${i}-real-${source}`,
        word: source,
        isReal: true,
        sourceWord: source,
      });
      continue;
    }

    const miss = misspellLearnedWord(source, blocked);
    if (miss) {
      blocked.add(miss);
      items.push({
        id: `q-${i}-fake-${miss}`,
        word: miss,
        isReal: false,
        sourceWord: source,
      });
    } else {
      // Couldn't misspell (very short) — show correct form instead
      items.push({
        id: `q-${i}-real-${source}`,
        word: source,
        isReal: true,
        sourceWord: source,
      });
    }
  }

  return shuffle(items);
}

import { isListedEnglishWord, sampleListedWords } from "@/lib/wordLevel";

export type RealWordItem = {
  id: string;
  word: string;
  isReal: boolean;
};

const ONSETS = [
  "b", "c", "d", "f", "g", "h", "j", "k", "l", "m", "n", "p", "r", "s", "t", "v", "w", "z",
  "bl", "br", "cl", "cr", "dr", "fl", "fr", "gl", "gr", "pl", "pr", "sc", "sk", "sl", "sm",
  "sn", "sp", "st", "sw", "tr", "tw", "ch", "sh", "th", "qu",
];
const NUCLEI = ["a", "e", "i", "o", "u", "ai", "ea", "ee", "oa", "oo", "ou", "ie", "ue"];
const CODAS = ["", "b", "d", "g", "k", "m", "n", "p", "t", "ck", "ll", "ss", "st", "nd", "nt", "mp", "ng"];
const PREFIXES = ["re", "un", "in", "dis", "pre", "over", "mis", "non", "anti", "inter"];
const ROOTS = [
  "form", "ject", "duct", "spect", "scrib", "ceive", "tend", "tain", "volve", "clude",
  "flect", "gress", "pose", "port", "press", "rupt", "sist", "tract", "vert", "lible",
  "nable", "vable", "mable", "pable",
];
const SUFFIXES = [
  "able", "ible", "tion", "sion", "ment", "ness", "ful", "less", "ous", "ive", "al",
  "ity", "ence", "ance", "ure", "ize", "ate", "ish", "ary",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function syllable(): string {
  return `${pick(ONSETS)}${pick(NUCLEI)}${pick(CODAS)}`;
}

/** Plausible English-looking nonce words (not in curated CEFR list). */
export function makeFakeEnglishWord(blocked: Set<string>): string {
  for (let attempt = 0; attempt < 40; attempt++) {
    let word = "";
    const mode = Math.random();
    if (mode < 0.45) {
      word = `${pick(PREFIXES)}${pick(ROOTS)}${pick(SUFFIXES)}`.replace(/(.)\1{2,}/g, "$1$1");
    } else if (mode < 0.75) {
      const n = Math.random() < 0.55 ? 2 : 3;
      word = Array.from({ length: n }, syllable).join("");
    } else {
      word = `${syllable()}${pick(SUFFIXES)}`;
    }

    word = word.toLowerCase().replace(/[^a-z]/g, "");
    if (word.length < 5 || word.length > 12) continue;
    if (blocked.has(word) || isListedEnglishWord(word)) continue;
    // Avoid accidental real dictionary hits on ultra-common short stems
    if (/^(the|and|for|with|from|that|this|have|were|been)$/.test(word)) continue;
    return word;
  }
  return "alible";
}

export function buildRealWordRound(
  userWords: string[],
  questionCount = 12
): RealWordItem[] {
  const blocked = new Set<string>();
  const realPool: string[] = [];

  for (const raw of userWords) {
    const w = raw.trim().toLowerCase().replace(/[^a-z'-]/g, "");
    if (!w || w.length < 3 || blocked.has(w)) continue;
    blocked.add(w);
    realPool.push(w);
  }

  for (const w of sampleListedWords(80)) {
    if (blocked.has(w)) continue;
    blocked.add(w);
    realPool.push(w);
  }

  const items: RealWordItem[] = [];
  const usedFake = new Set<string>();

  for (let i = 0; i < questionCount; i++) {
    const wantReal = Math.random() < 0.5 && realPool.length > 0;
    if (wantReal) {
      const word = realPool[i % realPool.length]!;
      items.push({ id: `q-${i}-${word}`, word, isReal: true });
    } else {
      const fake = makeFakeEnglishWord(new Set([...Array.from(blocked), ...Array.from(usedFake)]));
      usedFake.add(fake);
      items.push({ id: `q-${i}-${fake}`, word: fake, isReal: false });
    }
  }

  // Shuffle questions
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j]!, items[i]!];
  }

  return items;
}

import { findWordImageUrl } from "@/lib/wordImage";
import { detectWordLevel, type CefrLevel } from "@/lib/wordLevel";

export type WordLookupResult = {
  english: string;
  turkish: string;
  example_sentence: string | null;
  phonetic: string | null;
  audio_url: string | null;
  image_url: string | null;
  cefr: CefrLevel;
  difficulty: 1 | 2 | 3 | 4 | 5;
  level_source: "list" | "gemini" | "heuristic";
  source: "dictionary+mymemory" | "mymemory" | "manual";
};

function normalizeWord(raw: string) {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

function ensureHttps(url: string) {
  if (url.startsWith("//")) return `https:${url}`;
  return url;
}

type DictionaryEntry = {
  word?: string;
  phonetic?: string;
  phonetics?: Array<{ text?: string; audio?: string }>;
  meanings?: Array<{
    definitions?: Array<{ definition?: string; example?: string }>;
  }>;
};

async function fetchDictionary(word: string) {
  const res = await fetch(
    `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
    { next: { revalidate: 86400 } }
  );
  if (!res.ok) return null;
  const data = (await res.json()) as DictionaryEntry[];
  const entry = data[0];
  if (!entry) return null;

  const phonetic =
    entry.phonetic ||
    entry.phonetics?.find((p) => p.text)?.text ||
    null;

  const audioRaw = entry.phonetics?.find((p) => p.audio)?.audio || null;
  const audio_url = audioRaw ? ensureHttps(audioRaw) : null;

  let example: string | null = null;
  for (const meaning of entry.meanings ?? []) {
    for (const def of meaning.definitions ?? []) {
      if (def.example) {
        example = def.example;
        break;
      }
    }
    if (example) break;
  }

  return {
    english: (entry.word || word).toLowerCase(),
    phonetic,
    audio_url,
    example_sentence: example,
  };
}

async function translateToTurkish(text: string) {
  const url = new URL("https://api.mymemory.translated.net/get");
  url.searchParams.set("q", text);
  url.searchParams.set("langpair", "en|tr");

  const res = await fetch(url.toString(), { next: { revalidate: 86400 } });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    responseData?: { translatedText?: string };
    responseStatus?: number;
  };
  const translated = data.responseData?.translatedText?.trim();
  if (!translated || translated.toLowerCase() === text.toLowerCase()) return null;
  return translated;
}

export async function lookupEnglishWord(raw: string): Promise<WordLookupResult | { error: string }> {
  const word = normalizeWord(raw);
  if (!word || word.length > 60) {
    return { error: "Geçerli bir İngilizce kelime gir." };
  }
  if (!/^[a-z][a-z\s'-]*$/i.test(word)) {
    return { error: "Sadece harf içeren kelimeler destekleniyor." };
  }

  const dict = await fetchDictionary(word);
  const english = dict?.english || word;
  const [turkish, image_url, level] = await Promise.all([
    translateToTurkish(english),
    findWordImageUrl(english),
    detectWordLevel(english),
  ]);

  if (!turkish) {
    return {
      error:
        "Türkçe anlam bulunamadı. Kelimeyi kontrol et veya biraz sonra tekrar dene.",
    };
  }

  return {
    english,
    turkish,
    example_sentence: dict?.example_sentence ?? null,
    phonetic: dict?.phonetic ?? null,
    audio_url: dict?.audio_url ?? null,
    image_url,
    cefr: level.cefr,
    difficulty: level.difficulty,
    level_source: level.source,
    source: dict ? "dictionary+mymemory" : "mymemory",
  };
}

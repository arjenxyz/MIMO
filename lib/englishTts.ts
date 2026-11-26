/**
 * Trusted English-only pronunciation sources for MIMO.
 * Turkish / mixed / unknown voices and non-English TTS hosts are excluded.
 */

/** Known-good English SpeechSynthesis voice name fragments (Windows / macOS / Chrome). */
const TRUSTED_ENGLISH_VOICE_NAMES =
  /^(google us english|google uk english|microsoft (zira|aria|jenny|guy|sara|ana|christopher|eric|michelle|roger|steffan)|zira|aria|jenny|samantha|alex|victoria|daniel|karen|moira|tessa|fiona|serena|susan|karen|moira|raveena|salli|joanna|ivy|kimberly|kendra|matthew|justin|joey|brian|amy|emma|olivia)$/i;

const TRUSTED_ENGLISH_VOICE_HINT =
  /\b(google us english|google uk english female|google uk english male|microsoft zira|microsoft aria|microsoft jenny|microsoft guy|zira desktop|aria online|samantha|alex|victoria|daniel)\b/i;

/** Hosts that serve real English audio (dictionary / Google en-US TTS). */
const TRUSTED_AUDIO_HOSTS = [
  "translate.googleapis.com",
  "translate.google.com",
  "api.dictionaryapi.dev",
  "ssl.gstatic.com",
];

export type EnglishTtsProviderId = "google-en-us" | "google-en" | "dictionary-url";

export type EnglishTtsProvider = {
  id: EnglishTtsProviderId;
  label: string;
  /** Build a fetchable URL for the given English text. */
  buildUrl: (text: string) => string;
};

/**
 * Ordered list of remote English TTS providers we allow in production.
 * Youdao and other non-English hosts are intentionally omitted.
 */
export const ENGLISH_TTS_PROVIDERS: EnglishTtsProvider[] = [
  {
    id: "google-en-us",
    label: "Google Translate TTS (en-US)",
    buildUrl: (text) => {
      const q = encodeURIComponent(text.trim().slice(0, 180));
      return `https://translate.googleapis.com/translate_tts?ie=UTF-8&client=gtx&tl=en-US&q=${q}`;
    },
  },
  {
    id: "google-en",
    label: "Google Translate TTS (en)",
    buildUrl: (text) => {
      const q = encodeURIComponent(text.trim().slice(0, 180));
      return `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=${q}`;
    },
  },
];

export function normalizeEnglishText(text: string): string {
  return text.trim().slice(0, 180);
}

/** Same-origin proxy URL (server fetches trusted English providers). */
export function englishTtsProxyUrl(text: string, dictionaryUrl?: string | null): string {
  const params = new URLSearchParams({ q: normalizeEnglishText(text) });
  if (dictionaryUrl?.trim() && isTrustedEnglishAudioUrl(dictionaryUrl)) {
    params.set("url", dictionaryUrl.trim());
  }
  return `/api/word-audio?${params.toString()}`;
}

export function buildTrustedEnglishTtsUrls(text: string): string[] {
  const trimmed = normalizeEnglishText(text);
  if (!trimmed) return [];
  return ENGLISH_TTS_PROVIDERS.map((p) => p.buildUrl(trimmed));
}

/**
 * Accept dictionary / Google English audio URLs only.
 * Reject Youdao and other non-English hosts.
 */
export function isTrustedEnglishAudioUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    const host = u.hostname.toLowerCase();

    // Explicit English Google TTS
    if (host.includes("translate.google")) {
      const tl = (u.searchParams.get("tl") || "").toLowerCase();
      return tl === "en" || tl === "en-us" || tl === "en-gb" || tl.startsWith("en-");
    }

    // Free Dictionary / Wikimedia-style English clips
    if (
      host.includes("dictionaryapi.dev") ||
      host.endsWith("gstatic.com") ||
      host.includes("oxforddictionaries") ||
      host.includes("lexico.com") ||
      host.includes("cambridge.org")
    ) {
      return true;
    }

    // Block Youdao and everything else
    if (host.includes("youdao.com")) return false;

    return TRUSTED_AUDIO_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

function isStrictEnglishLang(lang: string): boolean {
  const normalized = lang.toLowerCase().replace(/_/g, "-");
  return (
    normalized === "en" ||
    normalized.startsWith("en-us") ||
    normalized.startsWith("en-gb") ||
    normalized.startsWith("en-au") ||
    normalized.startsWith("en-ca") ||
    normalized.startsWith("en-in") ||
    normalized.startsWith("en-ie") ||
    normalized.startsWith("en-nz") ||
    normalized.startsWith("en-za")
  );
}

function isTurkishOrOther(lang: string, name: string): boolean {
  const l = lang.toLowerCase().replace(/_/g, "-");
  const n = name.toLowerCase();
  if (l.startsWith("tr")) return true;
  if (/\bturkish\b|\btürkçe\b|\bturk\b/.test(n)) return true;
  // Reject voices that are clearly non-English
  if (l && !l.startsWith("en") && !/\benglish\b/.test(n)) return true;
  return false;
}

/**
 * Score only voices that are confidently English.
 * Returns 0 for untrusted voices (they must not be used).
 */
export function scoreEnglishVoice(voice: SpeechSynthesisVoice): number {
  const lang = voice.lang || "";
  const name = voice.name || "";

  if (isTurkishOrOther(lang, name)) return 0;
  if (!isStrictEnglishLang(lang) && !/\benglish\b/i.test(name)) return 0;

  let score = 0;
  const langN = lang.toLowerCase().replace(/_/g, "-");
  if (langN.startsWith("en-us")) score += 50;
  else if (langN.startsWith("en-gb")) score += 40;
  else if (langN.startsWith("en")) score += 25;

  if (TRUSTED_ENGLISH_VOICE_NAMES.test(name.trim()) || TRUSTED_ENGLISH_VOICE_HINT.test(name)) {
    score += 40;
  } else if (/\benglish\b/i.test(name)) {
    score += 15;
  } else {
    // lang is en-* but name unknown — weak candidate
    score += 5;
  }

  if (/natural|neural|online|premium/i.test(name)) score += 10;
  if (/google/i.test(name)) score += 12;
  if (/microsoft/i.test(name) && /en/i.test(lang)) score += 8;

  // Require a minimum confidence: either trusted name or clear en-US/GB lang
  if (score < 30 && !langN.startsWith("en-us") && !langN.startsWith("en-gb")) {
    return 0;
  }

  return score;
}

/** Pick the best trusted English system voice, or null if none are safe. */
export function pickTrustedEnglishVoice(
  voices?: SpeechSynthesisVoice[]
): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const list = voices ?? window.speechSynthesis.getVoices();
  const ranked = list
    .map((v) => ({ v, score: scoreEnglishVoice(v) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);
  return ranked[0]?.v ?? null;
}

/** Voices we consider safe for English pronunciation on this device. */
export function listTrustedEnglishVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  return window.speechSynthesis
    .getVoices()
    .filter((v) => scoreEnglishVoice(v) > 0)
    .sort((a, b) => scoreEnglishVoice(b) - scoreEnglishVoice(a));
}

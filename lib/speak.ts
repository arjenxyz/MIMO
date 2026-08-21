/** Stop overlapping playback from a previous tap. */
let activeAudio: HTMLAudioElement | null = null;

function stopActiveAudio() {
  if (!activeAudio) return;
  try {
    activeAudio.pause();
    activeAudio.removeAttribute("src");
    activeAudio.load();
  } catch {
    // ignore
  }
  activeAudio = null;
}

function playRemoteUrl(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    stopActiveAudio();
    const audio = new Audio();
    activeAudio = audio;

    let settled = false;
    const finish = (err?: Error) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      audio.removeEventListener("canplaythrough", onReady);
      audio.removeEventListener("error", onError);
      if (err) reject(err);
      else resolve();
    };

    const onReady = () => {
      audio
        .play()
        .then(() => finish())
        .catch((e) => finish(e instanceof Error ? e : new Error("play failed")));
    };
    const onError = () => finish(new Error("audio error"));

    const timer = window.setTimeout(() => finish(new Error("audio timeout")), 5000);
    audio.addEventListener("canplaythrough", onReady);
    audio.addEventListener("error", onError);
    audio.src = url;
    audio.load();
  });
}

/** English remote TTS — avoids Turkish Windows speechSynthesis accent. */
function englishRemoteUrls(text: string): string[] {
  const q = encodeURIComponent(text.trim().slice(0, 180));
  const word = encodeURIComponent(text.trim().split(/\s+/)[0] ?? text);
  return [
    // Youdao US English (works well for single words)
    `https://dict.youdao.com/dictvoice?audio=${word}&type=2`,
    // Google Translate TTS (en)
    `https://translate.googleapis.com/translate_tts?ie=UTF-8&client=gtx&tl=en&q=${q}`,
    `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=${q}`,
  ];
}

async function speakViaEnglishRemote(text: string): Promise<boolean> {
  for (const url of englishRemoteUrls(text)) {
    try {
      await playRemoteUrl(url);
      return true;
    } catch {
      // try next source
    }
  }
  return false;
}

const FEMALE_HINT =
  /female|woman|zira|hazel|samantha|victoria|karen|moira|tessa|fiona|serena|susan|linda|kate|ava|emma|jenny|aria|salli|joanna|ivy|kimberly|kendra|nicole|raveena|sonia|anya|neerja/i;

function isEnglishVoice(v: SpeechSynthesisVoice): boolean {
  const lang = (v.lang || "").toLowerCase().replace(/_/g, "-");
  if (lang.startsWith("tr")) return false;
  if (lang.startsWith("en")) return true;
  return /\benglish\b|\ben-?us\b|\ben-?gb\b/i.test(v.name);
}

function isTurkishVoice(v: SpeechSynthesisVoice): boolean {
  const lang = (v.lang || "").toLowerCase().replace(/_/g, "-");
  return lang.startsWith("tr") || /\bturkish\b|\btürkçe\b|\bturk/i.test(v.name);
}

function pickEnglishVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;

  const english = window.speechSynthesis
    .getVoices()
    .filter((v) => !isTurkishVoice(v) && isEnglishVoice(v));
  if (!english.length) return null;

  const score = (v: SpeechSynthesisVoice) => {
    let s = 0;
    const lang = (v.lang || "").toLowerCase().replace(/_/g, "-");
    if (lang.startsWith("en-us")) s += 40;
    else if (lang.startsWith("en-gb")) s += 30;
    else if (lang.startsWith("en")) s += 20;
    if (FEMALE_HINT.test(v.name)) s += 25;
    if (/zira/i.test(v.name)) s += 20;
    if (/google/i.test(v.name)) s += 10;
    return s;
  };

  return [...english].sort((a, b) => score(b) - score(a))[0] ?? null;
}

function loadVoices(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      resolve();
      return;
    }
    if (window.speechSynthesis.getVoices().length) {
      resolve();
      return;
    }
    const done = () => {
      window.speechSynthesis.removeEventListener("voiceschanged", done);
      resolve();
    };
    window.speechSynthesis.addEventListener("voiceschanged", done);
    window.setTimeout(done, 600);
  });
}

/**
 * Prefer remote English audio. Never use the OS default voice — on Turkish
 * Windows that produces Turkish-accented (or fully Turkish) speech even with lang=en-US.
 */
export async function speak(text: string, rate = 0.9) {
  if (typeof window === "undefined") return;
  const trimmed = text.trim();
  if (!trimmed) return;

  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }

  const ok = await speakViaEnglishRemote(trimmed);
  if (ok) return;

  await loadVoices();
  const voice = pickEnglishVoice();
  if (!voice) return; // stay silent rather than speak Turkish

  const utterance = new SpeechSynthesisUtterance(trimmed);
  utterance.voice = voice;
  utterance.lang = "en-US";
  utterance.rate = rate;
  window.setTimeout(() => window.speechSynthesis?.speak(utterance), 40);
}

export function playWordAudio(word: string, audioUrl?: string | null) {
  if (typeof window === "undefined") return;

  const run = async () => {
    if (audioUrl) {
      try {
        await playRemoteUrl(audioUrl);
        return;
      } catch {
        // fall through
      }
    }
    await speak(word);
  };

  void run();
}

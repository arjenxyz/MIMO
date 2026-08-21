/** Stop overlapping playback from a previous tap. */
let activeAudio: HTMLAudioElement | null = null;
let playGeneration = 0;

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
  const generation = ++playGeneration;

  return new Promise((resolve, reject) => {
    stopActiveAudio();
    const audio = new Audio();
    activeAudio = audio;
    audio.preload = "auto";

    let settled = false;
    let started = false;

    const cleanup = () => {
      window.clearTimeout(timer);
      audio.removeEventListener("canplaythrough", onReady);
      audio.removeEventListener("loadeddata", onReady);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };

    const finish = (err?: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (err) reject(err);
      else resolve();
    };

    const onEnded = () => {
      if (generation !== playGeneration) {
        finish();
        return;
      }
      const duration = Number.isFinite(audio.duration) ? audio.duration : audio.currentTime;
      if (duration > 0 && duration < 0.12) {
        finish(new Error("audio too short"));
        return;
      }
      finish();
    };

    const onReady = () => {
      if (settled || started || generation !== playGeneration) return;
      const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
      if (duration > 0 && duration < 0.12) {
        finish(new Error("audio too short"));
        return;
      }
      started = true;
      audio
        .play()
        .catch((e) => finish(e instanceof Error ? e : new Error("play failed")));
    };

    const onError = () => finish(new Error("audio error"));

    const timer = window.setTimeout(() => {
      if (generation !== playGeneration) {
        finish();
        return;
      }
      // Long phrase still playing — treat as success rather than cutting it off.
      if (!audio.paused && audio.currentTime > 0.25) {
        finish();
        return;
      }
      finish(new Error("audio timeout"));
    }, 20000);

    audio.addEventListener("canplaythrough", onReady);
    audio.addEventListener("loadeddata", onReady);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    audio.src = url;
    audio.load();
  });
}

/**
 * Remote English TTS. Youdao is single-word only — using it for phrases
 * produced half-spoken / garbled audio (first token only).
 */
function englishRemoteUrls(text: string): string[] {
  const trimmed = text.trim().slice(0, 180);
  const q = encodeURIComponent(trimmed);
  const isSingleWord = /^[a-zA-Z][a-zA-Z'-]*$/.test(trimmed);
  const urls: string[] = [
    `https://translate.googleapis.com/translate_tts?ie=UTF-8&client=gtx&tl=en-US&q=${q}`,
    `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=${q}`,
  ];
  if (isSingleWord) {
    urls.push(`https://dict.youdao.com/dictvoice?audio=${q}&type=2`);
  }
  return urls;
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
  /female|woman|zira|hazel|samantha|victoria|karen|moira|tessa|fiona|serena|susan|linda|kate|ava|emma|jenny|aria|salli|joanna|ivy|kimberly|kendra|nicole|raveena|sonia|anya|neerja|microsoft.*aria|google us english/i;

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
    const name = v.name || "";
    if (lang.startsWith("en-us")) s += 40;
    else if (lang.startsWith("en-gb")) s += 30;
    else if (lang.startsWith("en")) s += 20;
    if (FEMALE_HINT.test(name)) s += 25;
    if (/zira/i.test(name)) s += 20;
    if (/google/i.test(name)) s += 15;
    if (/natural|neural|online/i.test(name)) s += 12;
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
    window.setTimeout(done, 800);
  });
}

function speakViaSpeechSynthesis(text: string, rate: number): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      resolve(false);
      return;
    }

    const voice = pickEnglishVoice();
    if (!voice) {
      resolve(false);
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voice;
    utterance.lang = voice.lang?.startsWith("en") ? voice.lang : "en-US";
    utterance.rate = Math.min(1, Math.max(0.75, rate));
    utterance.pitch = 1;
    utterance.onend = () => resolve(true);
    utterance.onerror = () => resolve(false);

    window.setTimeout(() => {
      try {
        window.speechSynthesis.speak(utterance);
      } catch {
        resolve(false);
      }
    }, 60);
  });
}

/**
 * Prefer remote English audio. Never use the OS default voice — on Turkish
 * Windows that produces Turkish-accented (or fully Turkish) speech even with lang=en-US.
 */
export async function speak(text: string, rate = 0.92) {
  if (typeof window === "undefined") return;
  const trimmed = text.trim();
  if (!trimmed) return;

  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  stopActiveAudio();

  const ok = await speakViaEnglishRemote(trimmed);
  if (ok) return;

  await loadVoices();
  await speakViaSpeechSynthesis(trimmed, rate);
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

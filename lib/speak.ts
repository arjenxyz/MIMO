import {
  englishTtsProxyUrl,
  isTrustedEnglishAudioUrl,
  pickTrustedEnglishVoice,
} from "@/lib/englishTts";

/** Stop overlapping playback from a previous tap. */
let activeAudio: HTMLAudioElement | null = null;
let playGeneration = 0;

function stopActiveAudio() {
  if (!activeAudio) return;
  try {
    activeAudio.pause();
    activeAudio.currentTime = 0;
  } catch {
    // ignore
  }
  activeAudio = null;
}

/** Primed elements keyed by stable word key (`local:word`) or remote URL. */
const primedAudio = new Map<string, HTMLAudioElement>();

function wordPrimeKey(word: string) {
  return `local:${word.trim().toLowerCase()}`;
}

function takePrimed(key: string) {
  const existing = primedAudio.get(key);
  if (!existing) return new Audio();
  return existing;
}

function playUrlNow(url: string, primeKey?: string): Promise<void> {
  const generation = ++playGeneration;

  return new Promise((resolve, reject) => {
    stopActiveAudio();
    const audio = primeKey ? takePrimed(primeKey) : new Audio();
    if (primeKey) primedAudio.set(primeKey, audio);
    activeAudio = audio;
    audio.preload = "auto";

    let settled = false;
    let started = false;

    const cleanup = () => {
      window.clearTimeout(timer);
      audio.removeEventListener("canplay", onReady);
      audio.removeEventListener("canplaythrough", onReady);
      audio.removeEventListener("loadeddata", onReady);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };

    const finish = (err?: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (err) {
        try {
          audio.pause();
        } catch {
          // ignore
        }
        reject(err);
      } else resolve();
    };

    const onEnded = () => {
      if (generation !== playGeneration) {
        finish();
        return;
      }
      finish();
    };

    const onReady = () => {
      if (settled || started || generation !== playGeneration) return;
      started = true;
      try {
        audio.currentTime = 0;
      } catch {
        // ignore
      }
      audio
        .play()
        .catch((e) => {
          const blocked = e instanceof DOMException && e.name === "NotAllowedError";
          finish(new Error(blocked ? "autoplay blocked" : "play failed"));
        });
    };

    const onError = () => finish(new Error("audio error"));

    const isBlob = url.startsWith("blob:");
    const timer = window.setTimeout(
      () => {
        if (generation !== playGeneration || started) {
          finish();
          return;
        }
        if (audio.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          onReady();
          return;
        }
        finish(new Error("audio timeout"));
      },
      isBlob ? 1200 : 3500
    );

    audio.addEventListener("canplay", onReady);
    audio.addEventListener("canplaythrough", onReady);
    audio.addEventListener("loadeddata", onReady);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    if (audio.src !== url) {
      audio.src = url;
    }
    if (isBlob || audio.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      onReady();
    } else {
      try {
        audio.load();
      } catch {
        // ignore
      }
    }
  });
}

/** Only the trusted English proxy (Google en-US behind /api/word-audio). */
function englishRemoteUrls(text: string, dictionaryUrl?: string | null): string[] {
  return [englishTtsProxyUrl(text, dictionaryUrl)];
}

async function speakViaEnglishRemote(
  text: string,
  dictionaryUrl?: string | null
): Promise<boolean> {
  for (const url of englishRemoteUrls(text, dictionaryUrl)) {
    try {
      await playUrlNow(url);
      return true;
    } catch (err) {
      if (err instanceof Error && err.message === "autoplay blocked") return false;
    }
  }
  return false;
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

/**
 * Fallback only when a trusted English system voice exists.
 * Never uses Turkish / default OS voice.
 */
function speakViaTrustedEnglishSynthesis(text: string, rate: number): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      resolve(false);
      return;
    }

    const voice = pickTrustedEnglishVoice();
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
 * Prefer trusted English remote TTS. System voice only if scored as English-safe.
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
  await speakViaTrustedEnglishSynthesis(trimmed, rate);
}

/** Start decoding cached / remote English audio before playback. */
export function primeWordAudio(word: string, audioUrl?: string | null) {
  if (typeof window === "undefined") return;
  const key = wordPrimeKey(word);
  const trustedDict =
    audioUrl?.trim() && isTrustedEnglishAudioUrl(audioUrl) ? audioUrl.trim() : null;

  void import("@/lib/offlineAudio")
    .then(async ({ getCachedAudioObjectUrl, getMemoryAudioObjectUrl }) => {
      const hot = getMemoryAudioObjectUrl(word);
      const localUrl = hot || (await getCachedAudioObjectUrl(word));
      if (!localUrl) return;
      let audio = primedAudio.get(key);
      if (!audio) {
        audio = new Audio();
        primedAudio.set(key, audio);
      }
      audio.preload = "auto";
      if (audio.src !== localUrl) audio.src = localUrl;
      try {
        audio.load();
      } catch {
        // ignore
      }
    })
    .catch(() => {
      // ignore
    });

  const remote = englishTtsProxyUrl(word, trustedDict);
  if (!primedAudio.has(remote)) {
    const audio = new Audio();
    audio.preload = "auto";
    audio.src = remote;
    primedAudio.set(remote, audio);
    if (primedAudio.size > 24) {
      const oldest = primedAudio.keys().next().value;
      if (oldest && oldest !== key) primedAudio.delete(oldest);
    }
  }
}

export function playWordAudio(word: string, audioUrl?: string | null) {
  if (typeof window === "undefined") return;

  const run = async () => {
    const key = wordPrimeKey(word);
    const trustedDict =
      audioUrl?.trim() && isTrustedEnglishAudioUrl(audioUrl) ? audioUrl.trim() : null;

    // 1) Offline / memory English cache
    try {
      const { getMemoryAudioObjectUrl, getCachedAudioObjectUrl } = await import(
        "@/lib/offlineAudio"
      );
      const localUrl =
        getMemoryAudioObjectUrl(word) || (await getCachedAudioObjectUrl(word));
      if (localUrl) {
        try {
          await playUrlNow(localUrl, key);
          return;
        } catch {
          // fall through
        }
      }
    } catch {
      // IndexedDB unavailable
    }

    // 2) Trusted dictionary clip only (never Youdao / unknown hosts)
    if (trustedDict) {
      try {
        await playUrlNow(trustedDict, trustedDict);
        return;
      } catch {
        // fall through
      }
    }

    // 3) Trusted English proxy → optional trusted system voice
    const ok = await speakViaEnglishRemote(word, trustedDict);
    if (ok) return;

    await loadVoices();
    await speakViaTrustedEnglishSynthesis(word, 0.92);
  };

  void run();
}

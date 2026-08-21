const FEMALE_HINT =
  /female|woman|zira|hazel|samantha|victoria|karen|moira|tessa|fiona|serena|susan|linda|kate|ava|emma|jenny|aria|salli|joanna|ivy|kimberly|kendra|nicole|raveena|sonia|anya|neerja/i;

function isEnglishVoice(v: SpeechSynthesisVoice): boolean {
  const lang = (v.lang || "").toLowerCase().replace(/_/g, "-");
  if (lang.startsWith("en")) return true;
  // Some Windows builds mis-tag voice lang; still trust clear English names.
  return /\benglish\b|\ben-?us\b|\ben-?gb\b/i.test(v.name);
}

function isTurkishVoice(v: SpeechSynthesisVoice): boolean {
  const lang = (v.lang || "").toLowerCase().replace(/_/g, "-");
  return lang.startsWith("tr") || /\bturkish\b|\btürkçe\b|\bturkiye\b/i.test(v.name);
}

function pickEnglishVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;

  const voices = window.speechSynthesis.getVoices().filter((v) => !isTurkishVoice(v));
  const english = voices.filter(isEnglishVoice);
  if (!english.length) return null;

  const score = (v: SpeechSynthesisVoice) => {
    let s = 0;
    const lang = (v.lang || "").toLowerCase().replace(/_/g, "-");
    if (lang.startsWith("en-us")) s += 40;
    else if (lang.startsWith("en-gb")) s += 30;
    else if (lang.startsWith("en")) s += 20;
    if (FEMALE_HINT.test(v.name)) s += 25;
    if (/zira/i.test(v.name)) s += 15; // common Windows en-US female
    if (/google/i.test(v.name)) s += 10;
    if (/microsoft/i.test(v.name)) s += 5;
    return s;
  };

  return [...english].sort((a, b) => score(b) - score(a))[0] ?? null;
}

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      resolve([]);
      return;
    }

    const existing = window.speechSynthesis.getVoices();
    if (existing.length) {
      resolve(existing);
      return;
    }

    const done = () => {
      window.speechSynthesis.removeEventListener("voiceschanged", done);
      resolve(window.speechSynthesis.getVoices());
    };

    window.speechSynthesis.addEventListener("voiceschanged", done);
    window.setTimeout(done, 800);
  });
}

/** Unofficial but reliable en-US fallback when the OS has no English TTS voice. */
function speakViaTranslateTts(text: string) {
  const url =
    "https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=" +
    encodeURIComponent(text.slice(0, 180));
  const audio = new Audio(url);
  return audio.play();
}

export async function speak(text: string, rate = 0.9) {
  if (typeof window === "undefined") return;

  await loadVoices();

  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }

  const voice = pickEnglishVoice();

  // Turkish Windows often defaults to a TR voice even with lang=en-US.
  // If we cannot bind a real English voice, skip speechSynthesis entirely.
  if (!voice) {
    try {
      await speakViaTranslateTts(text);
    } catch {
      // last resort: still try utterance with en-US
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = rate;
      window.speechSynthesis?.speak(utterance);
    }
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = voice;
  utterance.lang = voice.lang?.replace(/_/g, "-") || "en-US";
  utterance.rate = rate;

  // Chrome sometimes drops the first speak() right after cancel().
  window.setTimeout(() => {
    window.speechSynthesis?.speak(utterance);
  }, 40);
}

export function playWordAudio(word: string, audioUrl?: string | null) {
  if (typeof window === "undefined") return;

  if (audioUrl) {
    try {
      const audio = new Audio(audioUrl);
      audio.play().catch(() => {
        void speak(word);
      });
      return;
    } catch {
      // fall through to TTS
    }
  }

  void speak(word);
}

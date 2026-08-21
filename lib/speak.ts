function pickEnglishVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;

  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  const english = voices.filter((v) => /^en([-_]|$)/i.test(v.lang));
  if (!english.length) return null;

  const femaleHint =
    /female|woman|girl|samantha|victoria|karen|moira|tessa|fiona|zuzana|serena|susan|linda|kate|ava|emma|jenny|aria|salli|joanna|ivy|kimberly|kendra|nicole|raveena/i;

  const usFemale =
    english.find((v) => /en-?US/i.test(v.lang) && femaleHint.test(v.name)) ?? null;
  if (usFemale) return usFemale;

  const anyFemale = english.find((v) => femaleHint.test(v.name)) ?? null;
  if (anyFemale) return anyFemale;

  const us = english.find((v) => /en-?US/i.test(v.lang)) ?? null;
  return us ?? english[0] ?? null;
}

export function speak(text: string, rate = 0.9) {
  if (typeof window === "undefined") return;

  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }

  const run = () => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = rate;
    const voice = pickEnglishVoice();
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang || "en-US";
    }
    window.speechSynthesis?.speak(utterance);
  };

  // Chrome often loads voices asynchronously.
  if (window.speechSynthesis && window.speechSynthesis.getVoices().length === 0) {
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.onvoiceschanged = null;
      run();
    };
    // Fallback if onvoiceschanged never fires.
    window.setTimeout(run, 250);
    return;
  }

  run();
}

export function playWordAudio(word: string, audioUrl?: string | null) {
  if (typeof window === "undefined") return;

  if (audioUrl) {
    try {
      const audio = new Audio(audioUrl);
      audio.play().catch(() => speak(word));
      return;
    } catch {
      // fall through to TTS
    }
  }

  speak(word);
}

export function speak(text: string, rate = 0.9) {
  if (typeof window === "undefined") return;

  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = rate;
  window.speechSynthesis?.speak(utterance);
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

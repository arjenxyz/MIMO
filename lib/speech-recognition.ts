export type SpeechRecognitionHandle = {
  stop: () => void;
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
};

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

export function isSpeechRecognitionSupported() {
  if (typeof window === "undefined") return false;
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

/**
 * Starts browser speech recognition (Chrome / Edge).
 * Returns a handle to stop listening.
 */
export function startSpeechRecognition(
  onResult: (text: string, isFinal: boolean) => void,
  onEnd: () => void,
  onError?: (message: string) => void
): SpeechRecognitionHandle | null {
  const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognitionCtor) {
    onError?.("Tarayıcınız konuşma tanımayı desteklemiyor. Lütfen Chrome kullanın.");
    return null;
  }

  const recognition = new SpeechRecognitionCtor();
  recognition.lang = "en-US";
  recognition.continuous = true;
  recognition.interimResults = true;

  let finalized = "";

  recognition.onresult = (event) => {
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const piece = event.results[i][0]?.transcript ?? "";
      if (event.results[i].isFinal) {
        finalized = `${finalized} ${piece}`.trim();
        onResult(finalized, true);
      } else {
        interim += piece;
      }
    }
    if (interim) {
      onResult(`${finalized} ${interim}`.trim(), false);
    }
  };

  recognition.onerror = (event) => {
    if (event.error === "aborted" || event.error === "no-speech") return;
    onError?.(event.error || "Konuşma tanıma hatası");
  };

  recognition.onend = () => {
    onEnd();
  };

  try {
    recognition.start();
  } catch {
    onError?.("Mikrofon başlatılamadı.");
    return null;
  }

  return {
    stop: () => {
      try {
        recognition.onend = null;
        recognition.stop();
      } catch {
        // ignore
      }
      onEnd();
    },
  };
}

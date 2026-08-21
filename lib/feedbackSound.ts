/**
 * Duolingo-style correct / wrong SFX via Web Audio (no asset files).
 * Safe to call from click/submit handlers; no-ops on SSR.
 */

type FeedbackKind = "correct" | "wrong";

const MUTE_KEY = "mimo-sfx-muted";

let audioCtx: AudioContext | null = null;
let unlocked = false;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!audioCtx) audioCtx = new AC();
  return audioCtx;
}

/** Call once from a user gesture so later auto-timeouts can still play. */
export function unlockFeedbackSounds() {
  if (unlocked) return;
  const ctx = getContext();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    void ctx.resume();
  }
  unlocked = true;
}

export function isFeedbackSoundMuted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setFeedbackSoundMuted(muted: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    // ignore
  }
}

function beep(
  ctx: AudioContext,
  {
    frequency,
    start,
    duration,
    volume = 0.18,
    type = "sine",
    slideTo,
  }: {
    frequency: number;
    start: number;
    duration: number;
    volume?: number;
    type?: OscillatorType;
    slideTo?: number;
  }
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, start);
  if (typeof slideTo === "number") {
    osc.frequency.linearRampToValueAtTime(slideTo, start + duration);
  }

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

function playCorrectTone(ctx: AudioContext) {
  const t = ctx.currentTime + 0.01;
  // Bright rising triad — familiar “ding-ding-ding”
  beep(ctx, { frequency: 587.33, start: t, duration: 0.11, volume: 0.16 }); // D5
  beep(ctx, { frequency: 739.99, start: t + 0.09, duration: 0.11, volume: 0.17 }); // F#5
  beep(ctx, { frequency: 880.0, start: t + 0.18, duration: 0.22, volume: 0.2 }); // A5
}

function playWrongTone(ctx: AudioContext) {
  const t = ctx.currentTime + 0.01;
  // Soft descending buzz — clear “nope” without being harsh
  beep(ctx, {
    frequency: 220,
    start: t,
    duration: 0.16,
    volume: 0.14,
    type: "triangle",
    slideTo: 180,
  });
  beep(ctx, {
    frequency: 165,
    start: t + 0.12,
    duration: 0.28,
    volume: 0.16,
    type: "triangle",
    slideTo: 120,
  });
}

export function playFeedback(kind: FeedbackKind | boolean) {
  if (typeof window === "undefined") return;
  if (isFeedbackSoundMuted()) return;

  const ctx = getContext();
  if (!ctx) return;

  const run = () => {
    const correct = kind === true || kind === "correct";
    if (correct) playCorrectTone(ctx);
    else playWrongTone(ctx);
  };

  if (ctx.state === "suspended") {
    void ctx.resume().then(run).catch(() => undefined);
    return;
  }
  run();
}

export function playCorrect() {
  playFeedback("correct");
}

export function playWrong() {
  playFeedback("wrong");
}

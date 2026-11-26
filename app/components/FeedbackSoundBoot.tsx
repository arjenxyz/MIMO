"use client";

import { useEffect } from "react";
import { unlockFeedbackSounds } from "@/lib/feedbackSound";

/** Unlocks Web Audio on first tap/key so feedback SFX can play later (e.g. timeouts). */
export function FeedbackSoundBoot() {
  useEffect(() => {
    const unlock = () => unlockFeedbackSounds();
    window.addEventListener("pointerdown", unlock, { once: true, passive: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  return null;
}

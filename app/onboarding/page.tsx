"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ContinueButton } from "@/app/components/ContinueButton";
import { Mascot } from "@/app/components/Mascot";
import { SpeechBubble } from "@/app/components/SpeechBubble";

const STEPS = [
  {
    text: "Selamlar! Benim adım Mimo!",
    mood: "wave" as const,
  },
  {
    text: "Hadi şu partiyi başlatalım!",
    mood: "excited" as const,
  },
  {
    text: "Her gün pratik yap, kesinlikle seviye atla.",
    mood: "happy" as const,
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  function next() {
    if (isLast) {
      router.push("/register");
      return;
    }
    setStep((value) => value + 1);
  }

  return (
    <main className="flex min-h-screen flex-col bg-duo-bg">
      <div className="flex flex-1 flex-col items-center justify-center px-4">
        <SpeechBubble>{current.text}</SpeechBubble>
        <Mascot mood={current.mood} />
      </div>

      <div className="border-t-2 border-duo-border px-4 py-5 sm:px-8">
        <div className="mx-auto w-full max-w-xl space-y-3">
          <ContinueButton onClick={next}>DEVAM ET</ContinueButton>
          {isLast && (
            <ContinueButton href="/login" variant="ghost">
              Zaten hesabım var
            </ContinueButton>
          )}
        </div>
      </div>
    </main>
  );
}

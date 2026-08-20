"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const STEPS = [
  {
    title: "Merhaba!",
    subtitle: "Eğlenerek öğrenmenin en tatlı hali!",
  },
  {
    title: "Hadi başlayalım!",
    subtitle: "Her gün pratik yap, kesinlikle seviye atla.",
  },
  {
    title: "Hazırsan",
    subtitle: "Google ile gir veya diğer hesapları seç.",
  },
];

function StepDots({
  step,
  onSelect,
}: {
  step: number;
  onSelect?: (index: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((_, index) => (
        <button
          key={index}
          type="button"
          aria-label={`Adım ${index + 1}`}
          onClick={() => onSelect?.(index)}
          className={`h-2.5 rounded-full transition-all ${
            index === step ? "w-7 bg-[#fd860a]" : "w-2.5 bg-[#fd860a]/30"
          }`}
        />
      ))}
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const current = STEPS[step];

  function next() {
    router.push("/login");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fff8f1] text-[#1f2937]">
      <div className="pointer-events-none absolute -left-16 -top-10 h-56 w-56 rounded-full bg-[#d8f5c8]/70" />
      <div className="pointer-events-none absolute -right-10 top-8 h-44 w-44 rounded-full bg-[#ffe8a3]/80" />
      <div className="pointer-events-none absolute -bottom-16 -left-8 h-52 w-52 rounded-full bg-[#c9f0e3]/70" />
      <div className="pointer-events-none absolute -bottom-20 -right-12 h-64 w-64 rounded-full bg-[#ffd0df]/70" />
      <div className="pointer-events-none absolute left-10 top-28 text-2xl text-[#9be06a] lg:left-16 lg:top-16 lg:text-4xl">
        ✦
      </div>
      <div className="pointer-events-none absolute right-16 top-40 text-xl text-[#c4b5fd] lg:right-24 lg:top-28 lg:text-3xl">
        ✦
      </div>
      <div className="pointer-events-none absolute bottom-10 left-6 text-3xl text-[#fbbf24]/70 lg:bottom-12 lg:left-10 lg:text-5xl">
        🐾
      </div>

      {/* ===== MOBILE ===== */}
      <div className="relative z-10 flex min-h-screen flex-col lg:hidden">
        <div className="flex flex-1 flex-col items-center justify-center px-6 pt-10 text-center">
          <h1 className="text-5xl font-black tracking-tight text-[#1f2937]">
            {current.title}
            <span className="ml-1 inline-block text-3xl text-[#fd860a]">♡</span>
          </h1>
          <p className="mt-3 text-lg font-bold text-[#6b7280]">{current.subtitle}</p>
          <div className="relative mt-8 w-full max-w-md">
            <Image
              src="/mimo.png"
              alt="Mimo maskotu"
              width={720}
              height={720}
              priority
              className="mx-auto h-auto w-[88%] select-none rounded-[2rem]"
            />
          </div>
        </div>

        <div className="px-6 pb-8 pt-2">
          <div className="mb-5 flex justify-center">
            <StepDots step={step} onSelect={setStep} />
          </div>
          <button
            type="button"
            onClick={next}
            className="mx-auto flex w-full max-w-md items-center justify-center gap-2 rounded-full bg-[#fd860a] px-6 py-4 text-lg font-black text-white shadow-[0_5px_0_#d66f08] transition active:translate-y-1 active:shadow-none"
          >
            Başlayalım!
            <span aria-hidden>›</span>
          </button>
          <p className="mt-4 text-center text-sm font-bold text-[#6b7280]">
            Zaten hesabın var mı?{" "}
            <Link href="/login" className="text-[#fd860a] underline underline-offset-2">
              Giriş yap
            </Link>
          </p>
        </div>
      </div>

      {/* ===== DESKTOP ===== */}
      <div className="relative z-10 mx-auto hidden min-h-screen max-w-7xl grid-cols-2 items-center gap-8 px-10 py-12 lg:grid xl:px-16">
        <div className="flex max-w-xl flex-col items-start text-left">
          <p className="mb-3 rounded-full bg-[#fd860a]/15 px-4 py-1 text-sm font-extrabold tracking-wide text-[#fd860a]">
            MIMO
          </p>
          <h1 className="text-6xl font-black leading-none tracking-tight text-[#1f2937] xl:text-7xl">
            {current.title}
            <span className="ml-2 inline-block text-4xl align-top text-[#fd860a]">♡</span>
          </h1>
          <p className="mt-5 max-w-md text-2xl font-bold leading-snug text-[#6b7280]">
            {current.subtitle}
          </p>

          <div className="mt-10 flex items-center gap-4">
            <StepDots step={step} onSelect={setStep} />
          </div>

          <div className="mt-8 flex w-full max-w-md flex-col gap-3">
            <button
              type="button"
              onClick={next}
              className="flex items-center justify-center gap-2 rounded-full bg-[#fd860a] px-8 py-4 text-lg font-black text-white shadow-[0_5px_0_#d66f08] transition hover:brightness-105 active:translate-y-1 active:shadow-none"
            >
              Başlayalım!
              <span aria-hidden>›</span>
            </button>
            <p className="text-sm font-bold text-[#6b7280]">
              Zaten hesabın var mı?{" "}
              <Link href="/login" className="text-[#fd860a] underline underline-offset-2">
                Giriş yap
              </Link>
            </p>
          </div>
        </div>

        <div className="relative flex items-center justify-center">
          <div className="absolute h-72 w-72 rounded-full bg-[#fd860a]/10 blur-3xl" />
          <Image
            src="/mimo.png"
            alt="Mimo maskotu"
            width={900}
            height={900}
            priority
            className="relative z-10 h-auto w-[min(100%,520px)] select-none rounded-[2.5rem]"
          />
        </div>
      </div>
    </main>
  );
}

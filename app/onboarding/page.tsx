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
            index === step ? "w-7 bg-white" : "w-2.5 bg-white/45"
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
    <main className="relative min-h-screen overflow-hidden bg-[#fd860a] text-white">
      {/* Soft pattern */}
      <div className="pointer-events-none absolute inset-0 opacity-20">
        <div className="absolute left-[8%] top-[18%] h-20 w-20 rounded-full bg-white/50 blur-sm" />
        <div className="absolute right-[18%] top-[12%] h-12 w-12 rotate-12 bg-white/40 [clip-path:polygon(50%_0,61%_35%,98%_35%,68%_57%,79%_91%,50%_70%,21%_91%,32%_57%,2%_35%,39%_35%)]" />
        <div className="absolute left-[40%] top-[30%] text-5xl text-white/30">🐾</div>
        <div className="absolute bottom-[35%] right-[8%] text-4xl text-white/25">✦</div>
      </div>

      {/* Desktop hills */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-36 bg-[#f07800] lg:block">
        <div className="absolute -top-10 inset-x-0 h-16 rounded-[100%] bg-[#fd860a]" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-[#e86f00]/80" />
      </div>

      {/* ===== MOBILE: stacked ===== */}
      <div className="relative z-10 flex min-h-screen flex-col lg:hidden">
        <div className="flex flex-1 flex-col items-center justify-center px-6 pt-10 text-center">
          <h1 className="text-5xl font-black tracking-tight">
            {current.title}
            <span className="ml-1 inline-block text-3xl">♡</span>
          </h1>
          <p className="mt-3 text-lg font-bold text-white/90">{current.subtitle}</p>
          <div className="relative mt-8 w-full max-w-md">
            <Image
              src="/mimo.png"
              alt="Mimo maskotu"
              width={720}
              height={720}
            priority
            className="mx-auto h-auto w-[88%] select-none"
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
            className="mx-auto flex w-full max-w-md items-center justify-center gap-2 rounded-full bg-white px-6 py-4 text-lg font-black text-[#fd860a] shadow-[0_5px_0_#d66f08] transition active:translate-y-1 active:shadow-none"
          >
            Başlayalım!
            <span aria-hidden>›</span>
          </button>
          <p className="mt-4 text-center text-sm font-bold text-white/85">
            Zaten hesabın var mı?{" "}
            <Link href="/login" className="underline underline-offset-2">
              Giriş yap
            </Link>
          </p>
        </div>
      </div>

      {/* ===== DESKTOP: split hero ===== */}
      <div className="relative z-10 mx-auto hidden min-h-screen max-w-7xl grid-cols-2 items-center gap-8 px-10 py-12 lg:grid xl:px-16">
        <div className="flex max-w-xl flex-col items-start text-left">
          <p className="mb-3 rounded-full bg-white/15 px-4 py-1 text-sm font-extrabold tracking-wide">
            MIMO
          </p>
          <h1 className="text-6xl font-black leading-none tracking-tight xl:text-7xl">
            {current.title}
            <span className="ml-2 inline-block text-4xl align-top">♡</span>
          </h1>
          <p className="mt-5 max-w-md text-2xl font-bold leading-snug text-white/92">
            {current.subtitle}
          </p>

          <div className="mt-10 flex items-center gap-4">
            <StepDots step={step} onSelect={setStep} />
          </div>

          <div className="mt-8 flex w-full max-w-md flex-col gap-3">
            <button
              type="button"
              onClick={next}
              className="flex items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-lg font-black text-[#fd860a] shadow-[0_5px_0_#d66f08] transition hover:brightness-105 active:translate-y-1 active:shadow-none"
            >
              Başlayalım!
              <span aria-hidden>›</span>
            </button>
            <p className="text-sm font-bold text-white/85">
              Zaten hesabın var mı?{" "}
              <Link href="/login" className="underline underline-offset-2">
                Giriş yap
              </Link>
            </p>
          </div>
        </div>

        <div className="relative flex items-end justify-center self-end pb-8">
          <div className="absolute -bottom-6 h-28 w-[85%] rounded-[100%] bg-[#c45f00]/35 blur-xl" />
          <Image
            src="/mimo.png"
            alt="Mimo maskotu"
            width={900}
            height={900}
            priority
            className="relative z-10 h-auto w-[min(100%,520px)] select-none"
          />
        </div>
      </div>
    </main>
  );
}

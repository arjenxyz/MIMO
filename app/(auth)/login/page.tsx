"use client";

import Image from "next/image";
import Link from "next/link";
import { SocialAuthButtons } from "@/app/components/SocialAuthButtons";

function Decor() {
  return (
    <>
      <div className="pointer-events-none absolute -left-16 -top-10 h-56 w-56 rounded-full bg-[#d8f5c8]/70 lg:h-80 lg:w-80" />
      <div className="pointer-events-none absolute -right-10 top-8 h-44 w-44 rounded-full bg-[#ffe8a3]/80 lg:h-72 lg:w-72" />
      <div className="pointer-events-none absolute -bottom-16 -left-8 h-52 w-52 rounded-full bg-[#c9f0e3]/70 lg:h-96 lg:w-96" />
      <div className="pointer-events-none absolute -bottom-20 -right-12 h-64 w-64 rounded-full bg-[#ffd0df]/70 lg:h-[28rem] lg:w-[28rem]" />
      <div className="pointer-events-none absolute left-10 top-28 text-2xl text-[#9be06a] lg:left-16 lg:top-16 lg:text-4xl">
        ✦
      </div>
      <div className="pointer-events-none absolute right-16 top-40 text-xl text-[#c4b5fd] lg:right-20 lg:top-24 lg:text-3xl">
        ✦
      </div>
      {/* Paw stays in empty corners only — never over text */}
      <div className="pointer-events-none absolute bottom-10 left-6 text-3xl text-[#fbbf24]/70 lg:bottom-10 lg:left-8 lg:text-5xl">
        🐾
      </div>
      <div className="pointer-events-none absolute bottom-16 right-10 hidden text-4xl text-[#fda4af]/60 lg:block">
        ✦
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fff8f1]">
      <Decor />

      {/* Mobile: centered card */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10 lg:hidden">
        <section className="w-full max-w-md rounded-[2rem] bg-white/80 px-6 py-10 text-center shadow-xl backdrop-blur-sm">
          <Image
            src="/mimo-avatar.png"
            alt="Mimo"
            width={160}
            height={160}
            priority
            className="mx-auto h-28 w-28 rounded-full object-cover shadow-lg ring-4 ring-[#fd860a]/25"
          />
          <h1 className="mt-5 text-4xl font-black tracking-tight text-[#1f2937]">Hoş geldin!</h1>
          <p className="mt-2 font-bold text-[#6b7280]">Devam etmek için giriş yap</p>
          <div className="mt-8">
            <SocialAuthButtons />
          </div>
          <p className="mt-8 text-sm font-bold text-[#6b7280]">
            İlk kez mi buradasın?{" "}
            <Link href="/onboarding" className="text-[#fd860a]">
              Tanışmaya dön
            </Link>
          </p>
        </section>
      </div>

      {/* Desktop: split panel */}
      <div className="relative z-10 mx-auto hidden min-h-screen max-w-6xl items-center gap-10 px-10 py-12 lg:grid lg:grid-cols-2 xl:gap-16">
        <section className="relative z-10 flex flex-col items-start justify-center">
          <div className="relative overflow-hidden rounded-[2.5rem] bg-[#fd860a] p-2 shadow-xl">
            <Image
              src="/mimo.png"
              alt="Mimo"
              width={640}
              height={640}
              priority
              className="relative h-auto w-[min(100%,420px)] select-none rounded-[2rem]"
            />
          </div>
          <h2 className="mt-4 text-4xl font-black text-[#1f2937]">MIMO</h2>
          <p className="relative z-10 mt-2 max-w-sm text-lg font-bold text-[#6b7280]">
            Eğlenerek öğrenmenin en tatlı hali. Her gün seviye atla.
          </p>
        </section>

        <section className="rounded-[2.5rem] border border-white/70 bg-white/90 p-10 shadow-2xl backdrop-blur">
          <div className="flex items-center gap-4">
            <Image
              src="/mimo-avatar.png"
              alt="Mimo avatar"
              width={72}
              height={72}
              className="h-16 w-16 rounded-full object-cover ring-4 ring-[#fd860a]/20"
            />
            <div>
              <h1 className="text-3xl font-black tracking-tight text-[#1f2937]">Hoş geldin!</h1>
              <p className="font-bold text-[#6b7280]">Devam etmek için giriş yap</p>
            </div>
          </div>

          <div className="mt-8">
            <SocialAuthButtons />
          </div>

          <p className="mt-8 text-center text-sm font-bold text-[#6b7280]">
            İlk kez mi buradasın?{" "}
            <Link href="/onboarding" className="text-[#fd860a]">
              Tanışmaya dön
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}

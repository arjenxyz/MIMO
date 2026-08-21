import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

type StatusScreenProps = {
  code?: string;
  eyebrow: string;
  title: string;
  description: string;
  primary?: ReactNode;
  secondary?: ReactNode;
};

/** Shared empty/error shell — light/dark mimo tokens, mascot first. */
export function StatusScreen({
  code,
  eyebrow,
  title,
  description,
  primary,
  secondary,
}: StatusScreenProps) {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-mimo-bg px-4 py-12 text-mimo-fg">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(28,176,246,0.14),_transparent_55%),radial-gradient(ellipse_at_bottom,_rgba(253,134,10,0.1),_transparent_50%)]"
      />

      <div className="relative z-10 w-full max-w-md text-center">
        <div className="mx-auto mb-2 w-36 sm:w-44">
          <div className="mimo-bounce relative">
            <Image
              src="/mimo.png"
              alt="Mimo"
              width={220}
              height={220}
              priority
              className="h-auto w-full object-contain drop-shadow-md"
            />
          </div>
        </div>

        {code && (
          <p className="text-5xl font-black tracking-tight text-[#1cb0f6]/35 sm:text-6xl">
            {code}
          </p>
        )}

        <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-[#1cb0f6]">
          {eyebrow}
        </p>
        <h1 className="mt-2 text-2xl font-black text-mimo-title sm:text-3xl">{title}</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm font-semibold leading-relaxed text-mimo-muted">
          {description}
        </p>

        <div className="mt-8 flex flex-col gap-2.5">
          {primary}
          {secondary}
        </div>
      </div>
    </main>
  );
}

export function StatusPrimaryLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex w-full items-center justify-center rounded-2xl bg-[#1cb0f6] px-8 py-3 text-sm font-black uppercase tracking-wide text-white shadow-[0_3px_0_#1899d6] transition active:translate-y-0.5 active:shadow-none"
    >
      {children}
    </Link>
  );
}

export function StatusSecondaryLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex w-full items-center justify-center rounded-2xl border border-mimo-soft bg-mimo-card px-8 py-3 text-sm font-bold text-mimo-muted transition hover:border-mimo-border hover:text-mimo-fg"
    >
      {children}
    </Link>
  );
}

export function StatusPrimaryButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex w-full items-center justify-center rounded-2xl bg-[#58cc02] px-8 py-3 text-sm font-black uppercase tracking-wide text-[#14260a] shadow-[0_3px_0_#46a302] transition active:translate-y-0.5 active:shadow-none"
    >
      {children}
    </button>
  );
}

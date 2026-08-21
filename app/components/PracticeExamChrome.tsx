import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

/** Shared exam-style chrome — follows light/dark mimo tokens. */
export function PracticeExamMain({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <main className={`min-h-screen bg-mimo-bg text-mimo-fg ${className}`.trim()}>
      {children}
    </main>
  );
}

export function PracticeExamCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-mimo-border bg-mimo-card px-5 py-6 shadow-sm sm:px-8 sm:py-8 ${className}`.trim()}
    >
      {children}
    </section>
  );
}

/** Tappable exit chip — keeps top placement, reads as a real control. */
export function PracticeExamExitLink({
  href = "/",
  label = "Çık",
  onClick,
  className = "",
}: {
  href?: string;
  label?: string;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-label={label}
      className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-mimo-soft bg-mimo-card px-3.5 text-sm font-extrabold text-mimo-fg shadow-[0_2px_0_rgba(15,23,42,0.06)] transition hover:border-mimo-border hover:bg-mimo-surface active:translate-y-0.5 active:shadow-none dark:shadow-[0_2px_0_rgba(0,0,0,0.35)] ${className}`.trim()}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.75"
        strokeLinecap="round"
        aria-hidden
        className="opacity-70"
      >
        <path d="M6 6l12 12M18 6 6 18" />
      </svg>
      <span>{label}</span>
    </Link>
  );
}

export function PracticeExamTopBar({
  left,
  exitHref = "/",
  exitLabel = "Çık",
}: {
  left?: ReactNode;
  exitHref?: string;
  exitLabel?: string;
}) {
  return (
    <div className="mb-6 flex items-center justify-between gap-3">
      <div className="min-w-0">{left}</div>
      <PracticeExamExitLink href={exitHref} label={exitLabel} />
    </div>
  );
}

export function PracticeExamEyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#1cb0f6]">{children}</p>
  );
}

export function PracticeExamPrimaryButton({
  children,
  className = "",
  variant = "blue",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "blue" | "green";
}) {
  const styles =
    variant === "green"
      ? "bg-[#58cc02] text-[#14260a] shadow-[0_3px_0_#46a302]"
      : "bg-[#1cb0f6] text-white shadow-[0_3px_0_#1899d6]";
  return (
    <button
      {...props}
      type={type}
      className={`rounded-2xl px-8 py-3 text-sm font-black uppercase tracking-wide disabled:opacity-50 ${styles} ${className}`.trim()}
    >
      {children}
    </button>
  );
}

export function PracticeExamGhostLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="block rounded-2xl border border-mimo-soft px-4 py-3 text-center text-sm font-bold text-mimo-muted"
    >
      {children}
    </Link>
  );
}

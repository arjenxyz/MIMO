import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

/** Light exam-style chrome shared by DET / practice sessions (Read & Complete look). */
export function PracticeExamMain({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <main className={`min-h-screen bg-[#f3f4f6] text-[#0f172a] ${className}`.trim()}>
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
      className={`rounded-2xl border border-[#e5e7eb] bg-white px-5 py-6 shadow-sm sm:px-8 sm:py-8 ${className}`.trim()}
    >
      {children}
    </section>
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
      <Link
        href={exitHref}
        className="shrink-0 text-sm font-bold text-[#64748b] hover:text-[#0f172a]"
      >
        {exitLabel}
      </Link>
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
      className="block rounded-2xl border border-[#e2e8f0] px-4 py-3 text-center text-sm font-bold text-[#64748b]"
    >
      {children}
    </Link>
  );
}

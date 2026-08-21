"use client";

import Link from "next/link";
import {
  type ButtonHTMLAttributes,
  type ReactNode,
  useEffect,
  useRef,
} from "react";

/** Shared exam-style chrome — follows light/dark mimo tokens. */
export function PracticeExamMain({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <main className={`min-h-[100dvh] bg-mimo-bg text-mimo-fg ${className}`.trim()}>
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

/** Subtle exit control — quiet enough for exam chrome, still clearly tappable. */
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
      className={`inline-flex h-9 shrink-0 items-center gap-1 rounded-full px-2.5 text-[13px] font-bold text-mimo-muted transition hover:bg-mimo-surface hover:text-mimo-fg active:scale-[0.97] ${className}`.trim()}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        aria-hidden
        className="opacity-80"
      >
        <path d="M6 6l12 12M18 6 6 18" />
      </svg>
      <span>{label}</span>
    </Link>
  );
}

/**
 * Fixed top timer/exit bar that stays visible when the mobile keyboard opens.
 * Pins to the visual viewport (iOS/Android) so students always see remaining time.
 */
export function PracticeExamStickyBar({
  left,
  exitHref = "/",
  exitLabel = "Çık",
  onExitClick,
  maxWidthClass = "max-w-lg",
}: {
  left?: ReactNode;
  exitHref?: string;
  exitLabel?: string;
  onExitClick?: () => void;
  maxWidthClass?: string;
}) {
  const barRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = barRef.current;
    if (!el || typeof window === "undefined") return;

    const vv = window.visualViewport;
    const sync = () => {
      if (!vv) {
        el.style.transform = "";
        return;
      }
      // Keep the bar glued to the visible top when the keyboard resizes the viewport.
      el.style.transform = `translateY(${Math.max(0, vv.offsetTop)}px)`;
    };

    sync();
    vv?.addEventListener("resize", sync);
    vv?.addEventListener("scroll", sync);
    window.addEventListener("orientationchange", sync);
    return () => {
      vv?.removeEventListener("resize", sync);
      vv?.removeEventListener("scroll", sync);
      window.removeEventListener("orientationchange", sync);
    };
  }, []);

  return (
    <header
      ref={barRef}
      className="fixed inset-x-0 top-0 z-50 border-b border-mimo-border/70 bg-mimo-bg/95 backdrop-blur-md will-change-transform supports-[padding:env(safe-area-inset-top)]:pt-[env(safe-area-inset-top)]"
    >
      <div
        className={`mx-auto flex w-full items-center justify-between gap-3 px-4 py-3 ${maxWidthClass}`}
      >
        <div className="min-w-0">{left}</div>
        <PracticeExamExitLink href={exitHref} label={exitLabel} onClick={onExitClick} />
      </div>
    </header>
  );
}

/** Spacer matching PracticeExamStickyBar height so content is not hidden underneath. */
export function PracticeExamStickySpacer({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`shrink-0 ${className}`.trim()}
      style={{ height: "calc(3.75rem + env(safe-area-inset-top, 0px))" }}
    />
  );
}

export function PracticeExamTimerLabel({
  time,
  urgent = false,
  hint = "bu soru için",
}: {
  time: string;
  urgent?: boolean;
  hint?: string | null;
}) {
  return (
    <div className="flex items-center gap-2 text-sm font-bold text-mimo-muted">
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className={urgent ? "text-[#ff4b4b]" : "text-mimo-muted"}
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
      <span
        className={`tabular-nums ${urgent ? "text-[#ff4b4b]" : "text-mimo-fg"}`}
      >
        {time}
      </span>
      {hint ? <span>{hint}</span> : null}
    </div>
  );
}

/** @deprecated Prefer PracticeExamStickyBar — kept for non-timed screens. */
export function PracticeExamTopBar({
  left,
  exitHref = "/",
  exitLabel = "Çık",
  maxWidthClass = "max-w-lg",
}: {
  left?: ReactNode;
  exitHref?: string;
  exitLabel?: string;
  maxWidthClass?: string;
}) {
  return (
    <>
      <PracticeExamStickyBar
        left={left}
        exitHref={exitHref}
        exitLabel={exitLabel}
        maxWidthClass={maxWidthClass}
      />
      <PracticeExamStickySpacer className="mb-4" />
    </>
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

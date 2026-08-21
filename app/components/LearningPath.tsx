import Link from "next/link";
import type { ReactNode } from "react";

export type PathIconName =
  | "books"
  | "write"
  | "photo"
  | "match"
  | "verify"
  | "listen"
  | "grammar";

export type PathNode = {
  id: string;
  title: string;
  href: string;
  tone: "green" | "blue" | "purple" | "orange" | "cyan" | "rose";
  state: "done" | "active" | "upcoming";
  icon?: PathIconName;
};

const TONE = {
  green: {
    fill: "bg-[#58cc02]",
    shadow: "shadow-[0_6px_0_#46a302]",
    soft: "text-[#58cc02]",
    ring: "ring-[#58cc02]/35",
    track: "bg-[#58cc02]",
  },
  blue: {
    fill: "bg-[#1cb0f6]",
    shadow: "shadow-[0_6px_0_#1899d6]",
    soft: "text-[#1cb0f6]",
    ring: "ring-[#1cb0f6]/35",
    track: "bg-[#1cb0f6]",
  },
  purple: {
    fill: "bg-[#6366f1]",
    shadow: "shadow-[0_6px_0_#4f46e5]",
    soft: "text-[#6366f1]",
    ring: "ring-[#6366f1]/30",
    track: "bg-[#6366f1]",
  },
  orange: {
    fill: "bg-[#fd860a]",
    shadow: "shadow-[0_6px_0_#c2410c]",
    soft: "text-[#ea580c]",
    ring: "ring-[#fd860a]/35",
    track: "bg-[#fd860a]",
  },
  cyan: {
    fill: "bg-[#0d9488]",
    shadow: "shadow-[0_6px_0_#0f766e]",
    soft: "text-[#0d9488]",
    ring: "ring-[#0d9488]/30",
    track: "bg-[#0d9488]",
  },
  rose: {
    fill: "bg-[#e11d48]",
    shadow: "shadow-[0_6px_0_#be123c]",
    soft: "text-[#e11d48]",
    ring: "ring-[#e11d48]/30",
    track: "bg-[#e11d48]",
  },
};

/** Zigzag offsets that stay inside the path column (no horizontal page scroll). */
const OFFSETS = [
  "translate-x-0",
  "-translate-x-12 sm:-translate-x-14",
  "translate-x-12 sm:translate-x-14",
  "-translate-x-9 sm:-translate-x-11",
  "translate-x-10 sm:translate-x-12",
  "-translate-x-12 sm:-translate-x-14",
  "translate-x-9 sm:translate-x-11",
];

function PathIcon({ name }: { name: PathIconName }) {
  const common = {
    width: 26,
    height: 26,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "text-white",
    "aria-hidden": true as const,
  };

  const icons: Record<PathIconName, ReactNode> = {
    books: (
      <svg {...common}>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        <path d="M8 7h8M8 11h6" />
      </svg>
    ),
    write: (
      <svg {...common}>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
    photo: (
      <svg {...common}>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <circle cx="12" cy="12" r="3.25" />
        <path d="M3 9h3.5l1.2-2h4.6" />
      </svg>
    ),
    match: (
      <svg {...common}>
        <rect x="3" y="3" width="8" height="8" rx="1.5" />
        <rect x="13" y="13" width="8" height="8" rx="1.5" />
        <path d="M14 6h4M16 4v4M6 14h4M8 12v4" />
      </svg>
    ),
    verify: (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M8 12.5 11 15.5 16 9" />
      </svg>
    ),
    listen: (
      <svg {...common}>
        <path d="M12 3v10" />
        <path d="M8.5 8.5a5 5 0 0 0 7 0" />
        <rect x="9" y="13" width="6" height="4" rx="1" />
        <path d="M12 17v2M9 21h6" />
      </svg>
    ),
    grammar: (
      <svg {...common}>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        <path d="M9 8h7M9 12h5M9 16h6" />
      </svg>
    ),
  };

  return icons[name];
}

function CheckIcon() {
  return (
    <svg
      width={26}
      height={26}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-white"
      aria-hidden
    >
      <path d="M5 12.5 10 17.5 19 7" />
    </svg>
  );
}

export function LearningPath({
  nodes,
  unitTitle,
  unitHint,
  primaryHref,
  primaryLabel,
  greeting,
}: {
  nodes: PathNode[];
  unitTitle: string;
  unitHint: string;
  primaryHref: string;
  primaryLabel: string;
  greeting: string;
}) {
  const activeIndex = Math.max(
    0,
    nodes.findIndex((n) => n.state === "active")
  );
  const doneCount = nodes.filter((n) => n.state === "done").length;
  const progressPct =
    nodes.length <= 1 ? 100 : Math.round((doneCount / (nodes.length - 1)) * 100);

  return (
    <section className="relative min-w-0 overflow-x-clip">
      {/* Hero unit */}
      <div className="relative overflow-hidden rounded-[1.75rem] border border-mimo-border/80 bg-mimo-card">
        <div
          className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[#1cb0f6]/10 blur-2xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-24 -left-10 h-48 w-48 rounded-full bg-[#fd860a]/10 blur-2xl"
          aria-hidden
        />
        <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#1cb0f6]">
                Bugünün yolu
              </p>
              <span className="rounded-full bg-mimo-surface px-2.5 py-0.5 text-[10px] font-extrabold tabular-nums text-mimo-muted ring-1 ring-mimo-border">
                {doneCount}/{nodes.length} tamam
              </span>
            </div>
            <h1 className="mt-2 text-[1.65rem] font-black tracking-tight text-mimo-title sm:text-3xl">
              {unitTitle}
            </h1>
            <p className="mt-1.5 max-w-md text-sm font-semibold leading-relaxed text-mimo-muted">
              {unitHint}
            </p>
            <div className="mt-4 h-1.5 max-w-xs overflow-hidden rounded-full bg-mimo-surface ring-1 ring-mimo-border/60">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#1cb0f6] to-[#58cc02] transition-[width] duration-500"
                style={{ width: `${Math.max(8, progressPct)}%` }}
              />
            </div>
          </div>
          <Link
            href={primaryHref}
            className="inline-flex shrink-0 items-center justify-center rounded-2xl bg-[#58cc02] px-8 py-3.5 text-sm font-black uppercase tracking-wide text-[#14260a] shadow-[0_4px_0_#46a302] transition hover:brightness-[1.03] active:translate-y-1 active:shadow-none"
          >
            {primaryLabel}
          </Link>
        </div>
      </div>

      {/* Path */}
      <div className="relative mx-auto mt-10 max-w-sm overflow-x-clip px-2 pb-8 sm:max-w-md">
        <div
          className="pointer-events-none absolute inset-x-0 -top-6 h-40 bg-[radial-gradient(ellipse_at_center,rgba(28,176,246,0.08),transparent_70%)]"
          aria-hidden
        />

        {/* Track */}
        <div
          className="pointer-events-none absolute bottom-14 left-1/2 top-24 w-[4px] -translate-x-1/2 overflow-hidden rounded-full bg-mimo-border/70"
          aria-hidden
        >
          <div
            className="absolute inset-x-0 top-0 rounded-full bg-gradient-to-b from-[#1cb0f6] via-[#58cc02] to-[#58cc02]/40 transition-[height] duration-700"
            style={{
              height: `${Math.min(100, ((activeIndex + 0.35) / Math.max(nodes.length - 1, 1)) * 100)}%`,
            }}
          />
        </div>

        {/* Greeting */}
        <div className="relative mb-14 flex justify-center mimo-path-enter">
          <div className="relative max-w-[300px]">
            <div className="rounded-[1.35rem] border border-mimo-border/80 bg-mimo-card/95 px-5 py-3.5 text-center shadow-[0_10px_40px_-18px_rgba(15,23,42,0.35)] backdrop-blur-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#fd860a]">
                MIMO
              </p>
              <p className="mt-1.5 text-[15px] font-extrabold leading-snug text-mimo-fg">
                {greeting}
              </p>
            </div>
            <div
              className="absolute left-1/2 top-full h-3.5 w-3.5 -translate-x-1/2 -translate-y-[7px] rotate-45 border-b border-r border-mimo-border/80 bg-mimo-card"
              aria-hidden
            />
          </div>
        </div>

        <ol className="relative space-y-12">
          {nodes.map((node, index) => {
            const tone = TONE[node.tone];
            const offset = OFFSETS[index % OFFSETS.length];
            const isActive = node.state === "active";
            const isDone = node.state === "done";
            const isUpcoming = node.state === "upcoming";

            return (
              <li
                key={node.id}
                className="relative flex justify-center mimo-path-enter"
                style={{ animationDelay: `${index * 55}ms` }}
              >
                <div className={`flex flex-col items-center ${offset}`}>
                  {isActive && (
                    <span className="mb-2.5 inline-flex items-center gap-1 rounded-full bg-[#58cc02] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#14260a] shadow-[0_3px_0_#46a302]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#14260a]/70" aria-hidden />
                      Başla
                    </span>
                  )}

                  <Link
                    href={node.href}
                    aria-current={isActive ? "step" : undefined}
                    aria-label={`${node.title}${isActive ? " — sıradaki" : isDone ? " — tamamlandı" : ""}`}
                    className={[
                      "group relative flex h-[4.6rem] w-[4.6rem] items-center justify-center rounded-full border-[3.5px] border-white transition duration-200",
                      "hover:-translate-y-0.5 active:translate-y-1 active:shadow-none dark:border-mimo-bg",
                      tone.fill,
                      tone.shadow,
                      isActive ? `ring-4 ${tone.ring} mimo-path-pulse` : "",
                      isDone ? "opacity-95" : "",
                      isUpcoming
                        ? "opacity-40 grayscale-[40%] hover:opacity-70 hover:grayscale-0"
                        : "",
                    ].join(" ")}
                  >
                    {isDone ? (
                      <CheckIcon />
                    ) : node.icon ? (
                      <PathIcon name={node.icon} />
                    ) : (
                      <span className="text-xl font-black text-white">{index + 1}</span>
                    )}
                  </Link>

                  <div className="mt-3 max-w-[8rem] text-center">
                    <p
                      className={`text-[14px] font-black leading-tight tracking-tight ${
                        isActive ? "text-mimo-title" : "text-mimo-fg/80"
                      }`}
                    >
                      {node.title}
                    </p>
                    {isActive ? (
                      <p
                        className={`mt-1 text-[10px] font-black uppercase tracking-[0.14em] ${tone.soft}`}
                      >
                        Sıradaki
                      </p>
                    ) : isDone ? (
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-mimo-muted">
                        Tamam
                      </p>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

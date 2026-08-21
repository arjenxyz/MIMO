import Link from "next/link";
import type { ReactNode } from "react";

export type PathIconName =
  | "books"
  | "sound"
  | "write"
  | "photo"
  | "match"
  | "verify"
  | "listen";

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
    shadow: "shadow-[0_5px_0_#46a302]",
    soft: "text-[#58cc02]",
    glow: "shadow-[0_0_0_6px_rgba(88,204,2,0.16)]",
  },
  blue: {
    fill: "bg-[#1cb0f6]",
    shadow: "shadow-[0_5px_0_#1899d6]",
    soft: "text-[#1cb0f6]",
    glow: "shadow-[0_0_0_6px_rgba(28,176,246,0.16)]",
  },
  purple: {
    fill: "bg-[#7c3aed]",
    shadow: "shadow-[0_5px_0_#6d28d9]",
    soft: "text-[#7c3aed]",
    glow: "shadow-[0_0_0_6px_rgba(124,58,237,0.14)]",
  },
  orange: {
    fill: "bg-[#f59e0b]",
    shadow: "shadow-[0_5px_0_#d97706]",
    soft: "text-[#d97706]",
    glow: "shadow-[0_0_0_6px_rgba(245,158,11,0.16)]",
  },
  cyan: {
    fill: "bg-[#0d9488]",
    shadow: "shadow-[0_5px_0_#0f766e]",
    soft: "text-[#0d9488]",
    glow: "shadow-[0_0_0_6px_rgba(13,148,136,0.14)]",
  },
  rose: {
    fill: "bg-[#e11d48]",
    shadow: "shadow-[0_5px_0_#be123c]",
    soft: "text-[#e11d48]",
    glow: "shadow-[0_0_0_6px_rgba(225,29,72,0.14)]",
  },
};

/** Zigzag offsets that stay inside the path column (no horizontal page scroll). */
const OFFSETS = [
  "translate-x-0",
  "-translate-x-14 sm:-translate-x-16",
  "translate-x-14 sm:translate-x-16",
  "-translate-x-10 sm:-translate-x-12",
  "translate-x-12 sm:translate-x-14",
  "-translate-x-14 sm:-translate-x-16",
  "translate-x-10 sm:translate-x-12",
];

function PathIcon({ name }: { name: PathIconName }) {
  const common = {
    width: 28,
    height: 28,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.25,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "text-white drop-shadow-sm",
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
    sound: (
      <svg {...common}>
        <path d="M11 5 6 9H2v6h4l5 4V5z" />
        <path d="M15.5 8.5a5 5 0 0 1 0 7" />
        <path d="M18.5 5.5a9 9 0 0 1 0 13" />
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
  };

  return icons[name];
}

function CheckIcon() {
  return (
    <svg
      width={28}
      height={28}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-white drop-shadow-sm"
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
  return (
    <section className="relative min-w-0 overflow-x-clip">
      <div className="relative overflow-hidden rounded-2xl border border-mimo-border bg-mimo-card p-5 shadow-sm sm:p-6">
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#1cb0f6]">
              Bugünün yolu
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-mimo-title sm:text-3xl">
              {unitTitle}
            </h1>
            <p className="mt-1.5 max-w-md text-sm font-semibold text-mimo-muted">{unitHint}</p>
          </div>
          <Link
            href={primaryHref}
            className="inline-flex shrink-0 items-center justify-center rounded-2xl bg-[#58cc02] px-8 py-3.5 text-sm font-black uppercase tracking-wide text-[#14260a] shadow-[0_3px_0_#46a302] transition active:translate-y-0.5 active:shadow-none"
          >
            {primaryLabel}
          </Link>
        </div>
      </div>

      <div className="relative mx-auto mt-8 max-w-sm overflow-x-clip px-2 pb-6 sm:max-w-md">
        <div
          className="pointer-events-none absolute bottom-10 left-1/2 top-6 w-[3px] -translate-x-1/2 rounded-full bg-gradient-to-b from-mimo-border via-mimo-soft to-transparent"
          aria-hidden
        />

        <div className="relative mb-12 flex justify-center">
          <div className="relative max-w-[280px]">
            <div className="rounded-2xl border border-mimo-border bg-mimo-card px-4 py-3 text-center text-sm font-extrabold leading-snug text-mimo-fg shadow-sm">
              {greeting}
            </div>
            <div className="absolute left-1/2 top-full h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-mimo-border bg-mimo-card" />
          </div>
        </div>

        <ol className="relative space-y-11">
          {nodes.map((node, index) => {
            const tone = TONE[node.tone];
            const offset = OFFSETS[index % OFFSETS.length];
            const isActive = node.state === "active";
            const isDone = node.state === "done";
            const isUpcoming = node.state === "upcoming";

            return (
              <li key={node.id} className="relative flex justify-center">
                <div className={`flex flex-col items-center ${offset}`}>
                  {isActive && (
                    <span className="mb-2 rounded-full bg-[#58cc02] px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#14260a] shadow-[0_2px_0_#46a302]">
                      Başla
                    </span>
                  )}

                  <Link
                    href={node.href}
                    aria-current={isActive ? "step" : undefined}
                    className={`group relative flex h-[4.75rem] w-[4.75rem] items-center justify-center rounded-full border-[4px] border-white transition duration-200 hover:-translate-y-0.5 active:translate-y-1 active:shadow-none dark:border-mimo-bg ${tone.fill} ${tone.shadow} ${
                      isActive ? `${tone.glow} mimo-path-pulse` : ""
                    } ${isUpcoming ? "opacity-45 grayscale-[30%]" : ""}`}
                  >
                    {isDone ? (
                      <CheckIcon />
                    ) : node.icon ? (
                      <PathIcon name={node.icon} />
                    ) : (
                      <span className="text-2xl font-black text-white drop-shadow-sm">{index + 1}</span>
                    )}
                  </Link>

                  <div className="mt-3 max-w-[7.5rem] text-center">
                    <p
                      className={`text-[15px] font-black leading-tight ${
                        isActive ? "text-mimo-fg" : "text-[#334155]"
                      }`}
                    >
                      {node.title}
                    </p>
                    {isActive && (
                      <p
                        className={`mt-0.5 text-[11px] font-extrabold uppercase tracking-wide ${tone.soft}`}
                      >
                        Sıradaki
                      </p>
                    )}
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

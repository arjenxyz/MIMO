"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

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
    muted: "bg-[#86efac]",
    shadow: "shadow-[0_6px_0_#46a302]",
    mutedShadow: "shadow-[0_6px_0_#4ade80]",
    soft: "text-[#58cc02]",
    ring: "ring-[#58cc02]/35",
  },
  blue: {
    fill: "bg-[#1cb0f6]",
    muted: "bg-[#7dd3fc]",
    shadow: "shadow-[0_6px_0_#1899d6]",
    mutedShadow: "shadow-[0_6px_0_#38bdf8]",
    soft: "text-[#1cb0f6]",
    ring: "ring-[#1cb0f6]/35",
  },
  purple: {
    fill: "bg-[#6366f1]",
    muted: "bg-[#a5b4fc]",
    shadow: "shadow-[0_6px_0_#4f46e5]",
    mutedShadow: "shadow-[0_6px_0_#818cf8]",
    soft: "text-[#6366f1]",
    ring: "ring-[#6366f1]/30",
  },
  orange: {
    fill: "bg-[#fd860a]",
    muted: "bg-[#fdba74]",
    shadow: "shadow-[0_6px_0_#c2410c]",
    mutedShadow: "shadow-[0_6px_0_#fb923c]",
    soft: "text-[#ea580c]",
    ring: "ring-[#fd860a]/35",
  },
  cyan: {
    fill: "bg-[#0d9488]",
    muted: "bg-[#5eead4]",
    shadow: "shadow-[0_6px_0_#0f766e]",
    mutedShadow: "shadow-[0_6px_0_#2dd4bf]",
    soft: "text-[#0d9488]",
    ring: "ring-[#0d9488]/30",
  },
  rose: {
    fill: "bg-[#e11d48]",
    muted: "bg-[#fda4af]",
    shadow: "shadow-[0_6px_0_#be123c]",
    mutedShadow: "shadow-[0_6px_0_#fb7185]",
    soft: "text-[#e11d48]",
    ring: "ring-[#e11d48]/30",
  },
};

/** Mild zigzag — stays inside column on narrow phones. */
const OFFSETS = [
  "translate-x-0",
  "-translate-x-10 sm:-translate-x-12",
  "translate-x-10 sm:translate-x-12",
  "-translate-x-8 sm:-translate-x-10",
  "translate-x-8 sm:translate-x-10",
  "-translate-x-10 sm:-translate-x-12",
  "translate-x-8 sm:translate-x-10",
];

type Pt = { x: number; y: number };

function buildSmoothPath(points: Pt[]) {
  if (points.length < 2) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const midY = (prev.y + curr.y) / 2;
    d += ` C ${prev.x} ${midY}, ${curr.x} ${midY}, ${curr.x} ${curr.y}`;
  }
  return d;
}

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

  const rootRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [rail, setRail] = useState<{
    d: string;
    progressLen: number;
    totalLen: number;
    width: number;
    height: number;
  } | null>(null);
  const pathFullRef = useRef<SVGPathElement>(null);

  const measure = useCallback(() => {
    const root = rootRef.current;
    const start = startRef.current;
    if (!root || !start) return;

    const rr = root.getBoundingClientRect();
    const sr = start.getBoundingClientRect();
    const points: Pt[] = [
      {
        x: sr.left + sr.width / 2 - rr.left,
        y: sr.bottom - rr.top - 2,
      },
    ];

    for (let i = 0; i < nodes.length; i++) {
      const el = nodeRefs.current[i];
      if (!el) continue;
      const er = el.getBoundingClientRect();
      points.push({
        x: er.left + er.width / 2 - rr.left,
        y: er.top + er.height / 2 - rr.top,
      });
    }

    if (points.length < 2) return;
    const d = buildSmoothPath(points);
    setRail({
      d,
      progressLen: 0,
      totalLen: 0,
      width: root.offsetWidth,
      height: root.offsetHeight,
    });
  }, [nodes.length]);

  useLayoutEffect(() => {
    measure();
  }, [measure, nodes, greeting]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(root);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  useLayoutEffect(() => {
    const pathEl = pathFullRef.current;
    if (!pathEl || !rail?.d) return;
    const total = pathEl.getTotalLength();
    // greeting → node0 → … ; progress through active node center (index+1 in points)
    const ratios = nodes.map((_, i) => (i + 1) / Math.max(nodes.length, 1));
    const t = ratios[activeIndex] ?? 1;
    const progressLen = total * Math.min(1, Math.max(0.08, t));
    setRail((prev) =>
      prev ? { ...prev, totalLen: total, progressLen } : prev
    );
  }, [rail?.d, activeIndex, nodes.length]);

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

      <div
        ref={rootRef}
        className="relative isolate mx-auto mt-10 max-w-sm overflow-x-clip px-2 pb-8 sm:max-w-md"
      >
        <div
          className="pointer-events-none absolute inset-x-0 -top-6 h-40 bg-[radial-gradient(ellipse_at_center,rgba(28,176,246,0.08),transparent_70%)]"
          aria-hidden
        />

        {/* Path rail — always behind nodes + labels (isolate + z-0). */}
        {rail?.d ? (
          <svg
            className="pointer-events-none absolute inset-0 z-0 overflow-visible"
            width={rail.width}
            height={rail.height}
            aria-hidden
          >
            <path
              ref={pathFullRef}
              d={rail.d}
              fill="none"
              stroke="#cbd5e1"
              strokeWidth={4}
              strokeLinecap="round"
            />
            <path
              d={rail.d}
              fill="none"
              stroke="url(#mimo-path-grad)"
              strokeWidth={4}
              strokeLinecap="round"
              strokeDasharray={rail.totalLen || 1}
              strokeDashoffset={Math.max(0, (rail.totalLen || 0) - (rail.progressLen || 0))}
              className="transition-[stroke-dashoffset] duration-700 ease-out"
            />
            <defs>
              <linearGradient id="mimo-path-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1cb0f6" />
                <stop offset="55%" stopColor="#58cc02" />
                <stop offset="100%" stopColor="#58cc02" />
              </linearGradient>
            </defs>
          </svg>
        ) : null}

        <div className="relative z-10">
          <div className="mb-14 flex justify-center mimo-path-enter">
            <div className="relative max-w-[300px]">
              <div
                ref={startRef}
                className="rounded-[1.35rem] border border-mimo-border/80 bg-mimo-card px-5 py-3.5 text-center shadow-[0_10px_40px_-18px_rgba(15,23,42,0.35)]"
              >
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

          <ol className="space-y-12">
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

                    <div className="relative">
                      {/* Mask so the rail never shows through the circle */}
                      <span
                        className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[5.4rem] w-[5.4rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-mimo-bg"
                        aria-hidden
                      />
                      <Link
                        ref={(el) => {
                          nodeRefs.current[index] = el;
                        }}
                        href={node.href}
                        aria-current={isActive ? "step" : undefined}
                        aria-label={`${node.title}${isActive ? " — sıradaki" : isDone ? " — tamamlandı" : ""}`}
                        className={[
                          "group relative z-[1] flex h-[4.6rem] w-[4.6rem] items-center justify-center rounded-full border-[3.5px] border-white transition duration-200",
                          "hover:-translate-y-0.5 active:translate-y-1 active:shadow-none dark:border-mimo-bg",
                          isUpcoming
                            ? `${tone.muted} ${tone.mutedShadow}`
                            : `${tone.fill} ${tone.shadow}`,
                          isActive ? `ring-4 ${tone.ring} mimo-path-pulse` : "",
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
                    </div>

                    {/* Opaque label plate — rail passes under, text stays readable */}
                    <div className="relative z-[1] mt-3 max-w-[8.5rem] rounded-xl bg-mimo-bg px-2 py-1 text-center">
                      <p
                        className={`text-[14px] font-black leading-tight tracking-tight ${
                          isActive ? "text-mimo-title" : isUpcoming ? "text-mimo-muted" : "text-mimo-fg/80"
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
      </div>
    </section>
  );
}

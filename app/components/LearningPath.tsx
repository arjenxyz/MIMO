import Link from "next/link";

export type PathNode = {
  id: string;
  title: string;
  href: string;
  tone: "green" | "blue" | "purple" | "orange" | "cyan";
  state: "done" | "active" | "upcoming";
  icon?: string;
};

const TONE = {
  green: {
    ring: "ring-[#58cc02]",
    fill: "bg-[#58cc02]",
    shadow: "shadow-[0_6px_0_#46a302]",
    soft: "text-[#58cc02]",
    glow: "shadow-[0_0_0_8px_rgba(88,204,2,0.18)]",
  },
  blue: {
    ring: "ring-[#1cb0f6]",
    fill: "bg-[#1cb0f6]",
    shadow: "shadow-[0_6px_0_#1899d6]",
    soft: "text-[#1cb0f6]",
    glow: "shadow-[0_0_0_8px_rgba(28,176,246,0.2)]",
  },
  purple: {
    ring: "ring-[#ce82ff]",
    fill: "bg-[#ce82ff]",
    shadow: "shadow-[0_6px_0_#a568cc]",
    soft: "text-[#ce82ff]",
    glow: "shadow-[0_0_0_8px_rgba(206,130,255,0.2)]",
  },
  orange: {
    ring: "ring-[#ff9600]",
    fill: "bg-[#ff9600]",
    shadow: "shadow-[0_6px_0_#e08600]",
    soft: "text-[#ff9600]",
    glow: "shadow-[0_0_0_8px_rgba(255,150,0,0.2)]",
  },
  cyan: {
    ring: "ring-[#00cd9c]",
    fill: "bg-[#00cd9c]",
    shadow: "shadow-[0_6px_0_#00a87f]",
    soft: "text-[#00cd9c]",
    glow: "shadow-[0_0_0_8px_rgba(0,205,156,0.2)]",
  },
};

/** Zigzag offsets that stay inside the path column (no horizontal page scroll). */
const OFFSETS = ["translate-x-0", "-translate-x-14 sm:-translate-x-16", "translate-x-14 sm:translate-x-16", "-translate-x-10 sm:-translate-x-12"];

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
      <div className="relative overflow-hidden rounded-[1.75rem] border-2 border-duo-border bg-gradient-to-br from-[#24353d] via-[#1a2a31] to-[#152229] p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#fd860a]/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 left-8 h-36 w-36 rounded-full bg-[#58cc02]/10 blur-2xl" />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#fd860a]">
              Bugünün yolu
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">
              {unitTitle}
            </h1>
            <p className="mt-1.5 max-w-md text-sm font-bold text-duo-muted">{unitHint}</p>
          </div>
          <Link
            href={primaryHref}
            className="inline-flex shrink-0 items-center justify-center rounded-2xl bg-[#58cc02] px-8 py-3.5 text-sm font-black uppercase tracking-wide text-[#14260a] shadow-[0_5px_0_#46a302] transition active:translate-y-1 active:shadow-none"
          >
            {primaryLabel}
          </Link>
        </div>
      </div>

      <div className="relative mx-auto mt-8 max-w-sm overflow-x-clip px-2 pb-6 sm:max-w-md">
        <div
          className="pointer-events-none absolute bottom-10 left-1/2 top-6 w-[3px] -translate-x-1/2 rounded-full bg-gradient-to-b from-[#37464f] via-[#2a3940] to-transparent"
          aria-hidden
        />

        <div className="relative mb-12 flex justify-center">
          <div className="relative max-w-[260px]">
            <div className="rounded-2xl border-2 border-duo-border bg-duo-card px-4 py-3 text-center text-sm font-extrabold leading-snug text-white shadow-[0_6px_0_rgba(0,0,0,0.25)]">
              {greeting}
            </div>
            <div className="absolute left-1/2 top-full h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b-2 border-r-2 border-duo-border bg-duo-card" />
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
                    className={`group relative flex h-[4.75rem] w-[4.75rem] items-center justify-center rounded-full border-[5px] border-[#0f1a1e] transition duration-200 hover:-translate-y-0.5 active:translate-y-1 active:shadow-none ${tone.fill} ${tone.shadow} ${
                      isActive ? `${tone.glow} mimo-path-pulse` : ""
                    } ${isUpcoming ? "opacity-50 grayscale-[40%]" : ""}`}
                  >
                    {isDone ? (
                      <span className="text-2xl font-black text-white drop-shadow-sm">✓</span>
                    ) : node.icon ? (
                      <span className="text-[1.65rem] leading-none drop-shadow-sm" aria-hidden>
                        {node.icon}
                      </span>
                    ) : (
                      <span className="text-2xl font-black text-white drop-shadow-sm">{index + 1}</span>
                    )}
                  </Link>

                  <div className="mt-3 max-w-[7.5rem] text-center">
                    <p className={`text-[15px] font-black leading-tight ${isActive ? "text-white" : "text-white/90"}`}>
                      {node.title}
                    </p>
                    {isActive && (
                      <p className={`mt-0.5 text-[11px] font-extrabold uppercase tracking-wide ${tone.soft}`}>
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

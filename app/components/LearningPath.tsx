import Link from "next/link";
import { Mascot } from "@/app/components/Mascot";

export type PathNode = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  badge?: string;
  tone: "green" | "blue" | "purple" | "orange" | "cyan";
  state: "done" | "active" | "upcoming";
};

const TONE = {
  green: {
    ring: "ring-[#58cc02]",
    fill: "bg-[#58cc02]",
    shadow: "shadow-[0_6px_0_#46a302]",
    soft: "bg-[#58cc02]/15 text-[#58cc02]",
    cta: "bg-[#58cc02] shadow-[0_4px_0_#46a302] hover:brightness-105",
  },
  blue: {
    ring: "ring-[#1cb0f6]",
    fill: "bg-[#1cb0f6]",
    shadow: "shadow-[0_6px_0_#1899d6]",
    soft: "bg-[#1cb0f6]/15 text-[#1cb0f6]",
    cta: "bg-[#1cb0f6] shadow-[0_4px_0_#1899d6] hover:brightness-105",
  },
  purple: {
    ring: "ring-[#ce82ff]",
    fill: "bg-[#ce82ff]",
    shadow: "shadow-[0_6px_0_#a568cc]",
    soft: "bg-[#ce82ff]/15 text-[#ce82ff]",
    cta: "bg-[#ce82ff] shadow-[0_4px_0_#a568cc] text-[#2b0a3d] hover:brightness-105",
  },
  orange: {
    ring: "ring-[#ff9600]",
    fill: "bg-[#ff9600]",
    shadow: "shadow-[0_6px_0_#e08600]",
    soft: "bg-[#ff9600]/15 text-[#ff9600]",
    cta: "bg-[#ff9600] shadow-[0_4px_0_#e08600] hover:brightness-105",
  },
  cyan: {
    ring: "ring-[#00cd9c]",
    fill: "bg-[#00cd9c]",
    shadow: "shadow-[0_6px_0_#00a87f]",
    soft: "bg-[#00cd9c]/15 text-[#00cd9c]",
    cta: "bg-[#00cd9c] shadow-[0_4px_0_#00a87f] hover:brightness-105",
  },
};

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
    <section className="relative">
      <div className="overflow-hidden rounded-[1.75rem] border-2 border-duo-border bg-gradient-to-br from-[#24353d] via-[#1a2a31] to-[#152229] p-5 sm:p-6">
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

      <div className="relative mx-auto mt-8 max-w-md pb-4">
        <div className="absolute bottom-8 left-1/2 top-4 w-1 -translate-x-1/2 rounded-full bg-gradient-to-b from-duo-border via-[#37464f] to-transparent" />

        <div className="relative mb-10 flex items-end justify-center gap-3">
          <div className="relative max-w-[200px]">
            <div className="rounded-2xl border-2 border-duo-border bg-duo-card px-4 py-3 text-sm font-extrabold leading-snug text-white shadow-lg">
              {greeting}
            </div>
            <div className="absolute left-8 top-full h-3 w-3 -translate-y-1/2 rotate-45 border-b-2 border-r-2 border-duo-border bg-duo-card" />
          </div>
          <Mascot mood="wave" size={140} className="w-28 shrink-0 sm:w-32" />
        </div>

        <ol className="relative space-y-10">
          {nodes.map((node, index) => {
            const tone = TONE[node.tone];
            const offset = index % 2 === 0 ? "mr-auto ml-2 sm:ml-6" : "ml-auto mr-2 sm:mr-6";
            const isActive = node.state === "active";
            const isDone = node.state === "done";

            return (
              <li key={node.id} className={`relative flex w-[78%] flex-col items-center ${offset}`}>
                <Link
                  href={node.href}
                  className={`group relative flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full border-[5px] border-[#0f1a1e] ${tone.fill} ${tone.shadow} transition hover:-translate-y-0.5 ${
                    isActive ? `ring-4 ${tone.ring}/40` : ""
                  } ${node.state === "upcoming" ? "opacity-55 grayscale-[30%]" : ""}`}
                >
                  <span className="text-2xl font-black text-white drop-shadow-sm">
                    {isDone ? "✓" : index + 1}
                  </span>
                </Link>

                <div className="mt-3 text-center">
                  <p className="text-base font-black text-white">{node.title}</p>
                  {node.badge && (
                    <span
                      className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${tone.soft}`}
                    >
                      {node.badge}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

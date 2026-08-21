"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  CEFR_SECTION_TITLE,
  difficultyLabel,
  type CefrBand,
  type GrammarTopic,
} from "@/lib/grammarTopics";

const BANDS: CefrBand[] = [1, 2, 3, 4, 5];

const BAND_TONE: Record<
  CefrBand,
  { chip: string; chipActive: string; bar: string; badge: string }
> = {
  1: {
    chip: "bg-mimo-surface text-mimo-muted ring-mimo-border",
    chipActive: "bg-[#e8f6fe] text-[#0369a1] ring-[#1cb0f6]/40",
    bar: "bg-[#1cb0f6]",
    badge: "bg-[#e8f6fe] text-[#0369a1]",
  },
  2: {
    chip: "bg-mimo-surface text-mimo-muted ring-mimo-border",
    chipActive: "bg-[#ecfce5] text-[#15803d] ring-[#58cc02]/40",
    bar: "bg-[#58cc02]",
    badge: "bg-[#ecfce5] text-[#15803d]",
  },
  3: {
    chip: "bg-mimo-surface text-mimo-muted ring-mimo-border",
    chipActive: "bg-[#fff3e0] text-[#c2410c] ring-[#fd860a]/40",
    bar: "bg-[#fd860a]",
    badge: "bg-[#fff3e0] text-[#c2410c]",
  },
  4: {
    chip: "bg-mimo-surface text-mimo-muted ring-mimo-border",
    chipActive: "bg-[#f0fdfa] text-[#0f766e] ring-[#0d9488]/35",
    bar: "bg-[#0d9488]",
    badge: "bg-[#f0fdfa] text-[#0f766e]",
  },
  5: {
    chip: "bg-mimo-surface text-mimo-muted ring-mimo-border",
    chipActive: "bg-[#ffe4e6] text-[#be123c] ring-[#e11d48]/30",
    bar: "bg-[#e11d48]",
    badge: "bg-[#ffe4e6] text-[#be123c]",
  },
};

function shortBand(band: CefrBand) {
  return difficultyLabel(band);
}

function matchesQuery(topic: GrammarTopic, q: string) {
  if (!q) return true;
  const hay = [
    topic.title,
    topic.slug,
    topic.summary,
    topic.tip_tr ?? "",
    topic.example ?? "",
    topic.category ?? "",
    difficultyLabel(topic.difficulty),
  ]
    .join(" ")
    .toLocaleLowerCase("tr");
  return q
    .toLocaleLowerCase("tr")
    .trim()
    .split(/\s+/)
    .every((token) => hay.includes(token));
}

export function GrammarCatalog({ topics }: { topics: GrammarTopic[] }) {
  const [query, setQuery] = useState("");
  const [bandFilter, setBandFilter] = useState<CefrBand | "all">("all");

  const filtered = useMemo(() => {
    return topics.filter((t) => {
      if (bandFilter !== "all") {
        const band = Math.min(5, Math.max(1, t.difficulty)) as CefrBand;
        if (band !== bandFilter) return false;
      }
      return matchesQuery(t, query);
    });
  }, [topics, query, bandFilter]);

  const grouped = useMemo(() => {
    const map = new Map<CefrBand, GrammarTopic[]>();
    for (const band of BANDS) map.set(band, []);
    for (const topic of filtered) {
      const band = Math.min(5, Math.max(1, topic.difficulty)) as CefrBand;
      map.get(band)!.push(topic);
    }
    return map;
  }, [filtered]);

  const counts = useMemo(() => {
    const map = new Map<CefrBand, number>();
    for (const band of BANDS) map.set(band, 0);
    for (const topic of topics) {
      const band = Math.min(5, Math.max(1, topic.difficulty)) as CefrBand;
      map.set(band, (map.get(band) ?? 0) + 1);
    }
    return map;
  }, [topics]);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#1cb0f6]">
            Gramer
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-mimo-title sm:text-[1.75rem]">
            Tüm konular
          </h1>
          <p className="mt-1 text-sm font-semibold text-mimo-muted">
            {topics.length} konu · seviyeye göre ilerle
          </p>
        </div>
        <Link
          href="/"
          className="mt-0.5 inline-flex h-9 shrink-0 items-center gap-1 rounded-full px-2.5 text-[13px] font-bold text-mimo-muted transition hover:bg-mimo-surface hover:text-mimo-fg"
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
          >
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
          Çık
        </Link>
      </header>

      <div className="space-y-3">
        <label className="relative block">
          <span className="sr-only">Konu ara</span>
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-mimo-muted">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              aria-hidden
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Konu ara… (present, if, passive)"
            autoComplete="off"
            className="w-full rounded-2xl border border-mimo-border bg-mimo-card py-3 pl-10 pr-3.5 text-sm font-semibold text-mimo-fg outline-none placeholder:text-mimo-muted focus:border-[#1cb0f6] focus:ring-2 focus:ring-[#1cb0f6]/15"
          />
        </label>

        <div
          role="tablist"
          aria-label="Seviye filtresi"
          className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <button
            type="button"
            role="tab"
            aria-selected={bandFilter === "all"}
            onClick={() => setBandFilter("all")}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-extrabold ring-1 transition ${
              bandFilter === "all"
                ? "bg-[#1cb0f6] text-white ring-[#1cb0f6]"
                : "bg-mimo-surface text-mimo-muted ring-mimo-border hover:text-mimo-fg"
            }`}
          >
            Tümü · {topics.length}
          </button>
          {BANDS.map((band) => {
            const active = bandFilter === band;
            const tone = BAND_TONE[band];
            return (
              <button
                key={band}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setBandFilter(band)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-extrabold ring-1 transition ${
                  active ? tone.chipActive : tone.chip
                }`}
              >
                {shortBand(band)} · {counts.get(band) ?? 0}
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-mimo-border bg-mimo-card/80 px-4 py-12 text-center">
          <p className="text-sm font-extrabold text-mimo-title">Konu bulunamadı</p>
          <p className="mt-1 text-sm font-semibold text-mimo-muted">
            {query
              ? `“${query}” için sonuç yok.`
              : "Bu filtreyle eşleşen konu yok."}
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setBandFilter("all");
            }}
            className="mt-4 text-sm font-bold text-[#1cb0f6]"
          >
            Filtreleri temizle
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {BANDS.map((band) => {
            const list = grouped.get(band) ?? [];
            if (!list.length) return null;
            const tone = BAND_TONE[band];
            return (
              <section key={band} aria-labelledby={`cefr-${band}`}>
                <div className="mb-3 flex items-center gap-2">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${tone.badge}`}
                  >
                    {shortBand(band)}
                  </span>
                  <h2
                    id={`cefr-${band}`}
                    className="min-w-0 flex-1 truncate text-sm font-black text-mimo-title"
                  >
                    {CEFR_SECTION_TITLE[band]}
                  </h2>
                  <span className="shrink-0 text-xs font-bold tabular-nums text-mimo-muted">
                    {list.length}
                  </span>
                </div>

                <ul className="overflow-hidden rounded-2xl border border-mimo-border bg-mimo-card shadow-sm">
                  {list.map((topic, i) => (
                    <li key={topic.slug}>
                      <Link
                        href={`/grammar/${topic.slug}`}
                        className={`group relative flex gap-3 px-3.5 py-3.5 transition hover:bg-mimo-surface ${
                          i > 0 ? "border-t border-mimo-soft" : ""
                        }`}
                      >
                        <span
                          className={`mt-1 w-1 shrink-0 self-stretch rounded-full ${tone.bar}`}
                          aria-hidden
                        />
                        <div className="min-w-0 flex-1">
                          <h3 className="text-[15px] font-black leading-snug text-mimo-title">
                            {topic.title}
                          </h3>
                          <p className="mt-0.5 line-clamp-2 text-[13px] font-semibold leading-snug text-mimo-muted">
                            {topic.tip_tr || topic.summary}
                          </p>
                        </div>
                        <span className="mt-0.5 flex shrink-0 items-center gap-1 self-start text-xs font-black text-[#1cb0f6] opacity-80 transition group-hover:opacity-100">
                          Başla
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden
                          >
                            <path d="M9 6l6 6-6 6" />
                          </svg>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

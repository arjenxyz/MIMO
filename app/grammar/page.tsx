import Link from "next/link";
import {
  CEFR_SECTION_TITLE,
  difficultyLabel,
  getDemoGrammarTopics,
  type CefrBand,
  type GrammarTopic,
} from "@/lib/grammarTopics";

export const dynamic = "force-dynamic";

const BANDS: CefrBand[] = [1, 2, 3, 4, 5];

function groupByDifficulty(topics: GrammarTopic[]) {
  const map = new Map<CefrBand, GrammarTopic[]>();
  for (const band of BANDS) map.set(band, []);
  for (const topic of topics) {
    const band = Math.min(5, Math.max(1, topic.difficulty)) as CefrBand;
    map.get(band)!.push(topic);
  }
  return map;
}

export default function GrammarCatalogPage() {
  const topics = getDemoGrammarTopics();
  const grouped = groupByDifficulty(topics);
  const total = topics.length;

  return (
    <main className="mx-auto min-h-[100dvh] max-w-lg bg-mimo-bg px-4 pb-12 pt-6 text-mimo-fg">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#ce82ff]">Gramer</p>
          <h1 className="mt-1 text-2xl font-black text-mimo-title">Tüm konular</h1>
          <p className="mt-1 text-sm font-semibold text-mimo-muted">
            A1–C1 — {total} konu. Sorular kod/API ile gelir; veritabanı gerekmez.
          </p>
        </div>
        <Link
          href="/"
          className="shrink-0 rounded-full px-3 py-1.5 text-sm font-bold text-mimo-muted transition hover:bg-mimo-surface hover:text-mimo-fg"
        >
          Ana sayfa
        </Link>
      </div>

      <div className="space-y-8">
        {BANDS.map((band) => {
          const list = grouped.get(band) ?? [];
          if (!list.length) return null;
          return (
            <section key={band} aria-labelledby={`cefr-${band}`}>
              <div className="mb-3 flex items-baseline justify-between gap-2">
                <h2 id={`cefr-${band}`} className="text-sm font-black uppercase tracking-[0.14em] text-mimo-title">
                  {CEFR_SECTION_TITLE[band]}
                </h2>
                <span className="text-xs font-bold text-mimo-muted">{list.length} konu</span>
              </div>
              <ul className="space-y-2.5">
                {list.map((topic) => (
                  <li key={topic.slug}>
                    <Link
                      href={`/grammar/${topic.slug}`}
                      className="block rounded-2xl border border-mimo-border bg-mimo-card px-4 py-3.5 shadow-sm transition hover:border-[#ce82ff]/50 hover:bg-mimo-surface"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-[15px] font-black leading-snug text-mimo-title">{topic.title}</h3>
                          <p className="mt-1 line-clamp-2 text-sm font-semibold text-mimo-muted">
                            {topic.tip_tr || topic.summary}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-mimo-surface px-2.5 py-1 text-[11px] font-black text-mimo-muted">
                          {difficultyLabel(topic.difficulty)}
                        </span>
                      </div>
                      <p className="mt-2.5 text-xs font-bold uppercase tracking-wide text-[#ce82ff]">
                        Alıştırma · Başla →
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </main>
  );
}

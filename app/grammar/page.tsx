import Link from "next/link";
import { headers } from "next/headers";
import { listGrammarTopics } from "@/lib/db";
import { difficultyLabel, getDemoGrammarTopics } from "@/lib/grammarTopics";
import { isDemoMode } from "@/lib/demo";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function GrammarCatalogPage() {
  const headerList = await headers();
  const host = headerList.get("host")?.split(":")[0] ?? null;
  const demo = isDemoMode(host);

  let topics = getDemoGrammarTopics();

  if (!demo && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    try {
      const supabase = await createClient();
      const live = await listGrammarTopics(supabase);
      if (live.length > 0) topics = live;
    } catch {
      // keep demo pack
    }
  }

  return (
    <main className="mx-auto min-h-[100dvh] max-w-lg bg-mimo-bg px-4 pb-12 pt-6 text-mimo-fg">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#ce82ff]">Gramer</p>
          <h1 className="mt-1 text-2xl font-black text-mimo-title">Konu seç</h1>
          <p className="mt-1 text-sm font-semibold text-mimo-muted">
            Her kural ayrı sayfada — özet oku, bol soru çöz.
          </p>
        </div>
        <Link
          href="/"
          className="rounded-full px-3 py-1.5 text-sm font-bold text-mimo-muted transition hover:bg-mimo-surface hover:text-mimo-fg"
        >
          Ana sayfa
        </Link>
      </div>

      <ul className="space-y-3">
        {topics.map((topic) => (
          <li key={topic.slug}>
            <Link
              href={`/grammar/${topic.slug}`}
              className="block rounded-2xl border border-mimo-border bg-mimo-card px-4 py-4 shadow-sm transition hover:border-[#ce82ff]/50 hover:bg-mimo-surface"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-base font-black text-mimo-title">{topic.title}</h2>
                  <p className="mt-1 line-clamp-2 text-sm font-semibold text-mimo-muted">
                    {topic.tip_tr || topic.summary}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-mimo-surface px-2.5 py-1 text-[11px] font-black text-mimo-muted">
                  {difficultyLabel(topic.difficulty)}
                </span>
              </div>
              <p className="mt-3 text-xs font-bold uppercase tracking-wide text-[#ce82ff]">
                {topic.item_count ?? 0} soru · Başla →
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

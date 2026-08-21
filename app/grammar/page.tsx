import { GrammarCatalog } from "@/app/components/GrammarCatalog";
import { getDemoGrammarTopics } from "@/lib/grammarTopics";

export const dynamic = "force-dynamic";

export default function GrammarCatalogPage() {
  const topics = getDemoGrammarTopics();

  return (
    <main className="relative mx-auto min-h-[100dvh] max-w-lg overflow-x-clip bg-mimo-bg px-4 pb-14 pt-6 text-mimo-fg">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_top,rgba(28,176,246,0.09),transparent_70%)]"
        aria-hidden
      />
      <div className="relative">
        <GrammarCatalog topics={topics} />
      </div>
    </main>
  );
}

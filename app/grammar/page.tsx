import { GrammarCatalog } from "@/app/components/GrammarCatalog";
import { getDemoGrammarTopics } from "@/lib/grammarTopics";

export const dynamic = "force-dynamic";

export default function GrammarCatalogPage() {
  const topics = getDemoGrammarTopics();

  return (
    <main className="mx-auto min-h-[100dvh] max-w-lg bg-mimo-bg px-4 pb-12 pt-6 text-mimo-fg">
      <GrammarCatalog topics={topics} />
    </main>
  );
}

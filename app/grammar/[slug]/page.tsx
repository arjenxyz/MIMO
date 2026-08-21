import { notFound } from "next/navigation";
import { GrammarDrill } from "@/app/components/GrammarDrill";
import { getDemoGrammarTopicBySlug } from "@/lib/grammarTopics";

export const dynamic = "force-dynamic";

export default async function GrammarTopicPage({
  params,
}: {
  params: Promise<{ slug: string }> | { slug: string };
}) {
  const resolved = await Promise.resolve(params);
  const topic = getDemoGrammarTopicBySlug(resolved.slug);

  if (!topic) {
    notFound();
  }

  return <GrammarDrill topic={topic} />;
}

import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { GrammarDrill } from "@/app/components/GrammarDrill";
import { getGrammarTopicBySlug } from "@/lib/db";
import { getDemoGrammarTopicBySlug } from "@/lib/grammarTopics";
import { isDemoMode } from "@/lib/demo";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function GrammarTopicPage({
  params,
}: {
  params: Promise<{ slug: string }> | { slug: string };
}) {
  const resolved = await Promise.resolve(params);
  const slug = resolved.slug;

  const headerList = await headers();
  const host = headerList.get("host")?.split(":")[0] ?? null;
  const demo = isDemoMode(host);

  let topic = getDemoGrammarTopicBySlug(slug);

  if (!demo && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    try {
      const supabase = await createClient();
      const live = await getGrammarTopicBySlug(supabase, slug);
      if (live && live.items.length > 0) topic = live;
    } catch {
      // keep demo
    }
  }

  if (!topic) {
    notFound();
  }

  return <GrammarDrill topic={topic} />;
}

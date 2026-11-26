import { headers } from "next/headers";
import { RealWordGame } from "@/app/components/RealWordGame";
import { getPublicGlobalWords, getUserWords } from "@/lib/db";
import { DEMO_DUE_WORDS, isDemoMode } from "@/lib/demo";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function RealWordQuizPage() {
  const headerList = await headers();
  const host = headerList.get("host")?.split(":")[0] ?? null;
  const demo = isDemoMode(host);

  let seedWords: string[] = [];

  if (demo || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    seedWords = DEMO_DUE_WORDS.filter((row) => row.words).map((row) => row.words!.english);
  } else {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Full vocabulary list — every word on the account is fair game.
        const all = await getUserWords(supabase, user.id);
        seedWords = all.filter((row) => row.words).map((row) => row.words!.english);
      } else {
        const pub = await getPublicGlobalWords(supabase, 80);
        seedWords = pub.map((w) => w.english);
      }
    } catch {
      seedWords = [];
    }

    if (seedWords.length === 0) {
      seedWords = DEMO_DUE_WORDS.filter((row) => row.words).map((row) => row.words!.english);
    }
  }

  return <RealWordGame seedWords={seedWords} />;
}

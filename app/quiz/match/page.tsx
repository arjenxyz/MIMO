import { headers } from "next/headers";
import { MatchPairsGame, type MatchWord } from "@/app/components/MatchPairsGame";
import { getLearnedWords, getPublicGlobalWords } from "@/lib/db";
import { DEMO_DUE_WORDS, isDemoMode } from "@/lib/demo";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const EXTRA_DEMO: MatchWord[] = [
  { id: 101, english: "please", turkish: "lütfen" },
  { id: 102, english: "London", turkish: "Londra" },
  { id: 103, english: "China", turkish: "Çin" },
  { id: 104, english: "Japan", turkish: "Japonya" },
  { id: 105, english: "dad", turkish: "baba" },
  { id: 106, english: "mother", turkish: "anne" },
  { id: 107, english: "water", turkish: "su" },
  { id: 108, english: "friend", turkish: "arkadaş" },
];

function demoMatchWords(): MatchWord[] {
  return [
    ...DEMO_DUE_WORDS.filter((row) => row.words).map((row) => ({
      id: row.words!.id,
      english: row.words!.english,
      turkish: row.words!.turkish,
    })),
    ...EXTRA_DEMO,
  ];
}

export default async function MatchQuizPage() {
  const headerList = await headers();
  const host = headerList.get("host")?.split(":")[0] ?? null;
  const demo = isDemoMode(host);

  let words: MatchWord[] = [];

  if (demo || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    words = demoMatchWords();
  } else {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const learned = await getLearnedWords(supabase, user.id, 5);
        words = learned
          .filter((row) => row.words)
          .map((row) => ({
            id: row.words!.id,
            english: row.words!.english,
            turkish: row.words!.turkish,
          }));
      } else {
        const pub = await getPublicGlobalWords(supabase, 80);
        words = pub.map((w) => ({ id: w.id, english: w.english, turkish: w.turkish }));
      }
    } catch {
      words = [];
    }

    if (words.length < 5) {
      words = [...words, ...demoMatchWords()];
    }
  }

  // Dedupe by english key
  const seen = new Set<string>();
  words = words.filter((w) => {
    const key = w.english.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return <MatchPairsGame words={words} />;
}

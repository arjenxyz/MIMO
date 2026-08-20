import { headers } from "next/headers";
import { MatchPairsGame, type MatchWord } from "@/app/components/MatchPairsGame";
import { getLearnedWords } from "@/lib/db";
import { DEMO_DUE_WORDS, isDemoMode } from "@/lib/demo";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

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

export default async function MatchQuizPage() {
  const headerList = await headers();
  const host = headerList.get("host")?.split(":")[0] ?? null;
  const demo = isDemoMode(host);

  let words: MatchWord[] = [];

  if (demo) {
    words = [
      ...DEMO_DUE_WORDS.filter((row) => row.words).map((row) => ({
        id: row.words!.id,
        english: row.words!.english,
        turkish: row.words!.turkish,
      })),
      ...EXTRA_DEMO,
    ];
  } else {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      redirect("/login");
    }
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const learned = await getLearnedWords(supabase, user.id, 5);
    words = learned
      .filter((row) => row.words)
      .map((row) => ({
        id: row.words!.id,
        english: row.words!.english,
        turkish: row.words!.turkish,
      }));
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

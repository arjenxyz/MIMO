import { headers } from "next/headers";
import { ChallengeArena } from "@/app/components/ChallengeArena";
import { getChallenge } from "@/lib/challenges";
import { isDemoMode } from "@/lib/demo";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { ChallengeModule, ChallengeRow } from "@/types";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ module?: string; vs?: string }>;
};

const DEMO_WORDS = [
  { id: 1, english: "water", turkish: "su" },
  { id: 2, english: "friend", turkish: "arkadaş" },
  { id: 3, english: "please", turkish: "lütfen" },
  { id: 4, english: "mother", turkish: "anne" },
  { id: 5, english: "father", turkish: "baba" },
  { id: 6, english: "school", turkish: "okul" },
  { id: 7, english: "book", turkish: "kitap" },
  { id: 8, english: "city", turkish: "şehir" },
  { id: 9, english: "happy", turkish: "mutlu" },
  { id: 10, english: "night", turkish: "gece" },
  { id: 11, english: "morning", turkish: "sabah" },
  { id: 12, english: "family", turkish: "aile" },
];

export default async function ChallengePage({ params, searchParams }: Props) {
  const { id: idParam } = await params;
  const q = await searchParams;
  const headerList = await headers();
  const host = headerList.get("host")?.split(":")[0] ?? null;
  const demoHost = isDemoMode(host);

  if (idParam === "demo" || (demoHost && !Number.isFinite(Number(idParam)))) {
    const module: ChallengeModule =
      q.module === "word_check" ? "word_check" : "match";
    const vs = q.vs?.trim() || "Demo Rakip";
    const demoChallenge: ChallengeRow = {
      id: 0,
      challenger_id: "demo-me",
      opponent_id: "demo-opp",
      module,
      status: "active",
      seed_words: DEMO_WORDS,
      challenger_score: 0,
      opponent_score: 0,
      winner_id: null,
      created_at: new Date().toISOString(),
      started_at: new Date().toISOString(),
      finished_at: null,
      challenger: { id: "demo-me", username: "Sen", daily_streak: 3 },
      opponent: { id: "demo-opp", username: vs, daily_streak: 2 },
    };
    return (
      <ChallengeArena initial={demoChallenge} userId="demo-me" demo demoVsName={vs} />
    );
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    redirect("/login");
  }

  const challengeId = Number(idParam);
  if (!Number.isFinite(challengeId)) redirect("/friends");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let challenge: ChallengeRow;
  try {
    challenge = await getChallenge(supabase, challengeId, user.id);
  } catch {
    redirect("/friends");
  }

  return <ChallengeArena initial={challenge} userId={user.id} />;
}

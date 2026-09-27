import { headers } from "next/headers";
import { ChallengeArena } from "@/app/components/ChallengeArena";
import { getChallenge } from "@/lib/challenges";
import {
  buildDemoArenaChallenge,
  DEMO_PROFILE,
  getDemoChallengeById,
  isDemoMode,
} from "@/lib/demo";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { ChallengeModule, ChallengeRow } from "@/types";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ module?: string; vs?: string }>;
};

export default async function ChallengePage({ params, searchParams }: Props) {
  const { id: idParam } = await params;
  const q = await searchParams;
  const headerList = await headers();
  const host = headerList.get("host")?.split(":")[0] ?? null;
  const demoHost = isDemoMode(host);

  const challengeModule: ChallengeModule =
    q.module === "word_check" ? "word_check" : "match";
  const vs = q.vs?.trim() || "Demo Rakip";
  const numericId = Number(idParam);

  if (demoHost || idParam === "demo") {
    const fromPool =
      Number.isFinite(numericId) && numericId > 0
        ? getDemoChallengeById(numericId)
        : null;
    const demoChallenge: ChallengeRow =
      fromPool ??
      buildDemoArenaChallenge({
        id: Number.isFinite(numericId) ? numericId : 0,
        module: challengeModule,
        vsName: vs,
      });

    const playable: ChallengeRow =
      demoChallenge.status === "pending"
        ? { ...demoChallenge, status: "active", started_at: new Date().toISOString() }
        : demoChallenge;

    return (
      <ChallengeArena
        initial={playable}
        userId={DEMO_PROFILE.id}
        demo
        demoVsName={
          playable.challenger_id === DEMO_PROFILE.id
            ? playable.opponent?.username ?? vs
            : playable.challenger?.username ?? vs
        }
      />
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

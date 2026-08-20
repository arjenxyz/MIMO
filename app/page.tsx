import { redirect } from "next/navigation";
import Link from "next/link";
import { DailyQuests } from "@/app/components/DailyQuests";
import { LoadWordsButton } from "@/app/components/LoadWordsButton";
import { Mascot } from "@/app/components/Mascot";
import {
  claimDailyQuestBonus,
  getDailyQuests,
  getDueGrammar,
  getDueWords,
  getProfile,
  syncDailyStreak,
} from "@/lib/db";
import { xpInCurrentLevel } from "@/lib/srs";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    redirect("/onboarding");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/onboarding");
  }

  let profile = await getProfile(supabase, user.id);
  if (!profile) {
    redirect("/onboarding");
  }

  profile = await syncDailyStreak(supabase, profile);
  const quests = await getDailyQuests(supabase, profile);
  const bonus = await claimDailyQuestBonus(supabase, profile, quests);
  if (bonus?.profile) {
    profile = bonus.profile;
  }

  const dueWords = await getDueWords(supabase, user.id);
  const dueGrammar = await getDueGrammar(supabase, user.id);
  const xpNow = xpInCurrentLevel(profile.xp);
  const questsView = bonus
    ? { ...quests, bonusClaimed: true, allComplete: true }
    : quests;

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-6">
      <section className="mb-6 flex flex-col items-center rounded-3xl border-2 border-duo-border bg-duo-card p-6 text-center sm:flex-row sm:text-left">
        <Mascot mood="excited" size={220} className="w-40 sm:w-52" />
        <div className="flex-1">
          <p className="text-sm font-extrabold uppercase tracking-wide text-duo-muted">
            Hoş geldin{profile.username ? `, ${profile.username}` : ""}
          </p>
          <h1 className="text-3xl font-black">Level {profile.level}</h1>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-sm font-extrabold">
              <span className="text-duo-gold">{xpNow}/100 XP</span>
              <span>Toplam {profile.xp} XP</span>
            </div>
            <div className="h-4 overflow-hidden rounded-full bg-duo-border">
              <div
                className="h-full rounded-full bg-duo-gold"
                style={{ width: `${xpNow}%` }}
              />
            </div>
          </div>
          <p className="mt-3 text-lg font-black text-duo-orange">🔥 {profile.daily_streak} günlük seri</p>
        </div>
      </section>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Link
          href="/quiz"
          className="rounded-3xl border-2 border-duo-blue bg-duo-card p-5 shadow-duo-blue"
        >
          <p className="text-sm font-extrabold text-duo-blue">KELİMELER</p>
          <p className="mt-2 text-3xl font-black">{dueWords.length}</p>
          <p className="font-bold text-duo-muted">Bugün tekrar edilecek kelime</p>
        </Link>
        <Link
          href="/quiz/grammar"
          className="rounded-3xl border-2 border-duo-purple bg-duo-card p-5 shadow-duo-purple"
        >
          <p className="text-sm font-extrabold text-duo-purple">GRAMER</p>
          <p className="mt-2 text-3xl font-black">{dueGrammar.length}</p>
          <p className="font-bold text-duo-muted">Bugün bekleyen gramer</p>
        </Link>
      </div>

      <DailyQuests quests={questsView} bonusJustClaimed={Boolean(bonus?.claimed)} />

      {dueWords.length === 0 && (
        <section className="mt-6 rounded-3xl border-2 border-dashed border-duo-border bg-duo-card p-5">
          <h2 className="mb-2 text-xl font-black">Havuz boş görünüyor</h2>
          <p className="mb-4 font-semibold text-duo-muted">
            Yeni kelimeler yükle, bugünkü quiz asla boş kalmasın.
          </p>
          <LoadWordsButton />
        </section>
      )}
    </main>
  );
}

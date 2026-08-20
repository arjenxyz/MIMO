import { redirect } from "next/navigation";
import Link from "next/link";
import { AddWordForm } from "@/app/components/AddWordForm";
import { DailyQuests } from "@/app/components/DailyQuests";
import { LearningPath, type PathNode } from "@/app/components/LearningPath";
import { LoadWordsButton } from "@/app/components/LoadWordsButton";
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

function greetingFor(hour: number, name: string | null) {
  const who = name ? `, ${name}` : "";
  if (hour < 12) return `Günaydın${who}! Bugün de bir adım atalım.`;
  if (hour < 18) return `Merhaba${who}! Serini bozma, kısa bir pratik yeter.`;
  return `İyi akşamlar${who}! Uyumadan önce hızlı bir tur atalım.`;
}

export default async function DashboardPage() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    redirect("/login");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let profile = await getProfile(supabase, user.id);
  if (!profile) {
    redirect("/login");
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

  const hour = new Date().getHours();
  const greeting = greetingFor(hour, profile.username);

  let primaryHref = "/sounds";
  let primaryLabel = "Başlat";
  let unitTitle = "Sesleri güçlendir";
  let unitHint = "Kulağını İngilizce seslere alıştır, telaffuzunu netleştir.";
  let activeId = "sounds";

  if (dueWords.length > 0) {
    primaryHref = "/quiz";
    primaryLabel = "Kelimeye başla";
    unitTitle = "Kelime tekrarı";
    unitHint = `${dueWords.length} kelime seni bekliyor. Kısa tekrar, uzun hafıza.`;
    activeId = "words";
  } else if (dueGrammar.length > 0) {
    primaryHref = "/quiz/grammar";
    primaryLabel = "Gramere başla";
    unitTitle = "Gramer pratiği";
    unitHint = `${dueGrammar.length} gramer kuralı tekrar zamanı.`;
    activeId = "grammar";
  }

  const nodes: PathNode[] = [
    {
      id: "words",
      title: "Kelimeler",
      subtitle: dueWords.length > 0 ? `${dueWords.length} bekleyen` : "Hepsi güncel",
      href: "/quiz",
      badge: dueWords.length > 0 ? "Tekrar" : "Hazır",
      tone: "blue",
      state: activeId === "words" ? "active" : dueWords.length === 0 ? "done" : "upcoming",
    },
    {
      id: "grammar",
      title: "Gramer",
      subtitle: dueGrammar.length > 0 ? `${dueGrammar.length} bekleyen` : "Rahat nefes",
      href: "/quiz/grammar",
      badge: dueGrammar.length > 0 ? "Pratik" : "Hazır",
      tone: "purple",
      state: activeId === "grammar" ? "active" : dueGrammar.length === 0 ? "done" : "upcoming",
    },
    {
      id: "sounds",
      title: "Sesler",
      subtitle: "Dinle ve ayırt et",
      href: "/sounds",
      badge: "+10 XP",
      tone: "cyan",
      state: activeId === "sounds" ? "active" : "upcoming",
    },
    {
      id: "reading",
      title: "Okuma",
      subtitle: `Seviye ${profile.level} hikayeler`,
      href: "/reading",
      badge: "Hikaye",
      tone: "orange",
      state: "upcoming",
    },
  ];

  // Mark nodes before active as done for path feel
  const activeIndex = nodes.findIndex((n) => n.id === activeId);
  const pathNodes = nodes.map((node, i) => {
    if (i < activeIndex) return { ...node, state: "done" as const };
    if (i === activeIndex) return { ...node, state: "active" as const };
    return { ...node, state: node.state === "done" ? ("done" as const) : ("upcoming" as const) };
  });

  return (
    <main className="relative mx-auto min-h-screen max-w-6xl px-4 pb-28 pt-5 lg:pb-10 lg:pt-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(ellipse_at_top,_rgba(253,134,10,0.12),_transparent_55%)]" />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)] lg:items-start">
        <LearningPath
          nodes={pathNodes}
          unitTitle={unitTitle}
          unitHint={unitHint}
          primaryHref={primaryHref}
          primaryLabel={primaryLabel}
          greeting={greeting}
        />

        <aside className="space-y-5 lg:sticky lg:top-20">
          <section className="rounded-[1.75rem] border-2 border-duo-border bg-duo-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-duo-muted">
                  Seviye ilerlemesi
                </p>
                <p className="mt-1 text-2xl font-black text-white">Level {profile.level}</p>
              </div>
              <div className="relative flex h-16 w-16 items-center justify-center">
                <svg className="absolute inset-0 -rotate-90" viewBox="0 0 36 36" aria-hidden>
                  <circle
                    cx="18"
                    cy="18"
                    r="15.5"
                    fill="none"
                    stroke="#37464f"
                    strokeWidth="3"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.5"
                    fill="none"
                    stroke="#ffc800"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={`${xpNow} ${100 - xpNow}`}
                  />
                </svg>
                <span className="text-xs font-black text-[#ffc800]">{xpNow}</span>
              </div>
            </div>
            <div className="mt-4">
              <div className="mb-1 flex justify-between text-xs font-extrabold">
                <span className="text-[#ffc800]">{xpNow}/100 XP</span>
                <span className="text-duo-muted">Toplam {profile.xp}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-[#0f1a1e]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#ffc800] to-[#ff9600]"
                  style={{ width: `${xpNow}%` }}
                />
              </div>
            </div>
            <p className="mt-4 flex items-center gap-2 text-sm font-black text-[#ff9600]">
              <span aria-hidden>🔥</span>
              {profile.daily_streak} günlük seri
            </p>
          </section>

          <DailyQuests quests={questsView} bonusJustClaimed={Boolean(bonus?.claimed)} />

          <AddWordForm />

          <section className="grid grid-cols-2 gap-3">
            <Link
              href="/quiz"
              className="rounded-2xl border-2 border-[#1cb0f6]/35 bg-[#1cb0f6]/10 p-4 transition hover:border-[#1cb0f6]/70"
            >
              <p className="text-[10px] font-black uppercase tracking-wide text-[#1cb0f6]">
                Kelime
              </p>
              <p className="mt-1 text-2xl font-black tabular-nums text-white">{dueWords.length}</p>
            </Link>
            <Link
              href="/quiz/grammar"
              className="rounded-2xl border-2 border-[#ce82ff]/35 bg-[#ce82ff]/10 p-4 transition hover:border-[#ce82ff]/70"
            >
              <p className="text-[10px] font-black uppercase tracking-wide text-[#ce82ff]">
                Gramer
              </p>
              <p className="mt-1 text-2xl font-black tabular-nums text-white">{dueGrammar.length}</p>
            </Link>
          </section>

          {dueWords.length === 0 && (
            <section className="rounded-[1.75rem] border-2 border-dashed border-duo-border bg-duo-card/80 p-5">
              <h2 className="text-base font-black text-white">Kelime havuzu boş</h2>
              <p className="mt-1 text-sm font-semibold text-duo-muted">
                Yeni kelimeler yükle, yolun ilk adımı dolsun.
              </p>
              <div className="mt-4">
                <LoadWordsButton />
              </div>
            </section>
          )}

          <nav className="hidden gap-2 lg:grid lg:grid-cols-2">
            {(
              [
                ["/quiz", "Kelime quiz", "#1cb0f6"],
                ["/quiz/grammar", "Gramer", "#ce82ff"],
                ["/sounds", "Sesler", "#00cd9c"],
                ["/reading", "Okuma", "#ff9600"],
              ] as const
            ).map(([href, label, color]) => (
              <Link
                key={href}
                href={href}
                className="rounded-2xl border-2 border-duo-border bg-[#0f1a1e] px-4 py-3 text-center text-sm font-extrabold text-white transition hover:border-white/20"
                style={{ boxShadow: `inset 3px 0 0 ${color}` }}
              >
                {label}
              </Link>
            ))}
          </nav>
        </aside>
      </div>
    </main>
  );
}

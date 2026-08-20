import Link from "next/link";
import { headers } from "next/headers";
import { AddWordForm } from "@/app/components/AddWordForm";
import { LearningPath, type PathNode } from "@/app/components/LearningPath";
import { LoadWordsButton } from "@/app/components/LoadWordsButton";
import { DEMO_DUE, DEMO_PROFILE, isDemoMode } from "@/lib/demo";
import {
  getDueGrammar,
  getDueWords,
  getProfile,
  syncDailyStreak,
} from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function greetingFor(hour: number, name: string | null) {
  const who = name ? `, ${name}` : "";
  if (hour < 12) return `Günaydın${who}! Bugün de bir adım atalım.`;
  if (hour < 18) return `Merhaba${who}! Serini bozma, kısa bir pratik yeter.`;
  return `İyi akşamlar${who}! Uyumadan önce hızlı bir tur atalım.`;
}

export default async function DashboardPage() {
  const headerList = await headers();
  const host = headerList.get("host")?.split(":")[0] ?? null;
  const demo = isDemoMode(host);

  let profile: Profile = DEMO_PROFILE;
  let dueWordCount = DEMO_DUE.words;
  let dueGrammarCount = DEMO_DUE.grammar;
  let showLoadWords = false;
  let showAddWord = !demo;

  if (!demo) {
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

    let liveProfile = await getProfile(supabase, user.id);
    if (!liveProfile) {
      redirect("/login");
    }

    liveProfile = await syncDailyStreak(supabase, liveProfile);
    const dueWords = await getDueWords(supabase, user.id);
    const dueGrammar = await getDueGrammar(supabase, user.id);

    profile = liveProfile;
    dueWordCount = dueWords.length;
    dueGrammarCount = dueGrammar.length;
    showLoadWords = dueWords.length === 0;
    showAddWord = true;
  }

  const hour = new Date().getHours();
  const greeting = greetingFor(hour, profile.username);

  let primaryHref = "/sounds";
  let primaryLabel = "Başlat";
  let unitTitle = "Sesleri güçlendir";
  let unitHint = "Kulağını İngilizce seslere alıştır, telaffuzunu netleştir.";
  let activeId = "sounds";

  if (dueWordCount > 0) {
    primaryHref = "/quiz";
    primaryLabel = "Kelimeye başla";
    unitTitle = "Kelime tekrarı";
    unitHint = `${dueWordCount} kelime seni bekliyor. Kısa tekrar, uzun hafıza.`;
    activeId = "words";
  }

  const nodes: PathNode[] = [
    {
      id: "words",
      title: "Kelimeler",
      href: "/quiz",
      tone: "blue",
      icon: "📚",
      state: activeId === "words" ? "active" : dueWordCount === 0 ? "done" : "upcoming",
    },
    {
      id: "sounds",
      title: "Sesler",
      href: "/sounds",
      tone: "cyan",
      icon: "🔊",
      state: activeId === "sounds" ? "active" : "upcoming",
    },
    {
      id: "det",
      title: "Read & Complete",
      href: "/det/read-complete",
      tone: "purple",
      icon: "📝",
      state: "upcoming",
    },
    {
      id: "photo",
      title: "Görsel Betimleme",
      href: "/photo-practice",
      tone: "orange",
      icon: "🖼️",
      state: "upcoming",
    },
  ];

  const activeIndex = nodes.findIndex((n) => n.id === activeId);
  const pathNodes = nodes.map((node, i) => {
    if (i < activeIndex) return { ...node, state: "done" as const };
    if (i === activeIndex) return { ...node, state: "active" as const };
    return { ...node, state: node.state === "done" ? ("done" as const) : ("upcoming" as const) };
  });

  return (
    <main className="relative mx-auto min-h-screen max-w-6xl overflow-x-clip px-4 pb-10 pt-5 lg:pt-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(ellipse_at_top,_rgba(253,134,10,0.12),_transparent_55%)]" />

      {demo && (
        <div className="mb-4 rounded-2xl border border-[#ffc800]/40 bg-[#ffc800]/10 px-4 py-2 text-center text-xs font-extrabold text-[#ffc800]">
          Demo modu — giriş yok, örnek verilerle tasarım yapıyorsun
        </div>
      )}

      <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)] lg:items-start">
        <LearningPath
          nodes={pathNodes}
          unitTitle={unitTitle}
          unitHint={unitHint}
          primaryHref={primaryHref}
          primaryLabel={primaryLabel}
          greeting={greeting}
        />

        <aside className="min-w-0 space-y-5 lg:sticky lg:top-20">
          {showAddWord && <AddWordForm />}

          {showLoadWords && (
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

import Link from "next/link";
import { headers } from "next/headers";
import { LearningPath, type PathNode } from "@/app/components/LearningPath";
import { LoadWordsButton } from "@/app/components/LoadWordsButton";
import { DEMO_DUE, DEMO_PROFILE, isDemoMode } from "@/lib/demo";
import {
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
  let showLoadWords = false;

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

    profile = liveProfile;
    dueWordCount = dueWords.length;
    showLoadWords = dueWords.length === 0;
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
      icon: "books",
      state: activeId === "words" ? "active" : dueWordCount === 0 ? "done" : "upcoming",
    },
    {
      id: "sounds",
      title: "Sesler",
      href: "/sounds",
      tone: "cyan",
      icon: "sound",
      state: activeId === "sounds" ? "active" : "upcoming",
    },
    {
      id: "det",
      title: "Read & Complete",
      href: "/det/read-complete",
      tone: "purple",
      icon: "write",
      state: "upcoming",
    },
    {
      id: "photo",
      title: "Görsel Betimleme",
      href: "/photo-practice",
      tone: "orange",
      icon: "photo",
      state: "upcoming",
    },
  ];

  const activeIndex = nodes.findIndex((n) => n.id === activeId);
  const pathNodes = nodes.map((node, i) => {
    if (i < activeIndex) return { ...node, state: "done" as const };
    if (i === activeIndex) return { ...node, state: "active" as const };
    return { ...node, state: node.state === "done" ? ("done" as const) : ("upcoming" as const) };
  });

  const shortcuts = [
    { href: "/quiz", label: "Kelime quiz", hint: "Tekrar et", color: "#1cb0f6" },
    { href: "/sounds", label: "Sesler", hint: "Dinle & tekrarla", color: "#00cd9c" },
    { href: "/det/read-complete", label: "Read & Complete", hint: "Boşluk doldur", color: "#ce82ff" },
    { href: "/photo-practice", label: "Görsel Betimleme", hint: "60 sn yaz", color: "#fd860a" },
    { href: "/words/add", label: "Kelime ekle", hint: "Kendi listen", color: "#ff9600" },
    { href: "/quiz/grammar", label: "Gramer", hint: "Kural pratikleri", color: "#a568cc" },
  ] as const;

  return (
    <main className="relative mx-auto min-h-screen max-w-6xl overflow-x-clip px-4 pb-10 pt-5 lg:pt-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(ellipse_at_top,_rgba(253,134,10,0.12),_transparent_55%)]" />

      {demo && (
        <div className="mb-4 rounded-2xl border border-[#ffc800]/40 bg-[#ffc800]/10 px-4 py-2 text-center text-xs font-extrabold text-[#ffc800]">
          Demo modu — giriş yok, örnek verilerle tasarım yapıyorsun
        </div>
      )}

      <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(300px,360px)] lg:items-start lg:gap-10">
        <LearningPath
          nodes={pathNodes}
          unitTitle={unitTitle}
          unitHint={unitHint}
          primaryHref={primaryHref}
          primaryLabel={primaryLabel}
          greeting={greeting}
        />

        <aside className="min-w-0 space-y-5 lg:sticky lg:top-20">
          <section className="rounded-[1.75rem] border-2 border-duo-border bg-duo-card p-5">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-duo-muted">
              Hızlı git
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              {shortcuts.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center justify-between gap-3 rounded-2xl border-2 border-duo-border bg-[#0f1a1e] px-4 py-3 transition hover:border-white/20"
                  style={{ boxShadow: `inset 3px 0 0 ${item.color}` }}
                >
                  <span>
                    <span className="block text-sm font-extrabold text-white">{item.label}</span>
                    <span className="mt-0.5 block text-xs font-bold text-duo-muted">{item.hint}</span>
                  </span>
                  <span className="text-duo-muted" aria-hidden>
                    →
                  </span>
                </Link>
              ))}
            </div>
          </section>

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
        </aside>
      </div>
    </main>
  );
}

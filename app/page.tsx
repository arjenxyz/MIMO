import { headers } from "next/headers";
import { LearningPath, type PathNode } from "@/app/components/LearningPath";
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
  }

  const hour = new Date().getHours();
  const greeting = greetingFor(hour, profile.display_name || profile.username);

  let primaryHref = "/det/read-complete";
  let primaryLabel = "Başlat";
  let unitTitle = "Read & Complete";
  let unitHint = "Boşlukları doldur, okuma hızını ve kelime bilgini güçlendir.";
  let activeId = "det";

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
      id: "grammar",
      title: "Gramer",
      href: "/grammar",
      tone: "cyan",
      icon: "grammar",
      state: "upcoming",
    },
    {
      id: "det",
      title: "Read & Complete",
      href: "/det/read-complete",
      tone: "blue",
      icon: "write",
      state: "upcoming",
    },
    {
      id: "listen-type",
      title: "Listen & Type",
      href: "/det/listen-type",
      tone: "cyan",
      icon: "listen",
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
    {
      id: "match",
      title: "Hızlı Eşleştir",
      href: "/quiz/match",
      tone: "green",
      icon: "match",
      state: "upcoming",
    },
    {
      id: "word-check",
      title: "Yazım doğru mu?",
      href: "/quiz/word-check",
      tone: "rose",
      icon: "verify",
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
    <main className="relative mx-auto min-h-screen max-w-2xl overflow-x-clip bg-mimo-bg px-4 pb-10 pt-5 text-mimo-fg lg:pt-8">
      {demo && (
        <div className="mb-4 rounded-2xl border border-[#fde68a] bg-[#fffbeb] px-4 py-2 text-center text-xs font-extrabold text-[#a16207]">
          Demo modu — giriş yok, örnek verilerle tasarım yapıyorsun
        </div>
      )}

      <LearningPath
        nodes={pathNodes}
        unitTitle={unitTitle}
        unitHint={unitHint}
        primaryHref={primaryHref}
        primaryLabel={primaryLabel}
        greeting={greeting}
      />
    </main>
  );
}

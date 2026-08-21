import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { InstallPwaButton } from "@/app/components/InstallPwaButton";
import { StreakWidget, streakBgIndex } from "@/app/components/StreakWidget";
import { DEMO_PROFILE, isDemoMode } from "@/lib/demo";
import { getDueGrammar, getDueWords, getProfile, syncDailyStreak } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function WidgetPreviewPage() {
  const headerList = await headers();
  const host = headerList.get("host")?.split(":")[0] ?? null;
  const demo = isDemoMode(host);

  let profile: Profile = DEMO_PROFILE;
  let primaryHref = "/quiz";
  let primaryLabel = "Başlat";

  if (!demo) {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      redirect("/login");
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    let liveProfile = await getProfile(supabase, user.id);
    if (!liveProfile) redirect("/login");

    liveProfile = await syncDailyStreak(supabase, liveProfile);
    const dueWords = await getDueWords(supabase, user.id);
    const dueGrammar = await getDueGrammar(supabase, user.id);
    profile = liveProfile;

    if (dueWords.length > 0) {
      primaryHref = "/quiz";
      primaryLabel = "Kelimeye başla";
    } else if (dueGrammar.length > 0) {
      primaryHref = "/grammar";
      primaryLabel = "Gramere başla";
    } else {
      primaryHref = "/det/read-complete";
      primaryLabel = "Başlat";
    }
  }

  const activeBg = streakBgIndex(profile.daily_streak);

  return (
    <main className="relative mx-auto min-h-screen max-w-lg px-4 pb-28 pt-6 lg:pb-10">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_rgba(253,134,10,0.18),_transparent_55%),linear-gradient(180deg,#0b1418,#131f24)]" />

      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#fd860a]">Widget</p>
          <h1 className="mt-1 text-2xl font-black text-white">Günlük seri</h1>
        </div>
        <Link
          href="/"
          className="rounded-xl border-2 border-duo-border bg-duo-card px-3 py-2 text-xs font-black uppercase tracking-wide text-duo-muted transition hover:text-white"
        >
          Ana sayfa
        </Link>
      </div>

      <div className="mx-auto max-w-[340px] rounded-[2.5rem] border-[10px] border-[#1c2a30] bg-[#0a1013] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
        <div className="mb-4 flex items-center justify-between px-1">
          <div className="h-1.5 w-16 rounded-full bg-white/15" />
          <div className="h-1.5 w-8 rounded-full bg-white/10" />
        </div>
        <div className="relative overflow-hidden rounded-[1.5rem] bg-[url('/widgets/bg-12.png')] bg-cover bg-center">
          <div className="absolute inset-0 bg-[#0b1418]/55 backdrop-blur-[1px]" />
          <div className="relative flex min-h-[380px] items-center justify-center p-5">
            <StreakWidget
              dailyStreak={profile.daily_streak}
              primaryHref={primaryHref}
              primaryLabel={primaryLabel}
              size="lg"
            />
          </div>
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-md space-y-4">
        <p className="text-center text-sm font-bold text-duo-muted">
          Ana ekrana MIMO’yu ekle; buradan seri widget’ını her gün aç.
        </p>
        <InstallPwaButton />
      </div>

      <section className="mx-auto mt-10 max-w-md">
        <h2 className="text-sm font-black uppercase tracking-[0.14em] text-white">
          25 arka plan
        </h2>
        <p className="mt-1 text-xs font-bold text-duo-muted">
          Seri gününe göre sırayla değişir. Bugün: #{activeBg}
        </p>
        <div className="mt-4 grid grid-cols-5 gap-2">
          {Array.from({ length: 25 }, (_, i) => {
            const n = i + 1;
            const pad = String(n).padStart(2, "0");
            const active = n === activeBg;
            return (
              <div
                key={n}
                className={`relative aspect-square overflow-hidden rounded-xl border-2 ${
                  active ? "border-[#ff9600]" : "border-duo-border/60"
                }`}
              >
                <Image
                  src={`/widgets/bg-${pad}.png`}
                  alt={`Arka plan ${n}`}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}

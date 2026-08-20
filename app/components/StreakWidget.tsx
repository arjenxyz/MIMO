import Image from "next/image";
import Link from "next/link";

export function streakBgIndex(dailyStreak: number) {
  const streak = Math.max(1, dailyStreak || 1);
  return ((streak - 1) % 25) + 1;
}

export function streakBgSrc(dailyStreak: number) {
  const n = String(streakBgIndex(dailyStreak)).padStart(2, "0");
  return `/widgets/bg-${n}.png`;
}

function motivation(streak: number) {
  if (streak <= 0) return "Bugün ilk adımı at, seriyi başlat.";
  if (streak === 1) return "İlk gün tamam — yarın da gel.";
  if (streak < 7) return "Serin ısınıyor — bugün de bir pratik yap.";
  if (streak < 30) return "Harika tempo! Seriyi bozma.";
  return "Efsane seri — MIMO gurur duyuyor.";
}

export function StreakWidget({
  dailyStreak,
  primaryHref,
  primaryLabel,
  size = "md",
}: {
  dailyStreak: number;
  primaryHref: string;
  primaryLabel: string;
  size?: "sm" | "md" | "lg";
}) {
  const src = streakBgSrc(dailyStreak);
  const sizeClass =
    size === "lg" ? "aspect-square w-full max-w-[320px]" : size === "sm" ? "aspect-square w-44" : "aspect-square w-full";

  return (
    <div
      className={`relative overflow-hidden rounded-[1.75rem] border-2 border-[#ff9600]/40 shadow-[0_8px_0_rgba(0,0,0,0.25)] ${sizeClass}`}
    >
      <Image
        src={src}
        alt=""
        fill
        priority
        sizes="(max-width: 768px) 90vw, 320px"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/35" />

      <div className="relative flex h-full flex-col justify-end p-4 sm:p-5">
        <div className="absolute left-3 right-3 top-3 rounded-2xl bg-black/45 px-3 py-2 backdrop-blur-sm sm:left-4 sm:right-4 sm:top-4">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#ff9600]">
            Günlük seri
          </p>
          <p className="mt-0.5 text-2xl font-black tabular-nums text-white sm:text-3xl">
            🔥 {dailyStreak}
            <span className="ml-1 text-sm font-extrabold text-white/80">gün</span>
          </p>
        </div>

        <div>
          <p className="mb-3 text-sm font-extrabold leading-snug text-white drop-shadow">
            {motivation(dailyStreak)}
          </p>
          <Link
            href={primaryHref}
            className="flex w-full items-center justify-center rounded-2xl bg-[#ff9600] px-4 py-3 text-sm font-black uppercase tracking-wide text-[#2a1600] shadow-[0_4px_0_#e08600] transition active:translate-y-1 active:shadow-none"
          >
            {primaryLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}

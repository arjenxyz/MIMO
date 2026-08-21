import Image from "next/image";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function AboutMimoPage() {
  return (
    <main className="relative min-h-[100dvh] overflow-x-clip bg-mimo-bg text-mimo-fg">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(ellipse_at_top,rgba(253,134,10,0.18),transparent_65%)]"
        aria-hidden
      />

      <div className="relative z-10 mx-auto max-w-lg px-4 pb-14 pt-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Image
              src="/mimo-avatar.png"
              alt=""
              width={44}
              height={44}
              className="h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-[#fd860a]/35"
              priority
            />
            <div className="min-w-0">
              <h1 className="text-lg font-black tracking-tight text-mimo-title">MIMO</h1>
              <p className="text-xs font-semibold text-mimo-muted">Hikâyemiz ve uygulama</p>
            </div>
          </div>
          <Link
            href="/"
            className="shrink-0 rounded-xl border border-mimo-soft bg-mimo-card px-3 py-2 text-sm font-extrabold text-mimo-muted transition hover:border-mimo-border hover:text-mimo-fg"
          >
            Geri
          </Link>
        </div>

        <section className="mt-6 overflow-hidden rounded-[1.75rem] border border-mimo-border bg-mimo-card shadow-sm">
          <div className="relative aspect-[9/16] max-h-[min(72dvh,560px)] w-full bg-[#0f172a] sm:aspect-video sm:max-h-none">
            <video
              className="h-full w-full object-contain"
              controls
              playsInline
              preload="metadata"
              poster="/mimo-avatar.png"
            >
              <source src="/mimo-story.mp4" type="video/mp4" />
              Tarayıcın video oynatmayı desteklemiyor.
            </video>
          </div>
          <div className="border-t border-mimo-soft px-5 py-4">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#fd860a]">
              Oluşum süreci
            </p>
            <h2 className="mt-1 text-lg font-black text-mimo-title">
              MIMO nasıl doğdu?
            </h2>
            <p className="mt-1.5 text-sm font-semibold leading-relaxed text-mimo-muted">
              Kısa bir bakış: fikirden uygulamaya, MIMO’nun hikâyesi.
            </p>
          </div>
        </section>

        <section className="mt-5 space-y-3 rounded-2xl border border-mimo-border bg-mimo-card p-5 shadow-sm">
          <h2 className="text-base font-black text-mimo-title">MIMO nedir?</h2>
          <p className="text-sm font-semibold leading-relaxed text-mimo-muted">
            MIMO, İngilizceyi eğlenceli ve düzenli pratikle öğrenmen için tasarlanmış bir
            öğrenme yoludur. Kelime tekrarı, gramer, okuma ve dinleme alıştırmaları aynı
            akışta birleşir.
          </p>
          <ul className="space-y-2 text-sm font-semibold text-mimo-fg">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#fd860a]" aria-hidden />
              Spaced repetition ile kelimeleri uzun süre hatırla
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1cb0f6]" aria-hidden />
              Günlük yolda net bir sonraki adım gör
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#58cc02]" aria-hidden />
              Arkadaşlarınla birlikte ilerle
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}

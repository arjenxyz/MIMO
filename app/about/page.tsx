import Image from "next/image";
import Link from "next/link";
import AboutStoryVideo from "@/app/components/AboutStoryVideo";

export const dynamic = "force-dynamic";

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 2C6.477 2 2 6.586 2 12.253c0 4.537 2.865 8.387 6.839 9.748.5.094.682-.222.682-.482 0-.237-.009-.866-.014-1.7-2.782.617-3.369-1.37-3.369-1.37-.455-1.18-1.11-1.494-1.11-1.494-.908-.636.069-.623.069-.623 1.004.072 1.532 1.055 1.532 1.055.892 1.563 2.341 1.112 2.91.85.091-.662.35-1.112.636-1.367-2.22-.258-4.555-1.138-4.555-5.065 0-1.119.39-2.033 1.029-2.75-.103-.259-.446-1.3.098-2.71 0 0 .84-.274 2.75 1.05A9.34 9.34 0 0 1 12 7.14c.85.004 1.705.117 2.504.343 1.909-1.324 2.747-1.05 2.747-1.05.546 1.41.203 2.451.1 2.71.64.717 1.028 1.631 1.028 2.75 0 3.937-2.338 4.804-4.566 5.058.359.317.679.943.679 1.901 0 1.372-.012 2.477-.012 2.814 0 .263.18.58.688.481A10.02 10.02 0 0 0 22 12.253C22 6.586 17.523 2 12 2Z" />
    </svg>
  );
}

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
          <div className="relative aspect-video w-full bg-[#0f172a]">
            <AboutStoryVideo />
          </div>
        </section>

        <section className="mt-5 space-y-3 rounded-2xl border border-mimo-border bg-mimo-card p-5 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#fd860a]">
            Marka
          </p>
          <h2 className="text-2xl font-black tracking-tight text-mimo-title">MIMO</h2>
          <p className="text-sm font-semibold leading-relaxed text-mimo-muted">
            MIMO; İngilizceyi kısa, net ve günlük bir ritimle öğrenmen için tasarlanmış bir
            öğrenme yoludur. Kelime tekrarı, gramer, okuma ve dinleme aynı akışta birleşir —
            “ne yapacağım?” sorusu kalmaz, sıradaki adım hep ortadadır.
          </p>
          <p className="text-sm font-semibold leading-relaxed text-mimo-muted">
            Markanın ruhu basit: baskısız ilerleme, görünür alışkanlık ve öğrenmeyi oyun gibi
            hissettiren bir yol. MIMO, ezbere değil pratikte kalır; küçük adımlarla büyük
            fark bırakmayı hedefler.
          </p>
          <ul className="space-y-2 pt-1 text-sm font-semibold text-mimo-fg">
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

        <section className="mt-5 space-y-3 rounded-2xl border border-mimo-border bg-mimo-card p-5 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#fd860a]">
            Neden doğdu?
          </p>
          <h2 className="text-base font-black text-mimo-title">Bir zorunluluktan çıktı</h2>
          <p className="text-sm font-semibold leading-relaxed text-mimo-muted">
            Merhaba, ben Arjen. MIMO’yu hobiden değil, gerçek bir ihtiyaçtan oluşturdum:
            Stipendium Hungaricum bursuna başvurabilmek ve İngilizcemi çok kısa sürede
            ciddi şekilde geliştirmek zorundaydım.
          </p>
          <p className="text-sm font-semibold leading-relaxed text-mimo-muted">
            Hazır araçlar ya dağınıktı ya da tempo tutturmuyordu. Bana her gün net bir yol,
            hızlı tekrar ve ölçülebilir ilerleme lazımdı. MIMO önce kendim için doğdu; şimdi
            aynı yolu seninle paylaşıyor.
          </p>
        </section>

        <section className="mt-5 rounded-2xl border border-mimo-border bg-mimo-card p-5 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#fd860a]">
            Geliştirici
          </p>
          <h2 className="mt-2 text-base font-black text-mimo-title">Arjen</h2>
          <p className="mt-1.5 text-sm font-semibold leading-relaxed text-mimo-muted">
            MIMO’nun tasarımı, geliştirmesi ve hikâyesi.
          </p>
          <a
            href="https://github.com/arjenxyz"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2.5 rounded-xl border border-mimo-soft bg-mimo-bg px-3.5 py-2.5 text-sm font-extrabold text-mimo-fg transition hover:border-mimo-border hover:bg-mimo-card"
          >
            <GitHubIcon className="h-5 w-5 shrink-0" />
            <span>arjenxyz</span>
          </a>
        </section>
      </div>
    </main>
  );
}

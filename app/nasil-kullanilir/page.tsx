import Image from "next/image";
import Link from "next/link";

export const dynamic = "force-dynamic";

const STEPS = [
  {
    num: "1",
    title: "Bağlantıyı aç",
    color: "#1cb0f6",
    body: "Mağaza uygulaması indirmen gerekmez. Telefonda veya bilgisayarda MIMO linkini tarayıcıda açman yeterli.",
  },
  {
    num: "2",
    title: "Bir pratik seç",
    color: "#58cc02",
    body: "Kelime testi, eşleştirme, yazım, dinleme veya okuma alıştırmalarından birine dokun. Hesap açmadan hemen başlayabilirsin.",
  },
  {
    num: "3",
    title: "Kısa kısa çalış",
    color: "#fd860a",
    body: "Her gün birkaç dakika yeter. Amaç uzun oturum değil; düzenli, kısa pratiklerle kelimeyi ve dinlemeyi pekiştirmek.",
  },
  {
    num: "4",
    title: "İstersen çevrimdışı indir",
    color: "#e11d48",
    body: "Kelime paketini sesleriyle birlikte indirirsen internet olmasa da çalışabilir ve telaffuzları dinleyebilirsin.",
  },
];

const PRACTICES = [
  {
    title: "Kelime Testi",
    href: "/quiz",
    tip: "Kelimeyi dinle, doğru Türkçe anlamı seç.",
  },
  {
    title: "Hızlı Eşleştir",
    href: "/quiz/match",
    tip: "İngilizce–Türkçe çiftleri hızla eşleştir.",
  },
  {
    title: "Yazım Doğru mu?",
    href: "/quiz/word-check",
    tip: "Yazımın gerçek kelime olup olmadığını fark et.",
  },
  {
    title: "Listen & Type",
    href: "/det/listen-type",
    tip: "Duyduğun kelimeyi veya cümleyi yaz.",
  },
  {
    title: "Read & Complete",
    href: "/det/read-complete",
    tip: "Boşluk doldurma pasajlarıyla okuma pratiği yap.",
  },
];

export default function HowToUsePage() {
  return (
    <main className="min-h-[100dvh] bg-mimo-bg text-mimo-fg">
      <header className="sticky top-0 z-40 border-b border-mimo-border bg-mimo-nav/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/mimo-avatar.png"
              alt="MIMO"
              width={34}
              height={34}
              className="h-8 w-8 rounded-full object-cover ring-2 ring-[#fd860a]/35"
            />
            <span className="text-base font-black text-mimo-title">Nasıl kullanılır?</span>
          </Link>
          <Link
            href="/"
            className="rounded-xl border border-mimo-border bg-mimo-surface px-3 py-1.5 text-xs font-extrabold text-mimo-fg"
          >
            Ana sayfa
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 pb-16">
        <section className="rounded-3xl border border-mimo-border bg-mimo-card p-5 shadow-sm sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#58cc02]">
            Kısa rehber
          </p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-mimo-title sm:text-3xl">
            MIMO’yu birkaç dakikada öğren
          </h1>
          <p className="mt-3 text-sm font-semibold leading-relaxed text-mimo-muted sm:text-base">
            Bu sayfa, pratiklere nasıl başlayacağını ve çevrimdışı paketleri nasıl
            kullanacağını adım adım anlatır. Her dönem aynı şekilde çalışır.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="px-1 text-lg font-black text-mimo-title">Adım adım</h2>
          <ol className="space-y-3">
            {STEPS.map((step) => (
              <li
                key={step.num}
                className="flex gap-3 rounded-3xl border border-mimo-border bg-mimo-card p-4 shadow-sm sm:gap-4 sm:p-5"
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-black text-white shadow-sm"
                  style={{ backgroundColor: step.color }}
                >
                  {step.num}
                </span>
                <div className="min-w-0 pt-0.5">
                  <h3 className="text-base font-black text-mimo-title">{step.title}</h3>
                  <p className="mt-1 text-sm font-semibold leading-relaxed text-mimo-muted">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-3xl border border-mimo-border bg-mimo-card p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-black text-mimo-title">Hangi pratik ne işe yarar?</h2>
          <p className="mt-1 text-sm font-semibold text-mimo-muted">
            İhtiyacına göre birini seç; hepsi tarayıcıda açılır.
          </p>
          <ul className="mt-4 space-y-2">
            {PRACTICES.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-start justify-between gap-3 rounded-2xl border border-mimo-border bg-mimo-surface px-3.5 py-3 transition hover:border-[#1cb0f6]/40"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-black text-mimo-title">{item.title}</p>
                    <p className="mt-0.5 text-xs font-bold text-mimo-muted">{item.tip}</p>
                  </div>
                  <span className="shrink-0 text-sm font-black text-[#1cb0f6]">Aç →</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-3xl border border-[#fd860a]/30 bg-mimo-card p-5 shadow-sm sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#fd860a]">
            Çevrimdışı
          </p>
          <h2 className="mt-2 text-lg font-black text-mimo-title">
            Kelime paketini seslerle indir
          </h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm font-semibold leading-relaxed text-mimo-muted">
            <li>Ana sayfada veya çevrimdışı alanda paket listesini aç.</li>
            <li>İstediğin paketi indir (kelimeler + İngilizce telaffuz sesleri).</li>
            <li>İnternet kesilse bile aynı pratiklerde dinleyip çalışmaya devam et.</li>
          </ol>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Link
              href="/#offline-packs"
              className="inline-flex items-center justify-center rounded-2xl bg-[#fd860a] px-4 py-3 text-sm font-black text-white shadow-[0_3px_0_#c2410c] transition hover:brightness-105 active:translate-y-0.5 active:shadow-none"
            >
              Paketlere git
            </Link>
            <Link
              href="/offline"
              className="inline-flex items-center justify-center rounded-2xl border border-mimo-border bg-mimo-surface px-4 py-3 text-sm font-extrabold text-mimo-fg"
            >
              Çevrimdışı alan
            </Link>
          </div>
        </section>

        <section className="rounded-3xl border border-mimo-border bg-mimo-card p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-black text-mimo-title">Hesap şart mı?</h2>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-mimo-muted">
            Hayır. Pratiklerin çoğu hesapsız açılır. İlerlemeni kaydetmek, kendi kelimelerini
            eklemek veya arkadaşlarınla birlikte çalışmak istersen hesap açman yeterli.
          </p>
          <Link
            href="/login"
            className="mt-4 inline-flex items-center justify-center rounded-2xl bg-[#1cb0f6] px-4 py-3 text-sm font-black text-white shadow-[0_3px_0_#1899d6] transition hover:brightness-105"
          >
            İstersen giriş yap
          </Link>
        </section>

        <div className="flex flex-col gap-2.5 sm:flex-row">
          <Link
            href="/quiz"
            className="inline-flex flex-1 items-center justify-center rounded-2xl bg-[#58cc02] px-4 py-3.5 text-sm font-black text-white shadow-[0_3px_0_#46a302]"
          >
            Pratiğe başla →
          </Link>
          <Link
            href="/"
            className="inline-flex flex-1 items-center justify-center rounded-2xl border border-mimo-border bg-mimo-card px-4 py-3.5 text-sm font-extrabold text-mimo-fg"
          >
            Ana sayfaya dön
          </Link>
        </div>
      </div>
    </main>
  );
}

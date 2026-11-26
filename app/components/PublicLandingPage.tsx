"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { OfflinePacksManager } from "@/app/components/OfflinePacksManager";
import { OfflinePracticeCta } from "@/app/components/OfflinePracticeCta";
import { OfflineSmartLink } from "@/app/components/OfflineSmartLink";
import { OnlineOnly } from "@/app/components/OnlineGate";
import { useTheme } from "@/app/components/ThemeProvider";
import { formatMegabytes, type OfflineManifestResponse } from "@/lib/offlinePacks";
import { fetchOfflineManifest, warmOfflineRouteCache } from "@/lib/offlineStorage";
import { useOnlineStatus } from "@/lib/useOnlineStatus";

/* ═══════════════════════════════════════════════════════════
   Animated Counter — numbers count up on mount
   ═══════════════════════════════════════════════════════════ */
function AnimatedCounter({
  value,
  suffix = "",
  duration = 1200,
}: {
  value: number;
  suffix?: string;
  duration?: number;
}) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const start = 0;
    const end = value;
    if (end === 0) return;
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (end - start) * eased);
      setDisplay(current);
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [value, duration]);

  return (
    <span ref={ref} className="tabular-nums">
      {display}
      {suffix}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════
   Scroll Reveal Hook — triggers when element enters viewport
   ═══════════════════════════════════════════════════════════ */
function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return { ref, visible };
}

/* ═══════════════════════════════════════════════════════════
   FAQ Accordion Item
   ═══════════════════════════════════════════════════════════ */
function FAQItem({
  question,
  answer,
  open,
  onToggle,
}: {
  question: string;
  answer: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-2xl border border-mimo-border bg-mimo-card shadow-sm transition hover:border-[#1cb0f6]/30">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <span className="text-[15px] font-extrabold text-mimo-title">
          {question}
        </span>
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-mimo-surface text-sm font-black text-mimo-muted transition-transform duration-300 ${
            open ? "rotate-45" : ""
          }`}
        >
          +
        </span>
      </button>
      <div className="faq-answer" data-open={open}>
        <div>
          <p className="px-5 pb-4 text-sm font-semibold leading-relaxed text-mimo-muted">
            {answer}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Feature Card Icons (inline SVGs)
   ═══════════════════════════════════════════════════════════ */
function FeatureIcon({
  name,
  className = "",
}: {
  name: string;
  className?: string;
}) {
  const common = {
    width: 28,
    height: 28,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true as const,
  };

  const icons: Record<string, ReactNode> = {
    quiz: (
      <svg {...common}>
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <path d="M9 9l2 2 4-4" />
        <path d="M9 15h6" />
      </svg>
    ),
    match: (
      <svg {...common}>
        <rect x="3" y="3" width="8" height="8" rx="1.5" />
        <rect x="13" y="13" width="8" height="8" rx="1.5" />
        <path d="M14 6h4M16 4v4M6 14h4M8 12v4" />
      </svg>
    ),
    spell: (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M8 12.5 11 15.5 16 9" />
      </svg>
    ),
    listen: (
      <svg {...common}>
        <path d="M12 3v10" />
        <path d="M8.5 8.5a5 5 0 0 0 7 0" />
        <rect x="9" y="13" width="6" height="4" rx="1" />
        <path d="M12 17v2M9 21h6" />
      </svg>
    ),
    cloze: (
      <svg {...common}>
        <path d="M4 7h16M4 12h10M4 17h14" />
        <rect x="16" y="10" width="5" height="4" rx="1" strokeDasharray="2 1" />
      </svg>
    ),
  };

  return <>{icons[name] ?? null}</>;
}

/* ═══════════════════════════════════════════════════════════
   Data
   ═══════════════════════════════════════════════════════════ */
type PublicFeature = {
  title: string;
  description: string;
  href: string;
  badge: string;
  tone: "blue" | "green" | "rose" | "cyan" | "orange";
  cta: string;
  iconKey: string;
};

const PUBLIC_FEATURES: PublicFeature[] = [
  {
    title: "Kelime Testi",
    description:
      "İngilizce kelimeyi dinle, doğru Türkçe anlamı seç. Hazırlık için temel kelime tekrarını hızlandırır.",
    href: "/quiz",
    badge: "Sesli pratik",
    tone: "blue",
    cta: "Teste başla",
    iconKey: "quiz",
  },
  {
    title: "Hızlı Eşleştir",
    description:
      "120 saniyede İngilizce–Türkçe çiftleri eşleştir. Kısa sürede çok kelime pekiştirir.",
    href: "/quiz/match",
    badge: "Hızlı tekrar",
    tone: "green",
    cta: "Başla",
    iconKey: "match",
  },
  {
    title: "Yazım Doğru mu?",
    description:
      "Gördüğün yazım gerçek bir İngilizce kelime mi, yoksa hatalı mı? Yazım farkındalığını güçlendirir.",
    href: "/quiz/word-check",
    badge: "Yazım",
    tone: "rose",
    cta: "Dene",
    iconKey: "spell",
  },
  {
    title: "Listen & Type",
    description:
      "Telaffuzu dinle, duyduğun kelimeyi veya cümleyi yaz. Dinleme ve yazmayı birlikte çalıştırır.",
    href: "/det/listen-type",
    badge: "Dinleme",
    tone: "cyan",
    cta: "Dinlemeye başla",
    iconKey: "listen",
  },
  {
    title: "Read & Complete",
    description:
      "Boşluk doldurma pasajlarıyla okuma ve dil bilgisi pratiği yap. Sınav tarzı alıştırmalar içerir.",
    href: "/det/read-complete",
    badge: "Okuma",
    tone: "orange",
    cta: "Pasaj çöz",
    iconKey: "cloze",
  },
];

const FEATURE_TONE: Record<
  PublicFeature["tone"],
  { pill: string; border: string; btn: string; iconBg: string }
> = {
  blue: {
    pill: "bg-[#e8f6fe] text-[#0369a1] dark:bg-[#0c4a6e]/40 dark:text-[#7dd3fc]",
    border: "hover:border-[#1cb0f6]/50",
    btn: "text-[#1cb0f6]",
    iconBg: "bg-[#e8f6fe] text-[#1cb0f6] dark:bg-[#0c4a6e]/40",
  },
  green: {
    pill: "bg-[#ecfce5] text-[#15803d] dark:bg-[#14532d]/40 dark:text-[#86efac]",
    border: "hover:border-[#58cc02]/50",
    btn: "text-[#46a302] dark:text-[#86efac]",
    iconBg: "bg-[#ecfce5] text-[#58cc02] dark:bg-[#14532d]/40",
  },
  rose: {
    pill: "bg-[#ffe4e6] text-[#be123c] dark:bg-[#881337]/40 dark:text-[#fda4af]",
    border: "hover:border-[#e11d48]/45",
    btn: "text-[#e11d48] dark:text-[#fda4af]",
    iconBg: "bg-[#ffe4e6] text-[#e11d48] dark:bg-[#881337]/40",
  },
  cyan: {
    pill: "bg-[#f0fdfa] text-[#0f766e] dark:bg-[#134e4a]/40 dark:text-[#5eead4]",
    border: "hover:border-[#0d9488]/45",
    btn: "text-[#0d9488] dark:text-[#5eead4]",
    iconBg: "bg-[#f0fdfa] text-[#0d9488] dark:bg-[#134e4a]/40",
  },
  orange: {
    pill: "bg-[#fff3e0] text-[#c2410c] dark:bg-[#7c2d12]/40 dark:text-[#fdba74]",
    border: "hover:border-[#fd860a]/50",
    btn: "text-[#ea580c] dark:text-[#fdba74]",
    iconBg: "bg-[#fff3e0] text-[#ea580c] dark:bg-[#7c2d12]/40",
  },
};

const FAQ_ITEMS = [
  {
    q: "Ücretsiz mi? Hesap açmam şart mı?",
    a: "Pratik modüllerinin çoğu ücretsizdir ve hesap olmadan kullanılabilir. Hesap; ilerlemeni kaydetmek, kendi kelime listeni tutmak ve arkadaşlarınla birlikte çalışmak istersen yeterlidir.",
  },
  {
    q: "Çevrimdışı nasıl çalışır?",
    a: "Kelime paketlerini (metin + İngilizce telaffuz sesleri) ve okuma pasajlarını telefonuna ya da bilgisayarına indirirsin. İnternet olmasa da çalışabilir, dinleyebilirsin. İnternet gelince paketlerin güncellenebilir.",
  },
  {
    q: "Telefonumda da açılır mı?",
    a: "Evet. Modern bir tarayıcı yeterli: telefon, tablet veya bilgisayar. İstersen ana ekrana ekleyerek uygulama gibi de kullanabilirsin.",
  },
  {
    q: "Bu alıştırmalar sınava yarar mı?",
    a: "Kelime, yazım, dinleme ve boşluk doldurma hazırlık sürecini destekler. Özellikle dinleme–yazma ve okuma pasajları sınav tarzı pratik için uygundur; tek başına resmi sınav yerine geçmez.",
  },
  {
    q: "Verilerim güvende mi?",
    a: "Giriş yapmadan kullandığında kişisel bilgin toplanmaz. Çevrimdışı paketler sadece senin cihazında durur. Hesap açarsan ilerlemen güvenli biçimde hesabına kaydedilir.",
  },
];

/* ═══════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════ */
export function PublicLandingPage({
  initialWordCount,
}: {
  initialWordCount: number;
}) {
  const { theme, toggleTheme } = useTheme();
  const online = useOnlineStatus();
  const [navScrolled, setNavScrolled] = useState(false);
  const [manifest, setManifest] = useState<OfflineManifestResponse | null>(null);
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  const [offlineHint, setOfflineHint] = useState<string | null>(null);

  const showOfflineBlocked = useCallback(() => {
    setOfflineHint(
      "Çevrimdışısın. Bu sayfa henüz cihazda yok — bir kez çevrimiçi aç veya paket indir."
    );
  }, []);

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    let cancelled = false;
    void fetchOfflineManifest(0, { timeoutMs: 6000 })
      .then((m) => {
        if (!cancelled) setManifest(m);
      })
      .catch(() => {
        // offline / slow network — keep initial counts
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void warmOfflineRouteCache();
  }, []);

  useEffect(() => {
    if (!offlineHint) return;
    const t = window.setTimeout(() => setOfflineHint(null), 4200);
    return () => window.clearTimeout(t);
  }, [offlineHint]);

  const wordCount = manifest?.packs.words.itemCount ?? initialWordCount;
  const totalMbLabel = manifest ? formatMegabytes(manifest.totalBytes) : null;

  // Scroll-reveal refs
  const featuresSection = useReveal<HTMLElement>();
  const faqSection = useReveal<HTMLElement>();

  const toggleFAQ = useCallback(
    (idx: number) => setOpenFAQ((prev) => (prev === idx ? null : idx)),
    []
  );

  // Offline mode: hide marketing / account / download surfaces — practice only.
  if (!online) {
    return (
      <div className="relative min-h-[100dvh] overflow-x-clip bg-mimo-bg text-mimo-fg">
        <header className="sticky top-0 z-50 border-b border-mimo-border bg-mimo-nav/90 backdrop-blur-md">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
            <Link href="/" className="flex items-center gap-2.5">
              <Image
                src="/mimo-avatar.png"
                alt="MIMO"
                width={36}
                height={36}
                className="h-9 w-9 rounded-full object-cover ring-2 ring-[#fd860a]/35"
              />
              <span className="text-lg font-black text-mimo-title">MIMO</span>
            </Link>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#fff3e0] px-2.5 py-1 text-xs font-black text-[#c2410c] dark:bg-[#7c2d12]/40 dark:text-[#fdba74]">
                Çevrimdışı
              </span>
              <button
                type="button"
                onClick={toggleTheme}
                aria-label="Tema değiştir"
                className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-mimo-border bg-mimo-surface text-mimo-muted"
              >
                {theme === "dark" ? "☀" : "☾"}
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
          <section className="rounded-3xl border border-[#fd860a]/30 bg-mimo-card p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#fd860a]">
              Çevrimdışı mod
            </p>
            <h1 className="mt-2 text-2xl font-black text-mimo-title sm:text-3xl">
              Sadece cihazda hazır olan pratikler
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold text-mimo-muted">
              Giriş, indirme, mesaj ve hesap özellikleri gizli. İnternet gelince tekrar
              görünür.
            </p>
            <div className="mt-5">
              <OfflinePracticeCta />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {PUBLIC_FEATURES.map((feat) => (
                <Link
                  key={feat.href}
                  href={`${feat.href}?source=offline`}
                  className="rounded-2xl border border-mimo-border bg-mimo-surface p-4 transition hover:border-[#1cb0f6]/40"
                >
                  <p className="text-base font-black text-mimo-title">{feat.title}</p>
                  <p className="mt-1 text-xs font-bold text-mimo-muted">{feat.badge}</p>
                </Link>
              ))}
              <Link
                href="/offline"
                className="rounded-2xl border border-[#fd860a]/40 bg-[#fff8f1] p-4 transition hover:border-[#fd860a] dark:bg-[#7c2d12]/20"
              >
                <p className="text-base font-black text-mimo-title">Çevrimdışı alan</p>
                <p className="mt-1 text-xs font-bold text-mimo-muted">
                  Cihazındaki paketler
                </p>
              </Link>
            </div>
          </section>

          <OfflinePacksManager />
        </main>
      </div>
    );
  }

  return (
    <div className="relative min-h-[100dvh] overflow-x-clip bg-mimo-bg text-mimo-fg">
      {offlineHint ? (
        <div className="fixed inset-x-3 top-[4.5rem] z-[60] mx-auto max-w-md rounded-2xl border border-[#fd860a]/40 bg-mimo-card px-4 py-3 text-sm font-extrabold text-[#c2410c] shadow-lg dark:text-[#fdba74]">
          {offlineHint}
        </div>
      ) : null}
      {/* ── Ambient Pastel Orbs ── */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 -top-20 h-72 w-72 rounded-full bg-[#fd860a]/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 top-16 h-80 w-80 rounded-full bg-[#1cb0f6]/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/3 top-[38rem] h-72 w-72 rounded-full bg-[#58cc02]/10 blur-3xl"
      />

      {/* ══════════════════════════════════════════════════════
          Navigation
          ══════════════════════════════════════════════════════ */}
      <header
        className={`sticky top-0 z-50 transition-[background,box-shadow] duration-300 ${
          navScrolled
            ? "bg-mimo-nav/90 shadow-[0_8px_30px_rgba(30,58,95,0.08)] backdrop-blur-xl dark:shadow-[0_8px_30px_rgba(0,0,0,0.35)]"
            : "bg-mimo-nav/70 backdrop-blur-md"
        }`}
      >
        <div className="relative mx-auto flex h-[4.25rem] max-w-6xl items-center justify-between gap-3 px-4">
          <Link
            href="/"
            className="group flex min-w-0 items-center gap-2.5 rounded-2xl py-1 pr-2 transition"
          >
            <span className="relative shrink-0">
              <span
                aria-hidden
                className="absolute -inset-1 rounded-full bg-gradient-to-br from-[#fd860a]/35 via-[#1cb0f6]/20 to-[#58cc02]/30 opacity-80 blur-[2px] transition group-hover:opacity-100"
              />
              <Image
                src="/mimo-avatar.png"
                alt="MIMO"
                width={40}
                height={40}
                priority
                className="relative h-10 w-10 rounded-full object-cover ring-2 ring-white shadow-[0_2px_0_rgba(253,134,10,0.45)] dark:ring-[#1a2a31]"
              />
            </span>
            <span className="flex min-w-0 flex-col leading-none">
              <span className="text-[1.35rem] font-black tracking-[-0.03em] text-mimo-title">
                MIMO
              </span>
              <span className="mt-0.5 hidden text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#1cb0f6] sm:block">
                Hazırlık · İngilizce
              </span>
            </span>
          </Link>

          <nav className="landing-nav hidden items-center gap-1 rounded-2xl border border-mimo-border/70 bg-mimo-surface/70 p-1 text-sm font-extrabold text-mimo-muted backdrop-blur-sm lg:flex">
            <a href="#features" className="landing-nav-link">
              Özellikler
            </a>
            <OfflineSmartLink
              href="/nasil-kullanilir"
              className="landing-nav-link"
              onOfflineBlocked={showOfflineBlocked}
            >
              Nasıl kullanılır
            </OfflineSmartLink>
            <a href="#offline-packs" className="landing-nav-link">
              Çevrimdışı
            </a>
            <a href="#faq" className="landing-nav-link">
              SSS
            </a>
            <OfflineSmartLink
              href="/about"
              className="landing-nav-link"
              onOfflineBlocked={showOfflineBlocked}
            >
              Hakkında
            </OfflineSmartLink>
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Tema değiştir"
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-mimo-border bg-mimo-surface text-mimo-muted shadow-[0_2px_0_rgba(15,23,42,0.06)] transition hover:border-[#1cb0f6]/40 hover:text-[#1cb0f6] active:translate-y-0.5 active:shadow-none"
            >
              {theme === "dark" ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2.2" />
                  <path
                    d="M12 2v2.2M12 19.8V22M4.2 12H2M22 12h-2.2M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M5.6 18.4l1.6-1.6M16.8 7.2l1.6-1.6"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M20.5 14.2A7.8 7.8 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2Z"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
            <OfflineSmartLink
              href="/offline"
              onOfflineBlocked={showOfflineBlocked}
              className="hidden h-10 items-center rounded-2xl border border-mimo-border bg-mimo-surface px-3 text-xs font-extrabold text-mimo-fg shadow-[0_2px_0_rgba(15,23,42,0.06)] transition hover:border-[#fd860a]/45 hover:text-[#ea580c] active:translate-y-0.5 active:shadow-none sm:inline-flex"
            >
              Çevrimdışı
            </OfflineSmartLink>
            <OnlineOnly>
              <Link
                href="/login"
                prefetch={false}
                data-online-only
                className="login-cta relative inline-flex h-10 items-center justify-center overflow-hidden rounded-2xl bg-[#1cb0f6] px-4 text-sm font-black text-white shadow-[0_3px_0_#1899d6] transition hover:brightness-105 active:translate-y-0.5 active:shadow-none"
              >
                <span className="relative z-10">Giriş Yap</span>
                <span
                  aria-hidden
                  className="login-cta-sheen absolute inset-y-0 -left-1/3 w-1/3 skew-x-[-18deg] bg-white/25"
                />
              </Link>
            </OnlineOnly>
          </div>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════
          Hero
          ══════════════════════════════════════════════════════ */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 pb-12 pt-8 sm:pt-14">
        <div className="grid items-center gap-10 lg:grid-cols-12">
          <div className="login-rise lg:col-span-7">
            <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-[#fd860a]/30 bg-mimo-card px-3.5 py-1.5 text-xs font-black text-[#ea580c] shadow-sm">
              <span>✦ ÜCRETSİZ PRATİK</span>
              <span className="text-mimo-border">•</span>
              <span className="text-[#0369a1] dark:text-[#38bdf8]">ÇEVRİMDIŞI HAZIR</span>
            </div>

            <h1 className="mt-5 text-[1.85rem] font-black leading-[1.12] tracking-tight text-mimo-title sm:text-5xl lg:text-[3.35rem]">
              Hazırlıkta İngilizce pratik —{" "}
              <span className="text-gradient-mimo">kısa, net, her gün.</span>
            </h1>

            <p className="mt-3 max-w-2xl text-[0.95rem] font-semibold leading-relaxed text-mimo-muted sm:mt-4 sm:text-lg">
              MIMO; kelime, yazım, dinleme ve okuma alıştırmalarıyla hazırlık sürecini
              destekler. Hesap açmadan başlayabilir, dilersen kelime paketlerini sesleriyle
              indirip internet olmadan da çalışmaya devam edebilirsin.
            </p>

            <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
              <OfflineSmartLink
                href="/quiz"
                onOfflineBlocked={showOfflineBlocked}
                className="login-cta relative inline-flex w-full items-center justify-center overflow-hidden rounded-2xl bg-[#58cc02] px-5 py-3.5 text-base font-black text-white shadow-[0_4px_0_#46a302] transition hover:brightness-105 active:translate-y-0.5 active:shadow-none sm:w-auto sm:px-6"
              >
                <span className="relative z-10">Pratiğe Başla →</span>
                <span
                  aria-hidden
                  className="login-cta-sheen absolute inset-y-0 -left-1/3 w-1/3 skew-x-[-18deg] bg-white/25"
                />
              </OfflineSmartLink>

              <a
                href="#offline-packs"
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#fd860a] px-5 py-3.5 text-base font-black text-white shadow-[0_4px_0_#c2410c] transition hover:brightness-105 active:translate-y-0.5 active:shadow-none sm:w-auto sm:px-6"
              >
                <span>Kelime paketleri →</span>
                {totalMbLabel && (
                  <span className="rounded-lg bg-white/20 px-2 py-0.5 text-xs font-black tabular-nums">
                    {totalMbLabel}
                  </span>
                )}
              </a>
            </div>

            {/* ── Stats: compact on mobile, roomier from sm up ── */}
            <div className="mt-7 grid grid-cols-3 gap-2 sm:mt-8 sm:max-w-lg sm:gap-3">
              <div className="rounded-2xl border border-mimo-border bg-mimo-card px-2 py-3 text-center shadow-sm sm:p-3.5 sm:text-left">
                <p className="text-xl font-black tabular-nums leading-none text-[#1cb0f6] sm:text-2xl">
                  <AnimatedCounter value={wordCount} suffix="+" />
                </p>
                <p className="mt-1.5 text-[11px] font-bold leading-tight text-mimo-muted sm:text-xs">
                  <span className="sm:hidden">Kelime</span>
                  <span className="hidden sm:inline">Paylaşılan kelime</span>
                </p>
              </div>
              <div className="rounded-2xl border border-mimo-border bg-mimo-card px-2 py-3 text-center shadow-sm sm:p-3.5 sm:text-left">
                <p className="text-xl font-black tabular-nums leading-none text-[#58cc02] sm:text-2xl">
                  <AnimatedCounter value={PUBLIC_FEATURES.length} />
                </p>
                <p className="mt-1.5 text-[11px] font-bold leading-tight text-mimo-muted sm:text-xs">
                  <span className="sm:hidden">Pratik</span>
                  <span className="hidden sm:inline">Açık pratik</span>
                </p>
              </div>
              <div className="rounded-2xl border border-mimo-border bg-mimo-card px-2 py-3 text-center shadow-sm sm:p-3.5 sm:text-left">
                <p className="text-xl font-black tabular-nums leading-none text-[#fd860a] sm:text-2xl">
                  {totalMbLabel ?? "—"}
                </p>
                <p className="mt-1.5 text-[11px] font-bold leading-tight text-mimo-muted sm:text-xs">
                  <span className="sm:hidden">Paket</span>
                  <span className="hidden sm:inline">İndirme boyutu</span>
                </p>
              </div>
            </div>
          </div>

          {/* ── Mascot Card ── */}
          <div className="lg:col-span-5">
            <div className="relative mx-auto max-w-md rounded-[2.25rem] border border-mimo-border bg-mimo-card p-6 shadow-xl">
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full bg-[#ecfce5] px-2.5 py-1 text-[11px] font-black text-[#15803d] sm:px-3 sm:text-xs dark:bg-[#14532d]/40 dark:text-[#86efac]">
                  Ücretsiz
                </span>
                <span className="text-[11px] font-extrabold text-mimo-muted sm:text-xs">
                  Hesapsız da olur
                </span>
              </div>

              <div className="mt-4 rounded-3xl bg-[#fff8f1] p-3 text-center sm:p-4 dark:bg-[#152229]">
                <div className="mb-3 inline-block rounded-2xl border border-[#fd860a]/30 bg-mimo-card px-3 py-2 text-xs font-extrabold text-mimo-title shadow-sm sm:px-4 sm:text-sm">
                  &ldquo;Bugün birkaç kelime daha pekiştirelim mi?&rdquo;
                </div>
                <div className="login-float mx-auto w-56 sm:w-64">
                  <Image
                    src="/mimo.png"
                    alt="Mimo maskotu"
                    width={520}
                    height={520}
                    priority
                    className="h-auto w-full select-none rounded-3xl"
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2.5">
                <OfflineSmartLink
                  href="/quiz/match"
                  onOfflineBlocked={showOfflineBlocked}
                  className="rounded-2xl border border-mimo-border bg-mimo-surface px-3.5 py-2.5 text-left transition hover:border-[#58cc02]/50"
                >
                  <p className="text-xs font-black text-[#15803d] dark:text-[#86efac]">
                    Kısa tekrar
                  </p>
                  <p className="mt-0.5 text-sm font-extrabold text-mimo-title">
                    Eşleştirme →
                  </p>
                </OfflineSmartLink>
                <OfflineSmartLink
                  href="/det/listen-type"
                  onOfflineBlocked={showOfflineBlocked}
                  className="rounded-2xl border border-mimo-border bg-mimo-surface px-3.5 py-2.5 text-left transition hover:border-[#0d9488]/50"
                >
                  <p className="text-xs font-black text-[#0f766e] dark:text-[#5eead4]">
                    Dinleme
                  </p>
                  <p className="mt-0.5 text-sm font-extrabold text-mimo-title">
                    Listen &amp; Type →
                  </p>
                </OfflineSmartLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Compact link to dedicated how-to page */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 py-8">
        <OfflineSmartLink
          href="/nasil-kullanilir"
          onOfflineBlocked={showOfflineBlocked}
          className="flex flex-col gap-3 rounded-3xl border border-[#58cc02]/30 bg-mimo-card p-5 shadow-sm transition hover:border-[#58cc02]/55 hover:shadow-md sm:flex-row sm:items-center sm:justify-between sm:p-6"
        >
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#58cc02]">
              Rehber
            </p>
            <h2 className="mt-1 text-xl font-black text-mimo-title sm:text-2xl">
              Nasıl kullanılır?
            </h2>
            <p className="mt-1 text-sm font-semibold text-mimo-muted">
              Adım adım başlangıç, pratiklerin özeti ve çevrimdışı paket kullanımı.
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center justify-center rounded-2xl bg-[#58cc02] px-4 py-3 text-sm font-black text-white shadow-[0_3px_0_#46a302]">
            Rehberi aç →
          </span>
        </OfflineSmartLink>
      </section>

      {/* ══════════════════════════════════════════════════════
          Features Grid
          ══════════════════════════════════════════════════════ */}
      <section
        id="features"
        ref={featuresSection.ref}
        className="relative z-10 mx-auto max-w-6xl px-4 py-10"
      >
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#1cb0f6]">
              Pratik alanları
            </p>
            <h2 className="mt-1 text-3xl font-black tracking-tight text-mimo-title">
              Hazırlık için günlük alıştırmalar
            </h2>
          </div>
          <p className="max-w-md text-sm font-semibold text-mimo-muted">
            Hepsi tarayıcıda açılır. Paket indirdiysen internet olmasa da aynı alıştırmalarla
            devam edebilirsin.
          </p>
        </div>

        <div
          className={`reveal-stagger ${featuresSection.visible ? "is-visible" : ""} mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3`}
        >
          {PUBLIC_FEATURES.map((feat) => {
            const style = FEATURE_TONE[feat.tone];
            return (
              <OfflineSmartLink
                key={feat.href}
                href={feat.href}
                onOfflineBlocked={showOfflineBlocked}
                className={`group flex flex-col justify-between rounded-3xl border border-mimo-border bg-mimo-card p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${style.border}`}
              >
                <div>
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${style.iconBg}`}
                    >
                      <FeatureIcon name={feat.iconKey} />
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-black ${style.pill}`}
                    >
                      {feat.badge}
                    </span>
                  </div>
                  <h3 className="mt-3.5 text-xl font-black text-mimo-title">{feat.title}</h3>
                  <p className="mt-1.5 text-sm font-semibold leading-relaxed text-mimo-muted">
                    {feat.description}
                  </p>
                </div>

                <div className={`mt-5 flex items-center gap-1 text-sm font-black ${style.btn}`}>
                  <span>{feat.cta}</span>
                  <span className="transition group-hover:translate-x-1.5">→</span>
                </div>
              </OfflineSmartLink>
            );
          })}
        </div>

      </section>

      {/* ══════════════════════════════════════════════════════
          Offline Packs
          ══════════════════════════════════════════════════════ */}
      <section id="offline-packs" className="relative z-10 mx-auto max-w-6xl px-4 pb-16 pt-6">
        <OfflinePacksManager />
      </section>

      {/* ══════════════════════════════════════════════════════
          FAQ
          ══════════════════════════════════════════════════════ */}
      <section
        id="faq"
        ref={faqSection.ref}
        className="relative z-10 mx-auto max-w-3xl px-4 pb-16"
      >
        <div className="text-center">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#fd860a]">
            Sıkça Sorulan Sorular
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-mimo-title">
            Merak edilenler
          </h2>
        </div>

        <div
          className={`reveal-stagger ${faqSection.visible ? "is-visible" : ""} mt-8 space-y-3`}
        >
          {FAQ_ITEMS.map((item, i) => (
            <FAQItem
              key={i}
              question={item.q}
              answer={item.a}
              open={openFAQ === i}
              onToggle={() => toggleFAQ(i)}
            />
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          Footer
          ══════════════════════════════════════════════════════ */}
      <footer className="border-t border-mimo-border bg-mimo-card/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-6 text-xs font-bold text-mimo-muted sm:flex-row">
          <div className="flex items-center gap-2">
            <Image
              src="/mimo-avatar.png"
              alt=""
              width={24}
              height={24}
              className="h-6 w-6 rounded-full object-cover"
            />
            <span>MIMO · Hazırlık öğrencileri için İngilizce pratik</span>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/nasil-kullanilir" className="hover:text-mimo-fg">
              Nasıl kullanılır
            </Link>
            <Link href="/offline" className="hover:text-mimo-fg">
              Çevrimdışı Çalışma
            </Link>
            <Link href="/about" className="hover:text-mimo-fg">
              Hakkında
            </Link>
            <Link href="/status" className="hover:text-mimo-fg" data-online-only>
              Sistem Durumu
            </Link>
            <Link
              href="/login"
              className="text-[#1cb0f6] hover:underline"
              data-online-only
            >
              Giriş Yap
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

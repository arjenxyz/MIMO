"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Provider = "google" | "discord" | "github" | "linkedin";

const MORE_PROVIDERS: {
  id: Provider;
  label: string;
  hint: string;
  iconClass: string;
  buttonClass: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "discord",
    label: "Discord",
    hint: "Topluluk hesabınla devam et",
    iconClass: "text-[#5865F2]",
    buttonClass:
      "border-[#e5e7eb] bg-white text-[#1f2937] shadow-[0_4px_0_#d1d5db] hover:bg-[#f9fafb]",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
        <path d="M19.3 5.2A16.4 16.4 0 0 0 15.4 4l-.2.4c1.5.4 2.4 1 3.1 1.7-1.3-.7-2.7-1.1-4.1-1.3h-.4c-1.4.2-2.8.6-4.1 1.3.7-.7 1.6-1.3 3.1-1.7L12.6 4a16.4 16.4 0 0 0-3.9 1.2C5.6 7 4.7 10.1 4.4 13.2c1.6 1.2 3.1 1.9 4.6 2.4l.9-1.4c-.5-.2-1-.4-1.5-.7.1-.1.3-.1.4-.2 2.5 1.2 5.3 1.2 7.8 0 .1.1.3.1.4.2-.5.3-1 .5-1.5.7l.9 1.4c1.5-.5 3-1.2 4.6-2.4-.4-3.6-1.6-6.6-4.3-8zM9.7 12.4c-.8 0-1.4-.7-1.4-1.5s.6-1.5 1.4-1.5 1.4.7 1.4 1.5-.6 1.5-1.4 1.5zm4.6 0c-.8 0-1.4-.7-1.4-1.5s.6-1.5 1.4-1.5 1.4.7 1.4 1.5-.6 1.5-1.4 1.5z" />
      </svg>
    ),
  },
  {
    id: "github",
    label: "GitHub",
    hint: "Geliştirici hesabınla devam et",
    iconClass: "text-[#24292f]",
    buttonClass:
      "border-[#e5e7eb] bg-white text-[#1f2937] shadow-[0_4px_0_#d1d5db] hover:bg-[#f9fafb]",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
        <path d="M12 2C6.48 2 2 6.58 2 12.26c0 4.52 2.87 8.35 6.84 9.7.5.1.68-.22.68-.48 0-.24-.01-.87-.01-1.7-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.55-1.14-4.55-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.31.1-2.73 0 0 .84-.27 2.75 1.05A9.3 9.3 0 0 1 12 6.8c.85 0 1.71.12 2.51.35 1.9-1.32 2.74-1.05 2.74-1.05.55 1.42.2 2.47.1 2.73.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.8-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .26.18.58.69.48A10.27 10.27 0 0 0 22 12.26C22 6.58 17.52 2 12 2z" />
      </svg>
    ),
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    hint: "Profesyonel hesabınla devam et",
    iconClass: "text-[#0A66C2]",
    buttonClass:
      "border-[#e5e7eb] bg-white text-[#1f2937] shadow-[0_4px_0_#d1d5db] hover:bg-[#f9fafb]",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
        <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.23 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.23 0z" />
      </svg>
    ),
  },
];

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.6h5.1c-.2 1.2-.9 2.2-1.9 2.9l3.1 2.4c1.8-1.7 2.8-4.1 2.8-7 0-.7-.1-1.3-.2-1.9H12z"
      />
      <path
        fill="#34A853"
        d="M6.6 14.3l-.9.7-2.5 1.9C5 19.5 8.2 21.5 12 21.5c2.4 0 4.4-.8 5.9-2.1l-3.1-2.4c-.8.6-1.9.9-2.8.9-2.2 0-4-1.5-4.7-3.5z"
      />
      <path
        fill="#4A90E2"
        d="M3.2 7.1C2.4 8.6 2 10.2 2 12s.4 3.4 1.2 4.9l3.4-2.6C6.2 13.4 6 12.7 6 12s.2-1.4.6-2.3L3.2 7.1z"
      />
      <path
        fill="#FBBC05"
        d="M12 5.5c1.3 0 2.5.5 3.4 1.3l2.6-2.6C16.4 2.7 14.4 2 12 2 8.2 2 5 4 3.2 7.1l3.4 2.6C7.9 7 9.8 5.5 12 5.5z"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
      <path d="M16.4 12.7c0-2.1 1.7-3.1 1.8-3.2-1-1.4-2.5-1.6-3-1.7-1.3-.1-2.5.8-3.1.8-.7 0-1.7-.7-2.8-.7-1.4 0-2.8.9-3.5 2.2-1.5 2.6-.4 6.4 1.1 8.5.7 1 1.6 2.1 2.7 2.1 1.1 0 1.5-.7 2.8-.7s1.7.7 2.8.7c1.2 0 1.9-1 2.6-2 .8-1.2 1.1-2.3 1.1-2.4-.1 0-2.2-.8-2.2-3.6zM14.5 5.9c.6-.7 1-1.7.9-2.7-.9 0-1.9.6-2.5 1.3-.6.6-1.1 1.7-.9 2.6 1 .1 1.9-.5 2.5-1.2z" />
    </svg>
  );
}

export function SocialAuthButtons() {
  const [loading, setLoading] = useState<Provider | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!moreOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMoreOpen(false);
    }
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [moreOpen]);

  async function signIn(provider: Provider) {
    setLoading(provider);
    setMoreOpen(false);
    window.location.assign(`/auth/pending?provider=${provider}`);
  }

  const primaryButtons = (
    <>
      <button
        type="button"
        aria-label="Google ile giriş yap"
        disabled={loading !== null}
        onClick={() => signIn("google")}
        className="flex w-full items-center justify-center gap-3 rounded-full border-2 border-[#e5e7eb] bg-white px-5 py-3.5 text-base font-extrabold text-[#1f2937] shadow-[0_4px_0_#d1d5db] transition hover:bg-[#f9fafb] active:translate-y-1 active:shadow-none disabled:opacity-60"
      >
        <GoogleIcon />
        <span>{loading === "google" ? "Yönlendiriliyor..." : "Google ile devam et"}</span>
      </button>

      <button
        type="button"
        disabled
        aria-disabled="true"
        title="Şu an geçerli değil"
        className="flex w-full cursor-not-allowed items-center justify-center gap-3 rounded-full border-2 border-[#d1d5db] bg-[#f3f4f6] px-5 py-3.5 text-base font-extrabold text-[#9ca3af]"
      >
        <AppleIcon />
        <span>Apple ile devam et</span>
      </button>
    </>
  );

  const modal =
    moreOpen && mounted
      ? createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
            role="presentation"
            onClick={() => setMoreOpen(false)}
          >
            <div className="absolute inset-0 bg-[#1f2937]/45 backdrop-blur-[2px]" />

            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="more-auth-title"
              className="relative z-10 w-full max-w-md overflow-hidden rounded-[2rem] bg-[#fffaf4] shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="relative px-6 pb-2 pt-6 text-center">
                <div className="pointer-events-none absolute -left-8 -top-6 h-28 w-28 rounded-full bg-[#d8f5c8]/50" />
                <div className="pointer-events-none absolute -right-6 top-0 h-24 w-24 rounded-full bg-[#ffe8a3]/60" />

                <button
                  type="button"
                  aria-label="Kapat"
                  onClick={() => setMoreOpen(false)}
                  className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white text-lg font-black text-[#9ca3af] shadow-sm"
                >
                  ×
                </button>

                <p className="relative text-xs font-black uppercase tracking-[0.2em] text-[#fd860a]">
                  MIMO
                </p>
                <h2 id="more-auth-title" className="relative mt-2 text-2xl font-black text-[#1f2937]">
                  Diğer hesaplar
                </h2>
                <p className="relative mt-1 text-sm font-bold text-[#6b7280]">
                  Hangisiyle devam etmek istersin?
                </p>
              </div>

              <div className="space-y-3 px-5 pb-6 pt-4">
                {MORE_PROVIDERS.map((provider) => (
                  <button
                    key={provider.id}
                    type="button"
                    disabled={loading !== null}
                    onClick={() => signIn(provider.id)}
                    className="flex w-full items-center gap-4 rounded-2xl border-2 border-[#f3e7d8] bg-white px-4 py-3.5 text-left shadow-[0_3px_0_#f0e4d4] transition hover:border-[#fd860a]/40 hover:bg-[#fff8f1] active:translate-y-[2px] active:shadow-none disabled:opacity-60"
                  >
                    <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#fff8f1] ${provider.iconClass}`}>
                      {provider.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-base font-black text-[#1f2937]">
                        {loading === provider.id ? "Yönlendiriliyor..." : provider.label}
                      </span>
                      <span className="mt-0.5 block text-xs font-bold text-[#9ca3af]">
                        {provider.hint}
                      </span>
                    </span>
                    <span className="text-xl font-black text-[#fd860a]" aria-hidden>
                      ›
                    </span>
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setMoreOpen(false)}
                  className="w-full pt-1 text-center text-sm font-extrabold text-[#9ca3af]"
                >
                  Vazgeç
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <div className="w-full space-y-3">
        {primaryButtons}

        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={moreOpen}
          disabled={loading !== null}
          onClick={() => setMoreOpen(true)}
          className="flex w-full items-center justify-center gap-3 rounded-full border-2 border-[#e5e7eb] bg-white px-5 py-3.5 text-base font-extrabold text-[#1f2937] shadow-[0_4px_0_#d1d5db] transition hover:bg-[#f9fafb] active:translate-y-1 active:shadow-none disabled:opacity-60"
        >
          <span className="flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" className="h-6 w-6 fill-[#5865F2]" aria-hidden>
              <path d="M19.3 5.2A16.4 16.4 0 0 0 15.4 4l-.2.4c1.5.4 2.4 1 3.1 1.7-1.3-.7-2.7-1.1-4.1-1.3h-.4c-1.4.2-2.8.6-4.1 1.3.7-.7 1.6-1.3 3.1-1.7L12.6 4a16.4 16.4 0 0 0-3.9 1.2C5.6 7 4.7 10.1 4.4 13.2c1.6 1.2 3.1 1.9 4.6 2.4l.9-1.4c-.5-.2-1-.4-1.5-.7.1-.1.3-.1.4-.2 2.5 1.2 5.3 1.2 7.8 0 .1.1.3.1.4.2-.5.3-1 .5-1.5.7l.9 1.4c1.5-.5 3-1.2 4.6-2.4-.4-3.6-1.6-6.6-4.3-8zM9.7 12.4c-.8 0-1.4-.7-1.4-1.5s.6-1.5 1.4-1.5 1.4.7 1.4 1.5-.6 1.5-1.4 1.5zm4.6 0c-.8 0-1.4-.7-1.4-1.5s.6-1.5 1.4-1.5 1.4.7 1.4 1.5-.6 1.5-1.4 1.5z" />
            </svg>
            <svg viewBox="0 0 24 24" className="h-6 w-6 fill-[#24292f]" aria-hidden>
              <path d="M12 2C6.48 2 2 6.58 2 12.26c0 4.52 2.87 8.35 6.84 9.7.5.1.68-.22.68-.48 0-.24-.01-.87-.01-1.7-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.55-1.14-4.55-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.31.1-2.73 0 0 .84-.27 2.75 1.05A9.3 9.3 0 0 1 12 6.8c.85 0 1.71.12 2.51.35 1.9-1.32 2.74-1.05 2.74-1.05.55 1.42.2 2.47.1 2.73.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.8-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .26.18.58.69.48A10.27 10.27 0 0 0 22 12.26C22 6.58 17.52 2 12 2z" />
            </svg>
            <svg viewBox="0 0 24 24" className="h-6 w-6 fill-[#0A66C2]" aria-hidden>
              <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.23 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.23 0z" />
            </svg>
          </span>
          <span>Diğer seçenekler</span>
        </button>
      </div>

      {modal}
    </>
  );
}

"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallPwaButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    const ua = window.navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIsIos(ios);

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    if (standalone) setInstalled(true);

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", () => setInstalled(true));
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  if (installed) {
    return (
      <p className="rounded-2xl border-2 border-[#58cc02]/40 bg-[#58cc02]/10 px-4 py-3 text-center text-sm font-extrabold text-[#58cc02]">
        Uygulama ana ekranda — widget önizlemesini buradan açabilirsin.
      </p>
    );
  }

  async function install() {
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
      setDeferred(null);
      return;
    }
    if (isIos) {
      setShowIosHint(true);
      return;
    }
    setShowIosHint(true);
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={install}
        className="flex w-full items-center justify-center rounded-2xl bg-[#1cb0f6] px-4 py-3.5 text-sm font-black uppercase tracking-wide text-white shadow-[0_4px_0_#1899d6] transition active:translate-y-1 active:shadow-none"
      >
        Ana ekrana ekle
      </button>
      {showIosHint && (
        <p className="rounded-2xl border-2 border-duo-border bg-duo-card/80 px-4 py-3 text-sm font-bold text-duo-muted">
          {isIos
            ? "Safari’de Paylaş → Ana Ekrana Ekle ile MIMO’yu ekle. Sonra kısayoldan Günlük seri’yi aç."
            : "Tarayıcı menüsünden “Uygulamayı yükle” / “Ana ekrana ekle” seçeneğini kullan."}
        </p>
      )}
    </div>
  );
}

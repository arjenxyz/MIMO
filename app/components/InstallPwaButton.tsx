"use client";

import { useEffect, useState } from "react";
import {
  clearPwaInstallPrompt,
  getPwaInstallPrompt,
  isIosDevice,
  isStandaloneDisplay,
  subscribePwaInstallPrompt,
} from "@/lib/pwaInstallPrompt";

type Props = {
  /** Larger hero-style button */
  prominent?: boolean;
  className?: string;
};

export function InstallPwaButton({ prominent = false, className = "" }: Props) {
  const [canPrompt, setCanPrompt] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setIsIos(isIosDevice());
    if (isStandaloneDisplay()) {
      setInstalled(true);
      return;
    }

    setCanPrompt(Boolean(getPwaInstallPrompt()));
    const unsub = subscribePwaInstallPrompt(() => {
      setCanPrompt(Boolean(getPwaInstallPrompt()));
    });

    const onInstalled = () => {
      setInstalled(true);
      clearPwaInstallPrompt();
    };
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      unsub();
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) {
    return (
      <p
        className={`rounded-2xl border-2 border-[#58cc02]/40 bg-[#58cc02]/10 px-4 py-3 text-center text-sm font-extrabold text-[#58cc02] ${className}`}
      >
        Uygulama yüklü — ana ekrandan aç; çevrimdışı pratik hazır.
      </p>
    );
  }

  async function install() {
    const deferred = getPwaInstallPrompt();
    if (deferred) {
      setBusy(true);
      try {
        await deferred.prompt();
        const choice = await deferred.userChoice;
        if (choice.outcome === "accepted") setInstalled(true);
        clearPwaInstallPrompt();
        setCanPrompt(false);
      } catch {
        setShowHint(true);
      } finally {
        setBusy(false);
      }
      return;
    }
    setShowHint(true);
  }

  const buttonClass = prominent
    ? "flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1cb0f6] px-5 py-4 text-base font-black text-white shadow-[0_4px_0_#1899d6] transition hover:brightness-105 active:translate-y-1 active:shadow-none disabled:opacity-70"
    : "flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1cb0f6] px-4 py-3.5 text-sm font-black uppercase tracking-wide text-white shadow-[0_4px_0_#1899d6] transition active:translate-y-1 active:shadow-none disabled:opacity-70";

  return (
    <div className={`space-y-3 ${className}`}>
      <button type="button" onClick={install} disabled={busy} className={buttonClass}>
        {busy ? "Kurulum açılıyor…" : "Uygulamayı indir"}
      </button>
      {!canPrompt && !showHint ? (
        <p className="text-center text-xs font-bold text-mimo-muted">
          {isIos
            ? "iPhone’da Safari → Paylaş → Ana Ekrana Ekle"
            : "Tarayıcı hazır olunca tek tıkla kurulur. Hazır değilse butona basınca yolu gösteririz."}
        </p>
      ) : null}
      {showHint ? (
        <p className="rounded-2xl border-2 border-duo-border bg-duo-card/80 px-4 py-3 text-sm font-bold text-duo-muted">
          {isIos ? (
            <>
              Safari’de alttaki <strong className="text-mimo-title">Paylaş</strong> →{" "}
              <strong className="text-mimo-title">Ana Ekrana Ekle</strong> ile MIMO’yu ekle.
              Sonra ana ekrandaki ikondan aç.
            </>
          ) : (
            <>
              Chrome menüsü (⋮) → <strong className="text-mimo-title">Uygulamayı yükle</strong>{" "}
              veya <strong className="text-mimo-title">Ana ekrana ekle</strong>. Adres çubuğunda
              bilgisayar simgesi de çıkabilir. Siteyi bir kez çevrimiçi açıp bekledikten sonra
              tekrar dene.
            </>
          )}
        </p>
      ) : null}
    </div>
  );
}

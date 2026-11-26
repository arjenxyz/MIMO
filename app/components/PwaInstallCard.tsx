"use client";

import { InstallPwaButton } from "@/app/components/InstallPwaButton";
import { PwaRuntime } from "@/app/components/PwaRuntime";

type Props = {
  /** Compact = button + short copy; full = status chips too */
  variant?: "hero" | "section";
};

export function PwaInstallCard({ variant = "section" }: Props) {
  if (variant === "hero") {
    return (
      <div className="mt-4 w-full max-w-md rounded-2xl border border-[#1cb0f6]/35 bg-[#e8f6fe]/80 p-4 dark:bg-[#0c4a6e]/25">
        <p className="text-sm font-black text-mimo-title">
          Çevrimdışı girebilmek için uygulamayı indir
        </p>
        <p className="mt-1 text-xs font-semibold text-mimo-muted">
          Ana ekrana ekle → kelime paketini indir → internet olmadan pratik yap.
        </p>
        <div className="mt-3">
          <InstallPwaButton prominent />
        </div>
      </div>
    );
  }

  return (
    <section
      id="pwa-indir"
      className="rounded-3xl border border-[#1cb0f6]/35 bg-mimo-card p-6 shadow-sm"
    >
      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#1cb0f6]">
        PWA uygulama
      </p>
      <h2 className="mt-2 text-2xl font-black text-mimo-title sm:text-3xl">
        Çevrimdışı için MIMO’yu indir
      </h2>
      <p className="mt-2 max-w-2xl text-sm font-semibold text-mimo-muted">
        Tarayıcıdaki site internet kesilince açılmayabilir. Ana ekrana eklenen uygulama
        çevrimdışı kabuğu ve indirdiğin kelime paketlerini kullanır.
      </p>
      <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-sm font-bold text-mimo-fg">
        <li>Aşağıdan uygulamayı indir / ana ekrana ekle</li>
        <li>Çevrimiçiyken kelime paketini indir</li>
        <li>Ana ekran ikonundan aç — internet olmasa da pratik</li>
      </ol>
      <div className="mt-5 max-w-md">
        <InstallPwaButton prominent />
      </div>
      <div className="mt-5">
        <PwaRuntime showInstall={false} />
      </div>
    </section>
  );
}

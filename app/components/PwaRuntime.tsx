"use client";

import { useEffect, useState } from "react";
import { InstallPwaButton } from "@/app/components/InstallPwaButton";
import { warmOfflineRouteCache } from "@/lib/offlineStorage";
import { useOnlineStatus } from "@/lib/useOnlineStatus";

const SHELLS = [
  "/offline",
  "/offline/quiz",
  "/offline/match",
  "/offline/word-check",
  "/offline/listen",
  "/offline/read",
  "/~offline",
];

async function precacheShellsInPage() {
  if (!("caches" in window) || !navigator.onLine) return;
  const cache = await caches.open("mimo-pwa-shell-v1");
  await Promise.allSettled(
    SHELLS.map(async (url) => {
      try {
        const res = await fetch(url, {
          credentials: "same-origin",
          cache: "no-cache",
          headers: { Accept: "text/html" },
        });
        if (res.ok) {
          await cache.put(url, res.clone());
          await cache.put(new URL(url, window.location.origin).href, res.clone());
        }
      } catch {
        // ignore
      }
    })
  );
  await warmOfflineRouteCache();
  if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage({ type: "MIMO_PRECACHE_OFFLINE" });
  }
}

/**
 * Keeps the offline PWA shells warm and shows install / ready status.
 */
export function PwaRuntime({ showInstall = true }: { showInstall?: boolean }) {
  const online = useOnlineStatus();
  const [swReady, setSwReady] = useState(false);
  const [shellReady, setShellReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!("serviceWorker" in navigator)) return;
      try {
        const reg = await navigator.serviceWorker.ready;
        if (!cancelled) setSwReady(Boolean(reg.active || reg.waiting || reg.installing));
        await precacheShellsInPage();
        if ("caches" in window) {
          const cache = await caches.open("mimo-pwa-shell-v1");
          const hit = await cache.match("/offline/quiz", { ignoreSearch: true });
          if (!cancelled) setShellReady(Boolean(hit));
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [online]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs font-extrabold">
        <span
          className={`rounded-full px-2.5 py-1 ${
            swReady
              ? "bg-[#ecfce5] text-[#15803d] dark:bg-[#14532d]/40 dark:text-[#86efac]"
              : "bg-mimo-surface text-mimo-muted"
          }`}
        >
          {swReady ? "PWA servis işçisi hazır" : "PWA yükleniyor…"}
        </span>
        <span
          className={`rounded-full px-2.5 py-1 ${
            shellReady
              ? "bg-[#e8f6fe] text-[#0369a1] dark:bg-[#0c4a6e]/40 dark:text-[#7dd3fc]"
              : "bg-mimo-surface text-mimo-muted"
          }`}
        >
          {shellReady
            ? "Çevrimdışı kabuk cache’te"
            : online
              ? "Kabuk cache’leniyor…"
              : "Kabuk henüz yok — bir kez çevrimiçi aç"}
        </span>
      </div>
      {showInstall ? <InstallPwaButton /> : null}
    </div>
  );
}

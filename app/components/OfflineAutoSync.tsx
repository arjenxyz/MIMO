"use client";

import { useEffect } from "react";
import { syncDownloadedPacksIfOnline } from "@/lib/offlineStorage";

/**
 * Automatically syncs any previously downloaded offline packs whenever
 * the user loads the app online or regains connectivity.
 */
export function OfflineAutoSync() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const runSync = () => {
      if (!navigator.onLine) return;
      void syncDownloadedPacksIfOnline();
    };

    const timer = window.setTimeout(runSync, 1200);
    window.addEventListener("online", runSync);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("online", runSync);
    };
  }, []);

  return null;
}

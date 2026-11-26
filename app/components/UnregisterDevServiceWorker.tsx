"use client";

import { useEffect } from "react";

/**
 * Local/dev: drop leftover production SW + caches so webpack chunks match the
 * current Next build (avoids "Cannot read properties of undefined (reading 'call')").
 */
export function UnregisterDevServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    if (!("serviceWorker" in navigator)) return;

    void (async () => {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((reg) => reg.unregister()));
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((key) => caches.delete(key)));
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  return null;
}

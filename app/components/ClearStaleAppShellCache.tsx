"use client";

import { useEffect } from "react";

/**
 * One-time cleanup of known-poisoned auth HTML caches.
 * Does NOT wipe PWA shell / workbox caches — that broke install + offline.
 */
export function ClearStaleAppShellCache() {
  useEffect(() => {
    if (typeof window === "undefined" || !("caches" in window)) return;
    const flag = "mimo-shell-cache-cleared-v4";
    try {
      if (sessionStorage.getItem(flag) === "1") return;
      sessionStorage.setItem(flag, "1");
    } catch {
      // continue
    }

    void (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(
          keys
            .filter((key) => /start-url|pages-v1|rsc/i.test(key) && !/pwa-shell|workbox|precache/i.test(key))
            .map((key) => caches.delete(key))
        );
      } catch {
        // ignore
      }
    })();
  }, []);

  return null;
}

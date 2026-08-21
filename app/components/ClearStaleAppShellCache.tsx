"use client";

import { useEffect } from "react";

/**
 * Bust stale PWA/page caches that can keep old /settings and /friends HTML around.
 * Runs once per tab session.
 */
export function ClearStaleAppShellCache() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const flag = "mimo-shell-cache-cleared-v2";
    try {
      if (sessionStorage.getItem(flag) === "1") return;
      sessionStorage.setItem(flag, "1");
    } catch {
      // continue
    }

    void (async () => {
      try {
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(
            keys
              .filter((key) => /pages|start-url|rsc|precache|workbox/i.test(key))
              .map((key) => caches.delete(key))
          );
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  return null;
}

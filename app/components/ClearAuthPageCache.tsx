"use client";

import { useEffect } from "react";

/**
 * Clears poisoned page caches from older SW builds that served "/" HTML under "/login".
 */
export function ClearAuthPageCache() {
  useEffect(() => {
    if (!("caches" in window)) return;

    void (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(
          keys
            .filter((key) => /pages|start-url|rsc|precache/i.test(key))
            .map((key) => caches.delete(key))
        );
        if ("serviceWorker" in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map((reg) => reg.update()));
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  return null;
}

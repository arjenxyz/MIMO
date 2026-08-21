"use client";

import { useEffect } from "react";
import { clearClientCaches } from "@/lib/clearClientCaches";

/**
 * Bust stale PWA/page caches that can keep another account's HTML around.
 * Runs once per tab session (flag bumped when cache policy changes).
 */
export function ClearStaleAppShellCache() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const flag = "mimo-shell-cache-cleared-v3";
    try {
      if (sessionStorage.getItem(flag) === "1") return;
      sessionStorage.setItem(flag, "1");
    } catch {
      // continue
    }

    void clearClientCaches().then(() => {
      try {
        sessionStorage.setItem(flag, "1");
      } catch {
        // ignore
      }
    });
  }, []);

  return null;
}

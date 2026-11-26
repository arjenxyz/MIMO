"use client";

import { useEffect } from "react";
import {
  capturePwaInstallPrompt,
  clearPwaInstallPrompt,
  isStandaloneDisplay,
} from "@/lib/pwaInstallPrompt";

/**
 * Mount early in the root layout so `beforeinstallprompt` is never missed
 * before a page-level install button hydrates.
 */
export function PwaInstallCapture() {
  useEffect(() => {
    if (isStandaloneDisplay()) return;

    const onBeforeInstall = (event: Event) => {
      capturePwaInstallPrompt(event);
    };
    const onInstalled = () => {
      clearPwaInstallPrompt();
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  return null;
}

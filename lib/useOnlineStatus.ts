"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

function subscribe(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener("online", onStoreChange);
  window.addEventListener("offline", onStoreChange);
  return () => {
    window.removeEventListener("online", onStoreChange);
    window.removeEventListener("offline", onStoreChange);
  };
}

function getSnapshot() {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

function getServerSnapshot() {
  return true;
}

/** Live online/offline flag (SSR assumes online). */
export function useOnlineStatus() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Keep <html data-mimo-offline> in sync for CSS / opportunistic hiding. */
export function useOfflineDocumentFlag() {
  const online = useOnlineStatus();
  useEffect(() => {
    const root = document.documentElement;
    if (online) root.removeAttribute("data-mimo-offline");
    else root.setAttribute("data-mimo-offline", "1");
    return () => root.removeAttribute("data-mimo-offline");
  }, [online]);
  return online;
}

/** True after first client mount — avoids flash of wrong mode. */
export function useHasMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

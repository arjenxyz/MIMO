/**
 * Drop PWA / Workbox caches that can serve another user's HTML or RSC payload.
 */
export async function clearClientCaches() {
  if (typeof window === "undefined") return;

  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } catch {
    // ignore
  }

  try {
    sessionStorage.removeItem("mimo-shell-cache-cleared-v2");
    sessionStorage.removeItem("mimo-shell-cache-cleared-v3");
  } catch {
    // ignore
  }
}

/** Full navigation so Next.js client router cache cannot keep the previous account. */
export function hardNavigate(path: string) {
  window.location.assign(path);
}

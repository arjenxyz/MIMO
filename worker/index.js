/* global self */

/**
 * Merged into the next-pwa service worker.
 * Precache the dedicated /offline/* PWA practice shells on install/activate
 * so opening the installed app without network still works.
 */

const SHELL_CACHE = "mimo-pwa-shell-v1";
const PRACTICE_SHELLS = [
  "/offline",
  "/offline/quiz",
  "/offline/match",
  "/offline/word-check",
  "/offline/listen",
  "/offline/read",
  "/~offline",
];

async function precachePracticeShells() {
  const cache = await caches.open(SHELL_CACHE);
  await Promise.allSettled(
    PRACTICE_SHELLS.map(async (url) => {
      try {
        const res = await fetch(url, {
          credentials: "same-origin",
          headers: { Accept: "text/html" },
        });
        if (res.ok) {
          await cache.put(url, res.clone());
        }
      } catch {
        // install may run offline — ignore
      }
    })
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(precachePracticeShells());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(precachePracticeShells());
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "MIMO_PRECACHE_OFFLINE") {
    event.waitUntil(precachePracticeShells());
  }
});

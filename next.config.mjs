import withPWAInit from "@ducanh2912/next-pwa";

function isOfflinePwaPath(pathname) {
  return (
    pathname === "/offline" ||
    pathname.startsWith("/offline/") ||
    pathname === "/~offline"
  );
}

function isPublicOfflinePath(pathname) {
  return (
    isOfflinePwaPath(pathname) ||
    pathname === "/" ||
    pathname.startsWith("/about") ||
    pathname.startsWith("/nasil-kullanilir") ||
    pathname.startsWith("/quiz") ||
    pathname.startsWith("/det/") ||
    pathname === "/det" ||
    pathname.startsWith("/grammar") ||
    pathname.startsWith("/reading")
  );
}

function isPrivatePath(pathname) {
  return (
    pathname.startsWith("/api/") ||
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/friends") ||
    pathname.startsWith("/setup") ||
    pathname.startsWith("/words") ||
    pathname.startsWith("/photo-practice") ||
    pathname.startsWith("/widget") ||
    pathname.startsWith("/challenge") ||
    pathname.startsWith("/messages")
  );
}

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  customWorkerSrc: "worker",
  cacheStartUrl: true,
  dynamicStartUrl: true,
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  extendDefaultRuntimeCaching: true,
  workboxOptions: {
    cleanupOutdatedCaches: true,
    skipWaiting: true,
    clientsClaim: true,
    runtimeCaching: [
      {
        // Dedicated offline PWA shells — prefer cache so installed app opens offline.
        urlPattern: ({ request, url }) => {
          if (request.method !== "GET") return false;
          return isOfflinePwaPath(url.pathname);
        },
        handler: "CacheFirst",
        options: {
          cacheName: "mimo-pwa-shell-v1",
          matchOptions: { ignoreSearch: true },
          expiration: {
            maxEntries: 64,
            maxAgeSeconds: 60 * 24 * 60 * 60,
          },
        },
      },
      {
        urlPattern: ({ request, url }) => {
          if (request.method !== "GET") return false;
          if (isOfflinePwaPath(url.pathname)) return false;
          return isPublicOfflinePath(url.pathname);
        },
        handler: "NetworkFirst",
        options: {
          cacheName: "mimo-public-pages-v1",
          networkTimeoutSeconds: 1.5,
          matchOptions: { ignoreSearch: true },
          expiration: {
            maxEntries: 96,
            maxAgeSeconds: 30 * 24 * 60 * 60,
          },
        },
      },
      {
        urlPattern: ({ url }) =>
          url.pathname.startsWith("/_next/static/") ||
          url.pathname.startsWith("/_next/data/"),
        handler: "CacheFirst",
        options: {
          cacheName: "mimo-next-static-v1",
          expiration: {
            maxEntries: 200,
            maxAgeSeconds: 30 * 24 * 60 * 60,
          },
        },
      },
      {
        urlPattern: ({ request, url }) => {
          const { pathname } = url;
          if (request.method !== "GET") return false;
          if (isPublicOfflinePath(pathname)) return false;
          if (pathname.startsWith("/_next/")) return false;
          if (isPrivatePath(pathname)) return true;
          if (request.mode === "navigate" || request.destination === "document") {
            return true;
          }
          try {
            if (request.headers.get("RSC") === "1") return true;
            if (request.headers.get("Next-Router-Prefetch") === "1") return true;
            if (request.headers.get("Next-Router-State-Tree")) return true;
          } catch {
            // ignore
          }
          return false;
        },
        handler: "NetworkOnly",
        method: "GET",
      },
    ],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        protocol: "https",
        hostname: "fastly.picsum.photos",
      },
      {
        protocol: "https",
        hostname: "loremflickr.com",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "github.com",
      },
    ],
  },
};

export default withPWA(nextConfig);

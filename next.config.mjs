import withPWAInit from "@ducanh2912/next-pwa";

function isPublicOfflinePath(pathname) {
  return (
    pathname === "/" ||
    pathname === "/offline" ||
    pathname === "/~offline" ||
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
    pathname.startsWith("/challenge")
  );
}

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  // Cache "/" so a hard refresh offline can reopen the last shell.
  // Auth/login stays NetworkOnly below; document failures use app/~offline.
  cacheStartUrl: true,
  dynamicStartUrl: true,
  cacheOnFrontEndNav: true,
  extendDefaultRuntimeCaching: true,
  workboxOptions: {
    cleanupOutdatedCaches: true,
    skipWaiting: true,
    clientsClaim: true,
    // Public practice shells: NetworkFirst with a short timeout so offline taps
    // fall back to cache quickly instead of hanging on dead network.
    // Private/auth HTML+RSC+API stay NetworkOnly (no cross-account leakage).
    runtimeCaching: [
      {
        urlPattern: ({ request, url }) => {
          if (request.method !== "GET") return false;
          return isPublicOfflinePath(url.pathname);
        },
        handler: "NetworkFirst",
        options: {
          cacheName: "mimo-public-pages-v1",
          networkTimeoutSeconds: 2,
          expiration: {
            maxEntries: 96,
            maxAgeSeconds: 30 * 24 * 60 * 60,
          },
        },
      },
      {
        urlPattern: ({ request, url }) => {
          const { pathname } = url;
          if (request.method !== "GET") return false;
          if (isPublicOfflinePath(pathname)) return false;
          if (isPrivatePath(pathname)) return true;
          if (request.mode === "navigate" || request.destination === "document") {
            // Remaining shells (status, messages, …): network only; ~offline catches fail.
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

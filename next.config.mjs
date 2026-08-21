import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  // App Router + auth redirects: NEVER use document fallback (serves wrong HTML for /login).
  cacheStartUrl: false,
  dynamicStartUrl: true,
  // Keep default Workbox routes and prepend our auth NetworkOnly rule.
  extendDefaultRuntimeCaching: true,
  workboxOptions: {
    cleanupOutdatedCaches: true,
    skipWaiting: true,
    clientsClaim: true,
    // Never cache HTML/RSC/API — otherwise account A data survives for account B.
    runtimeCaching: [
      {
        urlPattern: ({ request, url }) => {
          const { pathname } = url;
          if (pathname.startsWith("/api/")) return true;
          if (request.mode === "navigate" || request.destination === "document") {
            return true;
          }
          // Next.js App Router flight / RSC payloads
          try {
            if (request.headers.get("RSC") === "1") return true;
            if (request.headers.get("Next-Router-Prefetch") === "1") return true;
            if (request.headers.get("Next-Router-State-Tree")) return true;
          } catch {
            // ignore
          }
          return (
            pathname === "/login" ||
            pathname.startsWith("/login/") ||
            pathname.startsWith("/register") ||
            pathname.startsWith("/auth") ||
            pathname.startsWith("/onboarding") ||
            pathname.startsWith("/settings") ||
            pathname.startsWith("/friends") ||
            pathname.startsWith("/setup") ||
            pathname.startsWith("/about") ||
            pathname === "/" ||
            pathname.startsWith("/quiz") ||
            pathname.startsWith("/words") ||
            pathname.startsWith("/det") ||
            pathname.startsWith("/photo-practice") ||
            pathname.startsWith("/reading") ||
            pathname.startsWith("/widget")
          );
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
    ],
  },
};

export default withPWA(nextConfig);

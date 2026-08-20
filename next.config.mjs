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
    // Auth HTML must always hit the network — cached redirects poison /login with "/".
    runtimeCaching: [
      {
        urlPattern: ({ url: { pathname } }) =>
          pathname === "/login" ||
          pathname.startsWith("/login/") ||
          pathname.startsWith("/register") ||
          pathname.startsWith("/auth") ||
          pathname.startsWith("/onboarding"),
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

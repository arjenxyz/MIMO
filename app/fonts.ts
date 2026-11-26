import localFont from "next/font/local";

/**
 * Self-hosted font — avoids next/font Google fetch during Vercel builds
 * (fonts.gstatic.com is often blocked) and works offline in the PWA.
 */
export const appFont = localFont({
  src: [
    {
      path: "./fonts/GeistVF.woff",
      weight: "100 900",
      style: "normal",
    },
  ],
  variable: "--font-nunito",
  display: "swap",
  fallback: ["Nunito", "Segoe UI", "Arial", "sans-serif"],
});

import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/app/components/Navbar";
import { FeedbackSoundBoot } from "@/app/components/FeedbackSoundBoot";
import { ThemeProvider } from "@/app/components/ThemeProvider";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";

const nunito = Nunito({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "600", "700", "800", "900"],
  variable: "--font-nunito",
});

const APP_NAME = "MIMO";
const APP_TITLE = "MIMO — İngilizce Öğren";
const APP_DESCRIPTION =
  "Spaced repetition ile her gün pratik yapan İngilizce öğrenme platformu.";

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_TITLE,
    template: "%s · MIMO",
  },
  description: APP_DESCRIPTION,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_NAME,
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f4f6" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1a1e" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body
        className={`${nunito.variable} ${nunito.className} bg-mimo-bg text-mimo-fg antialiased`}
      >
        <ThemeProvider>
          <FeedbackSoundBoot />
          <Navbar />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Navbar } from "@/app/components/Navbar";
import { AuthSessionGuard } from "@/app/components/AuthSessionGuard";
import { ClearStaleAppShellCache } from "@/app/components/ClearStaleAppShellCache";
import { FeedbackSoundBoot } from "@/app/components/FeedbackSoundBoot";
import { OfflineAutoSync } from "@/app/components/OfflineAutoSync";
import { OfflineDocumentSync } from "@/app/components/OnlineGate";
import { PwaInstallCapture } from "@/app/components/PwaInstallCapture";
import { ThemeProvider } from "@/app/components/ThemeProvider";
import { UnregisterDevServiceWorker } from "@/app/components/UnregisterDevServiceWorker";
import { appFont } from "@/app/fonts";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";

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
        className={`${appFont.variable} ${appFont.className} bg-mimo-bg text-mimo-fg antialiased`}
      >
        <ThemeProvider>
          <UnregisterDevServiceWorker />
          <PwaInstallCapture />
          <ClearStaleAppShellCache />
          <OfflineDocumentSync />
          <AuthSessionGuard />
          <OfflineAutoSync />
          <FeedbackSoundBoot />
          <Navbar />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

"use client";

import { useEffect } from "react";
import { Nunito } from "next/font/google";
import { reportClientError } from "@/lib/report-client-error";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700", "800", "900"],
});

/** Root-layout failure fallback — must include its own html/body. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportClientError({
      title: "Kritik hata",
      message: error.message || "Bilinmeyen kritik hata",
      path: typeof window !== "undefined" ? window.location.pathname : undefined,
      source: "app/global-error",
      extra: {
        digest: error.digest,
        name: error.name,
      },
    });
  }, [error]);

  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className={`${nunito.className} antialiased`}>
        <main
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "3rem 1rem",
            textAlign: "center",
            background: "var(--mimo-bg, #f3f4f6)",
            color: "var(--mimo-fg, #0f172a)",
          }}
        >
          <p
            style={{
              fontSize: "0.75rem",
              fontWeight: 800,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#1cb0f6",
              margin: 0,
            }}
          >
            MIMO
          </p>
          <h1
            style={{
              marginTop: "0.75rem",
              fontSize: "1.75rem",
              fontWeight: 900,
              color: "var(--mimo-title, #1e3a5f)",
            }}
          >
            Uygulama yanıt vermiyor
          </h1>
          <p
            style={{
              marginTop: "0.75rem",
              maxWidth: "24rem",
              fontSize: "0.95rem",
              fontWeight: 600,
              color: "var(--mimo-muted, #64748b)",
            }}
          >
            Kritik bir hata oluştu. Sayfayı yenilemeyi dene.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1.75rem",
              borderRadius: "1rem",
              background: "#1cb0f6",
              color: "#fff",
              fontWeight: 900,
              fontSize: "0.875rem",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              padding: "0.75rem 2rem",
              border: "none",
              boxShadow: "0 3px 0 #1899d6",
              cursor: "pointer",
            }}
          >
            Tekrar dene
          </button>
        </main>
      </body>
    </html>
  );
}

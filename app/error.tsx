"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/report-client-error";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportClientError({
      title: "Sayfa hatası",
      message: error.message || "Bilinmeyen sayfa hatası",
      path: typeof window !== "undefined" ? window.location.pathname : undefined,
      source: "app/error",
      extra: {
        digest: error.digest,
        name: error.name,
      },
    });
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#fff8f1] px-4 text-center">
      <h1 className="text-3xl font-black text-[#1f2937]">Bir şeyler ters gitti</h1>
      <p className="mt-2 max-w-md font-bold text-[#6b7280]">
        {error.message || "Beklenmeyen bir sayfa hatası oluştu."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-full bg-[#fd860a] px-6 py-3 text-sm font-black text-white shadow-[0_4px_0_#d66f08]"
      >
        Tekrar dene
      </button>
    </main>
  );
}

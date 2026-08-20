"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AuthShell } from "@/app/components/AuthShell";
import { reportClientError } from "@/lib/report-client-error";

function friendlyMessage(raw: string) {
  const lower = raw.toLowerCase();
  if (lower.includes("user profile from external provider")) {
    return "Sağlayıcı hesabından profil alınamadı. Genelde Google/Discord Client ID-Secret veya Redirect URL ayarı yanlıştır.";
  }
  if (lower.includes("access_denied")) {
    return "Giriş iptal edildi veya izin verilmedi.";
  }
  return raw || "Giriş tamamlanamadı. Lütfen tekrar dene.";
}

function ErrorContent() {
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Giriş tamamlanamadı. Lütfen tekrar dene.");
  const [rawMessage, setRawMessage] = useState("");

  useEffect(() => {
    const fromQuery = searchParams.get("message") || searchParams.get("error_description");
    const hash = typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "";
    const hashParams = new URLSearchParams(hash);
    const fromHash = hashParams.get("error_description") || hashParams.get("error");
    const raw = fromQuery || fromHash || "";
    setRawMessage(raw);
    setMessage(friendlyMessage(raw));

    if (raw) {
      reportClientError({
        title: "Giriş hatası",
        message: raw,
        path: "/auth/error",
        source: "auth/error",
        extra: {
          error: searchParams.get("error") || hashParams.get("error") || undefined,
          error_code:
            searchParams.get("error_code") || hashParams.get("error_code") || undefined,
          href: typeof window !== "undefined" ? window.location.href.slice(0, 500) : undefined,
        },
      });
    }
  }, [searchParams]);

  return (
    <AuthShell title="Giriş başarısız" subtitle={message} tone="error">
      <div className="mt-6 rounded-2xl bg-[#fff4e8] px-4 py-3 text-left text-xs font-bold leading-relaxed text-[#6b7280]">
        Kontrol et:
        <ul className="mt-2 list-disc space-y-1 pl-4">
          <li>Supabase → Authentication → Providers (Client ID / Secret)</li>
          <li>
            Provider console Redirect URI:{" "}
            <code className="break-all text-[#c45f00]">
              https://PROJECT_REF.supabase.co/auth/v1/callback
            </code>
          </li>
          <li>
            Supabase Redirect URLs:{" "}
            <code className="break-all text-[#c45f00]">
              https://mimo-olive.vercel.app/auth/callback
            </code>
          </li>
        </ul>
        {rawMessage && (
          <p className="mt-3 break-all text-[11px] text-[#9ca3af]">Ham hata: {rawMessage}</p>
        )}
      </div>
      <div className="mt-8 flex flex-col gap-3">
        <Link
          href="/login"
          className="inline-flex items-center justify-center rounded-full bg-[#fd860a] px-6 py-3 text-sm font-black text-white shadow-[0_4px_0_#d66f08]"
        >
          Tekrar dene
        </Link>
        <Link href="/onboarding" className="text-sm font-extrabold text-[#6b7280]">
          Tanışmaya dön
        </Link>
      </div>
    </AuthShell>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={<AuthShell title="Giriş başarısız" subtitle="Yükleniyor..." tone="error" />}
    >
      <ErrorContent />
    </Suspense>
  );
}

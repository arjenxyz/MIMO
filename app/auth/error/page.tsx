"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AuthShell } from "@/app/components/AuthShell";

function ErrorContent() {
  const searchParams = useSearchParams();
  const message =
    searchParams.get("message") || "Giriş tamamlanamadı. Lütfen tekrar dene.";

  return (
    <AuthShell title="Giriş başarısız" subtitle={message} tone="error">
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

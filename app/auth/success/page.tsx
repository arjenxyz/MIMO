"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AuthShell } from "@/app/components/AuthShell";

export default function AuthSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      router.replace("/");
      router.refresh();
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [router]);

  return (
    <AuthShell
      title="Giriş başarılı!"
      subtitle="Hoş geldin. Seni panele götürüyoruz..."
      tone="success"
    >
      <div className="mt-8">
        <Link
          href="/"
          className="inline-flex rounded-full bg-[#fd860a] px-6 py-3 text-sm font-black text-white shadow-[0_4px_0_#d66f08]"
        >
          Panele git
        </Link>
      </div>
    </AuthShell>
  );
}

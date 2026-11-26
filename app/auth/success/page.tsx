"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AuthShell } from "@/app/components/AuthShell";
import { clearClientCaches, hardNavigate } from "@/lib/clearClientCaches";

export default function AuthSuccessPage() {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void clearClientCaches().finally(() => hardNavigate("/"));
    }, 1200);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <AuthShell
      title="Giriş başarılı!"
      subtitle="Hoş geldin. Seni panele götürüyoruz..."
      tone="success"
    >
      <div className="mt-8">
        <Link
          href="/"
          onClick={(e) => {
            e.preventDefault();
            void clearClientCaches().finally(() => hardNavigate("/"));
          }}
          className="inline-flex rounded-full bg-[#fd860a] px-6 py-3 text-sm font-black text-white shadow-[0_4px_0_#d66f08]"
        >
          Panele git
        </Link>
      </div>
    </AuthShell>
  );
}

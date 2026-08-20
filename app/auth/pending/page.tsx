"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AuthShell } from "@/app/components/AuthShell";
import { createClient } from "@/lib/supabase/client";

type Provider = "google" | "discord" | "spotify" | "github";

const LABELS: Record<Provider, string> = {
  google: "Google",
  discord: "Discord",
  spotify: "Spotify",
  github: "GitHub",
};

function PendingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const provider = (searchParams.get("provider") || "google") as Provider;
  const [message, setMessage] = useState("Giriş başlatılıyor...");

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        if (!LABELS[provider]) {
          router.replace("/auth/error?message=" + encodeURIComponent("Geçersiz giriş yöntemi."));
          return;
        }

        setMessage(`${LABELS[provider]} hesabına yönlendiriliyorsun...`);
        const supabase = createClient();
        const origin = window.location.origin;
        const scopes =
          provider === "google"
            ? "openid email profile"
            : provider === "discord"
              ? "identify email"
              : provider === "github"
                ? "read:user user:email"
                : undefined;

        const { data, error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: `${origin}/auth/callback`,
            skipBrowserRedirect: true,
            ...(scopes ? { scopes } : {}),
          },
        });

        if (cancelled) return;

        if (error || !data.url) {
          router.replace(
            `/auth/error?message=${encodeURIComponent(error?.message || "Giriş başlatılamadı.")}`
          );
          return;
        }

        window.location.assign(data.url);
      } catch (err) {
        if (cancelled) return;
        router.replace(
          `/auth/error?message=${encodeURIComponent(
            err instanceof Error ? err.message : "Beklenmeyen bir hata oluştu."
          )}`
        );
      }
    }

    start();
    return () => {
      cancelled = true;
    };
  }, [provider, router]);

  return <AuthShell title="Bir saniye..." subtitle={message} tone="pending" />;
}

export default function AuthPendingPage() {
  return (
    <Suspense fallback={<AuthShell title="Bir saniye..." subtitle="Hazırlanıyor..." tone="pending" />}>
      <PendingContent />
    </Suspense>
  );
}

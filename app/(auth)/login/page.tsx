"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ContinueButton } from "@/app/components/ContinueButton";
import { Mascot } from "@/app/components/Mascot";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError(signInError.message);
        return;
      }
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Giriş yapılamadı.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-duo-bg px-4 py-10">
      <Mascot mood="happy" className="mb-2 scale-75" />
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md space-y-4 rounded-3xl border-2 border-duo-border bg-duo-card p-6 shadow-xl"
      >
        <h1 className="text-center text-3xl font-black">Giriş Yap</h1>
        <p className="text-center text-sm font-semibold text-duo-muted">
          Seriye kaldığın yerden devam et.
        </p>
        <label className="block text-sm font-bold text-duo-muted">
          E-posta
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-2xl border-2 border-duo-border bg-duo-bg px-4 py-3 text-white outline-none focus:border-duo-green"
          />
        </label>
        <label className="block text-sm font-bold text-duo-muted">
          Şifre
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-2xl border-2 border-duo-border bg-duo-bg px-4 py-3 text-white outline-none focus:border-duo-green"
          />
        </label>
        {error && <p className="text-sm font-bold text-red-400">{error}</p>}
        <ContinueButton type="submit" disabled={loading}>
          {loading ? "Giriş yapılıyor..." : "GİRİŞ YAP"}
        </ContinueButton>
        <p className="text-center text-sm font-semibold text-duo-muted">
          Hesabın yok mu?{" "}
          <Link href="/register" className="text-duo-blue">
            Kayıt ol
          </Link>
        </p>
      </form>
    </main>
  );
}

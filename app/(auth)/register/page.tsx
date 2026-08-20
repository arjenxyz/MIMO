"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ContinueButton } from "@/app/components/ContinueButton";
import { Mascot } from "@/app/components/Mascot";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      const supabase = createClient();
      const origin = window.location.origin;
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username },
          emailRedirectTo: `${origin}/auth/callback`,
        },
      });
      if (signUpError) {
        setError(signUpError.message);
        return;
      }
      if (data.session) {
        router.replace("/");
        router.refresh();
        return;
      }
      setInfo("Kayıt başarılı! E-postandaki doğrulama bağlantısını kontrol et.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt olunamadı.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-duo-bg px-4 py-10">
      <Mascot mood="wave" className="mb-2 scale-75" />
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md space-y-4 rounded-3xl border-2 border-duo-border bg-duo-card p-6 shadow-xl"
      >
        <h1 className="text-center text-3xl font-black">Kayıt Ol</h1>
        <p className="text-center text-sm font-semibold text-duo-muted">
          MIMO ile her gün seviye atla.
        </p>
        <label className="block text-sm font-bold text-duo-muted">
          Kullanıcı adı
          <input
            type="text"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="mt-1 w-full rounded-2xl border-2 border-duo-border bg-duo-bg px-4 py-3 text-white outline-none focus:border-duo-green"
          />
        </label>
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
        {info && <p className="text-sm font-bold text-duo-green">{info}</p>}
        <ContinueButton type="submit" disabled={loading}>
          {loading ? "Kaydediliyor..." : "KAYIT OL"}
        </ContinueButton>
        <p className="text-center text-sm font-semibold text-duo-muted">
          Zaten hesabın var mı?{" "}
          <Link href="/login" className="text-duo-blue">
            Giriş yap
          </Link>
        </p>
      </form>
    </main>
  );
}

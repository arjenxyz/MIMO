"use client";

import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ProfileSetupPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [age, setAge] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [returningUser, setReturningUser] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || cancelled) return;

        const { data } = await supabase
          .from("profiles")
          .select("display_name, username, age")
          .eq("id", user.id)
          .maybeSingle();

        if (cancelled) return;

        const meta = user.user_metadata ?? {};
        const oauthName =
          (typeof meta.full_name === "string" && meta.full_name) ||
          (typeof meta.name === "string" && meta.name) ||
          "";

        const existingName = data?.display_name?.trim() || oauthName.trim();
        const existingUsername = data?.username?.trim() || "";
        const existingAge =
          typeof data?.age === "number" && Number.isFinite(data.age) ? String(data.age) : "";

        if (existingName) setDisplayName(existingName);
        if (existingUsername) {
          // Prefill only if it already looks like a valid handle; otherwise let them choose.
          const cleaned = existingUsername.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20);
          setUsername(cleaned);
        }
        if (existingAge) setAge(existingAge);

        setReturningUser(Boolean(data?.username || data?.display_name || data?.age));
      } catch {
        // Prefill is optional — form still works empty.
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/profile/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          username,
          age: Number(age),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Kayıt tamamlanamadı");
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt tamamlanamadı");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-mimo-bg text-mimo-fg">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(253,134,10,0.18),_transparent_52%),radial-gradient(ellipse_at_bottom,_rgba(28,176,246,0.1),_transparent_48%)]"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
        <div className="text-center">
          <Image
            src="/mimo-avatar.png"
            alt="MIMO"
            width={80}
            height={80}
            className="mx-auto h-20 w-20 rounded-full object-cover ring-4 ring-[#fd860a]/30"
            priority
          />
          <h1 className="mt-4 text-3xl font-black tracking-tight text-mimo-title">
            Seni tanıyalım
          </h1>
          <p className="mt-1.5 text-sm font-semibold text-mimo-muted">
            {returningUser
              ? "Profilini tamamlamak için isim, yaş ve kullanıcı adını gir."
              : "İlk girişte isim, yaş ve kullanıcı adını belirle."}
          </p>
        </div>

        <form
          onSubmit={(e) => void onSubmit(e)}
          className="mt-8 space-y-3 rounded-3xl border border-mimo-border bg-mimo-card p-5 shadow-[0_8px_0_rgba(15,23,42,0.06)] dark:shadow-[0_8px_0_rgba(0,0,0,0.35)]"
        >
          {loading ? (
            <p className="py-6 text-center text-sm font-bold text-mimo-muted">Yükleniyor…</p>
          ) : (
            <>
              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-mimo-muted">
                  İsim
                </span>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  autoComplete="name"
                  required
                  maxLength={40}
                  placeholder="Örn. Ayşe"
                  className="mt-1.5 w-full rounded-xl border border-mimo-soft bg-mimo-surface px-3 py-2.5 text-sm font-bold text-mimo-fg outline-none focus:border-[#fd860a]"
                />
              </label>

              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-mimo-muted">
                  Yaş
                </span>
                <input
                  value={age}
                  onChange={(e) => setAge(e.target.value.replace(/[^\d]/g, "").slice(0, 3))}
                  inputMode="numeric"
                  required
                  placeholder="Örn. 16"
                  className="mt-1.5 w-full rounded-xl border border-mimo-soft bg-mimo-surface px-3 py-2.5 text-sm font-bold text-mimo-fg outline-none focus:border-[#fd860a]"
                />
              </label>

              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-mimo-muted">
                  Kullanıcı adı
                </span>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
                  autoComplete="username"
                  required
                  maxLength={20}
                  placeholder="örn. ayse_yilmaz"
                  className="mt-1.5 w-full rounded-xl border border-mimo-soft bg-mimo-surface px-3 py-2.5 text-sm font-bold text-mimo-fg outline-none focus:border-[#fd860a]"
                />
                <span className="mt-1 block text-[11px] font-semibold text-mimo-muted">
                  3–20 karakter · harf, rakam ve _
                </span>
              </label>

              {error && (
                <p className="rounded-xl border border-[#fecaca] bg-[#ffe8e8] px-3 py-2 text-sm font-bold text-[#b91c1c]">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={saving}
                className="mt-2 w-full rounded-2xl bg-[#fd860a] py-3.5 text-sm font-black uppercase tracking-wide text-[#2a1600] shadow-[0_4px_0_#c2410c] transition active:translate-y-0.5 active:shadow-[0_2px_0_#c2410c] disabled:opacity-50"
              >
                {saving ? "Kaydediliyor…" : "Devam et"}
              </button>
            </>
          )}
        </form>
      </div>
    </main>
  );
}

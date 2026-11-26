"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type StatusPayload = {
  ok: boolean;
  heartbeat?: {
    lastPingAt: string;
    lastOk: boolean;
  } | null;
  error?: string;
};

function formatWhen(iso: string) {
  try {
    return new Intl.DateTimeFormat("tr-TR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function StatusPage() {
  const [data, setData] = useState<StatusPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/status", { cache: "no-store" });
      const json = (await res.json()) as StatusPayload;
      setData(json);
    } catch {
      setData({ ok: false, error: "Kontrol edilemedi" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const success = Boolean(data?.ok && data.heartbeat?.lastOk);

  return (
    <main className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-mimo-bg px-4 py-12 text-mimo-fg">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(28,176,246,0.14),_transparent_55%),radial-gradient(ellipse_at_bottom,_rgba(253,134,10,0.1),_transparent_50%)]"
      />

      <div className="relative z-10 w-full max-w-sm text-center">
        <Image
          src="/mimo-avatar.png"
          alt="MIMO"
          width={88}
          height={88}
          className="mx-auto h-20 w-20 rounded-full object-cover ring-4 ring-[#fd860a]/25"
        />

        <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-[#1cb0f6]">
          Sistem durumu
        </p>

        {loading ? (
          <h1 className="mt-3 text-3xl font-black text-mimo-title">Kontrol…</h1>
        ) : success ? (
          <>
            <h1 className="mt-3 text-4xl font-black text-[#58cc02]">Başarılı</h1>
            {data?.heartbeat?.lastPingAt && (
              <p className="mt-2 text-sm font-semibold text-mimo-muted">
                {formatWhen(data.heartbeat.lastPingAt)}
              </p>
            )}
          </>
        ) : (
          <>
            <h1 className="mt-3 text-4xl font-black text-[#ff4b4b]">Başarısız</h1>
            <p className="mt-2 text-sm font-semibold text-mimo-muted">
              {data?.error || "Nabız kaydı yok"}
            </p>
          </>
        )}

        <div className="mt-8 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-2xl bg-[#1cb0f6] px-6 py-3 text-sm font-black uppercase tracking-wide text-white shadow-[0_3px_0_#1899d6] transition active:translate-y-0.5 active:shadow-none"
          >
            Yenile
          </button>
          <Link
            href="/"
            className="rounded-2xl border border-mimo-soft px-6 py-3 text-sm font-bold text-mimo-muted"
          >
            Ana sayfa
          </Link>
        </div>
      </div>
    </main>
  );
}

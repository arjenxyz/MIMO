"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Heartbeat = {
  lastPingAt: string;
  lastOk: boolean;
  pingLatencyMs: number | null;
  source: string;
};

type StatusPayload = {
  ok: boolean;
  configured?: boolean;
  latencyMs?: number;
  heartbeat?: Heartbeat | null;
  error?: string;
  hint?: string;
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
      setData({ ok: false, error: "Durum alınamadı" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const hb = data?.heartbeat;
  const healthy = Boolean(data?.ok && hb?.lastOk);

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-mimo-bg px-4 pb-12 pt-8 text-mimo-fg">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(28,176,246,0.14),_transparent_55%),radial-gradient(ellipse_at_bottom,_rgba(253,134,10,0.1),_transparent_50%)]"
      />

      <div className="relative z-10 mx-auto max-w-lg">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/mimo-avatar.png"
              alt="MIMO"
              width={40}
              height={40}
              className="h-10 w-10 rounded-full object-cover ring-2 ring-[#fd860a]/30"
            />
            <span className="text-lg font-black text-mimo-title">MIMO</span>
          </Link>
          <Link
            href="/"
            className="rounded-full px-3 py-1.5 text-sm font-bold text-mimo-muted transition hover:bg-mimo-surface hover:text-mimo-fg"
          >
            Ana sayfa
          </Link>
        </div>

        <section className="rounded-[1.75rem] border border-mimo-border bg-mimo-card/95 p-6 shadow-sm backdrop-blur sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#1cb0f6]">
            Sistem durumu
          </p>
          <h1 className="mt-2 text-2xl font-black text-mimo-title sm:text-3xl">
            Keep-alive nabız
          </h1>
          <p className="mt-3 text-sm font-semibold leading-relaxed text-mimo-muted">
            cron-job.org üzerinden günlük istek, kimse siteye girmese bile Supabase
            projesine hafif bir ping atarak ücretsiz planın uykuya geçmesini engeller.
            Endpoint <span className="font-black text-mimo-fg">CRON_SECRET</span> ile korunur.
          </p>

          <div
            className={`mt-6 rounded-2xl border px-4 py-4 ${
              loading
                ? "border-mimo-soft bg-mimo-surface"
                : healthy
                  ? "border-[#bbf7d0] bg-[#ecfce5] dark:border-[#166534] dark:bg-[#052e16]"
                  : "border-[#fed7aa] bg-[#fff7ed] dark:border-[#9a3412] dark:bg-[#431407]"
            }`}
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-mimo-muted">
              Son nabız
            </p>
            {loading ? (
              <p className="mt-2 text-lg font-black text-mimo-title">Kontrol ediliyor…</p>
            ) : hb ? (
              <>
                <p className="mt-1 text-xl font-black text-mimo-title">
                  {hb.lastOk ? "Supabase ayakta" : "Son ping başarısız"}
                </p>
                <p className="mt-2 text-sm font-semibold text-mimo-muted">
                  {formatWhen(hb.lastPingAt)}
                  {typeof hb.pingLatencyMs === "number" ? ` · ${hb.pingLatencyMs} ms` : ""}
                  {hb.source ? ` · ${hb.source}` : ""}
                </p>
              </>
            ) : (
              <>
                <p className="mt-1 text-xl font-black text-mimo-title">Henüz kayıt yok</p>
                <p className="mt-2 text-sm font-semibold text-mimo-muted">
                  {data?.hint ||
                    data?.error ||
                    "İlk cron çalışınca veya schema-keepalive.sql uygulanınca görünür."}
                </p>
              </>
            )}
          </div>

          <ul className="mt-6 space-y-2 text-left text-sm font-semibold text-mimo-muted">
            <li className="rounded-xl bg-mimo-surface px-3 py-2">
              Servis: <span className="text-mimo-fg">cron-job.org</span> · günde 1 kez
            </li>
            <li className="rounded-xl bg-mimo-surface px-3 py-2">
              URL:{" "}
              <code className="break-all text-xs text-[#1cb0f6]">
                https://SENIN-DOMAIN/api/cron/keepalive
              </code>
            </li>
            <li className="rounded-xl bg-mimo-surface px-3 py-2">
              Header:{" "}
              <code className="break-all text-xs text-[#1cb0f6]">
                Authorization: Bearer CRON_SECRET
              </code>
            </li>
            <li className="rounded-xl bg-mimo-surface px-3 py-2">
              SQL: <code className="text-xs text-[#1cb0f6]">schema-keepalive.sql</code>
            </li>
          </ul>

          <div className="mt-6 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-2xl bg-[#1cb0f6] px-6 py-3 text-sm font-black uppercase tracking-wide text-white shadow-[0_3px_0_#1899d6] transition active:translate-y-0.5 active:shadow-none"
            >
              Yenile
            </button>
            <Link
              href="/"
              className="rounded-2xl border border-mimo-soft px-6 py-3 text-center text-sm font-bold text-mimo-muted"
            >
              Ana sayfaya dön
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

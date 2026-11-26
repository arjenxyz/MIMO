import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Public status snapshot for /status page (read-only). */
export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return NextResponse.json({
      ok: false,
      configured: false,
      error: "Supabase env eksik",
    });
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const started = Date.now();
  try {
    const { data, error } = await supabase
      .from("system_heartbeat")
      .select("last_ping_at, last_ok, latency_ms, source")
      .eq("id", 1)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      configured: true,
      latencyMs: Date.now() - started,
      heartbeat: data
        ? {
            lastPingAt: data.last_ping_at as string,
            lastOk: Boolean(data.last_ok),
            pingLatencyMs: data.latency_ms as number | null,
            source: (data.source as string | null) || "unknown",
          }
        : null,
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      configured: true,
      error: error instanceof Error ? error.message : "Durum okunamadı",
      hint: "schema-keepalive.sql dosyasını Supabase SQL editor'de çalıştır.",
    });
  }
}

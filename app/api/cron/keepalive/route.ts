import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
}

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") || "";
  return header === `Bearer ${secret}`;
}

/**
 * Vercel Cron keep-alive — pings Supabase so the free project stays awake.
 * Auth: Authorization: Bearer <CRON_SECRET>
 * Schedule: vercel.json → daily 05:00 UTC
 */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) return unauthorized();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { ok: false, error: "Supabase service env eksik" },
      { status: 500 }
    );
  }

  const started = Date.now();
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    // Lightweight round-trip against a real table.
    const { error: pingError } = await supabase.from("profiles").select("id").limit(1);
    if (pingError) throw pingError;

    const latencyMs = Date.now() - started;
    const { error: upsertError } = await supabase.from("system_heartbeat").upsert({
      id: 1,
      last_ping_at: new Date().toISOString(),
      last_ok: true,
      latency_ms: latencyMs,
      source: "cron",
    });

    // Heartbeat table may not exist yet — ping still woke the project.
    if (upsertError) {
      return NextResponse.json({
        ok: true,
        woke: true,
        latencyMs,
        heartbeatSaved: false,
        warning: upsertError.message,
        at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      ok: true,
      woke: true,
      latencyMs,
      heartbeatSaved: true,
      at: new Date().toISOString(),
    });
  } catch (error) {
    const latencyMs = Date.now() - started;
    const message = error instanceof Error ? error.message : "Keep-alive failed";

    await supabase
      .from("system_heartbeat")
      .upsert({
        id: 1,
        last_ping_at: new Date().toISOString(),
        last_ok: false,
        latency_ms: latencyMs,
        source: "cron",
      })
      .then(() => undefined)
      .catch(() => undefined);

    return NextResponse.json(
      { ok: false, error: message, latencyMs, at: new Date().toISOString() },
      { status: 500 }
    );
  }
}

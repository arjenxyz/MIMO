import { NextResponse } from "next/server";
import { sendDiscordAlert } from "@/lib/discord";

const recent = new Map<string, number>();
const DEDUPE_MS = 60_000;

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      title?: string;
      message?: string;
      path?: string;
      source?: string;
      extra?: Record<string, string | undefined>;
    };

    const title = (payload.title || "MIMO Error").slice(0, 200);
    const message = (payload.message || "Bilinmeyen hata").slice(0, 3500);
    const path = payload.path?.slice(0, 300);
    const source = payload.source?.slice(0, 100) || "client";

    const key = `${source}|${path}|${message}`;
    const now = Date.now();
    const last = recent.get(key);
    if (last && now - last < DEDUPE_MS) {
      return NextResponse.json({ ok: true, deduped: true });
    }
    recent.set(key, now);

    const sent = await sendDiscordAlert({
      title,
      message,
      path,
      source,
      extra: payload.extra,
    });

    return NextResponse.json({ ok: sent });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "report failed",
      },
      { status: 500 }
    );
  }
}

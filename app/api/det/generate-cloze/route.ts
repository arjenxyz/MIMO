import { NextRequest, NextResponse } from "next/server";
import { generateClozeSession } from "@/lib/detGenerate";
import { clientKeyFromRequest, consumeRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY eksik. Vercel env / .env.local kontrol et." },
        { status: 500 }
      );
    }

    const clientKey = clientKeyFromRequest(request);

    const burst = consumeRateLimit(`det-cloze-burst:${clientKey}`, {
      max: 1,
      windowMs: 25_000,
    });
    if (!burst.ok) {
      return NextResponse.json(
        { error: `Çok hızlı. ${burst.retryAfterSec} sn sonra yeni pasaj iste.` },
        { status: 429 }
      );
    }

    const daily = consumeRateLimit(`det-cloze-day:${clientKey}`, {
      max: 30,
      windowMs: 24 * 60 * 60 * 1000,
    });
    if (!daily.ok) {
      return NextResponse.json(
        { error: "Günlük pasaj üretim limiti doldu. Yarın tekrar dene." },
        { status: 429 }
      );
    }

    let avoidTopics: string[] = [];
    let count = 4;
    try {
      const body = (await request.json()) as {
        avoidTopics?: unknown;
        count?: unknown;
      };
      if (Array.isArray(body.avoidTopics)) {
        avoidTopics = body.avoidTopics
          .filter((t): t is string => typeof t === "string")
          .map((t) => t.trim())
          .filter(Boolean)
          .slice(0, 12);
      }
      if (typeof body.count === "number" && Number.isFinite(body.count)) {
        count = Math.min(5, Math.max(3, Math.round(body.count)));
      }
    } catch {
      // empty body ok
    }

    const exercises = await generateClozeSession({ count, avoidTopics });
    return NextResponse.json({
      exercises,
      source: "gemini",
    });
  } catch (error) {
    const raw = error instanceof Error ? error.message : "Pasaj üretilemedi";
    const message = /429|quota|rate.?limit|too many requests/i.test(raw)
      ? "Gemini kotası dolu. Biraz sonra tekrar dene; şimdilik yedek pasajlar kullanılacak."
      : raw;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

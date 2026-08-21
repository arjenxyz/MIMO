import { NextRequest, NextResponse } from "next/server";
import { getCurriculumTopic } from "@/lib/grammarCurriculum";
import { generateGrammarQuestionsForTopic } from "@/lib/grammarGenerate";
import { clientKeyFromRequest, consumeRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as {
      slug?: unknown;
      count?: unknown;
      forceAi?: unknown;
    } | null;

    const slug = typeof body?.slug === "string" ? body.slug.trim() : "";
    if (!slug) {
      return NextResponse.json({ error: "slug gerekli" }, { status: 400 });
    }

    const topic = getCurriculumTopic(slug);
    if (!topic) {
      return NextResponse.json({ error: "Konu bulunamadı" }, { status: 404 });
    }

    const forceAi = body?.forceAi === true;

    const clientKey = clientKeyFromRequest(request);
    const burst = consumeRateLimit(`grammar-gen:${clientKey}:${slug}`, {
      max: forceAi ? 2 : 8,
      windowMs: 20_000,
    });
    if (!burst.ok) {
      return NextResponse.json(
        { error: `Çok hızlı istek. ${burst.retryAfterSec} sn sonra tekrar dene.` },
        { status: 429 }
      );
    }

    if (forceAi) {
      const hourly = consumeRateLimit(`grammar-gen-ai-hour:${clientKey}`, {
        max: 20,
        windowMs: 60 * 60 * 1000,
      });
      if (!hourly.ok) {
        return NextResponse.json(
          { error: `AI saatlik limit. ${hourly.retryAfterSec} sn sonra tekrar dene.` },
          { status: 429 }
        );
      }
    }

    const count =
      typeof body?.count === "number" && Number.isFinite(body.count)
        ? Math.min(12, Math.max(6, Math.round(body.count)))
        : 10;

    const { items, source } = await generateGrammarQuestionsForTopic(topic, count, {
      forceAi,
    });

    return NextResponse.json({
      slug: topic.slug,
      title: topic.title,
      source,
      items,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Soru üretilemedi";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

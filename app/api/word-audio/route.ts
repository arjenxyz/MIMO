import { NextRequest, NextResponse } from "next/server";
import {
  buildTrustedEnglishTtsUrls,
  isTrustedEnglishAudioUrl,
  normalizeEnglishText,
} from "@/lib/englishTts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Server-side English TTS/dictionary proxy.
 * Only trusted English providers are fetched (Google en-US/en + vetted dictionary URLs).
 */
export async function GET(request: NextRequest) {
  const word = normalizeEnglishText(request.nextUrl.searchParams.get("q") || "");
  const direct = (request.nextUrl.searchParams.get("url") || "").trim();

  if (!word && !direct) {
    return NextResponse.json({ error: "Missing q or url" }, { status: 400 });
  }

  const candidates: string[] = [];
  if (direct && isTrustedEnglishAudioUrl(direct)) {
    candidates.push(direct);
  }
  if (word) {
    candidates.push(...buildTrustedEnglishTtsUrls(word));
  }

  // Deduplicate while preserving order
  const seen = new Set<string>();
  const unique = candidates.filter((url) => {
    if (seen.has(url)) return false;
    seen.add(url);
    return true;
  });

  for (const url of unique) {
    try {
      const res = await fetch(url, {
        headers: {
          Accept: "audio/*,*/*",
          "User-Agent": "MIMO-english-tts/1.0",
        },
        cache: "force-cache",
      });
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.byteLength < 64) continue;

      const contentType = res.headers.get("content-type") || "audio/mpeg";
      return new NextResponse(buf, {
        status: 200,
        headers: {
          "Content-Type": contentType.includes("audio") ? contentType : "audio/mpeg",
          "Cache-Control": "public, max-age=604800, immutable",
          "X-MIMO-TTS-Source": new URL(url).hostname,
        },
      });
    } catch {
      // try next trusted provider
    }
  }

  return NextResponse.json(
    { error: "No trusted English audio source available" },
    { status: 502 }
  );
}

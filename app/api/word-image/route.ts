import { NextRequest, NextResponse } from "next/server";
import { findWordImageCandidates, findWordImageUrl } from "@/lib/wordImage";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  if (!q.trim() || q.length > 60) {
    return NextResponse.json({ error: "Geçersiz kelime" }, { status: 400 });
  }

  const excludeRaw = request.nextUrl.searchParams.get("exclude") ?? "";
  const exclude = excludeRaw
    .split("|")
    .map((u) => u.trim())
    .filter(Boolean)
    .slice(0, 24);

  const wantPool = request.nextUrl.searchParams.get("pool") === "1";

  try {
    if (wantPool || exclude.length > 0) {
      const candidates = await findWordImageCandidates(q, {
        exclude,
        limit: 8,
      });
      return NextResponse.json({
        image_url: candidates[0] ?? null,
        candidates,
        placeholder: candidates.length === 0,
      });
    }

    const image_url = await findWordImageUrl(q);
    return NextResponse.json({
      image_url,
      candidates: image_url ? [image_url] : [],
      placeholder: !image_url,
    });
  } catch {
    return NextResponse.json({ image_url: null, candidates: [], placeholder: true });
  }
}

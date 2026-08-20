import { NextRequest, NextResponse } from "next/server";
import { findWordImageUrl } from "@/lib/wordImage";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  if (!q.trim() || q.length > 60) {
    return NextResponse.json({ error: "Geçersiz kelime" }, { status: 400 });
  }

  try {
    const image_url = await findWordImageUrl(q);
    return NextResponse.json({ image_url });
  } catch {
    return NextResponse.json({ image_url: null });
  }
}

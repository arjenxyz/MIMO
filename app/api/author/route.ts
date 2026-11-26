import { NextRequest, NextResponse } from "next/server";
import { getAuthorLegacy, upsertAuthorLegacy } from "@/lib/authorLegacy";
import { getUnlock } from "@/lib/packUnlock";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null as null };
  return { supabase, user };
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await requireUser();
    if (!user) {
      return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
    }

    const authorId =
      request.nextUrl.searchParams.get("authorId")?.trim() || user.id;

    if (authorId !== user.id) {
      const unlock = await getUnlock(supabase, user.id, authorId);
      if (!unlock) {
        return NextResponse.json(
          { error: "Anıyı görmek için paket sınavını geçmen gerekir.", locked: true },
          { status: 403 }
        );
      }
    }

    const legacy = await getAuthorLegacy(supabase, authorId);
    return NextResponse.json({ legacy, authorId, isOwner: authorId === user.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Anı alınamadı";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireUser();
    if (!user) {
      return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
    }

    const body = (await request.json()) as {
      title?: string;
      body?: string;
      period_label?: string | null;
    };

    if (typeof body.body !== "string") {
      return NextResponse.json({ error: "body gerekli." }, { status: 400 });
    }

    const legacy = await upsertAuthorLegacy(supabase, user.id, {
      title: typeof body.title === "string" ? body.title : "Hazırlık anım",
      body: body.body,
      period_label: body.period_label ?? null,
    });

    return NextResponse.json({ ok: true, legacy });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Anı kaydedilemedi";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

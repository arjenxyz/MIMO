import { NextRequest, NextResponse } from "next/server";
import {
  listMessageThreads,
  listThreadMessages,
  sendDirectMessage,
} from "@/lib/messages";
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

    const withId = request.nextUrl.searchParams.get("with")?.trim();
    if (withId) {
      const messages = await listThreadMessages(supabase, user.id, withId);
      const { data: other } = await supabase
        .from("profiles")
        .select("id, username")
        .eq("id", withId)
        .maybeSingle();
      return NextResponse.json({
        messages,
        me: user.id,
        other: other
          ? { id: other.id, username: other.username || "öğrenci" }
          : { id: withId, username: "öğrenci" },
      });
    }

    const threads = await listMessageThreads(supabase, user.id);
    return NextResponse.json({ threads, me: user.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Mesajlar alınamadı";
    const missing = /direct_messages|author_pack_unlocks|schema cache|does not exist/i.test(
      message
    );
    return NextResponse.json(
      {
        error: missing
          ? "Mesaj tablosu henüz yok. Supabase’te schema-author-unlock-messages.sql çalıştır."
          : message,
      },
      { status: missing ? 503 : 400 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireUser();
    if (!user) {
      return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
    }

    const body = (await request.json()) as {
      recipientId?: string;
      body?: string;
    };

    if (!body.recipientId || typeof body.recipientId !== "string") {
      return NextResponse.json({ error: "recipientId gerekli." }, { status: 400 });
    }
    if (typeof body.body !== "string") {
      return NextResponse.json({ error: "body gerekli." }, { status: 400 });
    }

    const message = await sendDirectMessage(
      supabase,
      user.id,
      body.recipientId,
      body.body
    );
    return NextResponse.json({ ok: true, message });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Mesaj gönderilemedi";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

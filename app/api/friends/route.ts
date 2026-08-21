import { NextRequest, NextResponse } from "next/server";
import {
  cancelOrRemoveFriendship,
  listFriendships,
  respondToFriendRequest,
  searchProfiles,
  sendFriendRequest,
} from "@/lib/friends";
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

    const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
    if (q) {
      const results = await searchProfiles(supabase, user.id, q);
      return NextResponse.json({ results });
    }

    const lists = await listFriendships(supabase, user.id);
    return NextResponse.json(lists);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Arkadaş listesi alınamadı";
    const missingTable = /friendships|schema cache|does not exist/i.test(message);
    return NextResponse.json(
      {
        error: missingTable
          ? "Arkadaş tablosu henüz yok. Supabase’te schema-friends.sql dosyasını çalıştır."
          : message,
      },
      { status: missingTable ? 503 : 500 }
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
      action?: string;
      addresseeId?: string;
      friendshipId?: number;
    };

    const action = body.action ?? "request";

    if (action === "request") {
      if (!body.addresseeId || typeof body.addresseeId !== "string") {
        return NextResponse.json({ error: "addresseeId gerekli." }, { status: 400 });
      }
      await sendFriendRequest(supabase, user.id, body.addresseeId);
      return NextResponse.json({ ok: true });
    }

    if (action === "accept" || action === "reject") {
      const id = Number(body.friendshipId);
      if (!Number.isFinite(id)) {
        return NextResponse.json({ error: "friendshipId gerekli." }, { status: 400 });
      }
      await respondToFriendRequest(supabase, user.id, id, action);
      return NextResponse.json({ ok: true });
    }

    if (action === "cancel" || action === "remove") {
      const id = Number(body.friendshipId);
      if (!Number.isFinite(id)) {
        return NextResponse.json({ error: "friendshipId gerekli." }, { status: 400 });
      }
      await cancelOrRemoveFriendship(supabase, user.id, id);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Geçersiz işlem." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "İşlem başarısız";
    const missingTable = /friendships|schema cache|does not exist/i.test(message);
    return NextResponse.json(
      {
        error: missingTable
          ? "Arkadaş tablosu henüz yok. Supabase’te schema-friends.sql dosyasını çalıştır."
          : message,
      },
      { status: missingTable ? 503 : 400 }
    );
  }
}

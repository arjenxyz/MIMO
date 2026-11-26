import { NextRequest, NextResponse } from "next/server";
import { completeProfileSetup } from "@/lib/profileSetup";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
    }

    const body = (await request.json()) as {
      displayName?: unknown;
      username?: unknown;
      age?: unknown;
    };

    const displayName = typeof body.displayName === "string" ? body.displayName : "";
    const username = typeof body.username === "string" ? body.username : "";
    const age = typeof body.age === "number" ? body.age : Number(body.age);

    const profile = await completeProfileSetup(supabase, user.id, {
      displayName,
      username,
      age,
    });

    return NextResponse.json({ profile });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Kayıt tamamlanamadı";
    const missing =
      /display_name|profile_completed_at|column|schema cache|does not exist/i.test(message);
    return NextResponse.json(
      {
        error: missing
          ? "Profil alanları henüz yok. Supabase’te schema-profile-setup.sql dosyasını çalıştır."
          : message,
      },
      { status: missing ? 503 : 400 }
    );
  }
}

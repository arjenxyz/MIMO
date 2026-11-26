import { NextRequest, NextResponse } from "next/server";
import {
  acceptChallenge,
  applyChallengeScore,
  createChallenge,
  declineChallenge,
  finishChallenge,
  getChallenge,
  listChallengesForUser,
} from "@/lib/challenges";
import { createClient } from "@/lib/supabase/server";
import type { ChallengeModule } from "@/types";

export const dynamic = "force-dynamic";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null as null };
  return { supabase, user };
}

function missingTable(message: string) {
  return /challenges|schema cache|does not exist/i.test(message);
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await requireUser();
    if (!user) {
      return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
    }

    const idParam = request.nextUrl.searchParams.get("id");
    if (idParam) {
      const id = Number(idParam);
      if (!Number.isFinite(id)) {
        return NextResponse.json({ error: "Geçersiz id." }, { status: 400 });
      }
      const challenge = await getChallenge(supabase, id, user.id);
      return NextResponse.json({ challenge });
    }

    const lists = await listChallengesForUser(supabase, user.id);
    return NextResponse.json(lists);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Meydan okumalar alınamadı";
    return NextResponse.json(
      {
        error: missingTable(message)
          ? "Meydan okuma tablosu henüz yok. Supabase’te schema-challenges.sql dosyasını çalıştır."
          : message,
      },
      { status: missingTable(message) ? 503 : 500 }
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
      opponentId?: string;
      module?: ChallengeModule;
      challengeId?: number;
      delta?: number;
    };

    const action = body.action ?? "create";

    if (action === "create") {
      if (!body.opponentId || typeof body.opponentId !== "string") {
        return NextResponse.json({ error: "opponentId gerekli." }, { status: 400 });
      }
      if (body.module !== "match" && body.module !== "word_check") {
        return NextResponse.json({ error: "Geçersiz modül." }, { status: 400 });
      }
      const challenge = await createChallenge(
        supabase,
        user.id,
        body.opponentId,
        body.module
      );
      return NextResponse.json({ challenge });
    }

    const challengeId = Number(body.challengeId);
    if (!Number.isFinite(challengeId)) {
      return NextResponse.json({ error: "challengeId gerekli." }, { status: 400 });
    }

    if (action === "accept") {
      const challenge = await acceptChallenge(supabase, user.id, challengeId);
      return NextResponse.json({ challenge });
    }

    if (action === "decline" || action === "cancel") {
      const challenge = await declineChallenge(supabase, user.id, challengeId);
      return NextResponse.json({ challenge });
    }

    if (action === "score") {
      const delta = Number(body.delta);
      if (!Number.isFinite(delta) || ![-1, 0, 1].includes(delta)) {
        return NextResponse.json({ error: "delta 1 veya -1 olmalı." }, { status: 400 });
      }
      // Only award points on correct (+1). Misses do not subtract.
      const challenge = await applyChallengeScore(
        supabase,
        user.id,
        challengeId,
        delta > 0 ? 1 : 0
      );
      return NextResponse.json({ challenge });
    }

    if (action === "finish") {
      const challenge = await finishChallenge(supabase, user.id, challengeId);
      return NextResponse.json({ challenge });
    }

    return NextResponse.json({ error: "Bilinmeyen action." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "İşlem başarısız";
    return NextResponse.json(
      {
        error: missingTable(message)
          ? "Meydan okuma tablosu henüz yok. Supabase’te schema-challenges.sql dosyasını çalıştır."
          : message,
      },
      { status: missingTable(message) ? 503 : 500 }
    );
  }
}

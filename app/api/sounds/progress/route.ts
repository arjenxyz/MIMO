import { NextResponse } from "next/server";
import { recordSoundAnswer } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      soundId?: number;
      isCorrect?: boolean;
      completeSession?: boolean;
    };

    let mastery: number | undefined;
    if (typeof body.soundId === "number" && typeof body.isCorrect === "boolean") {
      const result = await recordSoundAnswer(supabase, user.id, body.soundId, body.isCorrect);
      mastery = result.mastery;
    }

    return NextResponse.json({
      ok: true,
      mastery,
      sessionComplete: Boolean(body.completeSession),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save progress" },
      { status: 500 }
    );
  }
}

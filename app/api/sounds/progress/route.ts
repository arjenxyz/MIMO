import { NextResponse } from "next/server";
import {
  awardSoundSessionXp,
  getProfile,
  recordSoundAnswer,
} from "@/lib/db";
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

    let xpAwarded = 0;
    let leveledUp = false;
    let profile = await getProfile(supabase, user.id);

    if (body.completeSession && profile) {
      const award = await awardSoundSessionXp(supabase, profile, 10);
      profile = award.profile;
      xpAwarded = 10;
      leveledUp = award.leveledUp;
    }

    return NextResponse.json({
      ok: true,
      mastery,
      xpAwarded,
      leveledUp,
      profile,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save progress" },
      { status: 500 }
    );
  }
}

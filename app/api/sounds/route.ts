import { NextResponse } from "next/server";
import { getSoundsWithProgress } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sounds = await getSoundsWithProgress(supabase, user.id);
    const vowels = sounds.filter((s) => s.category === "vowel");
    const consonants = sounds.filter((s) => s.category === "consonant");

    return NextResponse.json({
      vowels,
      consonants,
      sounds,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load sounds" },
      { status: 500 }
    );
  }
}

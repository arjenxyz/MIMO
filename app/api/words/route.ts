import { NextRequest, NextResponse } from "next/server";
import { addWordToUserList } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { lookupEnglishWord } from "@/lib/wordLookup";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      action?: "lookup" | "save";
      english?: string;
      turkish?: string;
      example_sentence?: string | null;
      phonetic?: string | null;
      audio_url?: string | null;
    };

    if (body.action === "lookup") {
      const result = await lookupEnglishWord(body.english ?? "");
      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ lookup: result });
    }

    if (body.action === "save") {
      if (!body.english?.trim() || !body.turkish?.trim()) {
        return NextResponse.json(
          { error: "İngilizce kelime ve Türkçe anlam gerekli." },
          { status: 400 }
        );
      }

      const saved = await addWordToUserList(supabase, user.id, {
        english: body.english,
        turkish: body.turkish,
        example_sentence: body.example_sentence ?? null,
        phonetic: body.phonetic ?? null,
        audio_url: body.audio_url ?? null,
      });

      return NextResponse.json({
        ok: true,
        alreadyHad: saved.alreadyHad,
        word: saved.word,
      });
    }

    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Kelime eklenemedi";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

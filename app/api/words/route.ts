import { NextRequest, NextResponse } from "next/server";
import { addWordToUserList, findExistingUserWord } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { lookupEnglishWord } from "@/lib/wordLookup";
import { normalizeEnglishKey } from "@/lib/wordNormalize";

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

      const existing = await findExistingUserWord(supabase, user.id, result.english);
      if (existing?.alreadyOwned) {
        return NextResponse.json({
          lookup: {
            ...result,
            english: existing.word.english,
            turkish: existing.word.turkish || result.turkish,
            phonetic: existing.word.phonetic ?? result.phonetic,
            audio_url: existing.word.audio_url ?? result.audio_url,
            example_sentence: existing.word.example_sentence ?? result.example_sentence,
          },
          alreadyOwned: true,
          message: `"${existing.word.english}" zaten listende — tekrar eklenmez.`,
        });
      }

      return NextResponse.json({
        lookup: result,
        alreadyOwned: false,
        inPool: Boolean(existing?.word),
      });
    }

    if (body.action === "save") {
      if (!body.english?.trim() || !body.turkish?.trim()) {
        return NextResponse.json(
          { error: "İngilizce kelime ve Türkçe anlam gerekli." },
          { status: 400 }
        );
      }

      const key = normalizeEnglishKey(body.english);
      const precheck = await findExistingUserWord(supabase, user.id, key);
      if (precheck?.alreadyOwned) {
        return NextResponse.json(
          {
            error: `"${precheck.word.english}" zaten listende. Aynı kelime tekrar eklenemez.`,
            alreadyHad: true,
            word: precheck.word,
          },
          { status: 409 }
        );
      }

      const saved = await addWordToUserList(supabase, user.id, {
        english: body.english,
        turkish: body.turkish,
        example_sentence: body.example_sentence ?? null,
        phonetic: body.phonetic ?? null,
        audio_url: body.audio_url ?? null,
      });

      if (saved.alreadyHad) {
        return NextResponse.json(
          {
            error: `"${saved.word.english}" zaten listende. Aynı kelime tekrar eklenemez.`,
            alreadyHad: true,
            word: saved.word,
          },
          { status: 409 }
        );
      }

      return NextResponse.json({
        ok: true,
        alreadyHad: false,
        word: saved.word,
      });
    }

    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Kelime eklenemedi";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import {
  addWordToUserList,
  findExistingUserWord,
  removeWordFromUserList,
  updateUserListWord,
} from "@/lib/db";
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
      action?: "lookup" | "save" | "update" | "delete";
      english?: string;
      turkish?: string;
      example_sentence?: string | null;
      phonetic?: string | null;
      audio_url?: string | null;
      difficulty?: number;
      userWordId?: number;
      is_global?: boolean;
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

      const difficulty =
        typeof body.difficulty === "number" &&
        body.difficulty >= 1 &&
        body.difficulty <= 5
          ? body.difficulty
          : undefined;

      const isGlobal = body.is_global !== false;
      const meta = user.user_metadata ?? {};
      const identity = user.identities?.[0]?.identity_data ?? {};
      const uploaderUsername =
        (typeof meta.full_name === "string" && meta.full_name) ||
        (typeof meta.name === "string" && meta.name) ||
        (typeof meta.user_name === "string" && meta.user_name) ||
        user.email?.split("@")[0] ||
        "Kullanıcı";
      const avatarCandidates = [
        meta.avatar_url,
        meta.picture,
        meta.avatar,
        identity.avatar_url,
        identity.picture,
      ];
      let uploaderAvatar: string | null = null;
      for (const value of avatarCandidates) {
        if (typeof value === "string" && value.startsWith("http")) {
          uploaderAvatar = value;
          break;
        }
      }

      const saved = await addWordToUserList(supabase, user.id, {
        english: body.english,
        turkish: body.turkish,
        example_sentence: body.example_sentence ?? null,
        phonetic: body.phonetic ?? null,
        audio_url: body.audio_url ?? null,
        difficulty,
        is_global: isGlobal,
        uploader_username: uploaderUsername,
        uploader_avatar_url: uploaderAvatar,
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

    if (body.action === "update") {
      const userWordId = Number(body.userWordId);
      if (!Number.isFinite(userWordId) || userWordId <= 0) {
        return NextResponse.json({ error: "Geçersiz kelime." }, { status: 400 });
      }
      if (!body.english?.trim() || !body.turkish?.trim()) {
        return NextResponse.json(
          { error: "İngilizce kelime ve Türkçe anlam gerekli." },
          { status: 400 }
        );
      }

      const word = await updateUserListWord(supabase, user.id, userWordId, {
        english: body.english,
        turkish: body.turkish,
        phonetic: body.phonetic ?? null,
        example_sentence: body.example_sentence ?? null,
      });

      return NextResponse.json({ ok: true, word });
    }

    if (body.action === "delete") {
      const userWordId = Number(body.userWordId);
      if (!Number.isFinite(userWordId) || userWordId <= 0) {
        return NextResponse.json({ error: "Geçersiz kelime." }, { status: 400 });
      }

      await removeWordFromUserList(supabase, user.id, userWordId);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Kelime işlemi başarısız";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

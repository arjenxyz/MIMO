import { NextRequest, NextResponse } from "next/server";
import {
  getAuthorGlobalWords,
  getAuthorPassScore,
  getPackAuthorInfo,
  getUnlock,
  listMyUnlocks,
  PACK_QUIZ_MIN_QUESTIONS,
  PACK_QUIZ_PASS_SCORE,
  PACK_QUIZ_PASS_SCORE_FLOOR,
  PACK_QUIZ_PASS_SCORE_CEILING,
  setAuthorPassScore,
  submitPackQuiz,
} from "@/lib/packUnlock";
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

    const authorId = request.nextUrl.searchParams.get("authorId")?.trim();
    if (!authorId) {
      const unlocks = await listMyUnlocks(supabase, user.id);
      const myPassScore = await getAuthorPassScore(supabase, user.id);
      return NextResponse.json({
        unlocks,
        passScore: myPassScore,
        passScoreFloor: PACK_QUIZ_PASS_SCORE_FLOOR,
        passScoreCeiling: PACK_QUIZ_PASS_SCORE_CEILING,
        defaultPassScore: PACK_QUIZ_PASS_SCORE,
        minQuestions: PACK_QUIZ_MIN_QUESTIONS,
      });
    }

    const [author, words, unlock, passScore] = await Promise.all([
      getPackAuthorInfo(supabase, authorId),
      getAuthorGlobalWords(supabase, authorId, 80),
      authorId === user.id
        ? Promise.resolve(null)
        : getUnlock(supabase, user.id, authorId),
      getAuthorPassScore(supabase, authorId),
    ]);

    if (!author) {
      return NextResponse.json({ error: "Yazar bulunamadı." }, { status: 404 });
    }

    if (authorId === user.id) {
      return NextResponse.json({
        author,
        unlock: null,
        isOwnPack: true,
        passScore,
        passScoreFloor: PACK_QUIZ_PASS_SCORE_FLOOR,
        passScoreCeiling: PACK_QUIZ_PASS_SCORE_CEILING,
        defaultPassScore: PACK_QUIZ_PASS_SCORE,
        minQuestions: PACK_QUIZ_MIN_QUESTIONS,
        canAttempt: false,
        words: [],
        peerMeanings: [],
      });
    }

    const shuffled = [...words].sort(() => Math.random() - 0.5);
    const quizSize = Math.min(
      Math.max(PACK_QUIZ_MIN_QUESTIONS, 12),
      shuffled.length
    );
    const quizWords = shuffled.slice(0, quizSize);

    return NextResponse.json({
      author,
      unlock,
      isOwnPack: false,
      passScore,
      passScoreFloor: PACK_QUIZ_PASS_SCORE_FLOOR,
      passScoreCeiling: PACK_QUIZ_PASS_SCORE_CEILING,
      defaultPassScore: PACK_QUIZ_PASS_SCORE,
      minQuestions: PACK_QUIZ_MIN_QUESTIONS,
      canAttempt: words.length >= PACK_QUIZ_MIN_QUESTIONS,
      words: quizWords.map((w) => ({
        id: w.id,
        english: w.english,
        turkish: w.turkish,
        phonetic: w.phonetic ?? null,
        audio_url: w.audio_url ?? null,
        uploader_username: w.uploader_username ?? null,
        uploader_avatar_url: w.uploader_avatar_url ?? null,
        created_by: w.created_by ?? null,
        is_global: w.is_global ?? true,
      })),
      peerMeanings: words
        .map((w) => w.turkish.split(/[/|,;]/)[0]?.trim() || w.turkish.trim())
        .filter(Boolean),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Paket alınamadı";
    const missing = /author_pack_unlocks|author_pack_prefs|schema cache|does not exist/i.test(
      message
    );
    return NextResponse.json(
      {
        error: missing
          ? "Kilit tablosu henüz yok. Supabase’te schema-author-unlock-messages.sql çalıştır."
          : message,
      },
      { status: missing ? 503 : 500 }
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
      authorId?: string;
      passScore?: number;
      answers?: Array<{ wordId: number; selectedTurkish: string }>;
    };

    if (body.action === "setPassScore") {
      const score = await setAuthorPassScore(supabase, user.id, Number(body.passScore));
      return NextResponse.json({
        ok: true,
        passScore: score,
        passScoreFloor: PACK_QUIZ_PASS_SCORE_FLOOR,
      });
    }

    if (!body.authorId || typeof body.authorId !== "string") {
      return NextResponse.json({ error: "authorId gerekli." }, { status: 400 });
    }
    if (!Array.isArray(body.answers)) {
      return NextResponse.json({ error: "answers gerekli." }, { status: 400 });
    }

    const result = await submitPackQuiz(
      supabase,
      user.id,
      body.authorId,
      body.answers.map((a) => ({
        wordId: Number(a.wordId),
        selectedTurkish: String(a.selectedTurkish ?? ""),
      }))
    );

    const passScore = await getAuthorPassScore(supabase, body.authorId);

    return NextResponse.json({
      ok: true,
      ...result,
      passScore,
      messagePath: result.unlocked ? `/messages/${body.authorId}` : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sınav kaydedilemedi";
    const missing = /author_pack_unlocks|author_pack_prefs|schema cache|does not exist/i.test(
      message
    );
    return NextResponse.json(
      {
        error: missing
          ? "Kilit tablosu henüz yok. Supabase’te schema-author-unlock-messages.sql çalıştır."
          : message,
      },
      { status: missing ? 503 : 400 }
    );
  }
}

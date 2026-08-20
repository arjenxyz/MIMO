import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { clientKeyFromRequest, consumeRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export type PhotoEvaluation = {
  cefr_level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  score: number;
  grammar_errors: string[];
  vocabulary_score: number;
  coherence_score: number;
  feedback: string;
  improved_version: string;
  suggestions: string[];
};

function extractJson(text: string) {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("JSON bulunamadı");
  return JSON.parse(cleaned.slice(start, end + 1)) as PhotoEvaluation;
}

async function fetchImagePart(imageUrl: string) {
  const res = await fetch(imageUrl, {
    redirect: "follow",
    headers: { Accept: "image/*" },
  });
  if (!res.ok) {
    throw new Error(`Görsel indirilemedi (${res.status})`);
  }
  const contentType = (res.headers.get("content-type") || "image/jpeg").split(";")[0];
  if (!contentType.startsWith("image/")) {
    throw new Error("Geçersiz görsel yanıtı");
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.byteLength < 100) {
    throw new Error("Görsel boş veya çok küçük");
  }
  return {
    inlineData: {
      data: buffer.toString("base64"),
      mimeType: contentType,
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY eksik. .env.local dosyasına ekle." },
        { status: 500 }
      );
    }

    const clientKey = clientKeyFromRequest(request);

    // Burst protection: max 1 eval / 20s
    const burst = consumeRateLimit(`photo-burst:${clientKey}`, {
      max: 1,
      windowMs: 20_000,
    });
    if (!burst.ok) {
      return NextResponse.json(
        {
          error: `Çok hızlı istek. ${burst.retryAfterSec} sn sonra tekrar dene.`,
        },
        { status: 429 }
      );
    }

    // Daily soft cap: max 40 evals / day (protects free Gemini quota from spam)
    const daily = consumeRateLimit(`photo-day:${clientKey}`, {
      max: 40,
      windowMs: 24 * 60 * 60 * 1000,
    });
    if (!daily.ok) {
      return NextResponse.json(
        {
          error:
            "Günlük değerlendirme limitine ulaştın (40). Yarın tekrar dene veya kotanı AI Studio’dan kontrol et.",
        },
        { status: 429 }
      );
    }

    const body = (await request.json()) as {
      answer?: string;
      mode?: "write" | "speak";
      imageUrl?: string;
    };

    const userAnswer = (body.answer || "").trim();
    const mode = body.mode === "speak" ? "speak" : "write";
    const imageUrl = (body.imageUrl || "").trim();

    if (userAnswer.length < 20) {
      return NextResponse.json(
        { error: "Değerlendirme için en az ~20 karakter / birkaç cümle yaz." },
        { status: 400 }
      );
    }

    if (
      !imageUrl ||
      !/^https:\/\/([a-z0-9.-]+\.)?picsum\.photos\b/i.test(imageUrl)
    ) {
      return NextResponse.json(
        { error: "Geçerli bir pratik görseli gerekli." },
        { status: 400 }
      );
    }

    const imagePart = await fetchImagePart(imageUrl);

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });

    const prompt = `You are an expert Duolingo English Test evaluator for the "Describe the photo" / "Write about the photo" task.

IMPORTANT: An image is attached. You MUST look at the attached photo carefully.
- Judge whether the student's response accurately describes people, objects, setting, actions, and mood that are VISIBLE in THIS photo.
- Do NOT invent a different scene.
- "improved_version" MUST be a B2-level description of THIS SAME photo (what is actually in the image), written in English.
- If the student described something unrelated to the photo, lower the score and mention the mismatch in feedback.

Mode: ${mode}
Student's response: "${userAnswer.replace(/"/g, '\\"')}"

Return ONLY valid JSON in this format:
{
  "cefr_level": "A1|A2|B1|B2|C1|C2",
  "score": 0-10,
  "grammar_errors": ["error1", "error2"],
  "vocabulary_score": 0-10,
  "coherence_score": 0-10,
  "feedback": "Detailed feedback in Turkish about accuracy to the photo, strengths, and improvements.",
  "improved_version": "A B2-level English description of the attached photo.",
  "suggestions": ["Suggestion 1 in Turkish", "Suggestion 2 in Turkish"]
}

B2 criteria:
- Clear, detailed description of the photo.
- Range of vocabulary and grammar.
- Opinions / inferences grounded in the image are fine.
- Minimum ~50 words for writing, ~40 for speaking.

Only return valid JSON, no other text.`;

    const result = await model.generateContent([
      { text: prompt },
      imagePart,
    ]);
    const text = result.response.text();
    const evaluation = extractJson(text);

    const levels = new Set(["A1", "A2", "B1", "B2", "C1", "C2"]);
    if (!levels.has(evaluation.cefr_level)) {
      evaluation.cefr_level = "B1";
    }
    evaluation.score = Math.max(0, Math.min(10, Number(evaluation.score) || 0));
    evaluation.vocabulary_score = Math.max(
      0,
      Math.min(10, Number(evaluation.vocabulary_score) || 0)
    );
    evaluation.coherence_score = Math.max(
      0,
      Math.min(10, Number(evaluation.coherence_score) || 0)
    );
    evaluation.grammar_errors = Array.isArray(evaluation.grammar_errors)
      ? evaluation.grammar_errors.map(String)
      : [];
    evaluation.suggestions = Array.isArray(evaluation.suggestions)
      ? evaluation.suggestions.map(String)
      : [];
    evaluation.feedback = String(evaluation.feedback || "");
    evaluation.improved_version = String(evaluation.improved_version || "");

    return NextResponse.json({ evaluation });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Değerlendirme başarısız";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

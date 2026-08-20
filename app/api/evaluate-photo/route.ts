import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

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

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY eksik. .env.local dosyasına ekle." },
        { status: 500 }
      );
    }

    const body = (await request.json()) as {
      answer?: string;
      mode?: "write" | "speak";
    };

    const userAnswer = (body.answer || "").trim();
    const mode = body.mode === "speak" ? "speak" : "write";

    if (userAnswer.length < 8) {
      return NextResponse.json(
        { error: "Değerlendirme için daha uzun bir cevap gerekli." },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `You are an expert Duolingo English Test evaluator. Evaluate the following student's response to a "Describe the photo" task.
Mode: ${mode}
Student's response: "${userAnswer.replace(/"/g, '\\"')}"

Please provide your evaluation in the following JSON format:
{
  "cefr_level": "A1|A2|B1|B2|C1|C2",
  "score": 0-10,
  "grammar_errors": ["error1", "error2"],
  "vocabulary_score": 0-10,
  "coherence_score": 0-10,
  "feedback": "Detailed feedback in Turkish about what they did well and what needs improvement.",
  "improved_version": "A B2-level corrected version of their response.",
  "suggestions": ["Suggestion 1 in Turkish", "Suggestion 2 in Turkish"]
}

Criteria for B2 level:
- Can describe complex subjects with clear, detailed text.
- Can use a range of vocabulary and grammatical structures.
- Can express opinions and develop arguments.
- Minimum 50 words for writing, 40 words for speaking.

Only return valid JSON, no other text.`;

    const result = await model.generateContent(prompt);
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

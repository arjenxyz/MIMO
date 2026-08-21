import { GoogleGenerativeAI } from "@google/generative-ai";
import type { CefrBand, CurriculumTopic } from "@/lib/grammarCurriculum";
import { CEFR_LABEL } from "@/lib/grammarCurriculum";
import {
  generateLocalGrammarFallback,
  type GeneratedGrammarItem,
} from "@/lib/grammarFallback";

export type { GeneratedGrammarItem };

function extractJsonArray(text: string): unknown[] {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1) throw new Error("JSON array bulunamadı");
  const parsed = JSON.parse(cleaned.slice(start, end + 1)) as unknown;
  if (!Array.isArray(parsed)) throw new Error("Yanıt bir dizi değil");
  return parsed;
}

function normalizeItem(row: unknown, fallbackDiff: number): GeneratedGrammarItem | null {
  if (!row || typeof row !== "object") return null;
  const obj = row as Record<string, unknown>;
  const question = typeof obj.question === "string" ? obj.question.trim() : "";
  const correct =
    typeof obj.correct_answer === "string"
      ? obj.correct_answer.trim()
      : typeof obj.answer === "string"
        ? obj.answer.trim()
        : "";
  if (!question || !correct) return null;
  const explanation =
    typeof obj.explanation === "string" ? obj.explanation.trim() : "";
  const example = typeof obj.example === "string" ? obj.example.trim() : "";
  const difficulty =
    typeof obj.difficulty === "number" && obj.difficulty >= 1 && obj.difficulty <= 5
      ? Math.round(obj.difficulty)
      : fallbackDiff;

  return {
    question,
    correct_answer: correct,
    explanation: explanation || "Bu konunun kuralına göre cevapla.",
    example: example || question.replace("___", correct),
    difficulty,
  };
}

function buildPrompt(topic: CurriculumTopic, count: number) {
  const level = CEFR_LABEL[topic.difficulty as CefrBand];
  return `You are an English grammar exercise writer for Turkish learners (CEFR ${level}).

TOPIC (ONLY this topic — do not mix other grammar):
- slug: ${topic.slug}
- title: ${topic.title}
- category: ${topic.category}
- summary: ${topic.summary}
- tip (TR): ${topic.tip_tr}
- example: ${topic.example}

Write exactly ${count} fill-in-the-blank questions that test ONLY "${topic.title}".
Every blank must require knowledge of this topic alone (e.g. if topic is "To be: am / is / are", answers are only am/is/are/forms of be — never past tense, articles, etc.).

Rules:
- One blank per question marked with ___
- Keep English short (A1–C1 matching ${level})
- correct_answer = the missing word(s) only (allow alternate forms with / like "do not/don't")
- explanation: 1 short English sentence why
- example: full correct sentence
- difficulty: integer 1-5 matching CEFR band roughly (${topic.difficulty})

Return ONLY a JSON array (no markdown) of objects:
[{"question":"... ___ ...","correct_answer":"...","explanation":"...","example":"...","difficulty":${topic.difficulty}}]`;
}

export async function generateGrammarQuestionsForTopic(
  topic: CurriculumTopic,
  count = 10
): Promise<{ items: GeneratedGrammarItem[]; source: "gemini" | "local" }> {
  const n = Math.min(12, Math.max(6, count));
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return { items: generateLocalGrammarFallback(topic, n), source: "local" };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });

    const result = await model.generateContent(buildPrompt(topic, n));
    const text = result.response.text();
    const items = extractJsonArray(text)
      .map((row) => normalizeItem(row, topic.difficulty))
      .filter((row): row is GeneratedGrammarItem => Boolean(row))
      .slice(0, n);

    if (items.length < 4) {
      throw new Error("Yeterli soru üretilemedi");
    }

    return { items, source: "gemini" };
  } catch {
    return { items: generateLocalGrammarFallback(topic, n), source: "local" };
  }
}

import { GoogleGenerativeAI } from "@google/generative-ai";
import { extractGaps, parseClozePassage } from "@/lib/detCloze";
import {
  buildMixedClozePrompt,
  mixedClozeDifficulty,
  pickTopics,
} from "@/lib/detClozeCurriculum";
import type { DETExercise } from "@/types";

export type GeneratedCloze = {
  title: string;
  question: string;
  answer: string;
};

function extractJsonArray(text: string): GeneratedCloze[] {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1) {
    throw new Error("JSON array not found in model response");
  }

  const parsed = JSON.parse(cleaned.slice(start, end + 1)) as unknown;
  if (!Array.isArray(parsed)) throw new Error("Parsed JSON is not an array");

  return parsed
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const obj = row as { title?: unknown; question?: unknown; answer?: unknown };
      const q = obj.question;
      const a = obj.answer;
      const title = typeof obj.title === "string" ? obj.title.trim() : "";
      if (typeof q !== "string" || typeof a !== "string") return null;
      if (!q.includes("[[") || !q.includes("]]")) return null;
      return {
        title: title || "Read and Complete",
        question: q.trim(),
        answer: a.trim(),
      };
    })
    .filter((row): row is GeneratedCloze => Boolean(row));
}

function validateCloze(item: GeneratedCloze): GeneratedCloze | null {
  const gaps = extractGaps(parseClozePassage(item.question, item.answer));
  if (gaps.length < 5 || gaps.length > 12) return null;

  for (const gap of gaps) {
    if (gap.answer.length < 2) return null;
    if (gap.shown < 1 || gap.shown >= gap.answer.length) return null;
    if (!/^[a-z'-]+$/i.test(gap.answer)) return null;
  }

  return {
    title: item.title.replace(/^\[(A1|A2|B1|B2)\]\s*/i, "").trim() || item.title,
    question: item.question,
    answer: gaps.map((g) => g.answer).join("|"),
  };
}

export async function generateClozeSession(opts: {
  count?: number;
  avoidTopics?: string[];
}): Promise<DETExercise[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY eksik");
  }

  const count = Math.min(5, Math.max(3, opts.count ?? 4));
  const avoid = opts.avoidTopics ?? [];
  const topics = pickTopics(Math.min(4, count + 1), avoid);

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });

  const prompt = buildMixedClozePrompt({
    count,
    topics,
    avoidTopics: avoid,
  });

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const valid = extractJsonArray(text)
    .map(validateCloze)
    .filter((row): row is GeneratedCloze => Boolean(row))
    .slice(0, count);

  if (valid.length === 0) {
    throw new Error("Geçerli pasaj üretilemedi");
  }

  // Shuffle so session order is not an implied difficulty ladder
  for (let i = valid.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [valid[i], valid[j]] = [valid[j], valid[i]];
  }

  const stamp = Date.now();
  return valid.map((item, i) => ({
    id: -(stamp + i),
    question_type_id: 1,
    question_text: item.question,
    correct_answer: item.answer,
    difficulty: mixedClozeDifficulty(),
    topic: item.title,
    created_at: new Date().toISOString().slice(0, 10),
  }));
}

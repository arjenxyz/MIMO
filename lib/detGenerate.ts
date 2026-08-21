import { GoogleGenerativeAI } from "@google/generative-ai";
import { extractGaps, parseClozePassage } from "@/lib/detCloze";
import {
  buildClozePrompt,
  clozeDifficulty,
  pickLevelTopics,
  sessionLevels,
  type ClozeCefr,
} from "@/lib/detClozeCurriculum";
import type { DETExercise } from "@/types";

export type GeneratedCloze = {
  title: string;
  question: string;
  answer: string;
  cefr: ClozeCefr;
};

function extractJsonArray(text: string, fallbackCefr: ClozeCefr): GeneratedCloze[] {
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
      const obj = row as {
        title?: unknown;
        question?: unknown;
        answer?: unknown;
        cefr?: unknown;
      };
      const q = obj.question;
      const a = obj.answer;
      const title = typeof obj.title === "string" ? obj.title.trim() : "";
      if (typeof q !== "string" || typeof a !== "string") return null;
      if (!q.includes("[[") || !q.includes("]]")) return null;
      const rawCefr = typeof obj.cefr === "string" ? obj.cefr.toUpperCase() : "";
      const cefr: ClozeCefr =
        rawCefr === "A1" || rawCefr === "A2" || rawCefr === "B1" || rawCefr === "B2"
          ? rawCefr
          : fallbackCefr;
      return {
        title: title || "Read and Complete",
        question: q.trim(),
        answer: a.trim(),
        cefr,
      };
    })
    .filter((row): row is GeneratedCloze => Boolean(row));
}

function gapBounds(cefr: ClozeCefr): { min: number; max: number } {
  switch (cefr) {
    case "A1":
      return { min: 3, max: 5 };
    case "A2":
      return { min: 4, max: 6 };
    case "B1":
      return { min: 5, max: 7 };
    case "B2":
      return { min: 5, max: 8 };
  }
}

function validateCloze(item: GeneratedCloze): GeneratedCloze | null {
  const gaps = extractGaps(parseClozePassage(item.question, item.answer));
  const { min, max } = gapBounds(item.cefr);
  if (gaps.length < min || gaps.length > max) return null;

  for (const gap of gaps) {
    if (gap.answer.length < 2) return null;
    if (gap.shown < 1 || gap.shown >= gap.answer.length) return null;
    if (!/^[a-z'-]+$/i.test(gap.answer)) return null;
  }

  return {
    title: item.title,
    question: item.question,
    answer: gaps.map((g) => g.answer).join("|"),
    cefr: item.cefr,
  };
}

async function generateOneLevel(
  model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]>,
  cefr: ClozeCefr,
  avoidTopics: string[]
): Promise<GeneratedCloze | null> {
  const topics = pickLevelTopics(cefr, 2, avoidTopics);
  const prompt = buildClozePrompt({
    cefr,
    count: 1,
    topics,
    avoidTopics,
  });

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const raw = extractJsonArray(text, cefr);
  const valid = raw
    .map((row) => validateCloze({ ...row, cefr }))
    .filter((row): row is GeneratedCloze => Boolean(row));

  return valid[0] ?? null;
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
  const levels = sessionLevels(count);
  const avoid = opts.avoidTopics ?? [];

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });

  const valid: GeneratedCloze[] = [];
  const usedTitles: string[] = [...avoid];

  for (const cefr of levels) {
    try {
      const item = await generateOneLevel(model, cefr, usedTitles);
      if (item) {
        valid.push(item);
        usedTitles.push(item.title);
      }
    } catch {
      // try next level
    }
  }

  // If some levels failed, top up with B1 (still within A1–B2)
  while (valid.length < Math.min(3, count)) {
    try {
      const item = await generateOneLevel(model, "B1", usedTitles);
      if (!item) break;
      valid.push(item);
      usedTitles.push(item.title);
    } catch {
      break;
    }
  }

  if (valid.length === 0) {
    throw new Error("Geçerli pasaj üretilemedi");
  }

  // Keep easy → hard order by CEFR
  const order: Record<ClozeCefr, number> = { A1: 0, A2: 1, B1: 2, B2: 3 };
  valid.sort((a, b) => order[a.cefr] - order[b.cefr]);

  const stamp = Date.now();
  return valid.slice(0, count).map((item, i) => ({
    id: -(stamp + i),
    question_type_id: 1,
    question_text: item.question,
    correct_answer: item.answer,
    difficulty: clozeDifficulty(item.cefr),
    topic: `[${item.cefr}] ${item.title}`,
    created_at: new Date().toISOString().slice(0, 10),
  }));
}

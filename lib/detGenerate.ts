import { GoogleGenerativeAI } from "@google/generative-ai";
import { extractGaps, parseClozePassage } from "@/lib/detCloze";
import type { DETExercise } from "@/types";

const TOPICS = [
  "Science",
  "Technology",
  "History",
  "Education",
  "Health",
  "Environment",
  "Art",
  "Business",
  "Psychology",
  "Politics",
  "Space exploration",
  "Urban design",
  "Climate policy",
  "Public health",
  "Digital media",
  "Marine biology",
  "Economics",
  "Archaeology",
] as const;

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
      return { title: title || "Read and Complete", question: q.trim(), answer: a.trim() };
    })
    .filter((row): row is GeneratedCloze => Boolean(row));
}

function validateCloze(item: GeneratedCloze): GeneratedCloze | null {
  const gaps = extractGaps(parseClozePassage(item.question, item.answer));
  if (gaps.length < 4 || gaps.length > 10) return null;

  for (const gap of gaps) {
    if (gap.answer.length < 2) return null;
    if (gap.shown < 1 || gap.shown >= gap.answer.length) return null;
    if (!/^[a-z'-]+$/i.test(gap.answer)) return null;
  }

  return {
    title: item.title,
    question: item.question,
    answer: gaps.map((g) => g.answer).join("|"),
  };
}

function pickTopics(count: number, avoid: string[]) {
  const avoidSet = new Set(avoid.map((t) => t.toLowerCase()));
  const pool = TOPICS.filter((t) => !avoidSet.has(t.toLowerCase()));
  const source = pool.length >= count ? [...pool] : [...TOPICS];
  for (let i = source.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [source[i], source[j]] = [source[j], source[i]];
  }
  return source.slice(0, count);
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
  const topics = pickTopics(Math.min(3, count), opts.avoidTopics ?? []);
  const topicLine = topics.join(", ");
  const avoidLine =
    opts.avoidTopics && opts.avoidTopics.length > 0
      ? `Do NOT reuse these recent themes: ${opts.avoidTopics.slice(0, 8).join(", ")}.`
      : "";

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });

  const prompt = `Generate ${count} unique C1-C2 English "Read and Complete" PASSAGES in Duolingo English Test style.
Themes to use (mix freely, invent fresh angles): ${topicLine}.
${avoidLine}
Each passage must be DIFFERENT — new titles, new vocabulary, new facts. No duplicates.

Each passage must:
- Have a short academic title
- Be 2-4 sentences long
- Contain 5 to 8 incomplete words marked exactly like this: [[fullword:shownCount]]
  Example: [[send:2]] shows "se" + boxes for remaining letters
  Example: [[constraints:5]] shows "constr" + 5 boxes
- shownCount must be an integer >= 1 and less than the word length
- Prefer academic vocabulary suitable for DET 120+

Return ONLY a valid JSON array of objects:
- "title": string
- "question": full passage including [[word:n]] markers
- "answer": pipe-separated full words in order, e.g. "send|to|data"

Only return valid JSON, no markdown fences, no other text.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const raw = extractJsonArray(text);

  const valid = raw
    .map(validateCloze)
    .filter((row): row is GeneratedCloze => Boolean(row))
    .slice(0, count);

  if (valid.length === 0) {
    throw new Error("Geçerli pasaj üretilemedi");
  }

  const stamp = Date.now();
  return valid.map((item, i) => ({
    id: -(stamp + i),
    question_type_id: 1,
    question_text: item.question,
    correct_answer: item.answer,
    difficulty: 4,
    topic: item.title,
    created_at: new Date().toISOString().slice(0, 10),
  }));
}

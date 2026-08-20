/**
 * Generate DET Read and Complete cloze questions via Gemini and insert into Supabase.
 *
 * Requires in .env.local:
 *   GEMINI_API_KEY
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Run: npm run generate-cloze
 */

import { config } from "dotenv";
import { resolve } from "path";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

config({ path: resolve(process.cwd(), ".env.local") });

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
] as const;

type ClozeItem = { title: string; question: string; answer: string };

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

function extractJsonArray(text: string): ClozeItem[] {
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
    .filter((row): row is ClozeItem => Boolean(row));
}

async function generateForTopic(model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]>, topic: string) {
  const prompt = `Generate 3 C1-C2 level English "Read and Complete" PASSAGES about ${topic}, in Duolingo English Test style.

Each passage must:
- Have a short academic title
- Be 2-4 sentences long
- Contain 5 to 8 incomplete words marked exactly like this: [[fullword:shownCount]]
  Example: [[send:2]] renders as "se" + 3 letter boxes (for n,d)
  Example: [[constraints:5]] renders as "constr" + 5 letter boxes
- shownCount must be an integer >= 1 and less than the word length
- Prefer academic vocabulary suitable for DET 120+

Return ONLY valid JSON array of objects with:
- "title": string
- "question": the full passage string including [[word:n]] markers
- "answer": pipe-separated full words in order, e.g. "send|to|data"

Example object:
{"title":"European Space Agency's Mission to Mars","question":"The agency plans to [[send:2]] a rover [[to:1]] Mars.","answer":"send|to"}

Only return valid JSON, no other text.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return extractJsonArray(text);
}

async function main() {
  const geminiKey = requireEnv("GEMINI_API_KEY");
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  const genAI = new GoogleGenerativeAI(geminiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });
  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: typeRow, error: typeError } = await supabase
    .from("det_question_types")
    .select("id")
    .eq("type_name", "read_complete")
    .maybeSingle();

  if (typeError) throw typeError;
  if (!typeRow?.id) {
    throw new Error("read_complete type missing — run schema-det.sql first");
  }

  const typeId = typeRow.id as number;
  let inserted = 0;
  let failedTopics = 0;

  for (const topic of TOPICS) {
    try {
      console.log(`Generating: ${topic}…`);
      const items = await generateForTopic(model, topic);
      if (items.length === 0) {
        console.warn(`  No items for ${topic}`);
        failedTopics += 1;
        continue;
      }

      const rows = items.map((item) => ({
        question_type_id: typeId,
        question_text: item.question,
        correct_answer: item.answer,
        difficulty: Math.random() < 0.5 ? 4 : 5,
        topic: item.title,
      }));

      const { error } = await supabase.from("det_exercises").insert(rows);
      if (error) throw error;

      inserted += rows.length;
      console.log(`  +${rows.length} (${topic})`);
    } catch (error) {
      failedTopics += 1;
      console.error(`  Failed ${topic}:`, error instanceof Error ? error.message : error);
    }
  }

  console.log(`\nDone. Inserted ${inserted} questions. Failed topics: ${failedTopics}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

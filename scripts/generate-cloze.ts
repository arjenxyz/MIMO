/**
 * Generate DET Read and Complete cloze questions via Gemini and insert into Supabase.
 * Each passage mixes A1–B2 grammar in one text (not level-by-level sessions).
 *
 * Requires in .env.local:
 *   GEMINI_API_KEY
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Run: npm run generate-cloze
 * Optional: npm run generate-cloze -- --count=8
 */

import { config } from "dotenv";
import { resolve } from "path";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import {
  buildMixedClozePrompt,
  mixedClozeDifficulty,
  pickTopics,
} from "../lib/detClozeCurriculum";

config({ path: resolve(process.cwd(), ".env.local") });

type ClozeItem = { title: string; question: string; answer: string };

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

function parseArgs() {
  const args = process.argv.slice(2);
  let count = 8;

  for (const arg of args) {
    if (arg.startsWith("--count=")) {
      const n = Number(arg.slice("--count=".length));
      if (Number.isFinite(n)) count = Math.min(20, Math.max(1, Math.round(n)));
    }
  }

  return { count };
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
      return {
        title: (title || "Read and Complete").replace(/^\[(A1|A2|B1|B2)\]\s*/i, "").trim(),
        question: q.trim(),
        answer: a.trim(),
      };
    })
    .filter((row): row is ClozeItem => Boolean(row));
}

async function generateBatch(
  model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]>,
  count: number
) {
  const topics = pickTopics(Math.min(5, count + 1));
  const prompt = buildMixedClozePrompt({ count, topics });
  const result = await model.generateContent(prompt);
  return extractJsonArray(result.response.text());
}

async function main() {
  const geminiKey = requireEnv("GEMINI_API_KEY");
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const { count } = parseArgs();

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
  // Gemini quality drops on huge batches — chunk requests
  const chunkSize = 4;
  let inserted = 0;
  let failedBatches = 0;

  console.log(
    `Generating ${count} mixed A1–B2 cloze passages (grammar mixed inside each passage)…\n`
  );

  for (let offset = 0; offset < count; offset += chunkSize) {
    const n = Math.min(chunkSize, count - offset);
    try {
      console.log(`Batch ${offset + 1}–${offset + n}…`);
      const items = await generateBatch(model, n);
      if (items.length === 0) {
        console.warn("  No items");
        failedBatches += 1;
        continue;
      }

      const rows = items.map((item) => ({
        question_type_id: typeId,
        question_text: item.question,
        correct_answer: item.answer,
        difficulty: mixedClozeDifficulty(),
        topic: item.title,
      }));

      const { error } = await supabase.from("det_exercises").insert(rows);
      if (error) throw error;

      inserted += rows.length;
      console.log(`  +${rows.length}`);
    } catch (error) {
      failedBatches += 1;
      console.error(`  Failed:`, error instanceof Error ? error.message : error);
    }
  }

  console.log(`\nDone. Inserted ${inserted} questions. Failed batches: ${failedBatches}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

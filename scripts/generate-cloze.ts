/**
 * Generate DET Read and Complete cloze questions via Gemini and insert into Supabase.
 * Produces A1 → B2 passages (easy to hard) with level-appropriate grammar.
 *
 * Requires in .env.local:
 *   GEMINI_API_KEY
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Run: npm run generate-cloze
 * Optional: npm run generate-cloze -- --level=A2 --per-level=2
 */

import { config } from "dotenv";
import { resolve } from "path";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import {
  buildClozePrompt,
  CLOZE_CEFR_ORDER,
  CLOZE_LEVELS,
  clozeDifficulty,
  pickLevelTopics,
  type ClozeCefr,
} from "../lib/detClozeCurriculum";

config({ path: resolve(process.cwd(), ".env.local") });

type ClozeItem = { title: string; question: string; answer: string; cefr: ClozeCefr };

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

function parseArgs() {
  const args = process.argv.slice(2);
  let levelFilter: ClozeCefr | null = null;
  let perLevel = 3;

  for (const arg of args) {
    if (arg.startsWith("--level=")) {
      const v = arg.slice("--level=".length).toUpperCase();
      if (v === "A1" || v === "A2" || v === "B1" || v === "B2") levelFilter = v;
    }
    if (arg.startsWith("--per-level=")) {
      const n = Number(arg.slice("--per-level=".length));
      if (Number.isFinite(n)) perLevel = Math.min(6, Math.max(1, Math.round(n)));
    }
  }

  return { levelFilter, perLevel };
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
          : "B1";
      return {
        title: title || "Read and Complete",
        question: q.trim(),
        answer: a.trim(),
        cefr,
      };
    })
    .filter((row): row is ClozeItem => Boolean(row));
}

async function generateForLevel(
  model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]>,
  cefr: ClozeCefr,
  count: number
) {
  const topics = pickLevelTopics(cefr, Math.min(3, count + 1));
  const prompt = buildClozePrompt({ cefr, count, topics });
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return extractJsonArray(text).map((item) => ({ ...item, cefr }));
}

async function main() {
  const geminiKey = requireEnv("GEMINI_API_KEY");
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const { levelFilter, perLevel } = parseArgs();

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
  let failedBatches = 0;

  const levels = levelFilter ? [levelFilter] : CLOZE_CEFR_ORDER;

  console.log(
    `Generating cloze for levels: ${levels.join(" → ")} (${perLevel} each, easy → hard)\n`
  );

  for (const cefr of levels) {
    const spec = CLOZE_LEVELS[cefr];
    try {
      console.log(`${cefr} (difficulty ${spec.difficulty}) — grammar: ${spec.grammarFocus[0]}…`);
      const items = await generateForLevel(model, cefr, perLevel);
      if (items.length === 0) {
        console.warn(`  No items for ${cefr}`);
        failedBatches += 1;
        continue;
      }

      const rows = items.map((item) => ({
        question_type_id: typeId,
        question_text: item.question,
        correct_answer: item.answer,
        difficulty: clozeDifficulty(cefr),
        topic: `[${cefr}] ${item.title}`,
      }));

      const { error } = await supabase.from("det_exercises").insert(rows);
      if (error) throw error;

      inserted += rows.length;
      console.log(`  +${rows.length} passages`);
    } catch (error) {
      failedBatches += 1;
      console.error(`  Failed ${cefr}:`, error instanceof Error ? error.message : error);
    }
  }

  console.log(`\nDone. Inserted ${inserted} questions. Failed batches: ${failedBatches}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

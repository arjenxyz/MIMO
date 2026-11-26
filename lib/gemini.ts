import { GoogleGenerativeAI, type Part } from "@google/generative-ai";

/**
 * Free-tier quotas are per model. Prefer widely available Flash models first;
 * keep newer/scarce ids as last resorts so one exhausted quota does not block the app.
 */
export const GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-flash-latest",
  "gemini-1.5-flash",
  "gemini-3.6-flash",
] as const;

export type GeminiPrompt = string | Array<string | Part>;

function isRetryableGeminiError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /429|404|503|quota|rate.?limit|too many requests|not found|overloaded|resource.?exhausted/i.test(
    msg
  );
}

export async function generateGeminiContent(
  prompt: GeminiPrompt,
  opts?: { apiKey?: string }
): Promise<{ text: string; model: string }> {
  const apiKey = opts?.apiKey ?? process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY eksik");

  const genAI = new GoogleGenerativeAI(apiKey);
  let lastError: unknown;

  for (const modelName of GEMINI_MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      return { text: result.response.text(), model: modelName };
    } catch (err) {
      lastError = err;
      if (isRetryableGeminiError(err)) continue;
      throw err;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Gemini isteği başarısız");
}

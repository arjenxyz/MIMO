/** Shared cloze generation: each passage mixes A1–B2 grammar (not level-by-level sessions). */

export const CLOZE_TOPICS = [
  "Daily life and routines",
  "Travel and weekends",
  "School and studying",
  "Work and careers",
  "Health and habits",
  "Food and cooking",
  "Friends and family",
  "City life",
  "Sports and hobbies",
  "Shopping and money",
  "Technology at home",
  "Environment and recycling",
  "Weather and seasons",
  "Culture and free time",
  "Online learning",
  "Public transport",
] as const;

/** Grammar bands that MUST appear together inside ONE passage (mixed, not sequential levels). */
export const MIXED_GRAMMAR_BANDS = {
  A1: [
    "Present Simple (habits/facts: lives, goes, likes)",
    "be / have got",
    "there is / there are",
  ],
  A2: [
    "Past Simple (went, saw, cooked, visited)",
    "Present Continuous (is studying, are waiting)",
    "going to future",
    "can / must / should (basic)",
  ],
  B1: [
    "Present Perfect (have/has + past participle)",
    "Past Continuous vs Past Simple",
    "First Conditional (if + present, will…)",
    "Passive Voice Present/Past Simple (is made, was built)",
  ],
  B2: [
    "Second Conditional (if + past, would…)",
    "Third Conditional (light use: if + past perfect, would have…)",
    "Passive in other common forms OR reported speech (said that…)",
    "Connectors (although, however, therefore, despite)",
  ],
} as const;

export const MIXED_CLOZE_EXAMPLE = `{"title":"A Busy Week in Town","question":"Maya [[lives:2]] near the park and [[goes:2]] to work by bus every day. Last Friday she [[visited:3]] a new cafe while her friends were [[waiting:3]] outside. She has [[tried:3]] many recipes this month, and if the weather [[stays:2]] warm, they will [[walk:2]] by the river. The cafe was [[opened:3]] last year; Maya said she would [[return:3]] if the coffee [[stayed:3]] this good.","answer":"lives|goes|visited|waiting|tried|stays|walk|opened|return|stayed"}`;

export function pickTopics(count: number, avoid: string[] = []): string[] {
  const avoidSet = new Set(avoid.map((t) => t.toLowerCase()));
  const pool = CLOZE_TOPICS.filter((t) => !avoidSet.has(t.toLowerCase()));
  const source = pool.length > 0 ? [...pool] : [...CLOZE_TOPICS];
  for (let i = source.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [source[i], source[j]] = [source[j], source[i]];
  }
  return source.slice(0, Math.max(1, Math.min(count, source.length)));
}

/** Random mid difficulty for mixed A1–B2 passages (not a CEFR ladder). */
export function mixedClozeDifficulty(): 2 | 3 | 4 {
  const roll = Math.random();
  if (roll < 0.35) return 2;
  if (roll < 0.75) return 3;
  return 4;
}

export function buildMixedClozePrompt(opts: {
  count: number;
  topics: string[];
  avoidTopics?: string[];
}): string {
  const topicLine = opts.topics.join(", ");
  const avoidLine =
    opts.avoidTopics && opts.avoidTopics.length > 0
      ? `Do NOT reuse these recent titles/themes: ${opts.avoidTopics.slice(0, 8).join(", ")}.`
      : "";

  const bandBlock = (["A1", "A2", "B1", "B2"] as const)
    .map((band) => {
      const lines = MIXED_GRAMMAR_BANDS[band].map((g) => `  - ${g}`).join("\n");
      return `${band}:\n${lines}`;
    })
    .join("\n");

  return `Generate ${opts.count} unique English "Read and Complete" PASSAGES for language learners (Duolingo-style cloze).

CRITICAL DESIGN (follow exactly):
- Do NOT create one easy passage then one hard passage.
- Do NOT label or order passages as A1 then A2 then B1 then B2.
- EVERY single passage must MIX grammar from A1, A2, B1, and B2 inside the SAME text (several sentences weaving them together).
- Vocabulary stays learner-friendly (roughly A2–B2 words). Never use rare C1–C2 academic jargon (no exacerbate, serendipity, microcirculation, unprecedented, deliberation, etc.).

Themes to invent fresh stories from: ${topicLine}.
${avoidLine}

In EACH passage, include useful blanks that exercise forms from ALL four bands below (at least one clear signal from each band):
${bandBlock}

Gap targets should often be the grammar-bearing words (verbs/forms), not random tiny words like "to" or "a".

Each passage must:
- Have a short clear title (no CEFR tags like [A1] in the title)
- Be 3-5 sentences that feel like one coherent mini-story or explanation
- Contain 6 to 10 incomplete words marked exactly like this: [[fullword:shownCount]]
  Example: [[send:2]] shows "se" + boxes for remaining letters
- shownCount must be an integer >= 1 and less than the word length
- Be DIFFERENT from the others (new title, new situation)

Return ONLY a valid JSON array of objects:
- "title": string
- "question": full passage including [[word:n]] markers
- "answer": pipe-separated full words in order

Example object (mixed grammar in one passage — imitate this style, invent new content):
${MIXED_CLOZE_EXAMPLE}

Only return valid JSON, no markdown fences, no other text.`;
}

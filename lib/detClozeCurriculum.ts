import { cefrToDifficulty, type CefrLevel } from "@/lib/wordLevel";

/** Cloze generation targets A1–B2 only (not C1/C2). */
export type ClozeCefr = Extract<CefrLevel, "A1" | "A2" | "B1" | "B2">;

export const CLOZE_CEFR_ORDER: ClozeCefr[] = ["A1", "A2", "B1", "B2"];

export type ClozeLevelSpec = {
  cefr: ClozeCefr;
  difficulty: 1 | 2 | 3 | 4;
  /** Everyday → school → opinions → abstract */
  topics: string[];
  grammarFocus: string[];
  vocabGuide: string;
  sentenceCount: string;
  gapCount: string;
  examplePassage: string;
};

export const CLOZE_LEVELS: Record<ClozeCefr, ClozeLevelSpec> = {
  A1: {
    cefr: "A1",
    difficulty: 1,
    topics: [
      "Daily routines",
      "Family and friends",
      "Food and meals",
      "School life",
      "Home and rooms",
      "Weather",
      "Hobbies",
      "Shopping",
    ],
    grammarFocus: [
      "Present Simple (I/you/we/they + verb, he/she/it + -s)",
      "be / have got",
      "there is / there are",
      "Basic prepositions of place (in, on, at)",
      "Simple questions with do/does",
    ],
    vocabGuide:
      "High-frequency A1 words only (go, eat, live, like, friend, school, morning, water, happy). No academic or rare words.",
    sentenceCount: "1-2 short sentences",
    gapCount: "3 to 5",
    examplePassage:
      '{"title":"Morning at Home","question":"Anna [[wakes:2]] up early every day. She [[eats:2]] breakfast and then [[goes:2]] to school.","answer":"wakes|eats|goes"}',
  },
  A2: {
    cefr: "A2",
    difficulty: 2,
    topics: [
      "Travel and holidays",
      "Jobs and work",
      "Town and city",
      "Sports and free time",
      "Health and habits",
      "Weekend plans",
      "Clothes and shopping",
      "Past weekends",
    ],
    grammarFocus: [
      "Past Simple (regular and common irregular: went, saw, made)",
      "Present Continuous",
      "going to future",
      "Comparatives and superlatives (bigger, more interesting)",
      "Countable / uncountable (some, any, much, many)",
      "Modals can / must / should (basic)",
    ],
    vocabGuide:
      "Common A2 vocabulary (travel, holiday, busy, cheap, healthy, weather, cinema). Avoid abstract academic terms.",
    sentenceCount: "2-3 sentences",
    gapCount: "4 to 6",
    examplePassage:
      '{"title":"A Trip to the City","question":"Last weekend we [[visited:3]] our cousins in London. While we were [[walking:3]] in the park, it [[started:3]] to rain, so we [[went:2]] to a cafe.","answer":"visited|walking|started|went"}',
  },
  B1: {
    cefr: "B1",
    difficulty: 3,
    topics: [
      "Education and learning",
      "Technology in everyday life",
      "Environment and recycling",
      "Work and careers",
      "Healthy lifestyle",
      "Media and news",
      "Culture and festivals",
      "Travel experiences",
    ],
    grammarFocus: [
      "Present Perfect (have/has + past participle) for experience and recent results",
      "Past Continuous vs Past Simple",
      "First Conditional (if + present, will…)",
      "Passive Voice (Present/Past Simple: is made, was built)",
      "Modals of advice and possibility (should, might, could)",
      "Relative clauses with who/which/that (basic)",
    ],
    vocabGuide:
      "Solid B1 words (improve, experience, environment, opportunity, decision, recommend). Still everyday/learner-friendly — not C1 academic jargon.",
    sentenceCount: "2-3 sentences",
    gapCount: "5 to 7",
    examplePassage:
      '{"title":"Learning Online","question":"Many students have [[improved:4]] their English because they [[practice:4]] every day. If you [[study:3]] regularly, you will [[notice:3]] better results. Online courses are often [[designed:4]] for busy people.","answer":"improved|practice|study|notice|designed"}',
  },
  B2: {
    cefr: "B2",
    difficulty: 4,
    topics: [
      "Education systems",
      "Climate and sustainability",
      "Workplace skills",
      "Urban life",
      "Science in daily life",
      "Social media and society",
      "Public health",
      "Arts and culture",
    ],
    grammarFocus: [
      "Second Conditional (if + past, would…)",
      "Third Conditional (if + past perfect, would have…)",
      "Passive Voice (all common tenses, including present perfect passive)",
      "Reported speech",
      "Relative clauses (including where/whose)",
      "Mixed conditionals (light use)",
      "Connectors (although, despite, however, therefore)",
    ],
    vocabGuide:
      "Upper-intermediate B2 words (challenge, significant, require, encourage, policy, impact). Do NOT use rare C1–C2 vocabulary (serendipity, exacerbate, unprecedented, constraints as academic filler).",
    sentenceCount: "2-4 sentences",
    gapCount: "5 to 8",
    examplePassage:
      '{"title":"Greener Cities","question":"City planners are redesigning streets to [[encourage:4]] walking and cycling. Although traffic is still a [[challenge:4]], better public transport has [[reduced:4]] air pollution. If more people [[chose:3]] bikes, cities would become quieter and [[healthier:4]].","answer":"encourage|challenge|reduced|chose|healthier"}',
  },
};

export function clozeDifficulty(cefr: ClozeCefr): 1 | 2 | 3 | 4 {
  return cefrToDifficulty(cefr) as 1 | 2 | 3 | 4;
}

/** Build a progressive level list for a live session (easy → hard). */
export function sessionLevels(count: number): ClozeCefr[] {
  const n = Math.min(5, Math.max(3, count));
  if (n === 3) return ["A1", "A2", "B1"];
  if (n === 4) return ["A1", "A2", "B1", "B2"];
  return ["A1", "A2", "B1", "B2", "B2"];
}

export function buildClozePrompt(opts: {
  cefr: ClozeCefr;
  count: number;
  topics: string[];
  avoidTopics?: string[];
}): string {
  const spec = CLOZE_LEVELS[opts.cefr];
  const topicLine = opts.topics.join(", ");
  const grammarLine = spec.grammarFocus.map((g) => `- ${g}`).join("\n");
  const avoidLine =
    opts.avoidTopics && opts.avoidTopics.length > 0
      ? `Do NOT reuse these recent titles/themes: ${opts.avoidTopics.slice(0, 8).join(", ")}.`
      : "";

  return `Generate ${opts.count} unique CEFR ${opts.cefr} English "Read and Complete" PASSAGES for language learners (Duolingo-style cloze), NOT C1/C2 academic DET 120+ material.

Level: ${opts.cefr} (difficulty ${spec.difficulty}/5)
Themes to use (pick fresh angles): ${topicLine}.
${avoidLine}

Grammar focus for this level (target blanks should often test these forms):
${grammarLine}

Vocabulary rules:
- ${spec.vocabGuide}
- Gap words must be common at ${opts.cefr}; prefer content words (verbs, nouns, adjectives, adverbs) that fit the grammar focus.
- Do not invent obscure academic vocabulary.

Each passage must:
- Have a short, clear title suitable for ${opts.cefr} learners
- Be ${spec.sentenceCount} long
- Contain ${spec.gapCount} incomplete words marked exactly like this: [[fullword:shownCount]]
  Example: [[send:2]] shows "se" + boxes for remaining letters
- shownCount must be an integer >= 1 and less than the word length
- Be DIFFERENT from the others (new title, new situation)

Return ONLY a valid JSON array of objects:
- "title": string
- "question": full passage including [[word:n]] markers
- "answer": pipe-separated full words in order
- "cefr": "${opts.cefr}"

Example object:
${spec.examplePassage}

Only return valid JSON, no markdown fences, no other text.`;
}

export function pickLevelTopics(cefr: ClozeCefr, count: number, avoid: string[] = []): string[] {
  const avoidSet = new Set(avoid.map((t) => t.toLowerCase()));
  const pool = CLOZE_LEVELS[cefr].topics.filter((t) => !avoidSet.has(t.toLowerCase()));
  const source = pool.length > 0 ? [...pool] : [...CLOZE_LEVELS[cefr].topics];
  for (let i = source.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [source[i], source[j]] = [source[j], source[i]];
  }
  return source.slice(0, Math.max(1, Math.min(count, source.length)));
}

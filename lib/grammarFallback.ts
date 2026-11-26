import type { CurriculumTopic } from "@/lib/grammarCurriculum";

export type GeneratedGrammarItem = {
  question: string;
  correct_answer: string;
  explanation: string;
  example: string;
  difficulty: number;
};

/** Topic-scoped offline packs when GEMINI_API_KEY is missing. */
const PACKS: Record<string, GeneratedGrammarItem[]> = {
  "be-am-is-are": [
    { question: "I ___ a student.", correct_answer: "am", explanation: "I → am.", example: "I am a student.", difficulty: 1 },
    { question: "She ___ tired today.", correct_answer: "is", explanation: "She → is.", example: "She is tired today.", difficulty: 1 },
    { question: "They ___ at home.", correct_answer: "are", explanation: "They → are.", example: "They are at home.", difficulty: 1 },
    { question: "He ___ my brother.", correct_answer: "is", explanation: "He → is.", example: "He is my brother.", difficulty: 1 },
    { question: "We ___ happy.", correct_answer: "are", explanation: "We → are.", example: "We are happy.", difficulty: 1 },
    { question: "You ___ late.", correct_answer: "are", explanation: "You → are.", example: "You are late.", difficulty: 1 },
    { question: "It ___ cold outside.", correct_answer: "is", explanation: "It → is.", example: "It is cold outside.", difficulty: 1 },
    { question: "I ___ not ready.", correct_answer: "am", explanation: "I am not…", example: "I am not ready.", difficulty: 1 },
    { question: "___ she a teacher?", correct_answer: "Is", explanation: "Question: Is + she…?", example: "Is she a teacher?", difficulty: 1 },
    { question: "___ you okay?", correct_answer: "Are", explanation: "Question: Are + you…?", example: "Are you okay?", difficulty: 1 },
  ],
  "subject-pronouns": [
    { question: "Ali is here. ___ is here.", correct_answer: "He", explanation: "Ali (male) → He.", example: "He is here.", difficulty: 1 },
    { question: "Sara is kind. ___ is kind.", correct_answer: "She", explanation: "Sara → She.", example: "She is kind.", difficulty: 1 },
    { question: "The book is new. ___ is new.", correct_answer: "It", explanation: "Thing → It.", example: "It is new.", difficulty: 1 },
    { question: "Tom and I are friends. ___ are friends.", correct_answer: "We", explanation: "Tom and I → We.", example: "We are friends.", difficulty: 1 },
    { question: "The students are loud. ___ are loud.", correct_answer: "They", explanation: "Plural people → They.", example: "They are loud.", difficulty: 1 },
    { question: "___ am from Ankara.", correct_answer: "I", explanation: "Speaker → I.", example: "I am from Ankara.", difficulty: 1 },
    { question: "Are ___ a student?", correct_answer: "you", explanation: "Listener → you.", example: "Are you a student?", difficulty: 1 },
    { question: "My parents live here. ___ live here.", correct_answer: "They", explanation: "Parents → They.", example: "They live here.", difficulty: 1 },
  ],
  "possessive-adjectives": [
    { question: "This is ___ bag. (I)", correct_answer: "my", explanation: "I → my.", example: "This is my bag.", difficulty: 1 },
    { question: "That is ___ phone. (she)", correct_answer: "her", explanation: "she → her.", example: "That is her phone.", difficulty: 1 },
    { question: "Is this ___ book? (you)", correct_answer: "your", explanation: "you → your.", example: "Is this your book?", difficulty: 1 },
    { question: "We love ___ school.", correct_answer: "our", explanation: "we → our.", example: "We love our school.", difficulty: 1 },
    { question: "They parked ___ car.", correct_answer: "their", explanation: "they → their.", example: "They parked their car.", difficulty: 1 },
    { question: "He forgot ___ keys.", correct_answer: "his", explanation: "he → his.", example: "He forgot his keys.", difficulty: 1 },
    { question: "The dog wagged ___ tail.", correct_answer: "its", explanation: "it → its (no apostrophe).", example: "The dog wagged its tail.", difficulty: 1 },
    { question: "I like ___ name. (he)", correct_answer: "his", explanation: "he → his.", example: "I like his name.", difficulty: 1 },
  ],
};

function genericFromTopic(topic: CurriculumTopic, count: number): GeneratedGrammarItem[] {
  const tipBits = topic.tip_tr
    .split(/[·•|/]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1 && s.length < 40)
    .slice(0, 6);

  const items: GeneratedGrammarItem[] = [];

  if (topic.example) {
    const words = topic.example.split(/\s+/);
    const mid = Math.min(words.length - 1, Math.max(1, Math.floor(words.length / 3)));
    const target = words[mid]?.replace(/[.,!?]/g, "") ?? "";
    if (target.length > 1) {
      const blanked = words.map((w, i) => (i === mid ? "___" : w)).join(" ");
      items.push({
        question: blanked,
        correct_answer: target,
        explanation: `This item practises: ${topic.title}.`,
        example: topic.example,
        difficulty: topic.difficulty,
      });
    }
  }

  for (const bit of tipBits) {
    const token = bit.split(/\s+/)[0]?.replace(/[^a-zA-Z'-]/g, "") ?? "";
    if (token.length < 2) continue;
    items.push({
      question: `For "${topic.title}", choose the form that fits: "___" (hint: ${bit}).`,
      correct_answer: token,
      explanation: bit,
      example: topic.example || bit,
      difficulty: topic.difficulty,
    });
  }

  // Pad with focused prompts so every topic has a drill
  while (items.length < count) {
    const n = items.length + 1;
    items.push({
      question: `(${topic.title}) Complete with the correct form: ___`,
      correct_answer: tipBits[0]?.split(/\s+/)[0] || "—",
      explanation: topic.summary.slice(0, 120),
      example: topic.example || topic.tip_tr,
      difficulty: topic.difficulty,
    });
    if (n > count + 2) break;
  }

  return items.slice(0, count);
}

export function generateLocalGrammarFallback(
  topic: CurriculumTopic,
  count = 10
): GeneratedGrammarItem[] {
  const pack = PACKS[topic.slug];
  if (pack?.length) return pack.slice(0, Math.max(count, pack.length));
  return genericFromTopic(topic, count);
}

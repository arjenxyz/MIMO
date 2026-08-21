export type GrammarTopic = {
  id: number;
  slug: string;
  title: string;
  summary: string;
  tip_tr: string | null;
  example: string | null;
  difficulty: number;
  item_count?: number;
};

export type GrammarItem = {
  id: number;
  topic_id: number;
  question: string;
  correct_answer: string;
  explanation: string | null;
  example: string | null;
  difficulty: number;
  sort_order: number;
};

export type GrammarTopicDetail = GrammarTopic & {
  items: GrammarItem[];
};

type SeedTopic = Omit<GrammarTopic, "id" | "item_count"> & {
  items: Array<Omit<GrammarItem, "id" | "topic_id" | "sort_order"> & { sort_order?: number }>;
};

const SEED: SeedTopic[] = [
  {
    slug: "in-on-at",
    title: "Prepositions: in / on / at",
    summary:
      "Use in for enclosed spaces and longer periods, on for surfaces and days/dates, at for exact points and clock times.",
    tip_tr: "in = içinde / ay-yıl · on = üzerinde / gün-tarih · at = noktada / saat",
    example: "She is at school. The book is on the table. We met in July.",
    difficulty: 1,
    items: [
      { question: "She is ___ school right now.", correct_answer: "at", explanation: "Exact place → at school.", example: "She is at school.", difficulty: 1 },
      { question: "The keys are ___ the table.", correct_answer: "on", explanation: "Surface → on the table.", example: "The keys are on the table.", difficulty: 1 },
      { question: "We live ___ Ankara.", correct_answer: "in", explanation: "City → in.", example: "We live in Ankara.", difficulty: 1 },
      { question: "The meeting starts ___ 9 o'clock.", correct_answer: "at", explanation: "Clock time → at.", example: "It starts at 9 o'clock.", difficulty: 1 },
      { question: "I was born ___ 2005.", correct_answer: "in", explanation: "Year → in.", example: "I was born in 2005.", difficulty: 1 },
      { question: "See you ___ Monday.", correct_answer: "on", explanation: "Day → on.", example: "See you on Monday.", difficulty: 1 },
      { question: "There is a photo ___ the wall.", correct_answer: "on", explanation: "Surface → on.", example: "A photo is on the wall.", difficulty: 1 },
      { question: "He sat ___ the sofa.", correct_answer: "on", explanation: "Sit on a surface.", example: "He sat on the sofa.", difficulty: 1 },
      { question: "They arrived ___ the airport early.", correct_answer: "at", explanation: "Point/place → at.", example: "They arrived at the airport.", difficulty: 1 },
      { question: "She works ___ a hospital.", correct_answer: "in", explanation: "Inside institution → in.", example: "She works in a hospital.", difficulty: 1 },
      { question: "Let's meet ___ the weekend.", correct_answer: "at", explanation: "at the weekend (BrE).", example: "Let's meet at the weekend.", difficulty: 2 },
      { question: "Put the milk ___ the fridge.", correct_answer: "in", explanation: "Inside → in.", example: "Put the milk in the fridge.", difficulty: 1 },
    ],
  },
  {
    slug: "present-simple",
    title: "Present Simple",
    summary: "Use Present Simple for habits, routines, and facts. Add -s/-es with he/she/it.",
    tip_tr: "Alışkanlık ve gerçekler: I work / she works.",
    example: "She goes to school every day.",
    difficulty: 1,
    items: [
      { question: "She ___ (go) to school every day.", correct_answer: "goes", explanation: "he/she/it → +s/es.", example: "She goes to school every day.", difficulty: 1 },
      { question: "I ___ (like) coffee in the morning.", correct_answer: "like", explanation: "I/you/we/they → base verb.", example: "I like coffee.", difficulty: 1 },
      { question: "He ___ (watch) TV after dinner.", correct_answer: "watches", explanation: "watch → watches.", example: "He watches TV.", difficulty: 1 },
      { question: "They ___ (not / live) near here.", correct_answer: "do not live/don't live", explanation: "do/does not + base.", example: "They don't live near here.", difficulty: 1 },
      { question: "___ she work on Sundays?", correct_answer: "Does", explanation: "Does + she + base?", example: "Does she work on Sundays?", difficulty: 1 },
      { question: "Water ___ (boil) at 100°C.", correct_answer: "boils", explanation: "Facts use Present Simple.", example: "Water boils at 100°C.", difficulty: 1 },
      { question: "My brother ___ (study) English.", correct_answer: "studies", explanation: "study → studies.", example: "My brother studies English.", difficulty: 1 },
      { question: "We ___ (have) lunch at noon.", correct_answer: "have", explanation: "Routine.", example: "We have lunch at noon.", difficulty: 1 },
      { question: "The shop ___ (close) at 8 pm.", correct_answer: "closes", explanation: "he/she/it + s.", example: "The shop closes at 8 pm.", difficulty: 1 },
      { question: "___ you speak Turkish?", correct_answer: "Do", explanation: "Do + you + base?", example: "Do you speak Turkish?", difficulty: 1 },
    ],
  },
  {
    slug: "present-continuous",
    title: "Present Continuous",
    summary: "Use am/is/are + verb-ing for actions happening now or around now.",
    tip_tr: "Şu an: am/is/are + V-ing",
    example: "They are playing football right now.",
    difficulty: 1,
    items: [
      { question: "They ___ (play) football right now.", correct_answer: "are playing", explanation: "are + V-ing.", example: "They are playing football.", difficulty: 1 },
      { question: "I ___ (write) an email at the moment.", correct_answer: "am writing", explanation: "I + am + V-ing.", example: "I am writing an email.", difficulty: 1 },
      { question: "Look! It ___ (rain).", correct_answer: "is raining", explanation: "Happening now.", example: "It is raining.", difficulty: 1 },
      { question: "She ___ (not / sleep) now.", correct_answer: "is not sleeping/isn't sleeping", explanation: "is not + V-ing.", example: "She isn't sleeping.", difficulty: 1 },
      { question: "___ you listening to me?", correct_answer: "Are", explanation: "Are + subject + V-ing?", example: "Are you listening?", difficulty: 1 },
      { question: "We ___ (study) for the exam this week.", correct_answer: "are studying", explanation: "Around now.", example: "We are studying this week.", difficulty: 1 },
      { question: "He ___ (sit) next to the window.", correct_answer: "is sitting", explanation: "sit → sitting.", example: "He is sitting by the window.", difficulty: 1 },
      { question: "The baby ___ (cry).", correct_answer: "is crying", explanation: "cry → crying.", example: "The baby is crying.", difficulty: 1 },
      { question: "Please be quiet. I ___ (try) to focus.", correct_answer: "am trying", explanation: "try → trying.", example: "I am trying to focus.", difficulty: 1 },
      { question: "They ___ (wait) for the bus.", correct_answer: "are waiting", explanation: "are + waiting.", example: "They are waiting for the bus.", difficulty: 1 },
    ],
  },
  {
    slug: "past-simple",
    title: "Past Simple",
    summary: "Use Past Simple for finished actions in the past. Regular verbs take -ed; many verbs are irregular.",
    tip_tr: "Bitmiş geçmiş: V2 (worked / went)",
    example: "I watched a movie last night.",
    difficulty: 2,
    items: [
      { question: "I ___ (watch) a movie last night.", correct_answer: "watched", explanation: "Regular + ed.", example: "I watched a movie.", difficulty: 1 },
      { question: "She ___ (go) to Izmir yesterday.", correct_answer: "went", explanation: "go → went.", example: "She went to Izmir.", difficulty: 1 },
      { question: "They ___ (not / come) to the party.", correct_answer: "did not come/didn't come", explanation: "did not + base.", example: "They didn't come.", difficulty: 1 },
      { question: "___ you see the match?", correct_answer: "Did", explanation: "Did + subject + base?", example: "Did you see the match?", difficulty: 1 },
      { question: "He ___ (buy) a new phone last week.", correct_answer: "bought", explanation: "buy → bought.", example: "He bought a phone.", difficulty: 2 },
      { question: "We ___ (study) hard for the test.", correct_answer: "studied", explanation: "study → studied.", example: "We studied hard.", difficulty: 1 },
      { question: "The train ___ (leave) at 6.", correct_answer: "left", explanation: "leave → left.", example: "The train left at 6.", difficulty: 2 },
      { question: "I ___ (be) tired after class.", correct_answer: "was", explanation: "I → was.", example: "I was tired.", difficulty: 1 },
      { question: "They ___ (be) at home on Sunday.", correct_answer: "were", explanation: "they → were.", example: "They were at home.", difficulty: 1 },
      { question: "She ___ (write) three emails.", correct_answer: "wrote", explanation: "write → wrote.", example: "She wrote three emails.", difficulty: 2 },
    ],
  },
  {
    slug: "articles-a-an-the",
    title: "Articles: a / an / the",
    summary: "a/an = one (not specific). Use an before vowel sounds. the = specific / known.",
    tip_tr: "a/an = belirsiz · the = belirli",
    example: "I bought an apple and the apple was sweet.",
    difficulty: 1,
    items: [
      { question: "I bought ___ apple.", correct_answer: "an", explanation: "Vowel sound → an.", example: "I bought an apple.", difficulty: 1 },
      { question: "She is ___ teacher.", correct_answer: "a", explanation: "Job → a/an.", example: "She is a teacher.", difficulty: 1 },
      { question: "Please close ___ door.", correct_answer: "the", explanation: "Specific → the.", example: "Close the door.", difficulty: 1 },
      { question: "He wants ___ orange juice.", correct_answer: "an/some", explanation: "an before vowel; some OK.", example: "He wants an orange juice.", difficulty: 2 },
      { question: "___ sun is hot today.", correct_answer: "The", explanation: "Unique → the.", example: "The sun is hot.", difficulty: 1 },
      { question: "I need ___ umbrella.", correct_answer: "an", explanation: "Vowel sound.", example: "I need an umbrella.", difficulty: 1 },
      { question: "This is ___ best film of the year.", correct_answer: "the", explanation: "Superlative → the.", example: "the best film", difficulty: 2 },
      { question: "She has ___ honest friend.", correct_answer: "an", explanation: "honest = vowel sound.", example: "an honest friend", difficulty: 2 },
      { question: "We saw ___ cat in the garden. ___ cat was black.", correct_answer: "a / the", explanation: "First a, then the.", example: "a cat … the cat", difficulty: 2 },
      { question: "___ Mount Everest is very high.", correct_answer: "—/The/-", explanation: "Often no article with Mount + name.", example: "Mount Everest is high.", difficulty: 3 },
    ],
  },
  {
    slug: "present-perfect",
    title: "Present Perfect",
    summary: "Use have/has + past participle for life experience and actions with a link to now (for/since).",
    tip_tr: "have/has + V3 · for / since",
    example: "She has lived in London since 2010.",
    difficulty: 3,
    items: [
      { question: "She ___ (live) in London since 2010.", correct_answer: "has lived", explanation: "has + V3 + since.", example: "She has lived in London since 2010.", difficulty: 2 },
      { question: "I ___ (never / see) that film.", correct_answer: "have never seen", explanation: "have + never + V3.", example: "I have never seen that film.", difficulty: 2 },
      { question: "___ you finished your homework?", correct_answer: "Have", explanation: "Have + subject + V3?", example: "Have you finished?", difficulty: 2 },
      { question: "He ___ (be) ill for three days.", correct_answer: "has been", explanation: "for + period.", example: "He has been ill for three days.", difficulty: 2 },
      { question: "We ___ (just / arrive).", correct_answer: "have just arrived", explanation: "just + Present Perfect.", example: "We have just arrived.", difficulty: 2 },
      { question: "They ___ (not / visit) us yet.", correct_answer: "have not visited/haven't visited", explanation: "yet + negative.", example: "They haven't visited yet.", difficulty: 2 },
      { question: "She ___ (lose) her keys.", correct_answer: "has lost", explanation: "Result now.", example: "She has lost her keys.", difficulty: 2 },
      { question: "I ___ (know) him for years.", correct_answer: "have known", explanation: "know → known.", example: "I have known him for years.", difficulty: 2 },
      { question: "___ she ever been abroad?", correct_answer: "Has", explanation: "Has + she + V3?", example: "Has she ever been abroad?", difficulty: 2 },
      { question: "The train ___ (already / leave).", correct_answer: "has already left", explanation: "already + Present Perfect.", example: "The train has already left.", difficulty: 2 },
    ],
  },
];

/** Offline / demo catalog with item counts. */
export function getDemoGrammarTopics(): GrammarTopic[] {
  return SEED.map((topic, i) => ({
    id: i + 1,
    slug: topic.slug,
    title: topic.title,
    summary: topic.summary,
    tip_tr: topic.tip_tr,
    example: topic.example,
    difficulty: topic.difficulty,
    item_count: topic.items.length,
  }));
}

export function getDemoGrammarTopicBySlug(slug: string): GrammarTopicDetail | null {
  const idx = SEED.findIndex((t) => t.slug === slug);
  if (idx === -1) return null;
  const topic = SEED[idx];
  return {
    id: idx + 1,
    slug: topic.slug,
    title: topic.title,
    summary: topic.summary,
    tip_tr: topic.tip_tr,
    example: topic.example,
    difficulty: topic.difficulty,
    item_count: topic.items.length,
    items: topic.items.map((item, j) => ({
      id: (idx + 1) * 100 + j + 1,
      topic_id: idx + 1,
      question: item.question,
      correct_answer: item.correct_answer,
      explanation: item.explanation,
      example: item.example,
      difficulty: item.difficulty,
      sort_order: item.sort_order ?? j + 1,
    })),
  };
}

export function difficultyLabel(level: number) {
  if (level <= 1) return "A1–A2";
  if (level === 2) return "A2–B1";
  if (level === 3) return "B1";
  return "B1–B2";
}

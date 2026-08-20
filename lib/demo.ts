import type {
  DailyQuests,
  DETExercise,
  DueGrammarItem,
  DueWordItem,
  Profile,
  SoundWithProgress,
  Story,
} from "@/types";

/** Local development: skip auth and use sample data. */
export function isDemoMode(hostname?: string | null) {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") return true;
  if (process.env.NODE_ENV === "development") return true;
  const host = (hostname || "").toLowerCase();
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host === "[::1]" ||
    host.endsWith(".local")
  ) {
    return true;
  }
  return false;
}

export const DEMO_PROFILE: Profile = {
  id: "00000000-0000-4000-8000-000000000001",
  username: "Demo Öğrenci",
  xp: 340,
  level: 4,
  daily_streak: 7,
  last_active: new Date().toISOString().slice(0, 10),
  total_lessons: 28,
  daily_quest_bonus_date: null,
};

export const DEMO_QUESTS: DailyQuests = {
  wordsDone: 2,
  wordsTarget: 5,
  grammarDone: 1,
  grammarTarget: 3,
  storiesDone: 0,
  storiesTarget: 1,
  soundsDone: 0,
  soundsTarget: 1,
  allComplete: false,
  bonusClaimed: false,
};

export const DEMO_DUE = {
  words: 8,
  grammar: 3,
};

const today = () => new Date().toISOString().slice(0, 10);

export const DEMO_DUE_WORDS: DueWordItem[] = [
  {
    id: 1,
    user_id: DEMO_PROFILE.id,
    word_id: 1,
    ease_factor: 2.5,
    repetition: 0,
    interval: 1,
    next_review: today(),
    correct_count: 0,
    wrong_count: 0,
    last_answered: today(),
    words: {
      id: 1,
      english: "serendipity",
      turkish: "tesadüfi keşif",
      example_sentence: "Finding that cafe was pure serendipity.",
      difficulty: 3,
      phonetic: "/ˌser.ənˈdɪp.ə.ti/",
      audio_url: null,
    },
  },
  {
    id: 2,
    user_id: DEMO_PROFILE.id,
    word_id: 2,
    ease_factor: 2.5,
    repetition: 1,
    interval: 1,
    next_review: today(),
    correct_count: 1,
    wrong_count: 0,
    last_answered: today(),
    words: {
      id: 2,
      english: "resilient",
      turkish: "dayanıklı",
      example_sentence: "She is resilient under pressure.",
      difficulty: 2,
      phonetic: "/rɪˈzɪl.i.ənt/",
      audio_url: null,
    },
  },
  {
    id: 3,
    user_id: DEMO_PROFILE.id,
    word_id: 3,
    ease_factor: 2.6,
    repetition: 0,
    interval: 1,
    next_review: today(),
    correct_count: 0,
    wrong_count: 1,
    last_answered: today(),
    words: {
      id: 3,
      english: "glimpse",
      turkish: "göz atmak / anlık bakış",
      example_sentence: "I caught a glimpse of the ocean.",
      difficulty: 2,
      phonetic: "/ɡlɪmps/",
      audio_url: null,
    },
  },
];

export const DEMO_DUE_GRAMMAR: DueGrammarItem[] = [
  {
    id: 1,
    user_id: DEMO_PROFILE.id,
    grammar_id: 1,
    ease_factor: 2.5,
    repetition: 0,
    interval: 1,
    next_review: today(),
    correct_count: 0,
    wrong_count: 0,
    last_answered: today(),
    grammar_rules: {
      id: 1,
      title: "Simple Present",
      difficulty: 1,
      question: "She ___ (go) to school every day.",
      correct_answer: "goes",
      explanation: "he/she/it öznesinde fiile -s/-es eklenir.",
      example: "She goes to school every day.",
    },
  },
  {
    id: 2,
    user_id: DEMO_PROFILE.id,
    grammar_id: 2,
    ease_factor: 2.5,
    repetition: 0,
    interval: 1,
    next_review: today(),
    correct_count: 0,
    wrong_count: 0,
    last_answered: today(),
    grammar_rules: {
      id: 2,
      title: "Present Continuous",
      difficulty: 1,
      question: "They ___ (play) football right now.",
      correct_answer: "are playing",
      explanation: "am/is/are + fiil-ing.",
      example: "They are playing football right now.",
    },
  },
];

export const DEMO_STORIES: Story[] = [
  {
    id: 1,
    level: 1,
    title: "A Day at School",
    content:
      "Mina is a student. She wakes up early and eats breakfast. Then she walks to school with her friend Ali.",
    question1: "Who walks to school with Mina?",
    question2: "What does Mina eat?",
    question3: "Where does she go?",
    answer1: "Ali",
    answer2: "Breakfast",
    answer3: "School",
    image_prompt: null,
  },
  {
    id: 2,
    level: 2,
    title: "The Red Apple",
    content: "Tom is hungry. He sees a red apple on the table and eats it.",
    question1: "What color is the apple?",
    question2: "Who is hungry?",
    question3: "Where is the apple?",
    answer1: "Red",
    answer2: "Tom",
    answer3: "On the table",
    image_prompt: null,
  },
];

export const DEMO_SOUNDS: SoundWithProgress[] = [
  { id: 1, ipa: "ɑ", example_word: "hot", category: "vowel", sort_order: 1, mastery: 40 },
  { id: 2, ipa: "æ", example_word: "cat", category: "vowel", sort_order: 2, mastery: 20 },
  { id: 3, ipa: "ɪ", example_word: "ship", category: "vowel", sort_order: 3, mastery: 10 },
  { id: 4, ipa: "i", example_word: "sheep", category: "vowel", sort_order: 4, mastery: 0 },
  { id: 5, ipa: "θ", example_word: "think", category: "consonant", sort_order: 5, mastery: 15 },
  { id: 6, ipa: "ʃ", example_word: "shoe", category: "consonant", sort_order: 6, mastery: 5 },
];

export const DEMO_DET_READ_COMPLETE: DETExercise[] = [
  {
    id: 1,
    question_type_id: 1,
    question_text:
      "The European Space Agency plans to [[send:2]] a rover [[to:1]] Mars to collect [[data:2]] from the planet's surface. This mission will mark a new chapter in the [[history:4]] of space exploration, making it [[possible:4]] to study Martian geology in unprecedented detail. There are challenges, [[however:4]], [[due:2]] to budget [[constraints:5]] and the harsh environment.",
    correct_answer: "send|to|data|history|possible|however|due|constraints",
    difficulty: 4,
    topic: "European Space Agency's Mission to Mars",
    created_at: today(),
  },
  {
    id: 2,
    question_type_id: 1,
    question_text:
      "Recent studies suggest that regular exercise can [[improve:3]] cognitive [[function:4]] in older adults. Researchers observed a notable [[decline:3]] in memory loss among participants who remained physically [[active:3]]. These findings have [[significant:3]] implications for public [[health:3]] policy.",
    correct_answer: "improve|function|decline|active|significant|health",
    difficulty: 4,
    topic: "Exercise and Cognitive Health",
    created_at: today(),
  },
  {
    id: 3,
    question_type_id: 1,
    question_text:
      "Climate scientists argue that immediate action is [[essential:3]] to limit global [[warming:3]]. Without coordinated [[international:3]] agreements, rising temperatures may [[exacerbate:3]] extreme weather events and threaten food [[security:3]] worldwide.",
    correct_answer: "essential|warming|international|exacerbate|security",
    difficulty: 5,
    topic: "Climate Policy Challenges",
    created_at: today(),
  },
  {
    id: 4,
    question_type_id: 1,
    question_text:
      "Many universities now [[require:3]] students to complete an [[internship:3]] before graduation. This experience helps them develop practical [[skills:3]] and build [[professional:4]] networks that can lead to better job [[opportunities:4]] after college.",
    correct_answer: "require|internship|skills|professional|opportunities",
    difficulty: 3,
    topic: "Internships and Career Readiness",
    created_at: today(),
  },
  {
    id: 5,
    question_type_id: 1,
    question_text:
      "Urban planners are redesigning city centers to [[encourage:3]] walking and cycling. Wider sidewalks, protected bike lanes, and reduced [[traffic:3]] congestion can [[improve:3]] air quality and public [[health:3]] for millions of residents.",
    correct_answer: "encourage|traffic|improve|health",
    difficulty: 3,
    topic: "Sustainable City Design",
    created_at: today(),
  },
  {
    id: 6,
    question_type_id: 1,
    question_text:
      "The museum exhibition features rare [[artifacts:3]] discovered during an archaeological dig. Visitors can [[examine:3]] ancient tools and pottery while listening to audio guides that [[explain:3]] each object's cultural [[significance:4]].",
    correct_answer: "artifacts|examine|explain|significance",
    difficulty: 3,
    topic: "Museum Exhibition",
    created_at: today(),
  },
  {
    id: 7,
    question_type_id: 1,
    question_text:
      "Online education has become more [[accessible:4]] than ever, allowing learners to study from [[almost:3]] anywhere. However, some students still struggle with [[motivation:4]] and time [[management:4]] when classes are fully remote.",
    correct_answer: "accessible|almost|motivation|management",
    difficulty: 4,
    topic: "Online Learning Challenges",
    created_at: today(),
  },
  {
    id: 8,
    question_type_id: 1,
    question_text:
      "Scientists warn that plastic pollution continues to [[threaten:3]] marine ecosystems. Tiny particles called microplastics can [[enter:2]] the food chain and [[eventually:4]] affect human [[health:3]] as well.",
    correct_answer: "threaten|enter|eventually|health",
    difficulty: 3,
    topic: "Plastic Pollution in Oceans",
    created_at: today(),
  },
  {
    id: 9,
    question_type_id: 1,
    question_text:
      "The committee reached a [[consensus:3]] after lengthy [[deliberation:4]]. Members agreed to [[postpone:3]] the final vote until additional [[evidence:3]] could be reviewed by independent experts.",
    correct_answer: "consensus|deliberation|postpone|evidence",
    difficulty: 4,
    topic: "Committee Decision Making",
    created_at: today(),
  },
  {
    id: 10,
    question_type_id: 1,
    question_text:
      "Travelers are advised to [[arrive:3]] at the airport early during peak season. Long security lines and unexpected [[delays:3]] can cause passengers to [[miss:2]] their connecting [[flights:3]].",
    correct_answer: "arrive|delays|miss|flights",
    difficulty: 2,
    topic: "Airport Travel Tips",
    created_at: today(),
  },
  {
    id: 11,
    question_type_id: 1,
    question_text:
      "Libraries remain vital community spaces even in the digital age. They provide free [[access:3]] to information, quiet study areas, and [[programs:3]] that [[support:3]] literacy for children and adults [[alike:3]].",
    correct_answer: "access|programs|support|alike",
    difficulty: 3,
    topic: "Modern Public Libraries",
    created_at: today(),
  },
  {
    id: 12,
    question_type_id: 1,
    question_text:
      "Renewable energy investments have grown [[rapidly:3]] over the past decade. Solar and wind projects now [[compete:3]] with fossil fuels on price, making the transition to cleaner power more [[realistic:4]] for many [[countries:3]].",
    correct_answer: "rapidly|compete|realistic|countries",
    difficulty: 4,
    topic: "Renewable Energy Growth",
    created_at: today(),
  },
];

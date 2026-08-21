import type {
  DailyQuests,
  DETExercise,
  DueGrammarItem,
  DueWordItem,
  Profile,
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
  allComplete: false,
  bonusClaimed: false,
};

export const DEMO_DUE = {
  words: 8,
  grammar: 5,
};

const today = () => new Date().toISOString().slice(0, 10);

function demoWord(
  id: number,
  english: string,
  turkish: string,
  example_sentence: string,
  difficulty = 2,
  phonetic: string | null = null
): DueWordItem {
  return {
    id,
    user_id: DEMO_PROFILE.id,
    word_id: id,
    ease_factor: 2.5,
    repetition: id % 3,
    interval: 1,
    next_review: today(),
    correct_count: id % 4,
    wrong_count: id % 2 === 0 ? 0 : 1,
    last_answered: today(),
    words: {
      id,
      english,
      turkish,
      example_sentence,
      difficulty,
      phonetic,
      audio_url: null,
    },
  };
}

/** Rich demo pool for quiz / match / spelling / listen-type previews. */
export const DEMO_DUE_WORDS: DueWordItem[] = [
  demoWord(1, "friend", "arkadaş", "She is my best friend.", 1, "/frend/"),
  demoWord(2, "water", "su", "Please drink more water.", 1, "/ˈwɔː.tər/"),
  demoWord(3, "school", "okul", "The children walk to school.", 1, "/skuːl/"),
  demoWord(4, "mother", "anne", "My mother is a teacher.", 1, "/ˈmʌð.ər/"),
  demoWord(5, "father", "baba", "His father works in a hospital.", 1, "/ˈfɑː.ðər/"),
  demoWord(6, "please", "lütfen", "Could you help me, please?", 1, "/pliːz/"),
  demoWord(7, "because", "çünkü", "I stayed home because it was raining.", 2, "/bɪˈkɒz/"),
  demoWord(8, "beautiful", "güzel", "What a beautiful morning!", 2, "/ˈbjuː.tɪ.fəl/"),
  demoWord(9, "together", "birlikte", "We study English together.", 2, "/təˈɡeð.ər/"),
  demoWord(10, "important", "önemli", "This meeting is very important.", 2, "/ɪmˈpɔː.tənt/"),
  demoWord(11, "people", "insanlar", "Many people live in this city.", 2, "/ˈpiː.pəl/"),
  demoWord(12, "believe", "inanmak", "I believe you can do it.", 2, "/bɪˈliːv/"),
  demoWord(13, "enough", "yeterli", "There is enough food for everyone.", 2, "/ɪˈnʌf/"),
  demoWord(14, "receive", "almak", "Did you receive my message?", 3, "/rɪˈsiːv/"),
  demoWord(15, "glimpse", "göz atmak", "I caught a glimpse of the ocean.", 2, "/ɡlɪmps/"),
  demoWord(16, "resilient", "dayanıklı", "She is resilient under pressure.", 3, "/rɪˈzɪl.i.ənt/"),
  demoWord(17, "serendipity", "tesadüfi keşif", "Finding that cafe was pure serendipity.", 4, "/ˌser.ənˈdɪp.ə.ti/"),
  demoWord(18, "practice", "pratik yapmak", "Practice every day to improve.", 2, "/ˈpræk.tɪs/"),
  demoWord(19, "language", "dil", "English is a useful language.", 2, "/ˈlæŋ.ɡwɪdʒ/"),
  demoWord(20, "remember", "hatırlamak", "Please remember to lock the door.", 2, "/rɪˈmem.bər/"),
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
  {
    id: 3,
    user_id: DEMO_PROFILE.id,
    grammar_id: 3,
    ease_factor: 2.5,
    repetition: 0,
    interval: 1,
    next_review: today(),
    correct_count: 0,
    wrong_count: 0,
    last_answered: today(),
    grammar_rules: {
      id: 3,
      title: "Past Simple",
      difficulty: 1,
      question: "Yesterday I ___ (visit) my grandmother.",
      correct_answer: "visited",
      explanation: "Düzenli fiillerde -ed eklenir.",
      example: "Yesterday I visited my grandmother.",
    },
  },
  {
    id: 4,
    user_id: DEMO_PROFILE.id,
    grammar_id: 4,
    ease_factor: 2.5,
    repetition: 0,
    interval: 1,
    next_review: today(),
    correct_count: 0,
    wrong_count: 0,
    last_answered: today(),
    grammar_rules: {
      id: 4,
      title: "Articles",
      difficulty: 1,
      question: "I bought ___ apple and ___ orange.",
      correct_answer: "an / an",
      explanation: "Sesli harfle başlayan kelimelerde an kullanılır.",
      example: "I bought an apple and an orange.",
    },
  },
  {
    id: 5,
    user_id: DEMO_PROFILE.id,
    grammar_id: 5,
    ease_factor: 2.5,
    repetition: 0,
    interval: 1,
    next_review: today(),
    correct_count: 0,
    wrong_count: 0,
    last_answered: today(),
    grammar_rules: {
      id: 5,
      title: "Comparatives",
      difficulty: 2,
      question: "This book is ___ (interesting) than that one.",
      correct_answer: "more interesting",
      explanation: "Uzun sıfatlarda more + adjective kullanılır.",
      example: "This book is more interesting than that one.",
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

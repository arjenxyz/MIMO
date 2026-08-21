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
      "Anna [[wakes:2]] up early every morning. She [[eats:2]] breakfast with her family and then [[goes:2]] to school.",
    correct_answer: "wakes|eats|goes",
    difficulty: 1,
    topic: "[A1] Morning at Home",
    created_at: today(),
  },
  {
    id: 2,
    question_type_id: 1,
    question_text:
      "Last weekend we [[visited:3]] our cousins in London. While we were [[walking:3]] in the park, it [[started:3]] to rain, so we [[went:2]] to a cafe.",
    correct_answer: "visited|walking|started|went",
    difficulty: 2,
    topic: "[A2] A Trip to the City",
    created_at: today(),
  },
  {
    id: 3,
    question_type_id: 1,
    question_text:
      "Many students have [[improved:4]] their English because they [[practice:4]] every day. If you [[study:3]] regularly, you will [[notice:3]] better results. Online courses are often [[designed:4]] for busy people.",
    correct_answer: "improved|practice|study|notice|designed",
    difficulty: 3,
    topic: "[B1] Learning Online",
    created_at: today(),
  },
  {
    id: 4,
    question_type_id: 1,
    question_text:
      "City planners are redesigning streets to [[encourage:4]] walking and cycling. Although traffic is still a [[challenge:4]], better public transport has [[reduced:4]] air pollution. If more people [[chose:3]] bikes, cities would become quieter and [[healthier:4]].",
    correct_answer: "encourage|challenge|reduced|chose|healthier",
    difficulty: 4,
    topic: "[B2] Greener Cities",
    created_at: today(),
  },
  {
    id: 5,
    question_type_id: 1,
    question_text:
      "Tom [[likes:2]] football. He [[plays:2]] with his friends after school and they [[drink:2]] water when they are [[tired:2]].",
    correct_answer: "likes|plays|drink|tired",
    difficulty: 1,
    topic: "[A1] After School Sport",
    created_at: today(),
  },
  {
    id: 6,
    question_type_id: 1,
    question_text:
      "Yesterday Maya [[cooked:3]] dinner for her family. They [[watched:3]] a film together and [[went:2]] to bed early.",
    correct_answer: "cooked|watched|went",
    difficulty: 2,
    topic: "[A2] A Quiet Evening",
    created_at: today(),
  },
  {
    id: 7,
    question_type_id: 1,
    question_text:
      "Plastic bottles are often [[recycled:4]] in this town. People have [[started:3]] using cloth bags, and shops now [[offer:2]] discounts if you bring your own bag.",
    correct_answer: "recycled|started|offer",
    difficulty: 3,
    topic: "[B1] Recycling at Home",
    created_at: today(),
  },
  {
    id: 8,
    question_type_id: 1,
    question_text:
      "Travelers should [[arrive:3]] at the airport early. Long lines can make people [[miss:2]] their [[flights:3]], so planning ahead is [[important:3]].",
    correct_answer: "arrive|miss|flights|important",
    difficulty: 2,
    topic: "[A2] Airport Tips",
    created_at: today(),
  },
  {
    id: 9,
    question_type_id: 1,
    question_text:
      "If the company [[invested:4]] more in training, staff would feel more [[confident:4]]. Managers said that better skills had already [[improved:4]] customer service.",
    correct_answer: "invested|confident|improved",
    difficulty: 4,
    topic: "[B2] Skills at Work",
    created_at: today(),
  },
];

import type {
  DailyQuests,
  DETExercise,
  DueGrammarItem,
  DueWordItem,
  FriendshipRow,
  FriendProfile,
  Profile,
  Story,
} from "@/types";

/**
 * Sample-data / skip-auth mode — opt-in only.
 * Set NEXT_PUBLIC_DEMO_MODE=true for local sample data without login.
 * Do NOT auto-enable on localhost/development: that makes every account look
 * identical (same streak, path, words) and hides real Supabase progress.
 */
export function isDemoMode(hostname?: string | null) {
  void hostname;
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

export const DEMO_PROFILE: Profile = {
  id: "00000000-0000-4000-8000-000000000001",
  username: "demo_ogrenci",
  display_name: "Demo Öğrenci",
  age: 18,
  profile_completed_at: new Date().toISOString(),
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
  phonetic: string | null = null,
  community?: { username: string; avatar?: string | null }
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
      is_global: community ? true : id % 7 === 0 ? false : true,
      created_by: community ? "community-user" : id % 7 === 0 ? DEMO_PROFILE.id : null,
      uploader_username: community?.username ?? null,
      uploader_avatar_url: community?.avatar ?? null,
    },
  };
}

/** Rich demo pool for quiz / match / spelling / listen-type previews. */
export const DEMO_DUE_WORDS: DueWordItem[] = [
  demoWord(1, "friend", "arkadaş", "She is my best friend.", 1, "/frend/"),
  demoWord(2, "water", "su", "Please drink more water.", 1, "/ˈwɔː.tər/", {
    username: "Ayşe",
  }),
  demoWord(3, "school", "okul", "The children walk to school.", 1, "/skuːl/", {
    username: "Mert",
  }),
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
      "Maya [[lives:2]] near the park and [[goes:2]] to work by bus every day. Last Friday she [[visited:3]] a new cafe while her friends were [[waiting:3]] outside. She has [[tried:3]] many recipes this month, and if the weather [[stays:2]] warm, they will [[walk:2]] by the river. The cafe was [[opened:3]] last year; Maya said she would [[return:3]] if the coffee [[stayed:3]] this good.",
    correct_answer: "lives|goes|visited|waiting|tried|stays|walk|opened|return|stayed",
    difficulty: 3,
    topic: "A Busy Week in Town",
    created_at: today(),
  },
  {
    id: 2,
    question_type_id: 1,
    question_text:
      "Tom [[plays:2]] football after school and [[drinks:2]] water when he is tired. Yesterday he [[scored:3]] two goals while the coach was [[watching:3]] carefully. He has [[joined:3]] a new team this year; if he [[trains:3]] hard, he will [[improve:3]] quickly. The field was [[cleaned:3]] before the match, and Tom said he would [[invite:3]] his sister next time.",
    correct_answer: "plays|drinks|scored|watching|joined|trains|improve|cleaned|invite",
    difficulty: 3,
    topic: "Football After School",
    created_at: today(),
  },
  {
    id: 3,
    question_type_id: 1,
    question_text:
      "Lina [[works:2]] in a small bookshop and [[likes:2]] quiet mornings. Last weekend she [[ordered:3]] new novels while customers were [[browsing:3]] the shelves. She has [[read:2]] most of the bestsellers; if sales [[grow:2]], the shop will [[hire:2]] another assistant. Although rent is high, the shop was [[painted:3]] last spring, and Lina said she would [[expand:3]] the cafe corner if more people [[came:2]].",
    correct_answer: "works|likes|ordered|browsing|read|grow|hire|painted|expand|came",
    difficulty: 3,
    topic: "The Bookshop on Main Street",
    created_at: today(),
  },
  {
    id: 4,
    question_type_id: 1,
    question_text:
      "We [[recycle:3]] plastic bottles at home and [[save:2]] glass jars for the kitchen. Last month our street [[organized:4]] a clean-up while neighbors were [[collecting:4]] trash bags. Many families have [[started:3]] using cloth bags; if everyone [[helps:2]], the park will [[look:2]] cleaner. The bins were [[placed:3]] near the gate, and the mayor said the city would [[support:3]] the project if it [[succeeded:4]].",
    correct_answer: "recycle|save|organized|collecting|started|helps|look|placed|support|succeeded",
    difficulty: 3,
    topic: "Cleaning Our Street",
    created_at: today(),
  },
];

const DEMO_ME = DEMO_PROFILE.id;

function demoFriend(
  id: number,
  other: FriendProfile,
  opts: {
    status: "accepted" | "pending";
    direction: "incoming" | "outgoing";
  }
): FriendshipRow {
  const otherIsRequester = opts.direction === "incoming";
  const requester: FriendProfile = otherIsRequester
    ? other
    : { id: DEMO_ME, username: DEMO_PROFILE.username || "demo", daily_streak: DEMO_PROFILE.daily_streak };
  const addressee: FriendProfile = otherIsRequester
    ? { id: DEMO_ME, username: DEMO_PROFILE.username || "demo", daily_streak: DEMO_PROFILE.daily_streak }
    : other;

  return {
    id,
    requester_id: requester.id,
    addressee_id: addressee.id,
    status: opts.status,
    created_at: new Date().toISOString(),
    requester,
    addressee,
    other,
    direction: opts.direction,
  };
}

/** Sample social graph for local demo / Friends panel. */
export const DEMO_FRIENDS: {
  friends: FriendshipRow[];
  incoming: FriendshipRow[];
  outgoing: FriendshipRow[];
  searchPool: FriendProfile[];
} = {
  friends: [
    demoFriend(
      1,
      { id: "demo-friend-ayse", username: "Ayşe", daily_streak: 12 },
      { status: "accepted", direction: "outgoing" }
    ),
    demoFriend(
      2,
      { id: "demo-friend-mert", username: "Mert", daily_streak: 5 },
      { status: "accepted", direction: "incoming" }
    ),
    demoFriend(
      3,
      { id: "demo-friend-zeynep", username: "Zeynep", daily_streak: 21 },
      { status: "accepted", direction: "outgoing" }
    ),
  ],
  incoming: [
    demoFriend(
      4,
      { id: "demo-friend-can", username: "Can", daily_streak: 3 },
      { status: "pending", direction: "incoming" }
    ),
    demoFriend(
      5,
      { id: "demo-friend-elif", username: "Elif", daily_streak: 9 },
      { status: "pending", direction: "incoming" }
    ),
  ],
  outgoing: [
    demoFriend(
      6,
      { id: "demo-friend-deniz", username: "Deniz", daily_streak: 2 },
      { status: "pending", direction: "outgoing" }
    ),
  ],
  searchPool: [
    { id: "demo-search-berk", username: "Berk", daily_streak: 4 },
    { id: "demo-search-selin", username: "Selin", daily_streak: 15 },
    { id: "demo-search-emre", username: "Emre", daily_streak: 1 },
  ],
};

export interface Profile {
  id: string;
  username: string | null;
  display_name?: string | null;
  age?: number | null;
  profile_completed_at?: string | null;
  daily_streak: number;
  last_active: string;
  total_lessons: number;
  daily_quest_bonus_date: string | null;
}

export type FriendshipStatus = "pending" | "accepted" | "rejected";

export type FriendProfile = {
  id: string;
  username: string;
  daily_streak: number;
};

export type FriendshipRow = {
  id: number;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
  created_at: string;
  requester: FriendProfile | null;
  addressee: FriendProfile | null;
  /** The other person relative to the current viewer. */
  other: FriendProfile | null;
  direction: "incoming" | "outgoing";
};

export interface Word {
  id: number;
  english: string;
  turkish: string;
  example_sentence: string | null;
  difficulty: number;
  phonetic?: string | null;
  audio_url?: string | null;
  /** Shared with everyone when true; private to creator when false. */
  is_global?: boolean | null;
  created_by?: string | null;
  uploader_username?: string | null;
  uploader_avatar_url?: string | null;
}

export interface UserWord {
  id: number;
  user_id: string;
  word_id: number;
  ease_factor: number;
  repetition: number;
  interval: number;
  next_review: string;
  correct_count: number;
  wrong_count: number;
  last_answered: string;
  words?: Word;
}

export interface Grammar {
  id: number;
  title: string;
  difficulty: number;
  question: string;
  correct_answer: string;
  explanation: string | null;
  example: string | null;
}

export interface UserGrammar {
  id: number;
  user_id: string;
  grammar_id: number;
  ease_factor: number;
  repetition: number;
  interval: number;
  next_review: string;
  correct_count: number;
  wrong_count: number;
  last_answered: string;
  grammar_rules?: Grammar;
}

export interface Story {
  id: number;
  level: number;
  title: string;
  content: string;
  question1: string;
  question2: string;
  question3: string;
  answer1: string;
  answer2: string;
  answer3: string;
  image_prompt: string | null;
}

export interface UserStory {
  id: number;
  user_id: string;
  story_id: number;
  score: number;
  completed_at: string;
  stories?: Story;
}

export type Quality = 0 | 1 | 2 | 3;
export type ModuleType = "word" | "grammar" | "story";

export interface SM2Result {
  easeFactor: number;
  repetition: number;
  interval: number;
  nextReviewDate: string;
}

export interface DailyQuests {
  wordsDone: number;
  wordsTarget: number;
  grammarDone: number;
  grammarTarget: number;
  storiesDone: number;
  storiesTarget: number;
  allComplete: boolean;
  bonusClaimed: boolean;
}

export interface DueWordItem extends UserWord {
  words: Word;
}

export interface DueGrammarItem extends UserGrammar {
  grammar_rules: Grammar;
}

export interface DETQuestionType {
  id: number;
  type_name: "read_complete" | "read_select" | "listen_type" | "write_photo" | "speak_photo";
  description: string;
}

export interface DETExercise {
  id: number;
  question_type_id: number;
  question_text: string;
  correct_answer: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  topic?: string | null;
  created_at: string;
}

export interface UserDETAnswer {
  id: number;
  user_id: string;
  exercise_id: number;
  user_answer: string;
  is_correct: boolean;
  answered_at: string;
}

export type ChallengeModule = "match" | "word_check";
export type ChallengeStatus =
  | "pending"
  | "declined"
  | "active"
  | "finished"
  | "cancelled";

export type ChallengeSeedWord = {
  id: number;
  english: string;
  turkish: string;
};

export type ChallengeRow = {
  id: number;
  challenger_id: string;
  opponent_id: string;
  module: ChallengeModule;
  status: ChallengeStatus;
  seed_words: ChallengeSeedWord[];
  challenger_score: number;
  opponent_score: number;
  winner_id: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  challenger: FriendProfile | null;
  opponent: FriendProfile | null;
};

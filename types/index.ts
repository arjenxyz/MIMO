export interface Profile {
  id: string;
  username: string | null;
  xp: number;
  level: number;
  daily_streak: number;
  last_active: string;
  total_lessons: number;
  daily_quest_bonus_date: string | null;
}

export interface Word {
  id: number;
  english: string;
  turkish: string;
  example_sentence: string | null;
  difficulty: number;
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

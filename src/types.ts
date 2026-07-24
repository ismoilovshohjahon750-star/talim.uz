export type QuestionType = 'single' | 'multi' | 'yn' | 'match' | 'order';

export interface QuestionOption {
  en: string;
  uz: string;
  ok: boolean;
}

export interface YNItem {
  en: string;
  uz: string;
  ok: boolean;
}

export interface MatchPair {
  t: string;  // term
  en: string; // definition english
  uz: string; // definition uzbek
}

export interface OrderStep {
  en: string;
  uz: string;
}

export interface Question {
  n: number;
  type: QuestionType;
  qen: string;
  quz: string;
  opts?: QuestionOption[];
  yn?: YNItem[];
  pairs?: MatchPair[];
  steps?: OrderStep[];
  need?: number;
}

export interface TestModule {
  id: string;
  title: string;
  level: string; // "Level 1", "Level 2", "Level 3"
  questions: Question[];
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'student';
  registeredAt: string;
  lastActive: string;
  testsTaken: number;
  avgScore: number;
}

export interface UserAttempt {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  testId: string;
  testTitle: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  completedAt: string;
}

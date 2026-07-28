export const ADMIN_EMAILS = [
  'ismoilovshohjahon750@gmail.com',
  'ranvar611@gmail.com',
];

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

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
  isPaid?: boolean;
  price?: number; // Price in USD ($4 - $10)
}

export interface TestModule {
  id: string;
  title: string;
  subject?: string; // Fan: masalan "Biologiya", "Informatika (IC3)", "Fizika", etc.
  level: string; // "Level 1", "Level 2", "Level 3"
  questions: Question[];
  isPaid?: boolean;
  price?: number; // Price in USD ($4 - $10)
}

export function getNormalizedSubject(module: TestModule): string {
  if (module.subject && module.subject.trim()) {
    return module.subject.trim();
  }
  const title = (module.title || '').toLowerCase();
  const level = (module.level || '').toLowerCase();
  const id = (module.id || '').toLowerCase();

  if (title.includes('bio') || level.includes('bio') || id.includes('bio')) {
    return 'Biologiya';
  }
  if (title.includes('fizik') || level.includes('fizik')) {
    return 'Fizika';
  }
  if (title.includes('kimyo') || level.includes('kimyo')) {
    return 'Kimyo';
  }
  if (title.includes('matem') || level.includes('matem')) {
    return 'Matematika';
  }
  if (title.includes('info') || title.includes('ic3') || level.includes('ic3')) {
    return 'Informatika (IC3)';
  }
  return 'Biologiya';
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
  unlockedTests?: string[]; // IDs of unlocked test modules or questions
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

export interface ChatMessage {
  id: string;
  senderUid: string;
  senderName: string;
  senderEmail?: string;
  senderAvatar?: string;
  text: string;
  createdAt: string;
  timestamp?: number | any;
  channelId?: string;
}

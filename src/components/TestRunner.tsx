import React, { useState, useRef } from 'react';
import { TestModule, Question, QuestionOption, YNItem, MatchPair, OrderStep, UserProfile, isAdminEmail, getNormalizedSubject } from '../types';
import { CheckCircle2, XCircle, ArrowRight, ArrowLeft, RotateCcw, Award, Globe, HelpCircle, Check, Sparkles, Lock, Unlock, CreditCard, ShieldCheck, CheckCircle, DollarSign, Star, BookOpen, Layers, ChevronLeft, ChevronRight, Dna, Laptop, Zap, FlaskConical, ChevronUp, ChevronDown } from 'lucide-react';
import { Language, translations } from '../lib/i18n';

interface Props {
  modules: TestModule[];
  currentUser: UserProfile | null;
  onSaveAttempt: (testId: string, testTitle: string, score: number, total: number) => void;
  onUnlockTest?: (testId: string) => void;
  onOpenAuth?: () => void;
  onTestActiveChange?: (active: boolean) => void;
  lang?: Language;
  onLangChange?: (lang: Language) => void;
}

export const TestRunner: React.FC<Props> = ({
  modules,
  currentUser,
  onSaveAttempt,
  onUnlockTest,
  onOpenAuth,
  onTestActiveChange,
  lang: propLang,
  onLangChange,
}) => {
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const subjectScrollRef = useRef<HTMLDivElement>(null);

  const scrollSubject = (direction: 'left' | 'right') => {
    if (subjectScrollRef.current) {
      subjectScrollRef.current.scrollBy({
        left: direction === 'left' ? -220 : 220,
        behavior: 'smooth',
      });
    }
  };
  const [activeModule, setActiveModuleState] = useState<TestModule | null>(null);

  const setActiveModule = (mod: TestModule | null) => {
    setActiveModuleState(mod);
    if (onTestActiveChange) {
      onTestActiveChange(!!mod);
    }
  };
  const [currentQIndex, setCurrentQIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [internalLang, setInternalLang] = useState<Language>('uz');
  const lang = propLang || internalLang;

  const setLang = (l: Language) => {
    setInternalLang(l);
    if (onLangChange) {
      onLangChange(l);
    }
  };

  const currentLang = (lang && translations[lang]) ? lang : 'uz';
  const t = translations[currentLang];
  const [isFinished, setIsFinished] = useState<boolean>(false);

  // Payment Modal State
  const [paymentModalModule, setPaymentModalModule] = useState<TestModule | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);

  const isAdmin = currentUser?.role === 'admin' || isAdminEmail(currentUser?.email);

  const isModuleUnlocked = (m: TestModule): boolean => {
    if (isAdmin) return true;
    if (!m.isPaid) return true;
    return currentUser?.unlockedTests?.includes(m.id) || false;
  };

  // Get distinct normalized subjects
  const rawSubjects: string[] = Array.from(new Set(modules.map((m) => getNormalizedSubject(m))));
  const defaultSubjects: string[] = ['Biologiya', 'Informatika (IC3)', 'Fizika', 'Kimyo', 'Matematika'];
  const allKnownSubjects: string[] = Array.from(new Set<string>([...defaultSubjects, ...rawSubjects]));

  // Filter modules by subject & level
  const filteredModules = modules.filter((m) => {
    const normSub = getNormalizedSubject(m);
    const matchesSubject =
      selectedSubject === 'all' || normSub.toLowerCase() === selectedSubject.toLowerCase();

    const normLvl = (m.level || '').toLowerCase();
    const matchesLevel =
      selectedLevel === 'all' || normLvl.includes(selectedLevel.toLowerCase());

    return matchesSubject && matchesLevel;
  });

  // Fisher-Yates array shuffle algorithm
  const shuffleArray = <T,>(arr: T[]): T[] => {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const startTest = (module: TestModule) => {
    if (!isModuleUnlocked(module)) {
      if (!currentUser) {
        if (onOpenAuth) {
          onOpenAuth();
        } else {
          alert("Pullik testni xarid qilish uchun iltimos, avval tizimga kiring!");
        }
        return;
      }
      setPaymentModalModule(module);
      return;
    }

    // Always fetch fresh original module questions from modules array
    const originalModule = modules.find((m) => m.id === module.id) || module;
    const rawQuestions = originalModule.questions || [];

    // Shuffle question order & option order for every user/session
    const shuffledQuestions = shuffleArray<Question>(rawQuestions).map((q: Question) => {
      if ((q.type === 'single' || q.type === 'multi') && q.opts && q.opts.length > 0) {
        return {
          ...q,
          opts: shuffleArray<QuestionOption>(q.opts),
        };
      }
      return q;
    });

    setActiveModule({
      ...originalModule,
      questions: shuffledQuestions,
    });
    setCurrentQIndex(0);
    setAnswers({});
    setIsFinished(false);
  };

  const handleSingleSelect = (qIndex: number, optIndex: number) => {
    setAnswers((prev) => ({ ...prev, [qIndex]: optIndex }));
  };

  const handleMultiSelect = (qIndex: number, optIndex: number) => {
    setAnswers((prev) => {
      const currentList: number[] = prev[qIndex] || [];
      const updated = currentList.includes(optIndex)
        ? currentList.filter((i) => i !== optIndex)
        : [...currentList, optIndex];
      return { ...prev, [qIndex]: updated };
    });
  };

  const handleYNSelect = (qIndex: number, itemIndex: number, choice: boolean) => {
    setAnswers((prev) => {
      const currentObj: Record<number, boolean> = prev[qIndex] || {};
      return {
        ...prev,
        [qIndex]: { ...currentObj, [itemIndex]: choice },
      };
    });
  };

  const handleMatchSelect = (qIndex: number, pairIndex: number, selectedDef: string) => {
    setAnswers((prev) => {
      const currentObj: Record<number, string> = prev[qIndex] || {};
      return {
        ...prev,
        [qIndex]: { ...currentObj, [pairIndex]: selectedDef },
      };
    });
  };

  const handleOrderMove = (qIndex: number, fromIndex: number, direction: 'up' | 'down', defaultSteps: OrderStep[]) => {
    setAnswers((prev) => {
      const currentOrder: OrderStep[] = prev[qIndex]
        ? [...prev[qIndex]]
        : [...defaultSteps];
      
      const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
      if (toIndex < 0 || toIndex >= currentOrder.length) return prev;

      const temp = currentOrder[fromIndex];
      currentOrder[fromIndex] = currentOrder[toIndex];
      currentOrder[toIndex] = temp;

      return { ...prev, [qIndex]: currentOrder };
    });
  };

  // Evaluate single question score
  const isQuestionCorrect = (q: Question, qIndex: number): boolean => {
    const userAns = answers[qIndex];
    if (userAns === undefined) return false;

    if (q.type === 'single') {
      const opts = q.opts || [];
      const correctIndex = opts.findIndex((o) => o.ok);
      return userAns === correctIndex;
    }

    if (q.type === 'multi') {
      const opts = q.opts || [];
      const correctIndices = opts
        .map((o, idx) => (o.ok ? idx : -1))
        .filter((idx) => idx !== -1);
      
      const userIndices: number[] = userAns || [];
      if (userIndices.length !== correctIndices.length) return false;
      return correctIndices.every((idx) => userIndices.includes(idx));
    }

    if (q.type === 'yn') {
      const ynList = q.yn || [];
      const userYNObj: Record<number, boolean> = userAns || {};
      return ynList.every((item, idx) => userYNObj[idx] === item.ok);
    }

    if (q.type === 'match') {
      const pairs = q.pairs || [];
      const userMatchObj: Record<number, string> = userAns || {};
      return pairs.every((pair, idx) => {
        const val = userMatchObj[idx];
        return val === (lang === 'uz' ? pair.uz : pair.en);
      });
    }

    if (q.type === 'order') {
      const defaultSteps = q.steps || [];
      const userOrder: OrderStep[] = userAns || defaultSteps;
      return defaultSteps.every((step, idx) => {
        const userStep = userOrder[idx];
        return userStep && userStep.en === step.en;
      });
    }

    return false;
  };

  const calculateTotalScore = () => {
    if (!activeModule) return { score: 0, total: 0, percent: 0 };
    let score = 0;
    const questions = activeModule.questions || [];
    questions.forEach((q, idx) => {
      if (isQuestionCorrect(q, idx)) score++;
    });
    const total = questions.length;
    const percent = total > 0 ? Math.round((score / total) * 100) : 0;
    return { score, total, percent };
  };

  const finishTest = () => {
    if (!activeModule) return;
    const { score, total } = calculateTotalScore();
    setIsFinished(true);
    onSaveAttempt(activeModule.id, activeModule.title, score, total);
  };

  // View: Test Selection Hub
  if (!activeModule) {
    return (
      <div className="wrap">
        {/* Hero Section */}
        <div className="hero bg-gradient-to-br from-sky-700 via-sky-600 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden mb-6 border border-sky-500/20">
          <div className="absolute inset-0 bg-girikh-pattern opacity-10 pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-start gap-4 sm:gap-5">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-gradient-to-tr from-sky-500 via-blue-600 to-indigo-600 flex items-center justify-center text-white border-2 border-sky-300/40 shadow-2xl shrink-0 hidden sm:flex">
                <Award className="w-9 h-9 sm:w-11 sm:h-11 text-amber-300 drop-shadow-md" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 bg-sky-500/20 text-sky-100 font-bold px-3 py-1 rounded-full text-xs mb-2.5 border border-sky-300/30 backdrop-blur-xs">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span>{t.heroBadge}</span>
                </div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white leading-tight">
                  {t.heroTitle}
                </h1>
                <p className="text-sky-100/90 text-xs sm:text-sm mt-2 max-w-2xl leading-relaxed font-normal">
                  {t.heroSubtitle}
                </p>

                {/* Quick Stat Badges */}
                <div className="flex items-center gap-3 mt-4 flex-wrap text-xs font-semibold">
                  <span className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-xl border border-white/15 text-sky-100 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-amber-400" /> {(t.modulesCountBadge || '{count} Test Modules').replace('{count}', String(modules.length))}
                  </span>
                  <span className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-xl border border-white/15 text-sky-100 flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> {t.gs6Badge}
                  </span>
                  <span className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-xl border border-white/15 text-sky-100 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> {t.aiAnalysisBadge}
                  </span>
                </div>
              </div>
            </div>


          </div>
        </div>

        {/* Subject & Level Filters */}
        <div className="mb-6 space-y-3">
          {/* Main Subject Tabs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-sky-600" /> {t.subjectsSection}:
              </div>

              {/* Navigation buttons: Orqaga / Oldinga */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => scrollSubject('left')}
                  title={t.scrollLeft}
                  className="px-2.5 py-1 rounded-xl bg-white hover:bg-sky-50 border border-slate-200 text-slate-700 hover:text-sky-600 text-xs font-bold transition flex items-center gap-1 shadow-2xs active:scale-95"
                >
                  <ChevronLeft className="w-4 h-4 text-sky-600" />
                  <span className="hidden sm:inline">{t.scrollLeft}</span>
                </button>
                <button
                  type="button"
                  onClick={() => scrollSubject('right')}
                  title={t.scrollRight}
                  className="px-2.5 py-1 rounded-xl bg-white hover:bg-sky-50 border border-slate-200 text-slate-700 hover:text-sky-600 text-xs font-bold transition flex items-center gap-1 shadow-2xs active:scale-95"
                >
                  <span className="hidden sm:inline">{t.scrollRight}</span>
                  <ChevronRight className="w-4 h-4 text-sky-600" />
                </button>
              </div>
            </div>

            <div>
              <div
                ref={subjectScrollRef}
                className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 scrollbar-none scroll-smooth grow"
              >
                <button
                  onClick={() => setSelectedSubject('all')}
                  className={`px-4 py-2 rounded-2xl text-xs font-extrabold whitespace-nowrap transition flex items-center gap-1.5 border shrink-0 active:scale-95 ${
                    selectedSubject === 'all'
                      ? 'bg-sky-600 text-white border-sky-600 shadow-md shadow-sky-600/20'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" /> {(t.allSubjects || 'All Subjects ({count})').replace('{count}', String(modules.length))}
                </button>
                {allKnownSubjects.map((sub) => {
                  const subCount = modules.filter((m) => getNormalizedSubject(m).toLowerCase() === sub.toLowerCase()).length;
                  return (
                    <button
                      key={sub}
                      onClick={() => setSelectedSubject(sub)}
                      className={`px-4 py-2 rounded-2xl text-xs font-extrabold whitespace-nowrap transition flex items-center gap-1.5 border shrink-0 active:scale-95 ${
                        selectedSubject.toLowerCase() === sub.toLowerCase()
                          ? 'bg-sky-600 text-white border-sky-600 shadow-md shadow-sky-600/20'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span>
                        {sub === 'Biologiya' ? (
                          <Dna className="w-3.5 h-3.5" />
                        ) : sub.includes('Informatika') ? (
                          <Laptop className="w-3.5 h-3.5" />
                        ) : sub === 'Fizika' ? (
                          <Zap className="w-3.5 h-3.5" />
                        ) : sub === 'Kimyo' ? (
                          <FlaskConical className="w-3.5 h-3.5" />
                        ) : (
                          <BookOpen className="w-3.5 h-3.5" />
                        )}
                      </span>
                      <span>{sub}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                        selectedSubject.toLowerCase() === sub.toLowerCase() ? 'bg-sky-800 text-sky-100' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {subCount}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Level Filter Sub-pills */}
          <div className="flex items-center gap-2 bg-white/90 backdrop-blur-xs p-1.5 rounded-2xl border border-slate-200 shadow-2xs w-fit flex-wrap">
            <span className="text-[11px] font-bold text-slate-500 px-2">{t.levelFilterLabel}:</span>
            <button
              onClick={() => setSelectedLevel('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 ${
                selectedLevel === 'all'
                  ? 'bg-sky-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {t.levelAll}
            </button>
            <button
              onClick={() => setSelectedLevel('level 1')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 ${
                selectedLevel === 'level 1'
                  ? 'bg-sky-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {t.levelEasy}
            </button>
            <button
              onClick={() => setSelectedLevel('level 2')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 ${
                selectedLevel === 'level 2'
                  ? 'bg-sky-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {t.levelMedium}
            </button>
            <button
              onClick={() => setSelectedLevel('level 3')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 ${
                selectedLevel === 'level 3'
                  ? 'bg-sky-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {t.levelHard}
            </button>
          </div>
        </div>

        {/* Test Cards Grid */}
        {filteredModules.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-gray-200 shadow-sm max-w-xl mx-auto my-8">
            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <HelpCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">{t.noTestsFoundTitle}</h3>
            <p className="text-gray-500 text-sm mb-6 leading-relaxed">
              {t.noTestsFoundSub}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredModules.map((m) => {
              const unlocked = isModuleUnlocked(m);
              const subjectName = getNormalizedSubject(m);
              return (
                <div
                  key={m.id}
                  onClick={() => startTest(m)}
                  className={`tcard group transition relative ${
                    m.isPaid && !unlocked
                      ? 'hover:border-amber-500 bg-linear-to-b from-white to-amber-50/20'
                      : 'hover:border-indigo-500'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-extrabold bg-indigo-600 text-white px-2.5 py-0.5 rounded-lg shadow-2xs flex items-center gap-1">
                          <span>
                            {subjectName === 'Biologiya' ? (
                              <Dna className="w-3.5 h-3.5" />
                            ) : subjectName.includes('Informatika') ? (
                              <Laptop className="w-3.5 h-3.5" />
                            ) : subjectName === 'Fizika' ? (
                              <Zap className="w-3.5 h-3.5" />
                            ) : subjectName === 'Kimyo' ? (
                              <FlaskConical className="w-3.5 h-3.5" />
                            ) : (
                              <BookOpen className="w-3.5 h-3.5" />
                            )}
                          </span> {subjectName}
                        </span>
                        <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-lg border border-indigo-100">
                          {m.level}
                        </span>
                      </div>

                      {m.isPaid ? (
                        unlocked ? (
                          <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full flex items-center gap-1 border border-emerald-200">
                            <Unlock className="w-3.5 h-3.5 text-emerald-600" /> {t.unlockedBadge} (${m.price || 5})
                          </span>
                        ) : (
                          <span className="text-xs font-bold bg-amber-100 text-amber-900 px-2.5 py-1 rounded-full flex items-center gap-1 border border-amber-300 shadow-2xs">
                            <Lock className="w-3.5 h-3.5 text-amber-600" /> {t.paidBadge} (${m.price || 5})
                          </span>
                        )
                      ) : (
                        <span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-100">
                          {t.freeBadge}
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition">
                      {m.title}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {(t.cardQuestionCountDesc || '{count} questions').replace('{count}', String((m.questions || []).length))}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
                    {m.isPaid && !unlocked ? (
                      <span className="text-xs font-bold text-amber-700 group-hover:translate-x-1 transition flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5" /> {t.purchaseBtn} (${m.price || 5}.00)
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-indigo-600 group-hover:translate-x-1 transition flex items-center gap-1">
                        {t.startTestBtn} <ArrowRight className="w-4 h-4" />
                      </span>
                    )}

                    <span className="text-[11px] text-gray-400 font-semibold">
                      {(t.questionsCountTag || '{count} questions').replace('{count}', String((m.questions || []).length))}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Payment & Unlock Modal */}
        {paymentModalModule && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
            <div className="bg-white rounded-t-3xl sm:rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-100 shadow-2xl relative max-h-[92vh] overflow-y-auto">
              {/* Mobile Handle */}
              <div className="sm:hidden w-12 h-1.5 bg-slate-200 rounded-full mx-auto -mt-2 mb-4" />
              <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-200 shadow-xs">
                <Lock className="w-7 h-7" />
              </div>

              <div className="text-center mb-6">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-800 bg-amber-100 px-3 py-1 rounded-full border border-amber-200 inline-flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /> {t.premiumTestBadge}
                </span>
                <h3 className="text-xl font-extrabold text-gray-900 mt-2">
                  {paymentModalModule.title}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  {(t.paidTestDesc || '{count} questions').replace('{count}', String(paymentModalModule.questions.length))}
                </p>
              </div>

              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 mb-6 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-gray-600">{t.priceLabel}:</span>
                  <span className="text-2xl font-black text-amber-600">${paymentModalModule.price || 5}.00 USD</span>
                </div>
                <div className="text-xs text-gray-600 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{t.benefit1}</span>
                </div>
                <div className="text-xs text-gray-600 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{t.benefit2}</span>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={async () => {
                    setIsProcessingPayment(true);
                    setTimeout(() => {
                      if (onUnlockTest && paymentModalModule) {
                        onUnlockTest(paymentModalModule.id);
                      }
                      const unlockedModule = paymentModalModule;
                      setPaymentModalModule(null);
                      setIsProcessingPayment(false);
                      if (unlockedModule) {
                        startTest(unlockedModule);
                      }
                    }, 700);
                  }}
                  disabled={isProcessingPayment}
                  className="w-full btn py-3.5 rounded-2xl font-bold text-sm shadow-md flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-indigo-600 text-white hover:opacity-95 transition"
                >
                  {isProcessingPayment ? (
                    <>
                      <Sparkles className="w-4 h-4 animate-spin text-amber-200" /> {t.processingPayment}
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" /> {t.payNowBtn} (${paymentModalModule.price || 5}.00)
                    </>
                  )}
                </button>

                <button
                  onClick={() => setPaymentModalModule(null)}
                  className="w-full btn btn-secondary py-3 rounded-2xl text-xs font-semibold"
                >
                  {t.closeBtn}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // View: Test Results Screen
  if (isFinished) {
    const { score, total, percent } = calculateTotalScore();
    const isPassed = percent >= 70;

    return (
      <div className="wrap max-w-3xl animate-fade-in">
        <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-xl text-center mb-8">
          <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${
            isPassed ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
          }`}>
            <Award className="w-10 h-10" />
          </div>

          <h2 className="text-3xl font-extrabold text-gray-900 inline-flex items-center justify-center gap-2 flex-wrap">
            <span>{isPassed ? t.resultsPassTitle : t.resultsFailTitle}</span>
            {isPassed && <Sparkles className="w-7 h-7 text-amber-500 inline" />}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {activeModule.title} — {t.examResultsSub}
          </p>

          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto my-6 p-4 bg-gray-50 rounded-2xl border border-gray-200">
            <div>
              <div className="text-2xl font-black text-gray-900">{score}/{total}</div>
              <div className="text-xs text-gray-500 font-medium">{t.correctAnswersLabel}</div>
            </div>
            <div>
              <div className={`text-2xl font-black ${isPassed ? 'text-emerald-600' : 'text-rose-600'}`}>
                {percent}%
              </div>
              <div className="text-xs text-gray-500 font-medium">{t.percentageLabel}</div>
            </div>
            <div>
              <div className="text-2xl font-black text-indigo-600">
                {isPassed ? t.statusPassed : t.statusFailed}
              </div>
              <div className="text-xs text-gray-500 font-medium">{t.statusLabel}</div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => startTest(activeModule)}
              className="btn btn-primary py-2.5 px-6 text-sm"
            >
              <RotateCcw className="w-4 h-4" /> {t.retakeBtn}
            </button>
            <button
              onClick={() => setActiveModule(null)}
              className="btn btn-secondary py-2.5 px-6 text-sm"
            >
              {t.backToTestsBtn}
            </button>
          </div>
        </div>

        {/* Detailed Question Review */}
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          {t.questionsReviewTitle}
        </h3>

        <div className="space-y-6">
          {(activeModule.questions || []).map((q, qIdx) => {
            const correct = isQuestionCorrect(q, qIdx);
            return (
              <div
                key={qIdx}
                className={`qcard border-2 ${
                  correct ? 'border-emerald-200 bg-emerald-50/20' : 'border-rose-200 bg-rose-50/20'
                }`}
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm bg-gray-100 text-gray-700 px-2.5 py-1 rounded-lg">
                      #{qIdx + 1}
                    </span>
                    <span className="text-xs uppercase font-bold tracking-wide text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                      {q.type}
                    </span>
                  </div>
                  {correct ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {t.correctTag}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-bold bg-rose-100 text-rose-800 px-3 py-1 rounded-full">
                      <XCircle className="w-4 h-4 text-rose-600" /> {t.incorrectTag}
                    </span>
                  )}
                </div>

                <p className="font-bold text-gray-900 text-base mb-1">
                  {lang === 'uz' ? q.quz : q.qen}
                </p>
                <p className="text-xs text-gray-500 italic mb-4">
                  {lang === 'uz' ? q.qen : q.quz}
                </p>

                {/* Show Options according to question type */}
                {q.type === 'single' || q.type === 'multi' ? (
                  <div className="space-y-2">
                    {q.opts?.map((opt, optIdx) => (
                      <div
                        key={optIdx}
                        className={`p-3 rounded-xl text-sm border font-medium flex items-center justify-between ${
                          opt.ok
                            ? 'bg-emerald-100/70 border-emerald-300 text-emerald-900 font-bold'
                            : answers[qIdx] === optIdx || (Array.isArray(answers[qIdx]) && answers[qIdx].includes(optIdx))
                            ? 'bg-rose-100/70 border-rose-300 text-rose-900'
                            : 'bg-white border-gray-200 text-gray-700'
                        }`}
                      >
                        <span>{lang === 'uz' ? opt.uz : opt.en}</span>
                        {opt.ok && <Check className="w-4 h-4 text-emerald-700 font-bold" />}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // View: Active Question Runner
  const questionsList = activeModule.questions || [];
  const currentQ = questionsList[currentQIndex] || { type: 'single', quz: '', qen: '', opts: [] };
  const isLastQuestion = questionsList.length > 0 ? currentQIndex === questionsList.length - 1 : true;

  return (
    <div className="wrap max-w-3xl animate-fade-in">
      {/* Top Runner Navigation Bar */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-200 mb-6 shadow-xs">
        <button
          onClick={() => setActiveModule(null)}
          className="text-xs font-semibold text-gray-500 hover:text-gray-900 flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" /> {t.exitBtn}
        </button>

        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-900">
            {(t.questionLabel || 'Question {current} / {total}').replace('{current}', String(currentQIndex + 1)).replace('{total}', String(questionsList.length))}
          </span>
          <div className="w-32 bg-gray-200 h-2 rounded-full overflow-hidden">
            <div
              className="bg-indigo-600 h-full transition-all duration-300"
              style={{
                width: `${((currentQIndex + 1) / (questionsList.length || 1)) * 100}%`,
              }}
            ></div>
          </div>
        </div>

        <button
          onClick={() => setLang(lang === 'uz' ? 'en' : 'uz')}
          className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100 hover:bg-indigo-100 transition inline-flex items-center gap-1.5"
        >
          <Globe className="w-3.5 h-3.5 text-indigo-600" />
          <span>{lang === 'uz' ? "O'zbekcha" : "English"}</span>
        </button>
      </div>

      {/* Main Question Card */}
      <div className="qcard shadow-md">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
            {currentQ.type === 'single' && t.qtypeSingle}
            {currentQ.type === 'multi' && (t.qtypeMulti || 'Select multiple ({need})').replace('{need}', String(currentQ.need || 2))}
            {currentQ.type === 'yn' && t.qtypeYN}
            {currentQ.type === 'match' && t.qtypeMatch}
            {currentQ.type === 'order' && t.qtypeOrder}
          </span>
        </div>

        <h2 className="text-xl font-extrabold text-gray-900 mb-2 leading-snug">
          {lang === 'uz' ? currentQ.quz : currentQ.qen}
        </h2>
        <p className="text-xs text-gray-400 italic mb-6">
          {lang === 'uz' ? currentQ.qen : currentQ.quz}
        </p>

        {/* QUESTION TYPE: SINGLE */}
        {currentQ.type === 'single' && (
          <div className="space-y-3">
            {currentQ.opts?.map((opt, optIdx) => {
              const isSelected = answers[currentQIndex] === optIdx;
              return (
                <div
                  key={optIdx}
                  onClick={() => handleSingleSelect(currentQIndex, optIdx)}
                  className={`opt ${isSelected ? 'selected' : ''}`}
                >
                  <span className="font-medium text-sm">
                    {lang === 'uz' ? opt.uz : opt.en}
                  </span>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-300'
                    }`}
                  >
                    {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* QUESTION TYPE: MULTI */}
        {currentQ.type === 'multi' && (
          <div className="space-y-3">
            {currentQ.opts?.map((opt, optIdx) => {
              const currentList: number[] = answers[currentQIndex] || [];
              const isSelected = currentList.includes(optIdx);
              return (
                <div
                  key={optIdx}
                  onClick={() => handleMultiSelect(currentQIndex, optIdx)}
                  className={`opt ${isSelected ? 'selected' : ''}`}
                >
                  <span className="font-medium text-sm">
                    {lang === 'uz' ? opt.uz : opt.en}
                  </span>
                  <div
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${
                      isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-300'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* QUESTION TYPE: YN */}
        {currentQ.type === 'yn' && (
          <div className="space-y-3">
            {currentQ.yn?.map((item, itemIdx) => {
              const userObj = answers[currentQIndex] || {};
              const selectedValue = userObj[itemIdx];
              return (
                <div key={itemIdx} className="ynrow">
                  <span className="font-medium text-sm text-gray-800 flex-1">
                    {lang === 'uz' ? item.uz : item.en}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleYNSelect(currentQIndex, itemIdx, true)}
                      className={`px-4 py-1.5 rounded-xl text-xs font-bold transition border ${
                        selectedValue === true
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:bg-emerald-50'
                      }`}
                    >
                      {t.yesBtn}
                    </button>
                    <button
                      onClick={() => handleYNSelect(currentQIndex, itemIdx, false)}
                      className={`px-4 py-1.5 rounded-xl text-xs font-bold transition border ${
                        selectedValue === false
                          ? 'bg-rose-600 text-white border-rose-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:bg-rose-50'
                      }`}
                    >
                      {t.noBtn}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* QUESTION TYPE: MATCH */}
        {currentQ.type === 'match' && (
          <div className="space-y-4">
            {currentQ.pairs?.map((pair, pairIdx) => {
              const userObj = answers[currentQIndex] || {};
              const allDefs = currentQ.pairs?.map((p) => (lang === 'uz' ? p.uz : p.en)) || [];
              return (
                <div key={pairIdx} className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  <div className="mterm">
                    {pair.t}
                  </div>
                  <select
                    value={userObj[pairIdx] || ''}
                    onChange={(e) => handleMatchSelect(currentQIndex, pairIdx, e.target.value)}
                    className="w-full p-3 border-1.5 border-gray-300 rounded-xl text-sm font-medium focus:border-indigo-600 focus:outline-none bg-white"
                  >
                    <option value="">{t.selectDefinition}</option>
                    {allDefs.map((defText, dIdx) => (
                      <option key={dIdx} value={defText}>
                        {defText}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        )}

        {/* QUESTION TYPE: ORDER */}
        {currentQ.type === 'order' && (
          <div className="space-y-2">
            <p className="text-xs text-gray-500 mb-2 font-medium">
              {t.orderInstructions}
            </p>
            {(answers[currentQIndex] || currentQ.steps || []).map((step: OrderStep, stepIdx: number) => (
              <div key={stepIdx} className="ostep">
                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center">
                  {stepIdx + 1}
                </span>
                <span className="flex-1 font-medium text-sm text-gray-800">
                  {lang === 'uz' ? step.uz : step.en}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={stepIdx === 0}
                    onClick={() => handleOrderMove(currentQIndex, stepIdx, 'up', currentQ.steps || [])}
                    className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 disabled:opacity-30 flex items-center justify-center"
                    title={t.moveUp}
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    disabled={stepIdx === (answers[currentQIndex] || currentQ.steps || []).length - 1}
                    onClick={() => handleOrderMove(currentQIndex, stepIdx, 'down', currentQ.steps || [])}
                    className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 disabled:opacity-30 flex items-center justify-center"
                    title={t.moveDown}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Navigation Controls */}
        <div className="navrow">
          <button
            disabled={currentQIndex === 0}
            onClick={() => setCurrentQIndex((prev) => prev - 1)}
            className="btn btn-secondary text-sm disabled:opacity-30"
          >
            <ArrowLeft className="w-4 h-4" /> {t.prevBtn}
          </button>

          {isLastQuestion ? (
            <button
              onClick={finishTest}
              className="btn btn-success text-sm py-2.5 px-6 shadow-md"
            >
              <CheckCircle2 className="w-4 h-4" /> {t.finishTestBtn}
            </button>
          ) : (
            <button
              onClick={() => setCurrentQIndex((prev) => prev + 1)}
              className="btn btn-primary text-sm py-2.5 px-6"
            >
              {t.nextBtn} <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

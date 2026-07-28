import React, { useState, useEffect } from 'react';
import { UserProfile, UserAttempt, TestModule, isAdminEmail } from '../types';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { collection, query, where, onSnapshot, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import {
  X,
  LogOut,
  ShieldCheck,
  Award,
  BookOpen,
  CheckCircle2,
  XCircle,
  Calendar,
  Sparkles,
  ChevronRight,
  User,
  Unlock,
  TrendingUp,
  RotateCcw,
  Key,
  MessageSquare,
  Check,
  Trash2,
  Camera,
} from 'lucide-react';
import { Language, translations } from '../lib/i18n';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  attempts: UserAttempt[];
  modules: TestModule[];
  onLogout: () => void;
  viewMode: 'student' | 'admin';
  onToggleViewMode: (mode: 'student' | 'admin') => void;
  lang: Language;
}

export const ProfileModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentUser,
  attempts,
  modules,
  onLogout,
  viewMode,
  onToggleViewMode,
  lang = 'uz',
}) => {
  const [pwdResetLoading, setPwdResetLoading] = useState(false);
  const [pwdResetSent, setPwdResetSent] = useState(false);
  const [pwdResetError, setPwdResetError] = useState<string | null>(null);
  const [chatRequests, setChatRequests] = useState<Array<any>>([]);

  useEffect(() => {
    if (!isOpen || !currentUser) return;
    const emailLower = (currentUser.email || '').toLowerCase();
    const uid = currentUser.id || '';

    const q1 = query(collection(db, 'chatRequests'), where('recipientEmail', '==', emailLower));
    const q2 = query(collection(db, 'chatRequests'), where('recipientId', '==', uid));

    const listMap = new Map<string, any>();
    const updateList = () => {
      setChatRequests(Array.from(listMap.values()));
    };

    const unsub1 = onSnapshot(q1, (snapshot) => {
      snapshot.forEach((docSnap) => {
        listMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
      });
      updateList();
    }, (err) => {
      console.warn("Chat requests error 1:", err);
    });

    const unsub2 = onSnapshot(q2, (snapshot) => {
      snapshot.forEach((docSnap) => {
        listMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
      });
      updateList();
    }, (err) => {
      console.warn("Chat requests error 2:", err);
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, [isOpen, currentUser]);

  const handleUpdateChatRequest = async (reqId: string, status: 'accepted' | 'declined') => {
    try {
      await updateDoc(doc(db, 'chatRequests', reqId), { status });
    } catch (e) {
      console.warn("Update chat request error:", e);
    }
  };

  const handleDeleteChatRequest = async (reqId: string) => {
    try {
      await deleteDoc(doc(db, 'chatRequests', reqId));
    } catch (e) {
      console.warn("Delete chat request error:", e);
    }
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Rasm hajmi 5MB dan oshmasligi kerak.");
      return;
    }
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Data = event.target?.result as string;
      if (base64Data) {
        try {
          await updateDoc(doc(db, 'users', currentUser.id), { avatar: base64Data });
        } catch (err) {
          console.warn("Avatar update error:", err);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen || !currentUser) return null;

  const handleSendPasswordReset = async () => {
    if (!currentUser.email) return;
    setPwdResetLoading(true);
    setPwdResetError(null);
    setPwdResetSent(false);
    try {
      await sendPasswordResetEmail(auth, currentUser.email);
      setPwdResetSent(true);
    } catch (err: any) {
      console.error('Password reset error in profile:', err);
      setPwdResetError("Xabarni yuborishda xatolik yuz berdi. Birozdan so'ng qayta urinib ko'ring.");
    } finally {
      setPwdResetLoading(false);
    }
  };

  const currentLang = (lang && translations[lang]) ? lang : 'uz';
  const t = translations[currentLang];
  const isAdminUser = currentUser.role === 'admin' || isAdminEmail(currentUser.email);

  // Filter attempts for this user
  const userAttempts = attempts.filter(
    (a) => a.userId === currentUser.id || (currentUser.email && a.userEmail === currentUser.email)
  ).sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime());

  const totalTaken = userAttempts.length || currentUser.testsTaken || 0;
  
  // Calculate average score percentage
  const avgPct =
    userAttempts.length > 0
      ? Math.round(
          userAttempts.reduce((acc, curr) => acc + (curr.percentage || 0), 0) / userAttempts.length
        )
      : currentUser.avgScore || 0;

  const unlockedCount = currentUser.unlockedTests?.length || 0;

  // Pass rate (>= 70%)
  const passedAttempts = userAttempts.filter((a) => (a.percentage || 0) >= 70).length;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4 animate-fade-in">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl border border-slate-100 relative max-h-[90vh] flex flex-col overflow-hidden">
        {/* Mobile Pull Handle Bar */}
        <div className="sm:hidden w-12 h-1.5 bg-slate-200 rounded-full mx-auto -mt-1 mb-3" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition active:scale-90 z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top Profile Header */}
        <div className="relative pt-2 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-4">
            {/* Avatar Circle with Badge */}
            <div className="relative shrink-0 group">
              <img
                src={currentUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(currentUser.email)}`}
                alt={currentUser.name}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl object-cover border-2 border-sky-500/40 shadow-md bg-sky-50"
              />
              <label
                className="absolute inset-0 bg-black/40 rounded-2xl sm:rounded-3xl flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition cursor-pointer"
                title="Profil rasmini o'zgartirish"
              >
                <Camera className="w-5 h-5" />
                <span className="text-[9px] font-bold mt-0.5">Rasm yuklash</span>
                <input type="file" accept="image/*" onChange={handleAvatarFileChange} className="hidden" />
              </label>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white text-[10px] font-bold shadow-xs">
                ✓
              </div>
            </div>

            {/* Name, Email & Role Badge */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight truncate">
                  {currentUser.name}
                </h2>
                {isAdminUser ? (
                  <span className="text-[10px] bg-amber-100 text-amber-900 font-black px-2 py-0.5 rounded-full border border-amber-300 inline-flex items-center gap-1 uppercase tracking-wider">
                    <ShieldCheck className="w-3 h-3 text-amber-600" /> {t.adminRole}
                  </span>
                ) : (
                  <span className="text-[10px] bg-sky-100 text-sky-800 font-bold px-2 py-0.5 rounded-full border border-sky-200 inline-flex items-center gap-1">
                    <User className="w-3 h-3 text-sky-600" /> {t.studentRole}
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-500 font-mono truncate mt-0.5">
                {currentUser.email}
              </p>

              <div className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1 font-medium">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{(t.joinedDate || 'Member since: {date}').replace('{date}', currentUser.registeredAt || '2026-01-01')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-5 pr-1 scrollbar-none">
          {/* Quick Metrics Bento Grid */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-sky-600" /> {t.examMetricsTitle}
            </h3>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="bg-sky-50/80 border border-sky-100 p-3 rounded-2xl text-center">
                <div className="text-lg sm:text-2xl font-black text-sky-900">{totalTaken}</div>
                <div className="text-[11px] text-sky-700 font-medium mt-0.5">{t.metricTotalTests}</div>
              </div>

              <div className={`p-3 rounded-2xl text-center border ${
                avgPct >= 70
                  ? 'bg-emerald-50/80 border-emerald-100 text-emerald-900'
                  : avgPct >= 50
                  ? 'bg-amber-50/80 border-amber-100 text-amber-900'
                  : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}>
                <div className="text-lg sm:text-2xl font-black">{avgPct}%</div>
                <div className="text-[11px] opacity-80 font-medium mt-0.5">{t.metricAvgScore}</div>
              </div>

              <div className="bg-purple-50/80 border border-purple-100 p-3 rounded-2xl text-center">
                <div className="text-lg sm:text-2xl font-black text-purple-900">{unlockedCount}</div>
                <div className="text-[11px] text-purple-700 font-medium mt-0.5">{t.metricUnlockedModules}</div>
              </div>
            </div>
          </div>

          {/* Email / Password Setup Card */}
          <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 font-bold">
                  <Key className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-800">Email va parol bilan kirish</div>
                  <div className="text-[10px] text-slate-500">Google profilingizga parol o'rnatish</div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSendPasswordReset}
                disabled={pwdResetLoading}
                className="text-xs font-bold text-sky-700 hover:text-sky-800 bg-sky-100 hover:bg-sky-200/80 border border-sky-300/60 px-3 py-1.5 rounded-xl transition active:scale-95 disabled:opacity-50 shrink-0"
              >
                {pwdResetLoading ? "Yuborilmoqda..." : "Parol o'rnatish linkini olish"}
              </button>
            </div>
            {pwdResetSent && (
              <p className="text-[11px] text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 leading-normal">
                ✓ Parol o'rnatish havolasi <strong>{currentUser.email}</strong> manziliga yuborildi. Pochtadagi havolani bosib parol belgilasangiz, kelgusida ushbu email va parolingiz bilan ham tizimga kirsangiz bo'ladi!
              </p>
            )}
            {pwdResetError && (
              <p className="text-[11px] text-red-700 bg-red-50 p-2.5 rounded-xl border border-red-200">
                {pwdResetError}
              </p>
            )}
          </div>

          {/* Admin Switch Quick Action Banner (If Admin) */}
          {isAdminUser && (
            <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200/80 p-3.5 rounded-2xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-amber-950">
                    {t.adminAccessGranted}
                  </div>
                  <div className="text-[11px] text-amber-800/90">
                    {t.adminAccessSub}
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  onToggleViewMode(viewMode === 'admin' ? 'student' : 'admin');
                  onClose();
                }}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition shadow-xs active:scale-95 whitespace-nowrap shrink-0"
              >
                {viewMode === 'admin' ? t.studentModeBtn : t.adminPanelBtn}
              </button>
            </div>
          )}

          {/* Test Attempt History */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-sky-600" /> {(t.recentResultsTitle || 'Recent Results ({count})').replace('{count}', String(userAttempts.length))}
              </h3>
              {userAttempts.length > 0 && (
                <span className="text-[11px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {(t.passedCountTag || '{count} Passed').replace('{count}', String(passedAttempts))}
                </span>
              )}
            </div>

            {userAttempts.length === 0 ? (
              <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6 text-center">
                <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-600">{t.noTestsTakenTitle}</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {t.noTestsTakenSub}
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {userAttempts.map((attempt) => {
                  const isPassed = (attempt.percentage || 0) >= 70;
                  return (
                    <div
                      key={attempt.id || Math.random()}
                      className="bg-slate-50 hover:bg-sky-50/50 border border-slate-200/80 rounded-2xl p-3 flex items-center justify-between gap-3 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs ${
                          isPassed
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300/80'
                            : 'bg-red-100 text-red-800 border border-red-300/80'
                        }`}>
                          {isPassed ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <XCircle className="w-5 h-5 text-red-600" />}
                        </div>

                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate">
                            {attempt.testTitle || 'UniTest Moduli'}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2">
                            <span>{attempt.completedAt || 'Yaqinda'}</span>
                            <span>•</span>
                            <span>{attempt.score} / {attempt.totalQuestions} {t.correctTag.toLowerCase()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`text-xs font-extrabold px-2.5 py-1 rounded-xl inline-block ${
                          isPassed
                            ? 'bg-emerald-500 text-white'
                            : 'bg-red-500 text-white'
                        }`}>
                          {attempt.percentage}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Chat Requests / Chat yozishish so'rovlari (At the very bottom of profile) */}
          <div className="border-t border-slate-100 pt-4 mt-2">
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-sky-600" /> Chat yozishish so'rovlari ({chatRequests.filter(r => r.status === 'pending').length})
              </h3>
            </div>

            {chatRequests.length === 0 ? (
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-center text-xs text-slate-400 font-medium">
                Hozircha yangi chat so'rovlari mavjud emas.
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {chatRequests.map((req) => {
                  const isPending = req.status === 'pending';
                  return (
                    <div
                      key={req.id}
                      className="bg-slate-50 hover:bg-slate-100 rounded-2xl p-3 border border-slate-200/80 flex items-center justify-between gap-3 transition"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={req.senderAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(req.senderEmail || req.senderName)}`}
                          alt={req.senderName}
                          className="w-9 h-9 rounded-full bg-slate-200 shrink-0 object-cover"
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-slate-800 truncate">{req.senderName}</div>
                          <div className="text-[10px] text-slate-500 truncate">{req.senderEmail}</div>
                          <div className="text-[10px] text-sky-600 font-medium mt-0.5">Siz bilan yozishishni xohlaydi</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isPending ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleUpdateChatRequest(req.id, 'accepted')}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-extrabold px-3 py-1.5 rounded-xl shadow-xs transition flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" />
                              <span>Qabul</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateChatRequest(req.id, 'declined')}
                              className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-[11px] font-extrabold px-3 py-1.5 rounded-xl transition flex items-center gap-1"
                            >
                              <X className="w-3 h-3" />
                              <span>Rad</span>
                            </button>
                          </>
                        ) : (
                          <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-xl ${
                            req.status === 'accepted' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {req.status === 'accepted' ? '✓ Qabul qilindi' : '✗ Rad etildi'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            onClick={() => {
              onLogout();
              onClose();
            }}
            className="flex items-center gap-2 text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100/80 border border-red-200 px-4 py-2.5 rounded-xl transition active:scale-95"
          >
            <LogOut className="w-4 h-4" />
            <span>{t.signOutBtn}</span>
          </button>

          <button
            onClick={onClose}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition active:scale-95"
          >
            {t.closeBtn}
          </button>
        </div>
      </div>
    </div>
  );
};

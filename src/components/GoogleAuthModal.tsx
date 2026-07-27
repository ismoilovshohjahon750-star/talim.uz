import React, { useState } from 'react';
import { UserProfile, isAdminEmail } from '../types';
import {
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
import { LogIn, UserPlus, KeyRound, Mail, Lock, User, X, AlertCircle, CheckCircle2 } from 'lucide-react';

import { Language, translations } from '../lib/i18n';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: UserProfile) => void;
  currentUser: UserProfile | null;
  lang?: Language;
}

type AuthMode = 'sign-in' | 'sign-up' | 'forgot-password';

export const GoogleAuthModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onLogin,
  lang = 'uz',
}) => {
  const currentLang = (lang && translations[lang]) ? lang : 'uz';
  const t = translations[currentLang];
  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetState = () => {
    setError(null);
    setSuccessMsg(null);
  };

  const switchMode = (newMode: AuthMode) => {
    resetState();
    setMode(newMode);
  };

  // Helper to ensure user document in Firestore
  const syncUserProfile = async (uid: string, userEmail: string, userName: string, photoUrl?: string): Promise<UserProfile> => {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    const isAdmin = isAdminEmail(userEmail);
    const role = isAdmin ? 'admin' : (userSnap.exists() ? userSnap.data().role || 'student' : 'student');

    const profileData: UserProfile = {
      id: uid,
      email: userEmail,
      name: userName || userEmail.split('@')[0],
      avatar: photoUrl || userSnap.data()?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userName || userEmail)}`,
      role: role,
      registeredAt: userSnap.exists() ? userSnap.data().registeredAt : new Date().toISOString().split('T')[0],
      lastActive: 'Hozir',
      testsTaken: userSnap.exists() ? userSnap.data().testsTaken || 0 : 0,
      avgScore: userSnap.exists() ? userSnap.data().avgScore || 0 : 0,
    };

    await setDoc(userRef, { ...profileData, updatedAt: serverTimestamp() }, { merge: true });
    return profileData;
  };

  // Google Popup Sign In
  const handleGoogleSignIn = async () => {
    resetState();
    setLoading(true);
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const user = res.user;
      const profile = await syncUserProfile(
        user.uid,
        user.email || '',
        user.displayName || user.email?.split('@')[0] || 'Foydalanuvchi',
        user.photoURL || undefined
      );
      onLogin(profile);
      onClose();
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError("Google orqali kirish darchasi yopildi");
      } else {
        setError("Google orqali kirishda xatolik yuz berdi. Iltimos qaytadan urinib ko'ring.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Email / Password Registration
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    resetState();
    if (!email || !password || !name) {
      setError("Iltimos, barcha maydonlarni to'ldiring");
      return;
    }
    if (password.length < 6) {
      setError("Parol kamida 6 ta belgidan iborat bo'lishi kerak");
      return;
    }

    setLoading(true);
    try {
      const res = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(res.user, { displayName: name });

      const profile = await syncUserProfile(res.user.uid, email, name);
      onLogin(profile);
      onClose();
    } catch (err: any) {
      console.error('Sign Up Error:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError("Bu elektron pochta allaqachon ro'yxatdan o'tgan. Kirish bo'limiga o'ting.");
      } else if (err.code === 'auth/invalid-email') {
        setError("Noto'g'ri elektron pochta formati");
      } else if (err.code === 'auth/weak-password') {
        setError("Parol juda kuchsiz, kamida 6 ta belgi kiriting");
      } else {
        setError(err.message || "Ro'yxatdan o'tishda xatolik yuz berdi");
      }
    } finally {
      setLoading(false);
    }
  };

  // Email / Password Sign In
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    resetState();
    if (!email || !password) {
      setError("Iltimos, email va parolni kiriting");
      return;
    }

    setLoading(true);
    try {
      const res = await signInWithEmailAndPassword(auth, email, password);
      const user = res.user;
      const profile = await syncUserProfile(
        user.uid,
        user.email || email,
        user.displayName || email.split('@')[0]
      );
      onLogin(profile);
      onClose();
    } catch (err: any) {
      console.error('Sign In Error:', err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError("Elektron pochta yoki parol noto'g'ri kiritildi");
      } else if (err.code === 'auth/invalid-email') {
        setError("Noto'g'ri elektron pochta manzil kiritildi");
      } else {
        setError("Tizimga kirishda xatolik yuz berdi");
      }
    } finally {
      setLoading(false);
    }
  };

  // Reset Password via Email Link
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    resetState();
    if (!email) {
      setError("Iltimos, parolni tiklash uchun elektron pochta manzilingizni kiriting");
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccessMsg(`Parolni tiklash havolasi ${email} manziliga yuborildi! Pochtangizni tekshiring va yangi parol o'rnatgach, qayta kiring.`);
    } catch (err: any) {
      console.error('Password Reset Error:', err);
      if (err.code === 'auth/user-not-found') {
        setError("Bunday elektron pochta manzili ro'yxatdan o'tmagan");
      } else if (err.code === 'auth/invalid-email') {
        setError("Noto'g'ri elektron pochta formati");
      } else {
        setError("Parolni tiklash xabarini yuborishda xatolik yuz berdi");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4 animate-fade-in">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative max-h-[92vh] overflow-y-auto">
        {/* Mobile Pull Bar Handle */}
        <div className="sm:hidden w-12 h-1.5 bg-slate-200 rounded-full mx-auto -mt-2 mb-4" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition active:scale-90"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-100 mb-6 font-semibold text-sm text-gray-500">
          <button
            onClick={() => switchMode('sign-in')}
            className={`flex-1 py-2.5 text-center transition border-b-2 ${
              mode === 'sign-in'
                ? 'border-indigo-600 text-indigo-600 font-bold'
                : 'border-transparent hover:text-gray-800'
            }`}
          >
            Kirish
          </button>
          <button
            onClick={() => switchMode('sign-up')}
            className={`flex-1 py-2.5 text-center transition border-b-2 ${
              mode === 'sign-up'
                ? 'border-indigo-600 text-indigo-600 font-bold'
                : 'border-transparent hover:text-gray-800'
            }`}
          >
            Ro'yxatdan o'tish
          </button>
        </div>

        {/* Header Title */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">
            {mode === 'sign-in' && "Tizimga Kirish"}
            {mode === 'sign-up' && "Ro'yxatdan O'tish"}
            {mode === 'forgot-password' && "Parolni Tiklash"}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {mode === 'sign-in' && "Imtihon topshirish va sertifikatlar uchun profilingizga kiring"}
            {mode === 'sign-up' && "Yangi hisob yarating va raqamli savodxonlik imtihonlarini topshiring"}
            {mode === 'forgot-password' && "Pochtangizga parolni tiklash havolasini yuboramiz"}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2 text-xs text-emerald-800 leading-relaxed">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Google Quick Login Button (available for Sign-in & Sign-up) */}
        {mode !== 'forgot-password' && (
          <>
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white border border-gray-300 hover:bg-gray-50 hover:border-gray-400 active:scale-[0.99] rounded-xl text-sm font-bold text-gray-700 shadow-xs transition mb-4"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.29v3.15C3.26 21.3 7.31 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.29C.47 8.21 0 10.05 0 12s.47 3.79 1.29 5.42l3.99-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.58l3.99 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              Google orqali kiring
            </button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-[11px] uppercase tracking-wider font-semibold">
                <span className="bg-white px-3 text-gray-400">yoki email orqali</span>
              </div>
            </div>
          </>
        )}

        {/* MODE: SIGN IN */}
        {mode === 'sign-in' && (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Elektron pochta (Email)</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  placeholder="ismingiz@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-gray-700">Parol</label>
                <button
                  type="button"
                  onClick={() => switchMode('forgot-password')}
                  className="text-xs text-indigo-600 hover:underline font-semibold"
                >
                  Parolni unutdingizmi?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              {loading ? (
                <span>Kirilmoqda...</span>
              ) : (
                <>
                  <LogIn className="w-4 h-4" /> Tizimga Kirish
                </>
              )}
            </button>
          </form>
        )}

        {/* MODE: SIGN UP */}
        {mode === 'sign-up' && (
          <form onSubmit={handleSignUp} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Ism va Familiya</label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  placeholder="Shohjahon Ismoilov"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Elektron pochta (Email)</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  placeholder="ismingiz@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Maxfiy Parol (kamida 6 ta belgi)</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              {loading ? (
                <span>Ro'yxatdan o'tkazilmoqda...</span>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" /> Ro'yxatdan O'tish
                </>
              )}
            </button>
          </form>
        )}

        {/* MODE: FORGOT PASSWORD */}
        {mode === 'forgot-password' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Elektron pochta manzilingiz</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  placeholder="ismingiz@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              {loading ? (
                <span>Yuborilmoqda...</span>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" /> Tiklash Havolasini Yuborish
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => switchMode('sign-in')}
                className="text-xs text-gray-600 hover:text-indigo-600 font-semibold transition"
              >
                ← Kirish bo'limiga qaytash
              </button>
            </div>
          </form>
        )}

        {/* Bottom Switch Links */}
        <div className="mt-6 text-center text-xs text-gray-500 border-t border-gray-100 pt-4">
          {mode === 'sign-in' ? (
            <p>
              Hali hisobingiz yo'qmi?{' '}
              <button
                onClick={() => switchMode('sign-up')}
                className="text-indigo-600 hover:underline font-bold"
              >
                Ro'yxatdan o'ting
              </button>
            </p>
          ) : mode === 'sign-up' ? (
            <p>
              Allaqachon ro'yxatdan o'tganmisiz?{' '}
              <button
                onClick={() => switchMode('sign-in')}
                className="text-indigo-600 hover:underline font-bold"
              >
                Kirish bo'limiga o'ting
              </button>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
};

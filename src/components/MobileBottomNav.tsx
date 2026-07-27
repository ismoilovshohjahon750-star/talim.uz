import React from 'react';
import { UserProfile, isAdminEmail } from '../types';
import { BookOpen, ShieldCheck, User, LogIn, Award } from 'lucide-react';
import { Language, translations } from '../lib/i18n';

interface Props {
  currentUser: UserProfile | null;
  onOpenAuth: () => void;
  onOpenProfile?: () => void;
  viewMode: 'student' | 'admin';
  onToggleViewMode: (mode: 'student' | 'admin') => void;
  isTestActive?: boolean;
  lang: Language;
}

export const MobileBottomNav: React.FC<Props> = ({
  currentUser,
  onOpenAuth,
  onOpenProfile,
  viewMode,
  onToggleViewMode,
  isTestActive,
  lang = 'uz',
}) => {
  const currentLang = (lang && translations[lang]) ? lang : 'uz';
  const t = translations[currentLang];
  // Hide bottom nav during active test solving to give full screen focus to questions
  if (isTestActive) return null;

  const isAdminUser = currentUser?.role === 'admin' || isAdminEmail(currentUser?.email);

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-xl border-t border-slate-200/90 z-40 px-3 py-1.5 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] flex items-center justify-around">
      {/* Testlar / Main Student View */}
      <button
        type="button"
        onClick={() => onToggleViewMode('student')}
        className={`flex flex-col items-center justify-center py-1 px-4 rounded-xl min-w-[64px] transition ${
          viewMode === 'student'
            ? 'text-sky-600 font-bold bg-sky-50/80 scale-105'
            : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <BookOpen className={`w-5 h-5 ${viewMode === 'student' ? 'text-sky-600' : 'text-slate-400'}`} />
        <span className="text-[11px] mt-0.5 tracking-tight font-medium">{t.navTests}</span>
      </button>

      {/* Admin Panel (if admin) */}
      {isAdminUser && (
        <button
          type="button"
          onClick={() => onToggleViewMode('admin')}
          className={`flex flex-col items-center justify-center py-1 px-4 rounded-xl min-w-[64px] transition relative ${
            viewMode === 'admin'
              ? 'text-amber-700 font-bold bg-amber-50/90 scale-105'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <div className="relative">
            <ShieldCheck className={`w-5 h-5 ${viewMode === 'admin' ? 'text-amber-600' : 'text-slate-400'}`} />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
          </div>
          <span className="text-[11px] mt-0.5 tracking-tight font-medium">{t.navAdmin}</span>
        </button>
      )}

      {/* Profile / Login */}
      {currentUser ? (
        <button
          type="button"
          onClick={onOpenProfile || onOpenAuth}
          className="flex flex-col items-center justify-center py-1 px-4 rounded-xl min-w-[64px] text-slate-500 hover:text-slate-800 transition active:scale-95"
        >
          <img
            src={currentUser.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=User"}
            alt={currentUser.name}
            className="w-5.5 h-5.5 rounded-full border border-sky-400 object-cover"
          />
          <span className="text-[11px] mt-0.5 tracking-tight font-medium truncate max-w-[64px]">
            {currentUser.name.split(' ')[0]}
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={onOpenAuth}
          className="flex flex-col items-center justify-center py-1 px-4 rounded-xl min-w-[64px] text-sky-600 font-semibold bg-sky-50 rounded-xl transition"
        >
          <LogIn className="w-5 h-5 text-sky-600" />
          <span className="text-[11px] mt-0.5 tracking-tight">{t.navLogin}</span>
        </button>
      )}
    </nav>
  );
};

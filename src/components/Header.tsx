import React from 'react';
import { UserProfile, isAdminEmail } from '../types';
import { ShieldCheck, LogIn, LogOut, BookOpen } from 'lucide-react';
import logoImg from '../assets/images/ic3_portal_logo_1785040670797.jpg';
import { Language, translations } from '../lib/i18n';

interface Props {
  currentUser: UserProfile | null;
  onOpenAuth: () => void;
  onOpenProfile?: () => void;
  onLogout: () => void;
  viewMode: 'student' | 'admin';
  onToggleViewMode: (mode: 'student' | 'admin') => void;
  lang: Language;
  onLangChange: (lang: Language) => void;
}

export const Header: React.FC<Props> = ({
  currentUser,
  onOpenAuth,
  onOpenProfile,
  onLogout,
  viewMode,
  onToggleViewMode,
  lang = 'uz',
  onLangChange,
}) => {
  const currentLang = (lang && translations[lang]) ? lang : 'uz';
  const t = translations[currentLang];
  // Check for Admin status
  const isAdminUser = currentUser?.role === 'admin' || isAdminEmail(currentUser?.email);

  return (
    <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between py-2 px-4 sm:px-6">
        {/* Brand Logo */}
        <div 
          onClick={() => onToggleViewMode('student')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="relative">
            <img
              src={logoImg}
              alt="IC3 GS6 Logo"
              referrerPolicy="no-referrer"
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl object-cover border-2 border-sky-500/30 shadow-md group-hover:scale-105 transition-transform duration-200 bg-slate-900"
            />
            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" />
          </div>
          <div>
            <div className="font-extrabold text-slate-900 tracking-tight text-base sm:text-lg flex items-center gap-2">
              IC3 GS6 Portal
            </div>
            <div className="text-[11px] text-slate-500 font-medium hidden sm:block">
              {t.portalSubtitle}
            </div>
          </div>
        </div>

        {/* Right Header Navigation */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Global Language Toggle Badge */}
          <div className="bg-slate-100 p-0.5 rounded-xl border border-slate-200 flex items-center gap-0.5">
            <button
              onClick={() => onLangChange('uz')}
              className={`px-2 py-1 rounded-lg text-[11px] font-extrabold transition active:scale-95 ${
                lang === 'uz' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              UZ
            </button>
            <button
              onClick={() => onLangChange('en')}
              className={`px-2 py-1 rounded-lg text-[11px] font-extrabold transition active:scale-95 ${
                lang === 'en' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              EN
            </button>
          </div>

          {/* Admin Panel Button (ONLY for Admin) */}
          {isAdminUser && (
            <button
              onClick={() => onToggleViewMode(viewMode === 'admin' ? 'student' : 'admin')}
              className={`text-xs sm:text-sm font-bold py-2 px-3 sm:px-4 rounded-xl flex items-center gap-1.5 transition active:scale-95 shadow-xs ${
                viewMode === 'admin'
                  ? 'bg-amber-50 text-amber-900 border border-amber-300/80 hover:bg-amber-100'
                  : 'bg-sky-600 hover:bg-sky-700 text-white shadow-sky-600/20 shadow-md'
              }`}
            >
              {viewMode === 'admin' ? (
                <>
                  <BookOpen className="w-4 h-4 text-amber-700" />
                  <span className="hidden sm:inline">{t.backToTests}</span>
                  <span className="sm:hidden">{t.tests}</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-amber-300" />
                  <span className="hidden sm:inline">{t.openAdmin}</span>
                </>
              )}
            </button>
          )}

          {/* User Profile / Auth State */}
          {currentUser ? (
            <div className="flex items-center gap-1.5 bg-slate-50/90 hover:bg-slate-100/90 border border-slate-200/80 p-1 pr-2 rounded-xl transition shadow-2xs">
              <button
                type="button"
                onClick={onOpenProfile}
                className="flex items-center gap-2 text-left hover:opacity-90 active:scale-95 transition"
                title={t.profileMenu}
              >
                <img
                  src={currentUser.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=User"}
                  alt={currentUser.name}
                  className="w-8 h-8 rounded-full border border-sky-400 object-cover bg-white shrink-0"
                />
                <div className="hidden md:block">
                  <div className="text-xs font-bold text-slate-900 leading-tight flex items-center gap-1">
                    {currentUser.name}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono truncate max-w-[130px]">
                    {currentUser.email}
                  </div>
                </div>
              </button>
              <button
                onClick={onLogout}
                title={t.logout}
                className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition ml-0.5 active:scale-90"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="bg-sky-600 hover:bg-sky-700 text-white text-xs sm:text-sm font-bold py-2 px-3.5 sm:px-4 rounded-xl flex items-center gap-1.5 shadow-md shadow-sky-600/20 transition active:scale-95"
            >
              <LogIn className="w-4 h-4" />
              <span>{t.login}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};


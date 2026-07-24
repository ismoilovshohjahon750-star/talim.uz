import React from 'react';
import { UserProfile } from '../types';
import { ShieldCheck, LogIn, LogOut, BookOpen, Settings, LayoutDashboard } from 'lucide-react';

interface Props {
  currentUser: UserProfile | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  viewMode: 'student' | 'admin';
  onToggleViewMode: (mode: 'student' | 'admin') => void;
}

export const Header: React.FC<Props> = ({
  currentUser,
  onOpenAuth,
  onLogout,
  viewMode,
  onToggleViewMode,
}) => {
  // STRICT check for Admin email requirement
  const isAdminUser = currentUser?.email.toLowerCase() === 'ismoilovshohjahon750@gmail.com';

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-xs">
      <div className="wrap flex items-center justify-between py-3.5 px-4">
        {/* Brand Logo */}
        <div 
          onClick={() => onToggleViewMode('student')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center font-bold text-lg shadow-md group-hover:scale-105 transition">
            IC3
          </div>
          <div>
            <div className="font-bold text-gray-900 tracking-tight text-lg flex items-center gap-2">
              IC3 GS6 Test Portal
              <span className="text-xs bg-indigo-100 text-indigo-700 font-semibold px-2 py-0.5 rounded-full">
                AI Powered
              </span>
            </div>
            <div className="text-xs text-gray-500 hidden sm:block">
              Raqamli savodxonlik xalqaro sertifikatlash testi
            </div>
          </div>
        </div>

        {/* Right Header Navigation */}
        <div className="flex items-center gap-3">
          {/* STRICT REQUIREMENT: Admin Panel Button ONLY for ismoilovshohjahon750@gmail.com */}
          {isAdminUser && (
            <button
              onClick={() => onToggleViewMode(viewMode === 'admin' ? 'student' : 'admin')}
              className={`btn ${
                viewMode === 'admin'
                  ? 'btn-secondary text-indigo-700 font-semibold border-indigo-300'
                  : 'btn-primary bg-indigo-600 hover:bg-indigo-700 text-white shadow-md'
              } text-sm py-2 px-3.5 rounded-xl flex items-center gap-2 transition`}
            >
              {viewMode === 'admin' ? (
                <>
                  <BookOpen className="w-4 h-4" />
                  <span>Testlarga qaytish</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-amber-300" />
                  <span>Admin panelni ochish</span>
                </>
              )}
            </button>
          )}

          {/* User Profile / Auth State */}
          {currentUser ? (
            <div className="flex items-center gap-2.5 bg-gray-50 border border-gray-200 pl-2 pr-3 py-1.5 rounded-xl">
              <img
                src={currentUser.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=User"}
                alt={currentUser.name}
                className="w-8 h-8 rounded-full border border-gray-200 bg-white"
              />
              <div className="hidden md:block text-left">
                <div className="text-xs font-bold text-gray-900 leading-tight flex items-center gap-1">
                  {currentUser.name}
                  {isAdminUser && (
                    <span className="text-[10px] bg-indigo-600 text-white px-1.5 py-0.2 rounded-xs">
                      Admin
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-gray-500 font-mono truncate max-w-[140px]">
                  {currentUser.email}
                </div>
              </div>
              <button
                onClick={onLogout}
                title="Tizimdan chiqish"
                className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition ml-1"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="btn btn-primary text-sm py-2 px-4 rounded-xl flex items-center gap-2 shadow-sm"
            >
              <LogIn className="w-4 h-4" />
              <span>Kirish / Ro'yxatdan o'tish</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

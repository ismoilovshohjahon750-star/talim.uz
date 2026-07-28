import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { MobileBottomNav } from './components/MobileBottomNav';
import { GoogleAuthModal } from './components/GoogleAuthModal';
import { ProfileModal } from './components/ProfileModal';
import { CommunityChat } from './components/CommunityChat';
import { TestRunner } from './components/TestRunner';
import { AdminPanel } from './components/AdminPanel';
import { TestModule, UserProfile, UserAttempt, isAdminEmail } from './types';
import { Language } from './lib/i18n';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { MessageSquare } from 'lucide-react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  query,
  where,
} from 'firebase/firestore';

export function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'student' | 'admin'>('student');
  const [isTestActive, setIsTestActive] = useState<boolean>(false);
  const [lang, setLang] = useState<Language>('uz');

  const [modules, setModules] = useState<TestModule[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [attempts, setAttempts] = useState<UserAttempt[]>([]);
  const [loadingAuth, setLoadingAuth] = useState<boolean>(true);

  // 1. Firebase Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoadingAuth(true);
      if (firebaseUser) {
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userSnap = await getDoc(userDocRef);

          const isPrimaryAdmin = isAdminEmail(firebaseUser.email);
          let profile: UserProfile;

          if (userSnap.exists()) {
            profile = userSnap.data() as UserProfile;
            // Ensure admin role for primary admins
            if (isPrimaryAdmin && profile.role !== 'admin') {
              profile.role = 'admin';
              await setDoc(userDocRef, { role: 'admin' }, { merge: true });
            }
          } else {
            profile = {
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Foydalanuvchi',
              avatar: firebaseUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(firebaseUser.email || 'user')}`,
              role: isPrimaryAdmin ? 'admin' : 'student',
              registeredAt: new Date().toISOString().split('T')[0],
              lastActive: 'Hozir',
              testsTaken: 0,
              avgScore: 0,
            };
            await setDoc(userDocRef, { ...profile, createdAt: serverTimestamp() });
          }

          setCurrentUser(profile);
          if (profile.role === 'admin') {
            setViewMode('admin');
          }
        } catch (err) {
          console.error("Error loading user profile from Firestore:", err);
        }
      } else {
        setCurrentUser(null);
        setViewMode('student');
      }
      setLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  // 1b. Handle invite parameter in URL when friend signs in
  useEffect(() => {
    if (!currentUser) return;
    const urlParams = new URLSearchParams(window.location.search);
    const inviterId = urlParams.get('invite');
    if (inviterId && inviterId !== currentUser.id && inviterId !== 'guest') {
      const processInviteLink = async () => {
        try {
          const inviterSnap = await getDoc(doc(db, 'users', inviterId));
          if (inviterSnap.exists()) {
            const inviterData = inviterSnap.data();
            const q = query(
              collection(db, 'chatRequests'),
              where('senderUid', '==', inviterId),
              where('recipientId', '==', currentUser.id)
            );
            const existingReqs = await getDocs(q);
            if (existingReqs.empty) {
              const sEmail = (inviterData.email || '').toLowerCase();
              const rEmail = (currentUser.email || '').toLowerCase();
              await addDoc(collection(db, 'chatRequests'), {
                senderUid: inviterId,
                senderName: inviterData.name || 'Foydalanuvchi',
                senderEmail: sEmail,
                senderAvatar: inviterData.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(sEmail || inviterId)}`,
                recipientId: currentUser.id,
                recipientEmail: rEmail,
                recipientName: currentUser.name || '',
                recipientAvatar: currentUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(rEmail || currentUser.id)}`,
                status: 'pending',
                createdAt: new Date().toISOString(),
                timestamp: serverTimestamp(),
              });
            }
          }
        } catch (e) {
          console.warn("Invite link handler error:", e);
        } finally {
          window.history.replaceState({}, '', window.location.pathname);
        }
      };
      processInviteLink();
    }
  }, [currentUser]);

  // 2. Real-time Firestore sync for testModules, attempts, and users
  useEffect(() => {
    // Listen to testModules
    const unsubModules = onSnapshot(
      collection(db, 'testModules'),
      (snapshot) => {
        const loadedModules: TestModule[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          loadedModules.push({
            id: d.id,
            title: data.title || 'Untitled Test',
            level: data.level || 'Level 1',
            isPaid: data.isPaid || false,
            price: data.price,
            subject: data.subject || 'Biologiya',
            ...data,
            questions: Array.isArray(data.questions) ? data.questions : [],
          } as TestModule);
        });
        setModules(loadedModules);
      },
      (err) => {
        console.warn("Firestore testModules listener notice, falling back to API:", err);
        fetchDataFromBackend();
      }
    );

    // Listen to attempts
    const unsubAttempts = onSnapshot(
      collection(db, 'attempts'),
      (snapshot) => {
        const loadedAttempts: UserAttempt[] = [];
        snapshot.forEach((d) => {
          loadedAttempts.push({ id: d.id, ...d.data() } as UserAttempt);
        });
        setAttempts(loadedAttempts);
      },
      (err) => {
        console.warn("Firestore attempts listener notice:", err);
      }
    );

    // Listen to users for admin panel
    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const loadedUsers: UserProfile[] = [];
        snapshot.forEach((d) => {
          loadedUsers.push({ id: d.id, ...d.data() } as UserProfile);
        });
        setUsers(loadedUsers);
      },
      (err) => {
        console.warn("Firestore users listener notice:", err);
      }
    );

    return () => {
      unsubModules();
      unsubAttempts();
      unsubUsers();
    };
  }, []);

  const fetchDataFromBackend = async () => {
    try {
      const res = await fetch('/api/data');
      if (res.ok) {
        const data = await res.json();
        if (data.modules) setModules(data.modules);
        if (data.users) setUsers(data.users);
        if (data.attempts) setAttempts(data.attempts);
      }
    } catch (err) {
      console.error("Backend fetch error:", err);
    }
  };

  const handleSaveAttempt = async (
    testId: string,
    testTitle: string,
    score: number,
    total: number
  ) => {
    const pct = total > 0 ? Math.round((score / total) * 100) : 0;
    const newAttempt: Omit<UserAttempt, 'id'> = {
      userId: currentUser?.id || 'guest',
      userName: currentUser?.name || 'Talaba',
      userEmail: currentUser?.email || 'guest@mail.com',
      testId,
      testTitle,
      score,
      totalQuestions: total,
      percentage: pct,
      completedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
    };

    try {
      // 1. Save to Firestore attempts
      await addDoc(collection(db, 'attempts'), {
        ...newAttempt,
        createdAt: serverTimestamp(),
      });

      // 2. If user is logged in, update stats in Firestore user doc
      if (currentUser?.id && currentUser.id !== 'guest') {
        const userRef = doc(db, 'users', currentUser.id);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const prevTaken = userSnap.data().testsTaken || 0;
          const prevAvg = userSnap.data().avgScore || 0;
          const pct = Math.round((score / total) * 100);
          const newAvg = Math.round((prevAvg * prevTaken + pct) / (prevTaken + 1));

          await setDoc(
            userRef,
            {
              testsTaken: prevTaken + 1,
              avgScore: newAvg,
              lastActive: 'Hozir',
            },
            { merge: true }
          );
        }
      }

      // 3. Fallback sync to backend API
      fetch('/api/attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAttempt),
      }).catch(() => {});

    } catch (err) {
      console.error("Save attempt error:", err);
    }
  };

  const handleUnlockTest = async (testId: string) => {
    if (!currentUser?.id || currentUser.id === 'guest') return;

    try {
      const currentUnlocked = currentUser.unlockedTests || [];
      if (!currentUnlocked.includes(testId)) {
        const updatedUnlockedTests = [...currentUnlocked, testId];
        setCurrentUser((prev) => (prev ? { ...prev, unlockedTests: updatedUnlockedTests } : null));

        const userRef = doc(db, 'users', currentUser.id);
        await setDoc(userRef, { unlockedTests: arrayUnion(testId) }, { merge: true });
      }
    } catch (err) {
      console.error("Unlock test error:", err);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setViewMode('student');
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] flex flex-col font-sans">
      {/* Top Header */}
      <Header
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenChat={() => setIsChatOpen(true)}
        onLogout={handleLogout}
        viewMode={viewMode}
        onToggleViewMode={(mode) => setViewMode(mode)}
        lang={lang}
        onLangChange={setLang}
      />

      {/* Main View Area */}
      <main className="flex-1 py-4 sm:py-6 pb-24">
        {viewMode === 'admin' ? (
          <AdminPanel
            currentUser={currentUser}
            users={users}
            modules={modules}
            attempts={attempts}
            onRefreshData={fetchDataFromBackend}
          />
        ) : (
          <TestRunner
            modules={modules}
            currentUser={currentUser}
            onSaveAttempt={handleSaveAttempt}
            onUnlockTest={handleUnlockTest}
            onOpenAuth={() => setIsAuthOpen(true)}
            onTestActiveChange={(active) => setIsTestActive(active)}
            lang={lang}
            onLangChange={setLang}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenChat={() => setIsChatOpen(true)}
        viewMode={viewMode}
        onToggleViewMode={(mode) => setViewMode(mode)}
        isTestActive={isTestActive}
        lang={lang}
      />

      {/* Community Realtime Chat Modal */}
      <CommunityChat
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        lang={lang}
      />

      {/* Profile Modal Menu */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        currentUser={currentUser}
        attempts={attempts}
        modules={modules}
        onLogout={handleLogout}
        viewMode={viewMode}
        onToggleViewMode={(mode) => setViewMode(mode)}
        lang={lang}
      />

      {/* Google & Firebase Auth Modal */}
      <GoogleAuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        currentUser={currentUser}
        onLogin={(user) => {
          setCurrentUser(user);
          if (isAdminEmail(user.email)) {
            setViewMode('admin');
          }
        }}
        lang={lang}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6 mt-12">
        <div className="wrap text-center text-xs text-gray-500">
          <p className="font-semibold text-gray-700">
            UniTest — Onlayn Test va Bilimni Baholash Portali
          </p>
          <p className="mt-1 text-gray-400">
            © 2026 Barcha huquqlar himoyalangan.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;

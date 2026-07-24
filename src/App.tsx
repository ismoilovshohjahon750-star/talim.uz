import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { GoogleAuthModal } from './components/GoogleAuthModal';
import { TestRunner } from './components/TestRunner';
import { AdminPanel } from './components/AdminPanel';
import { TestModule, UserProfile, UserAttempt } from './types';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';

export function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'student' | 'admin'>('student');

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

          const isPrimaryAdmin = firebaseUser.email?.toLowerCase() === 'ismoilovshohjahon750@gmail.com';
          let profile: UserProfile;

          if (userSnap.exists()) {
            profile = userSnap.data() as UserProfile;
            // Ensure admin role for primary admin
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

  // 2. Real-time Firestore sync for testModules, attempts, and users
  useEffect(() => {
    // Listen to testModules
    const unsubModules = onSnapshot(
      collection(db, 'testModules'),
      (snapshot) => {
        const loadedModules: TestModule[] = [];
        snapshot.forEach((d) => {
          loadedModules.push({ id: d.id, ...d.data() } as TestModule);
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
        onLogout={handleLogout}
        viewMode={viewMode}
        onToggleViewMode={(mode) => setViewMode(mode)}
      />

      {/* Main View Area */}
      <main className="flex-1 py-6">
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
          />
        )}
      </main>

      {/* Google & Firebase Auth Modal */}
      <GoogleAuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        currentUser={currentUser}
        onLogin={(user) => {
          setCurrentUser(user);
          if (user.email.toLowerCase() === 'ismoilovshohjahon750@gmail.com') {
            setViewMode('admin');
          }
        }}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6 mt-12">
        <div className="wrap text-center text-xs text-gray-500">
          <p className="font-semibold text-gray-700">
            IC3 GS6 Digital Literacy Exam & Admin Platform
          </p>
          <p className="mt-1 text-gray-400">
            © 2025 Barcha huquqlar himoyalangan. Firebase Auth, Firestore va Gemini AI bilan quvvatlangan.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;

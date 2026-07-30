import { TestModule, UserProfile, UserAttempt } from '../types';

export const INITIAL_TEST_MODULES: TestModule[] = [];

export const INITIAL_USERS: UserProfile[] = [
  {
    id: "admin-1",
    name: "Shohjahon Ismoilov",
    email: "ismoilovshohjahon750@gmail.com",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Shohjahon",
    role: "admin",
    registeredAt: "2025-01-10",
    lastActive: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    testsTaken: 0,
    avgScore: 0
  },
  {
    id: "admin-2",
    name: "Ranvar Admin",
    email: "ranvar611@gmail.com",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ranvar",
    role: "admin",
    registeredAt: "2025-01-10",
    lastActive: new Date(Date.now() - 48 * 60 * 1000).toISOString(),
    testsTaken: 0,
    avgScore: 0
  }
];

export const INITIAL_ATTEMPTS: UserAttempt[] = [];

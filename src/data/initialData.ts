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
    lastActive: "Hozir",
    testsTaken: 0,
    avgScore: 0
  }
];

export const INITIAL_ATTEMPTS: UserAttempt[] = [];

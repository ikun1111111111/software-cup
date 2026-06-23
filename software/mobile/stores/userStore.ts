import { create } from 'zustand';

export interface UserInfo {
  id: number | string;
  username: string;
  nickname?: string;
  avatar?: string;
  role: 'tourist' | 'admin';
}

interface UserState {
  user: UserInfo | null;
  isAuthenticated: boolean;

  setUser: (user: UserInfo) => void;
  clearUser: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  isAuthenticated: false,

  setUser: (user) => set({ user, isAuthenticated: true }),
  clearUser: () => set({ user: null, isAuthenticated: false }),
}));

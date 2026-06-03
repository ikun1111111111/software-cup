import { create } from 'zustand';

// 用户信息接口
export interface UserInfo {
  id: string;
  username: string;
  avatar?: string;
  role: 'tourist' | 'admin';
}

// 用户偏好接口
export interface UserPreferences {
  language: string;
  theme: 'light' | 'dark';
  fontSize: 'small' | 'medium' | 'large';
}

// 用户状态接口
interface UserState {
  // 状态
  user: UserInfo | null;
  preferences: UserPreferences;
  isAuthenticated: boolean;

  // 操作
  setUser: (user: UserInfo) => void;
  clearUser: () => void;
  setPreferences: (prefs: Partial<UserPreferences>) => void;
  isAuthenticatedFn: () => boolean;
}

// 默认偏好设置
const defaultPreferences: UserPreferences = {
  language: 'zh-CN',
  theme: 'light',
  fontSize: 'medium',
};

// 创建用户状态store
export const useUserStore = create<UserState>((set, get) => ({
  // 初始状态
  user: null,
  preferences: defaultPreferences,
  isAuthenticated: false,

  // 设置用户信息
  setUser: (user) =>
    set({ user, isAuthenticated: true }),

  // 清除用户信息
  clearUser: () =>
    set({ user: null, isAuthenticated: false }),

  // 设置用户偏好
  setPreferences: (prefs) =>
    set((state) => ({
      preferences: { ...state.preferences, ...prefs },
    })),

  // 判断是否已登录
  isAuthenticatedFn: () => {
    const { user } = get();
    return user !== null;
  },
}));

export default useUserStore;

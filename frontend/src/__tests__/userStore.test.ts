import { describe, it, expect, beforeEach } from 'vitest';
import { useUserStore, UserInfo, UserPreferences } from '../stores/userStore';

describe('userStore', () => {
  beforeEach(() => {
    // 重置store状态
    useUserStore.setState({
      user: null,
      preferences: {
        language: 'zh-CN',
        theme: 'light',
        fontSize: 'medium',
      },
      isAuthenticated: false,
    });
  });

  describe('初始状态', () => {
    it('应该没有用户信息', () => {
      const { user } = useUserStore.getState();
      expect(user).toBeNull();
    });

    it('应该有默认偏好设置', () => {
      const { preferences } = useUserStore.getState();
      expect(preferences).toEqual({
        language: 'zh-CN',
        theme: 'light',
        fontSize: 'medium',
      });
    });

    it('应该未登录状态', () => {
      const { isAuthenticated } = useUserStore.getState();
      expect(isAuthenticated).toBe(false);
    });
  });

  describe('setUser', () => {
    it('应该设置用户信息', () => {
      const user: UserInfo = {
        id: '1',
        username: 'testuser',
        role: 'tourist',
      };

      useUserStore.getState().setUser(user);
      const state = useUserStore.getState();

      expect(state.user).toEqual(user);
      expect(state.isAuthenticated).toBe(true);
    });

    it('应该支持设置头像', () => {
      const user: UserInfo = {
        id: '1',
        username: 'testuser',
        avatar: 'https://example.com/avatar.jpg',
        role: 'tourist',
      };

      useUserStore.getState().setUser(user);
      const { user: storedUser } = useUserStore.getState();

      expect(storedUser?.avatar).toBe('https://example.com/avatar.jpg');
    });

    it('应该支持管理员角色', () => {
      const user: UserInfo = {
        id: '1',
        username: 'admin',
        role: 'admin',
      };

      useUserStore.getState().setUser(user);
      const { user: storedUser } = useUserStore.getState();

      expect(storedUser?.role).toBe('admin');
    });
  });

  describe('clearUser', () => {
    it('应该清除用户信息', () => {
      const user: UserInfo = {
        id: '1',
        username: 'testuser',
        role: 'tourist',
      };

      useUserStore.getState().setUser(user);
      useUserStore.getState().clearUser();

      const state = useUserStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('setPreferences', () => {
    it('应该更新语言设置', () => {
      useUserStore.getState().setPreferences({ language: 'en-US' });
      const { preferences } = useUserStore.getState();

      expect(preferences.language).toBe('en-US');
    });

    it('应该更新主题设置', () => {
      useUserStore.getState().setPreferences({ theme: 'dark' });
      const { preferences } = useUserStore.getState();

      expect(preferences.theme).toBe('dark');
    });

    it('应该更新字体大小', () => {
      useUserStore.getState().setPreferences({ fontSize: 'large' });
      const { preferences } = useUserStore.getState();

      expect(preferences.fontSize).toBe('large');
    });

    it('应该支持部分更新', () => {
      useUserStore.getState().setPreferences({ theme: 'dark' });
      const { preferences } = useUserStore.getState();

      expect(preferences.theme).toBe('dark');
      expect(preferences.language).toBe('zh-CN');
      expect(preferences.fontSize).toBe('medium');
    });
  });

  describe('isAuthenticatedFn', () => {
    it('未登录时应该返回false', () => {
      const result = useUserStore.getState().isAuthenticatedFn();
      expect(result).toBe(false);
    });

    it('已登录时应该返回true', () => {
      const user: UserInfo = {
        id: '1',
        username: 'testuser',
        role: 'tourist',
      };

      useUserStore.getState().setUser(user);
      const result = useUserStore.getState().isAuthenticatedFn();

      expect(result).toBe(true);
    });
  });
});

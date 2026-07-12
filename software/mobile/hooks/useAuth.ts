import { useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUserStore } from '@/stores/userStore';
import { authApi } from '@/api/auth';
import { useRouter } from 'expo-router';
import { clearAuthToken, persistAuthToken } from '@/api/request';

export function useAuth() {
  const { user, setUser, clearUser } = useUserStore();
  const router = useRouter();

  const login = useCallback(async (username: string, password: string) => {
    const res = await authApi.login(username, password);
    const { token, user: userData } = res.data;
    await persistAuthToken(token);
    setUser(userData);
    return userData;
  }, [setUser]);

  const register = useCallback(async (username: string, password: string, nickname?: string) => {
    const res = await authApi.register(username, password, nickname);
    const { token, user: userData } = res.data;
    await persistAuthToken(token);
    setUser(userData);
    return userData;
  }, [setUser]);

  const logout = useCallback(async () => {
    await clearAuthToken();
    clearUser();
    router.replace('/auth/login');
  }, [clearUser, router]);

  const restoreSession = useCallback(async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) return;
    try {
      const res = await authApi.getMe();
      setUser(res.data);
    } catch {
      await clearAuthToken();
      clearUser();
    }
  }, [setUser, clearUser]);

  return { user, login, register, logout, restoreSession };
}

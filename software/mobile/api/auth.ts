import { post, get, put } from './request';

export const authApi = {
  register: (username: string, password: string, nickname?: string) =>
    post('/api/auth/register', { username, password, nickname }),
  login: (username: string, password: string) =>
    post('/api/auth/login', { username, password }),
  getMe: () => get('/api/auth/me'),
  updateProfile: (data: { nickname?: string; avatar?: string }) =>
    put('/api/auth/profile', data),
  changePassword: (oldPassword: string, newPassword: string) =>
    post('/api/auth/change-password', { old_password: oldPassword, new_password: newPassword }),
};

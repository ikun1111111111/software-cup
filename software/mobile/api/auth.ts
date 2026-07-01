import { post, get, put } from './request';

export const authApi = {
  register: (username: string, password: string, nickname?: string) =>
    post('/auth/register', { username, password, nickname }, { retries: 0 }),
  login: (username: string, password: string) =>
    post('/auth/login', { username, password }, { retries: 0 }),
  getMe: () => get('/auth/me', undefined, { retries: 0 }),
  updateProfile: (data: { nickname?: string; avatar?: string }) =>
    put('/auth/profile', data),
  changePassword: (oldPassword: string, newPassword: string) =>
    post('/auth/change-password', { old_password: oldPassword, new_password: newPassword }),
};

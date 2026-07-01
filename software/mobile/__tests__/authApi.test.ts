import { authApi } from '../api/auth';
import { get, post, put } from '../api/request';

jest.mock('../api/request', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
}));

describe('authApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('uses API-relative auth paths without duplicating /api', () => {
    authApi.register('traveler', 'secret123', '小灵');
    authApi.login('traveler', 'secret123');
    authApi.getMe();
    authApi.updateProfile({ nickname: '山客' });
    authApi.changePassword('oldpass', 'newpass123');

    expect(post).toHaveBeenNthCalledWith(
      1,
      '/auth/register',
      { username: 'traveler', password: 'secret123', nickname: '小灵' },
      { retries: 0 },
    );
    expect(post).toHaveBeenNthCalledWith(
      2,
      '/auth/login',
      { username: 'traveler', password: 'secret123' },
      { retries: 0 },
    );
    expect(get).toHaveBeenCalledWith('/auth/me', undefined, { retries: 0 });
    expect(put).toHaveBeenCalledWith('/auth/profile', { nickname: '山客' });
    expect(post).toHaveBeenNthCalledWith(3, '/auth/change-password', {
      old_password: 'oldpass',
      new_password: 'newpass123',
    });
  });
});

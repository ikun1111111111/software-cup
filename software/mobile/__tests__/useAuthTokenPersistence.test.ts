const mockPersistAuthToken = jest.fn();
const mockClearAuthToken = jest.fn();
const mockSetUser = jest.fn();
const mockClearUser = jest.fn();
const mockReplace = jest.fn();
const mockLogin = jest.fn();
const mockRegister = jest.fn();
const mockGetMe = jest.fn();
const mockGetItem = jest.fn();

jest.mock('react', () => ({ useCallback: (callback: unknown) => callback }));
jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: mockGetItem }));
jest.mock('@/stores/userStore', () => ({
  useUserStore: () => ({ user: null, setUser: mockSetUser, clearUser: mockClearUser }),
}));
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace }) }));
jest.mock('@/api/auth', () => ({
  authApi: { login: mockLogin, register: mockRegister, getMe: mockGetMe },
}));
jest.mock('@/api/request', () => ({
  persistAuthToken: mockPersistAuthToken,
  clearAuthToken: mockClearAuthToken,
}));

import { useAuth } from '../hooks/useAuth';

describe('useAuth token persistence contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('login and register persist tokens through request token helpers', async () => {
    mockLogin.mockResolvedValue({ data: { token: 'login-token', user: { id: 1 } } });
    mockRegister.mockResolvedValue({ data: { token: 'register-token', user: { id: 2 } } });
    const auth = useAuth();

    await auth.login('user', 'password');
    await auth.register('user2', 'password', 'nickname');

    expect(mockPersistAuthToken).toHaveBeenNthCalledWith(1, 'login-token');
    expect(mockPersistAuthToken).toHaveBeenNthCalledWith(2, 'register-token');
  });

  test('logout and failed restoration clear tokens through request token helpers', async () => {
    mockGetItem.mockResolvedValue('stored-token');
    mockGetMe.mockRejectedValue(new Error('expired'));
    const auth = useAuth();

    await auth.logout();
    await auth.restoreSession();

    expect(mockClearAuthToken).toHaveBeenCalledTimes(2);
  });
});

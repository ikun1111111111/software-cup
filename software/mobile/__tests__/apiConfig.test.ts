jest.mock('react-native', () => ({
  Platform: {
    select: (options: Record<string, string>) => options.default,
  },
}));

jest.mock('expo-constants', () => ({
  expoConfig: {
    hostUri: '192.168.1.23:8081',
  },
}));

describe('api config', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test('derives the default dev host from expo hostUri when available', () => {
    const { API_BASE_URL, WS_BASE_URL } = require('../api/config');

    expect(API_BASE_URL).toBe('http://192.168.1.23:8000/api');
    expect(WS_BASE_URL).toBe('ws://192.168.1.23:8000/ws');
  });

  test('supports a project-local backend port when the default port is occupied', () => {
    process.env.EXPO_PUBLIC_BACKEND_PORT = '8001';

    const { API_BASE_URL, WS_BASE_URL } = require('../api/config');

    expect(API_BASE_URL).toBe('http://192.168.1.23:8001/api');
    expect(WS_BASE_URL).toBe('ws://192.168.1.23:8001/ws');

    delete process.env.EXPO_PUBLIC_BACKEND_PORT;
  });
});

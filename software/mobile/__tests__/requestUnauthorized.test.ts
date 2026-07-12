import { AxiosHeaders } from 'axios';

const removeItem = jest.fn();
const getItem = jest.fn();
let requestInterceptor: (config: any) => Promise<any>;
let rejectedInterceptor: (error: any) => Promise<never>;

const fakeInstance: any = jest.fn();
fakeInstance.interceptors = {
  request: {
    use: jest.fn((fulfilled) => {
      requestInterceptor = fulfilled;
    }),
  },
  response: {
    use: jest.fn((_fulfilled, rejected) => {
      rejectedInterceptor = rejected;
    }),
  },
};
fakeInstance.get = jest.fn();
fakeInstance.post = jest.fn();
fakeInstance.put = jest.fn();
fakeInstance.delete = jest.fn();

jest.mock('axios', () => {
  const actual = jest.requireActual('axios');
  return { ...actual, create: jest.fn(() => fakeInstance) };
});

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem,
  removeItem,
}));

jest.mock('../api/config', () => ({ API_BASE_URL: 'http://test.local/api/v1' }));

import { authEvents } from '../api/request';

describe('request 401 handling', () => {
  const listener = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    getItem.mockResolvedValue('stale-token');
    authEvents.onUnauthorized(listener);
  });

  afterEach(() => {
    authEvents.offUnauthorized(listener);
  });

  test('public login 401 preserves auth state and exposes server detail', async () => {
    const config = await requestInterceptor({ url: '/auth/login', headers: {} });
    const error = {
      message: 'Request failed with status code 401',
      config,
      response: { status: 401, data: { detail: '用户名或密码错误' } },
    };

    await expect(rejectedInterceptor(error)).rejects.toThrow('用户名或密码错误');
    expect(config.headers.Authorization).toBeUndefined();
    expect(removeItem).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
  });

  test.each([
    ['ordinary lowercase header', { authorization: 'Bearer active-token' }],
    ['AxiosHeaders mixed-case header', new AxiosHeaders({ aUtHoRiZaTiOn: 'Bearer active-token' })],
  ])('authenticated /auth/me 401 clears token for %s', async (_label, headers) => {
    const config = await requestInterceptor({ url: '/auth/me', headers });
    const error = {
      message: 'Request failed with status code 401',
      config,
      response: { status: 401, data: { detail: 'Token 无效或已过期' } },
    };

    await expect(rejectedInterceptor(error)).rejects.toThrow('Token 无效或已过期');
    expect(config.headers.Authorization ?? config.headers.get?.('Authorization')).toBe('Bearer stale-token');
    expect(removeItem).toHaveBeenCalledWith('token');
    expect(removeItem).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

import { AxiosHeaders } from 'axios';

const removeItem = jest.fn();
const getItem = jest.fn();
const setItem = jest.fn();
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
  setItem,
  removeItem,
}));

jest.mock('../api/config', () => ({ API_BASE_URL: 'http://test.local/api/v1' }));

import {
  authEvents,
  clearAuthToken,
  invalidateTokenCache,
  persistAuthToken,
} from '../api/request';

describe('request 401 handling', () => {
  const listener = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    invalidateTokenCache();
    getItem.mockResolvedValue('stale-token');
    setItem.mockResolvedValue(undefined);
    removeItem.mockResolvedValue(undefined);
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

  test('late 401 from an old token does not clear a newly rotated token', async () => {
    getItem.mockResolvedValue('new-token');
    const error = {
      message: 'Request failed with status code 401',
      config: { url: '/auth/me', headers: { Authorization: 'Bearer old-token' } },
      response: { status: 401, data: { detail: 'Token 无效或已过期' } },
    };

    await expect(rejectedInterceptor(error)).rejects.toThrow('Token 无效或已过期');
    expect(removeItem).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
  });

  test('401 clears auth state when the failed request token is still current', async () => {
    getItem.mockResolvedValue('old-token');
    const error = {
      message: 'Request failed with status code 401',
      config: { url: '/auth/me', headers: { Authorization: 'Bearer old-token' } },
      response: { status: 401, data: { detail: 'Token 无效或已过期' } },
    };

    await expect(rejectedInterceptor(error)).rejects.toThrow('Token 无效或已过期');
    expect(removeItem).toHaveBeenCalledWith('token');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  test('token rotation during the 401 storage check prevents stale cleanup', async () => {
    let resolveStoredToken!: (token: string | null) => void;
    let resolveTokenWrite!: () => void;
    getItem.mockReturnValueOnce(new Promise((resolve) => {
      resolveStoredToken = resolve;
    }));
    setItem.mockReturnValueOnce(new Promise<void>((resolve) => {
      resolveTokenWrite = resolve;
    }));
    const error = {
      message: 'Request failed with status code 401',
      config: { url: '/auth/me', headers: { Authorization: 'Bearer old-token' } },
      response: { status: 401, data: { detail: 'Token 无效或已过期' } },
    };

    const rejection = rejectedInterceptor(error);
    const persistence = persistAuthToken('new-token');
    resolveStoredToken('old-token');

    await expect(rejection).rejects.toThrow('Token 无效或已过期');
    expect(setItem).toHaveBeenCalledWith('token', 'new-token');
    expect(removeItem).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
    resolveTokenWrite();
    await persistence;
  });

  test('failed token persistence invalidates its cached value', async () => {
    setItem.mockRejectedValueOnce(new Error('write failed'));
    await expect(persistAuthToken('unsaved-token')).rejects.toThrow('write failed');
    getItem.mockResolvedValueOnce('stored-token');

    const config = await requestInterceptor({ url: '/auth/me', headers: {} });

    expect(config.headers.Authorization).toBe('Bearer stored-token');
  });

  test('failed older persistence does not overwrite a newer cached generation', async () => {
    let rejectOldWrite!: (error: Error) => void;
    setItem
      .mockReturnValueOnce(new Promise<void>((_resolve, reject) => {
        rejectOldWrite = reject;
      }))
      .mockResolvedValueOnce(undefined);
    const oldPersistence = persistAuthToken('old-token');
    await persistAuthToken('new-token');
    rejectOldWrite(new Error('old write failed'));
    await expect(oldPersistence).rejects.toThrow('old write failed');

    const config = await requestInterceptor({ url: '/auth/me', headers: {} });

    expect(config.headers.Authorization).toBe('Bearer new-token');
  });

  test('failed explicit clear invalidates its cached null value', async () => {
    await persistAuthToken('old-token');
    removeItem.mockRejectedValueOnce(new Error('remove failed'));
    await expect(clearAuthToken()).rejects.toThrow('remove failed');
    getItem.mockResolvedValueOnce('stored-token');

    const config = await requestInterceptor({ url: '/auth/me', headers: {} });

    expect(config.headers.Authorization).toBe('Bearer stored-token');
  });

  test('failed older clear does not overwrite a newer cached generation', async () => {
    await persistAuthToken('old-token');
    let rejectOldRemoval!: (error: Error) => void;
    removeItem.mockReturnValueOnce(new Promise<void>((_resolve, reject) => {
      rejectOldRemoval = reject;
    }));
    const oldClear = clearAuthToken();
    await persistAuthToken('new-token');
    rejectOldRemoval(new Error('old remove failed'));
    await expect(oldClear).rejects.toThrow('old remove failed');

    const config = await requestInterceptor({ url: '/auth/me', headers: {} });

    expect(config.headers.Authorization).toBe('Bearer new-token');
  });

  test('failed 401 cleanup invalidates its cached null value', async () => {
    await persistAuthToken('old-token');
    getItem.mockResolvedValueOnce('old-token');
    removeItem.mockRejectedValueOnce(new Error('remove failed'));
    const error = {
      config: { url: '/auth/me', headers: { Authorization: 'Bearer old-token' } },
      response: { status: 401, data: { detail: 'Token 无效或已过期' } },
    };
    await expect(rejectedInterceptor(error)).rejects.toThrow('remove failed');
    getItem.mockResolvedValueOnce('stored-token');

    const config = await requestInterceptor({ url: '/auth/me', headers: {} });

    expect(config.headers.Authorization).toBe('Bearer stored-token');
  });

  test('failed older 401 cleanup does not overwrite a newer cached generation', async () => {
    await persistAuthToken('old-token');
    getItem.mockResolvedValueOnce('old-token');
    let rejectOldRemoval!: (error: Error) => void;
    let removalStarted!: () => void;
    const started = new Promise<void>((resolve) => {
      removalStarted = resolve;
    });
    removeItem.mockReturnValueOnce(new Promise<void>((_resolve, reject) => {
      rejectOldRemoval = reject;
      removalStarted();
    }));
    const error = {
      config: { url: '/auth/me', headers: { Authorization: 'Bearer old-token' } },
      response: { status: 401, data: { detail: 'Token 无效或已过期' } },
    };
    const oldCleanup = rejectedInterceptor(error);
    await started;
    await persistAuthToken('new-token');
    rejectOldRemoval(new Error('old remove failed'));
    await expect(oldCleanup).rejects.toThrow('old remove failed');

    const config = await requestInterceptor({ url: '/auth/me', headers: {} });

    expect(config.headers.Authorization).toBe('Bearer new-token');
  });
});

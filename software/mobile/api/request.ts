import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from './config';

export interface ApiResponse<T = any> {
  code: number;
  data: T;
  message: string;
}

interface RetryConfig {
  retries?: number;
  retryDelay?: number;
  retryCondition?: (error: AxiosError) => boolean;
}

// Simple event system for 401 handling (avoids Node.js 'events' module)
type AuthListener = () => void;
const authListeners: AuthListener[] = [];
export const authEvents = {
  onUnauthorized: (listener: AuthListener) => {
    authListeners.push(listener);
  },
  offUnauthorized: (listener: AuthListener) => {
    const idx = authListeners.indexOf(listener);
    if (idx >= 0) authListeners.splice(idx, 1);
  },
  emit: () => {
    authListeners.forEach((l) => l());
  },
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableError = (error: AxiosError): boolean => {
  // 无响应（网络错误、DNS、CORS 等）一律重试
  if (!error.response) return true;

  const status = error.response.status;
  // 408 Request Timeout / 429 Too Many Requests / 5xx 服务端错误
  if (status === 408 || status === 429 || (status >= 500 && status < 600)) {
    return true;
  }
  return false;
};

const shouldRetry = (error: AxiosError, config: AxiosRequestConfig & RetryConfig): boolean => {
  // 显式禁用重试
  if (config.retries === 0) return false;
  // SSE/流式请求不重试，避免重复消费
  if (config.responseType === 'stream' || config.adapter === 'http') return false;
  // 自定义条件优先
  if (config.retryCondition) return config.retryCondition(error);
  return isRetryableError(error);
};

// Cache token in memory to avoid AsyncStorage reads on every request
let cachedToken: string | null | undefined = undefined;

async function getToken(): Promise<string | null> {
  if (cachedToken !== undefined) return cachedToken;
  cachedToken = await AsyncStorage.getItem('token');
  return cachedToken;
}

// Called on login/logout to invalidate the cache
export function invalidateTokenCache() {
  cachedToken = undefined;
}

function getResponseMessage(error: AxiosError<ApiResponse | any>): string {
  const data = error.response?.data;
  if (!data) return error.message || '网络连接异常，请稍后再试';
  if (typeof data === 'string') return data;
  if (typeof data.message === 'string') return data.message;
  if (typeof data.detail === 'string') return data.detail;
  if (Array.isArray(data.detail) && data.detail.length > 0) {
    const first = data.detail[0];
    if (typeof first?.msg === 'string') return first.msg;
  }
  return error.message || '请求失败，请稍后再试';
}

function hasBearerAuthorization(config: AxiosRequestConfig): boolean {
  const headers = config.headers;
  if (!headers) return false;

  const authorization = typeof (headers as any).get === 'function'
    ? (headers as any).get('Authorization')
    : Object.entries(headers).find(([name]) => name.toLowerCase() === 'authorization')?.[1];

  return typeof authorization === 'string' && /^Bearer\s+\S+/i.test(authorization.trim());
}

function isPublicAuthPath(url?: string): boolean {
  return /^\/auth\/(?:login|register)(?:[/?#]|$)/.test(url ?? '');
}

const createAxiosInstance = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: { 'Content-Type': 'application/json' },
  });

  instance.interceptors.request.use(async (config) => {
    if (isPublicAuthPath(config.url)) return config;

    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  instance.interceptors.response.use(
    (response: AxiosResponse<ApiResponse>) => {
      const { data } = response;
      if (data && typeof data.code === 'number' && data.code !== 0 && data.code !== 200) {
        return Promise.reject(new Error(data.message));
      }
      return response;
    },
    async (error: AxiosError<ApiResponse>) => {
      const config = error.config as (AxiosRequestConfig & RetryConfig) | undefined;
      if (!config) {
        return Promise.reject(error);
      }

      // 401 统一登出
      if (error.response?.status === 401) {
        if (hasBearerAuthorization(config)) {
          await AsyncStorage.removeItem('token');
          invalidateTokenCache();
          authEvents.emit();
        }
        return Promise.reject(new Error(getResponseMessage(error)));
      }

      const retryCount = (config as any).__retryCount || 0;
      const maxRetries = config.retries ?? 2;

      if (retryCount < maxRetries && shouldRetry(error, config)) {
        (config as any).__retryCount = retryCount + 1;

        // 指数退避 + 抖动
        const baseDelay = config.retryDelay ?? 300;
        const delay = baseDelay * 2 ** retryCount + Math.random() * 200;
        console.warn(`[request] retry ${retryCount + 1}/${maxRetries} after ${Math.round(delay)}ms: ${config.method?.toUpperCase()} ${config.url}`);
        await sleep(delay);
        return instance(config);
      }

      return Promise.reject(new Error(getResponseMessage(error)));
    },
  );

  return instance;
};

const request = createAxiosInstance();

export const get = <T = any>(url: string, params?: any, config?: AxiosRequestConfig & RetryConfig) =>
  request.get<T>(url, { params, ...config });

export const post = <T = any>(url: string, data?: any, config?: AxiosRequestConfig & RetryConfig) =>
  request.post<T>(url, data, config);

export const put = <T = any>(url: string, data?: any, config?: AxiosRequestConfig & RetryConfig) =>
  request.put<T>(url, data, config);

export const del = <T = any>(url: string, config?: AxiosRequestConfig & RetryConfig) =>
  request.delete<T>(url, config);

export default request;

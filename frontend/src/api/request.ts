import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { message } from 'antd';

// API响应格式
export interface ApiResponse<T = any> {
  code: number;
  data: T;
  message: string;
}

// 创建axios实例
const createAxiosInstance = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // 请求拦截器
  instance.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // 响应拦截器
  instance.interceptors.response.use(
    (response: AxiosResponse<ApiResponse>) => {
      const { data } = response;
      // 业务错误码处理 — only reject when code field is present and indicates error
      if (data && typeof data.code === 'number' && data.code !== 0 && data.code !== 200) {
        return Promise.reject(new Error(data.message));
      }
      return response;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  return instance;
};

// 错误处理
const handleError = (error: any): void => {
  if (error.response) {
    const { status, data } = error.response;
    switch (status) {
      case 401:
        message.error('未授权，请重新登录');
        localStorage.removeItem('token');
        window.location.href = '/login';
        break;
      case 403:
        message.error('拒绝访问');
        break;
      case 404:
        message.error('请求资源不存在');
        break;
      case 500:
        message.error('服务器错误');
        break;
      default:
        message.error(data?.message || '请求失败');
    }
  } else if (error.request) {
    message.error('网络错误，请检查网络连接');
  } else {
    message.error('请求配置错误');
  }
};

// 创建请求实例
const request = createAxiosInstance();

type CachedResponse = AxiosResponse<any>;

const getResponseCache = new Map<string, { expiresAt: number; response: CachedResponse }>();
const getInFlight = new Map<string, Promise<CachedResponse>>();

const stableStringify = (value: any): string => {
  if (!value || typeof value !== 'object') return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    .join(',')}}`;
};

const getCacheKey = (url: string, params?: any) => `${url}?${stableStringify(params)}`;

// 封装请求方法
export const get = <T = any>(url: string, params?: any, config?: AxiosRequestConfig) => {
  return request.get<T>(url, { params, ...config });
};

export const getCached = <T = any>(
  url: string,
  params?: any,
  ttlMs = 60000,
  config?: AxiosRequestConfig,
) => {
  const key = getCacheKey(url, params);
  const now = Date.now();
  const cached = getResponseCache.get(key);
  if (cached && cached.expiresAt > now) {
    return Promise.resolve(cached.response as AxiosResponse<T>);
  }

  const inFlight = getInFlight.get(key);
  if (inFlight) return inFlight as Promise<AxiosResponse<T>>;

  const requestPromise = get<T>(url, params, config)
    .then((response) => {
      getResponseCache.set(key, { expiresAt: Date.now() + ttlMs, response });
      return response;
    })
    .finally(() => {
      getInFlight.delete(key);
    });
  getInFlight.set(key, requestPromise as Promise<CachedResponse>);
  return requestPromise;
};

export const invalidateGetCache = (matcher?: (key: string) => boolean) => {
  if (!matcher) {
    getResponseCache.clear();
    getInFlight.clear();
    return;
  }
  [...getResponseCache.keys()].forEach((key) => {
    if (matcher(key)) getResponseCache.delete(key);
  });
  [...getInFlight.keys()].forEach((key) => {
    if (matcher(key)) getInFlight.delete(key);
  });
};

export const post = <T = any>(url: string, data?: any, config?: AxiosRequestConfig) => {
  return request.post<T>(url, data, config);
};

export const put = <T = any>(url: string, data?: any, config?: AxiosRequestConfig) => {
  return request.put<T>(url, data, config);
};

export const del = <T = any>(url: string, config?: AxiosRequestConfig) => {
  return request.delete<T>(url, config);
};

export default request;

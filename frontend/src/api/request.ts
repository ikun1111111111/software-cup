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
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
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
      // 业务错误码处理
      if (data.code !== 0 && data.code !== 200) {
        message.error(data.message || '请求失败');
        return Promise.reject(new Error(data.message));
      }
      return response;
    },
    (error) => {
      handleError(error);
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

// 封装请求方法
export const get = <T = any>(url: string, params?: any, config?: AxiosRequestConfig) => {
  return request.get<ApiResponse<T>>(url, { params, ...config });
};

export const post = <T = any>(url: string, data?: any, config?: AxiosRequestConfig) => {
  return request.post<ApiResponse<T>>(url, data, config);
};

export const put = <T = any>(url: string, data?: any, config?: AxiosRequestConfig) => {
  return request.put<ApiResponse<T>>(url, data, config);
};

export const del = <T = any>(url: string, config?: AxiosRequestConfig) => {
  return request.delete<ApiResponse<T>>(url, config);
};

export default request;

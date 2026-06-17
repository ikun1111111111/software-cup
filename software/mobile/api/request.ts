import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from './config';

export interface ApiResponse<T = any> {
  code: number;
  data: T;
  message: string;
}

const createAxiosInstance = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: { 'Content-Type': 'application/json' },
  });

  instance.interceptors.request.use(async (config) => {
    const token = await AsyncStorage.getItem('token');
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
    (error) => Promise.reject(error),
  );

  return instance;
};

const request = createAxiosInstance();

export const get = <T = any>(url: string, params?: any, config?: AxiosRequestConfig) =>
  request.get<T>(url, { params, ...config });

export const post = <T = any>(url: string, data?: any, config?: AxiosRequestConfig) =>
  request.post<T>(url, data, config);

export const put = <T = any>(url: string, data?: any, config?: AxiosRequestConfig) =>
  request.put<T>(url, data, config);

export const del = <T = any>(url: string, config?: AxiosRequestConfig) =>
  request.delete<T>(url, config);

export default request;

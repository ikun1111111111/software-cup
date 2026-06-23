import { Platform } from 'react-native';

declare const process: {
  env?: {
    EXPO_PUBLIC_API_BASE_URL?: string;
    EXPO_PUBLIC_WS_BASE_URL?: string;
    EXPO_PUBLIC_DEMO_MODE?: string;
  };
};

const DEV_HOST = Platform.select({
  android: '10.0.2.2',
  ios: 'localhost',
  default: 'localhost',
});

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');
const isEnabledFlag = (value?: string) => /^(1|true|yes|on|demo)$/i.test(value?.trim() ?? '');

const DEFAULT_API_BASE_URL = `http://${DEV_HOST}:8000/api`;
const DEFAULT_WS_BASE_URL = `ws://${DEV_HOST}:8000/ws`;

export const API_BASE_URL = trimTrailingSlash(
  process.env?.EXPO_PUBLIC_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL,
);

export const WS_BASE_URL = trimTrailingSlash(
  process.env?.EXPO_PUBLIC_WS_BASE_URL?.trim() || DEFAULT_WS_BASE_URL,
);

export const DEMO_MODE = isEnabledFlag(process.env?.EXPO_PUBLIC_DEMO_MODE);

export const API_RUNTIME_LABEL = DEMO_MODE ? '演示数据模式' : '在线服务模式';

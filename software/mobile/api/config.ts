import Constants from 'expo-constants';
import { Platform } from 'react-native';

declare const process: {
  env?: {
    EXPO_PUBLIC_API_BASE_URL?: string;
    EXPO_PUBLIC_WS_BASE_URL?: string;
    EXPO_PUBLIC_BACKEND_PORT?: string;
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

const resolveBackendPort = (): string => {
  const rawPort = process.env?.EXPO_PUBLIC_BACKEND_PORT?.trim();
  if (!rawPort || !/^\d+$/.test(rawPort)) return '8000';
  const port = Number(rawPort);
  return port >= 1 && port <= 65535 ? rawPort : '8000';
};

const resolveDevHost = (): string => {
  const hostUri = Constants.expoConfig?.hostUri?.trim();
  if (hostUri) {
    try {
      const parsed = new URL(hostUri.includes('://') ? hostUri : `http://${hostUri}`);
      return parsed.hostname;
    } catch {
      // fall through to platform defaults
    }
  }

  return DEV_HOST;
};

const DEV_BACKEND_PORT = resolveBackendPort();
const DEFAULT_API_BASE_URL = `http://${resolveDevHost()}:${DEV_BACKEND_PORT}/api`;
const DEFAULT_WS_BASE_URL = `ws://${resolveDevHost()}:${DEV_BACKEND_PORT}/ws`;

export const API_BASE_URL = trimTrailingSlash(
  process.env?.EXPO_PUBLIC_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL,
);

export const WS_BASE_URL = trimTrailingSlash(
  process.env?.EXPO_PUBLIC_WS_BASE_URL?.trim() || DEFAULT_WS_BASE_URL,
);

export const DEMO_MODE = isEnabledFlag(process.env?.EXPO_PUBLIC_DEMO_MODE);

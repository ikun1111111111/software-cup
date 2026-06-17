import { Platform } from 'react-native';

const DEV_HOST = Platform.select({
  android: '10.0.2.2',
  ios: 'localhost',
  default: 'localhost',
});

export const API_BASE_URL = `http://${DEV_HOST}:8000/api`;
export const WS_BASE_URL = `ws://${DEV_HOST}:8000/ws`;

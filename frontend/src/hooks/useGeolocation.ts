import { useState, useEffect } from 'react';

export interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  loading: boolean;
  error: string | null;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setState((s) => ({ ...s, loading: false, error: '浏览器不支持定位' }));
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setState({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          loading: false,
          error: null,
        });
      },
      (err) => {
        setState((s) => ({
          ...s,
          loading: false,
          error: err.code === 1 ? '已拒绝定位授权' : '定位失败',
        }));
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  return state;
}

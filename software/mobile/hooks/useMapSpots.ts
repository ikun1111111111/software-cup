import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { listSpots, type Spot } from '@/api/spots';
import { LINGSHAN_CENTER } from '@/components/map/AmapView.shared';
import { getMapFallbackSpots, normalizeMapSpotResponse } from '@/utils/mapSpotsFallback';

// In-memory cache for spots list
let spotsCache: Spot[] | null = null;
let spotsCacheTime = 0;
const SPOTS_CACHE_TTL = 5 * 60 * 1000;

interface RouteStep {
  distance: number;
  duration: number;
}

export function useMapSpots() {
  const [spots, setSpots] = useState<Spot[]>(() => spotsCache ?? getMapFallbackSpots());
  const [loading, setLoading] = useState(false);
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  const [navigating, setNavigating] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteStep | null>(null);

  useEffect(() => {
    if (spotsCache && Date.now() - spotsCacheTime < SPOTS_CACHE_TTL) {
      setSpots(spotsCache);
      setLoading(false);
      return;
    }
    let disposed = false;
    listSpots()
      .then((res) => {
        if (disposed) return;
        const withCoords = normalizeMapSpotResponse(res);
        spotsCache = withCoords;
        spotsCacheTime = Date.now();
        setSpots(withCoords);
      })
      .catch(() => {
        if (disposed) return;
        const fallback = getMapFallbackSpots();
        if (!spotsCache) {
          spotsCache = fallback;
          spotsCacheTime = Date.now();
        }
        setSpots(fallback);
      })
      .finally(() => {
        if (!disposed) setLoading(false);
      });
    return () => {
      disposed = true;
    };
  }, []);

  const handleSpotTap = useCallback((spot: Spot) => {
    setSelectedSpot(spot);
    setNavigating(false);
    setRouteInfo(null);
  }, []);

  const handleNavigate = useCallback(() => {
    if (!userLocation || !selectedSpot) {
      Alert.alert('无法导航', '请先授权定位权限');
      return;
    }
    setNavigating(true);
    const dist = haversine(
      userLocation.latitude, userLocation.longitude,
      selectedSpot.latitude!, selectedSpot.longitude!,
    );
    const time = Math.ceil(dist / 80 * 60);
    setRouteInfo({ distance: dist, duration: time });
  }, [userLocation, selectedSpot]);

  const handleCloseRoute = useCallback(() => {
    setNavigating(false);
    setRouteInfo(null);
  }, []);

  const spotDistance =
    selectedSpot && userLocation && selectedSpot.latitude != null && selectedSpot.longitude != null
      ? haversine(userLocation.latitude, userLocation.longitude, selectedSpot.latitude, selectedSpot.longitude)
      : null;

  return {
    spots, loading, selectedSpot, navigating, userLocation,
    locationError, routeInfo, spotDistance,
    setSelectedSpot, setNavigating, setLocationError, setUserLocation,
    handleSpotTap, handleNavigate, handleCloseRoute,
  };
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export { LINGSHAN_CENTER };

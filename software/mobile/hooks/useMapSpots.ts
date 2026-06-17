import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { listSpots, type Spot } from '@/api/spots';

const LINGSHAN_CENTER = { latitude: 31.424, longitude: 120.355 };

interface RouteStep {
  distance: number;
  duration: number;
}

export function useMapSpots() {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  const [navigating, setNavigating] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteStep | null>(null);

  useEffect(() => {
    listSpots()
      .then((res) => {
        const data = (res as any).data ?? res;
        const withCoords = (Array.isArray(data) ? data : []).filter(
          (s: Spot) => s.latitude != null && s.longitude != null,
        );
        setSpots(withCoords);
      })
      .catch(() => setSpots([]))
      .finally(() => setLoading(false));
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
    setSelectedSpot, setLocationError, setUserLocation,
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

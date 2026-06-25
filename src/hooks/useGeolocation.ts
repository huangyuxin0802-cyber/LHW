"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type UserLocation = {
  latitude: number;
  longitude: number;
  accuracy: number;
};

export type GeolocationStatus =
  | "idle"
  | "locating"
  | "active"
  | "denied"
  | "unavailable";

const GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 30_000,
};

export function useGeolocation() {
  const watchIdRef = useRef<number | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [status, setStatus] = useState<GeolocationStatus>("idle");

  const clearWatch = useCallback(() => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus("unavailable");
      return;
    }

    clearWatch();
    setStatus("locating");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setStatus("active");
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setStatus("denied");
        } else {
          setStatus("unavailable");
        }
      },
      GEO_OPTIONS
    );

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setStatus("active");
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setStatus("denied");
        }
      },
      GEO_OPTIONS
    );
  }, [clearWatch]);

  useEffect(() => {
    startTracking();
    return clearWatch;
  }, [startTracking, clearWatch]);

  return {
    userLocation,
    status,
    retry: startTracking,
  };
}

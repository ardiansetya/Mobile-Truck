// hooks/useLocation.ts
import { useState, useEffect } from "react";
import * as Location from "expo-location";

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  city?: string;
  region?: string;
  country?: string;
  address?: string;
  mocked?: boolean; 
}

export interface UseLocationReturn {
  location: LocationData | null;
  isLoading: boolean;
  error: string | null;
  isMocked: boolean; 
  requestLocationPermission: () => Promise<boolean>;
  getCurrentLocation: () => Promise<void>;
  startWatchingLocation: () => void;
  stopWatchingLocation: () => void;
  isWatching: boolean;
}

export const useLocation = (): UseLocationReturn => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isWatching, setIsWatching] = useState(false);
  const [isMocked, setIsMocked] = useState(false); 
  const [watchSubscription, setWatchSubscription] =
    useState<Location.LocationSubscription | null>(null);

  // Request location permission
  const requestLocationPermission = async (): Promise<boolean> => {
    try {
      const { status: foregroundStatus } =
        await Location.requestForegroundPermissionsAsync();

      if (foregroundStatus !== "granted") {
        setError("Permission to access location was denied");
        return false;
      }

      const isEnabled = await Location.hasServicesEnabledAsync();
      if (!isEnabled) {
        setError("Location services are not enabled");
        return false;
      }

      return true;
    } catch (err) {
      setError("Failed to request location permission");
      return false;
    }
  };

  // Helper: build LocationData + deteksi mocked
  const buildLocationData = async (locationResult: Location.LocationObject) => {
    const { latitude, longitude, accuracy } = locationResult.coords;

    let locationData: LocationData = {
      latitude,
      longitude,
      accuracy: accuracy || undefined,
      mocked: locationResult.mocked ?? false,
    };

    setIsMocked(locationResult.mocked ?? false);

    try {
      const geocoding = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });
      if (geocoding && geocoding.length > 0) {
        const address = geocoding[0];
        locationData = {
          ...locationData,
          city: address.city || undefined,
          region: address.region || undefined,
          country: address.country || undefined,
          address: [
            address.name,
            address.street,
            address.city,
            address.region,
            address.country,
          ]
            .filter(Boolean)
            .join(", "),
        };
      }
    } catch (err) {
      console.warn("Reverse geocoding failed:", err);
    }

    return locationData;
  };

  // Get current location once
  const getCurrentLocation = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        setIsLoading(false);
        return;
      }

      const locationResult = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const locationData = await buildLocationData(locationResult);

      setLocation(locationData);

      if (locationData.mocked) {
        setError("⚠️ Fake GPS terdeteksi!");
      }
    } catch (err) {
      setError(
        "Failed to get current location. Please check your GPS settings."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Start watching location changes
  const startWatchingLocation = async (): Promise<void> => {
    if (isWatching) return;

    try {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) return;

      setIsWatching(true);
      setError(null);

      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 5,
        },
        async (locationResult) => {
          const locationData = await buildLocationData(locationResult);
          setLocation(locationData);

          if (locationData.mocked) {
            setError("⚠️ Fake GPS terdeteksi!");
          }
        }
      );

      setWatchSubscription(subscription);
    } catch (err) {
      setError("Failed to start location tracking");
      setIsWatching(false);
    }
  };

  const stopWatchingLocation = (): void => {
    if (watchSubscription) {
      watchSubscription.remove();
      setWatchSubscription(null);
    }
    setIsWatching(false);
  };

  useEffect(() => {
    return () => {
      stopWatchingLocation();
    };
  }, []);

  return {
    location,
    isLoading,
    error,
    isMocked, // <-- expose ke luar
    requestLocationPermission,
    getCurrentLocation,
    startWatchingLocation,
    stopWatchingLocation,
    isWatching,
  };
};

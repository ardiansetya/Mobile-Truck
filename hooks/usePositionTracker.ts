import api from "@/services/axios";
import { useMutation } from "@tanstack/react-query";
import * as BackgroundFetch from "expo-background-fetch";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
import { LocationData, useLocation } from "./useLocation";

interface PositionPayload {
  latitude: number;
  longitude: number;
  recorded_at: number; // Unix timestamp
}

interface UsePositionTrackerOptions {
  autoTrack?: boolean; // Automatically start tracking when component mounts
  interval?: number; // Interval in milliseconds to send position updates
}

interface UsePositionTrackerReturn {
  isTracking: boolean;
  location: LocationData | null;
  isLoadingLocation: boolean;
  locationError: string | null;
  isSendingPosition: boolean;
  sendPositionError: string | null;
  lastSentAt: Date | null;
  isMocked: boolean;
  backgroundTaskRegistered: boolean;
  startTracking: () => void;
  stopTracking: () => void;
  sendCurrentPosition: () => Promise<void>;
}

// Task names
const BACKGROUND_LOCATION_TASK = "background-location-task";
const BACKGROUND_FETCH_TASK = "background-fetch-task";

// Global variables to track last send time and prevent spam
let lastBackgroundSendTime = 0;
let backgroundSendInterval = 900000; // 15 minutes default

// API function to send position
const sendPositionToAPI = async (position: PositionPayload): Promise<any> => {
  try {
    const response = await api.post("/api/delivery/position", position);

    if (response.status !== 200) {
      throw new Error(`Failed to send position: ${response.status}`);
    }

    return response.data;
  } catch (error) {
    console.error("❌ API Error:", error);
    throw error;
  }
};

// Background location task with throttling
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error("❌ Background location error:", error);
    return;
  }

  if (data) {
    const { locations } = data as any;
    const location = locations[0];
    const currentTime = Date.now();

    // Throttle background sends to prevent spam
    if (currentTime - lastBackgroundSendTime < backgroundSendInterval) {
      console.log(
        `⏳ Background send throttled. Next send in ${Math.round((backgroundSendInterval - (currentTime - lastBackgroundSendTime)) / 1000)}s`
      );
      return;
    }

    if (location && !location.mocked) {
      const payload: PositionPayload = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        recorded_at: Math.floor(currentTime / 1000),
      };

      try {
        await sendPositionToAPI(payload);
        lastBackgroundSendTime = currentTime;
      } catch (error) {
        console.error("❌ Failed to send background position:", error);
      }
    } else {
    }
  }
});

// Background fetch task
TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    const currentTime = Date.now();

    // Throttle background fetch as well
    if (currentTime - lastBackgroundSendTime < backgroundSendInterval) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // Get current location
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced, // Changed from High to Balanced
    });

    if (location && !location.mocked) {
      const payload: PositionPayload = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        recorded_at: Math.floor(currentTime / 1000),
      };

      await sendPositionToAPI(payload);
      lastBackgroundSendTime = currentTime;

      return BackgroundFetch.BackgroundFetchResult.NewData;
    }

    return BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (error) {
    console.error("❌ Background fetch error:", error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export const usePositionTracker = (
  options: UsePositionTrackerOptions = {}
): UsePositionTrackerReturn => {
  const { autoTrack = false, interval = 900000 } = options; // Default 15 minutes

  const [isTracking, setIsTracking] = useState(false);
  const [lastSentAt, setLastSentAt] = useState<Date | null>(null);
  const [backgroundTaskRegistered, setBackgroundTaskRegistered] =
    useState(false);
  const intervalRef = useRef<NodeJS.Timeout | number | null>(null);
  const isInitialized = useRef(false);
  const locationRef = useRef<LocationData | null>(null);

  const {
    location,
    isLoading: isLoadingLocation,
    error: locationError,
    isMocked,
    startWatchingLocation,
    stopWatchingLocation,
    getCurrentLocation,
  } = useLocation();

  // Update location ref whenever location changes
  useEffect(() => {
    if (location) {
      locationRef.current = location;
    }
  }, [location]);

  // Update global interval when hook interval changes
  useEffect(() => {
    backgroundSendInterval = interval;
    console.log(
      "⚙️ Background send interval updated to:",
      interval / 60000,
      "minutes"
    );
  }, [interval]);

  // Mutation for sending position to API
  const sendPositionMutation = useMutation({
    mutationFn: sendPositionToAPI,
    onSuccess: (data) => {
      setLastSentAt(new Date());
    },
    onError: (error: Error) => {
      console.error("❌ Failed to send position:", error.message);
    },
  });

  // Setup background tasks with fixed configuration
  const setupBackgroundTasks = useCallback(async () => {
    try {
      // Request background permissions
      const { status: backgroundStatus } =
        await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus !== "granted") {
        console.warn("⚠️ Background location permission denied");
        return false;
      }

      // Register background fetch with new API
      await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK);

      // Set minimum interval separately
      await BackgroundFetch.setMinimumIntervalAsync(interval);
      console.log(
        "✅ Background fetch registered with interval:",
        interval / 60000,
        "minutes"
      );

      // Start background location tracking with optimized settings
      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.Balanced, // Changed from High to Balanced
        timeInterval: Math.max(interval, 60000), // At least 1 minute, use interval if higher
        distanceInterval: 10, // Only update if moved 10 meters
        deferredUpdatesInterval: interval, // Defer updates to save battery
        pausesUpdatesAutomatically: true, // Pause when device is stationary
        foregroundService: {
          notificationTitle: "Tracking Location",
          notificationBody: "App is tracking your location in the background",
          notificationColor: "#000000",
        },
      });

      setBackgroundTaskRegistered(true);
      console.log(
        "✅ Background location started with interval:",
        interval / 60000,
        "minutes"
      );
      return true;
    } catch (error) {
      console.error("❌ Failed to setup background tasks:", error);
      return false;
    }
  }, [interval]);

  // Cleanup background tasks
  const cleanupBackgroundTasks = useCallback(async () => {
    try {
      // Check if tasks are registered before trying to unregister
      const isLocationTaskRegistered = await TaskManager.isTaskRegisteredAsync(
        BACKGROUND_LOCATION_TASK
      );
      const isFetchTaskRegistered = await TaskManager.isTaskRegisteredAsync(
        BACKGROUND_FETCH_TASK
      );

      if (isLocationTaskRegistered) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      }

      if (isFetchTaskRegistered) {
        await BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
      }

      setBackgroundTaskRegistered(false);
    } catch (error) {
      console.error("❌ Failed to cleanup background tasks:", error);
    }
  }, []);

  // Get current location with timeout
  const getLocationWithTimeout = useCallback(
    async (timeoutMs: number = 5000): Promise<LocationData | null> => {
      if (locationRef.current) {
        return locationRef.current;
      }

      try {
        await getCurrentLocation();

        const startTime = Date.now();
        while (!locationRef.current && Date.now() - startTime < timeoutMs) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        return locationRef.current;
      } catch (error) {
        console.error("❌ Failed to get location:", error);
        return null;
      }
    },
    [getCurrentLocation]
  );

  // Send position with robust location handling
  const sendPositionRobust = useCallback(async (): Promise<boolean> => {
    const currentLocation = await getLocationWithTimeout(3000);

    if (!currentLocation) {
      return false;
    }

    if (currentLocation.mocked) {
      return false;
    }

    try {
      const payload: PositionPayload = {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        recorded_at: Math.floor(Date.now() / 1000),
      };

      await sendPositionMutation.mutateAsync(payload);

      return true;
    } catch (error) {
      console.error("❌ Failed to send position:", error);
      return false;
    }
  }, [getLocationWithTimeout, sendPositionMutation]);

  // Send current position (for external use)
  const sendCurrentPosition = useCallback(async (): Promise<void> => {
    const success = await sendPositionRobust();
    if (!success) {
      throw new Error("Failed to send position");
    }
  }, [sendPositionRobust]);

  // Interval function for automatic sending
  const intervalSendPosition = useCallback(async () => {
    await sendPositionRobust();
  }, [sendPositionRobust]);

  const appState = useRef(AppState.currentState);

  const handleAppStateChange = useCallback(
    (nextAppState: AppStateStatus) => {
      const currentState = appState.current;

      if (
        (currentState === "inactive" || currentState === "background") &&
        nextAppState === "active"
      ) {
        if (isTracking) {
          sendPositionRobust();
        }
      }

      appState.current = nextAppState;
    },
    [isTracking, sendPositionRobust]
  );

  // Start tracking
  const startTracking = useCallback(async () => {
    if (isTracking) {
      return;
    }

    try {
      // Reset last send time when starting tracking
      lastBackgroundSendTime = 0;

      // Start foreground location tracking
      await startWatchingLocation();

      // Setup background tasks
      const backgroundSetup = await setupBackgroundTasks();

      setIsTracking(true);

      // Send initial position
      const initialSuccess = await sendPositionRobust();

      if (initialSuccess) {
      } else {
      }

      // Set up foreground interval as backup
      intervalRef.current = setInterval(intervalSendPosition, interval);
      console.log(
        "✅ Foreground interval set up with",
        interval / 60000,
        "minutes"
      );

      if (backgroundSetup) {
      } else {
        console.log(
          "⚠️ Background tracking not available, using foreground only"
        );
      }
    } catch (error) {
      console.error("❌ Failed to start tracking:", error);
      setIsTracking(false);
    }
  }, [
    isTracking,
    interval,
    startWatchingLocation,
    sendPositionRobust,
    intervalSendPosition,
    setupBackgroundTasks,
  ]);

  // Stop tracking
  const stopTracking = useCallback(async () => {
    if (!isTracking) {
      return;
    }

    setIsTracking(false);

    // Stop foreground tracking
    stopWatchingLocation();

    // Clear foreground interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Cleanup background tasks
    await cleanupBackgroundTasks();
  }, [isTracking, stopWatchingLocation, cleanupBackgroundTasks]);

  // Setup app state listener
  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );
    return () => subscription?.remove();
  }, [handleAppStateChange]);

  // Auto-start tracking
  useEffect(() => {
    if (autoTrack && !isInitialized.current) {
      isInitialized.current = true;
      setTimeout(() => {
        startTracking();
      }, 1000);
    }

    return () => {
      stopTracking();
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    isTracking,
    location,
    isLoadingLocation,
    locationError,
    isMocked,
    backgroundTaskRegistered,
    isSendingPosition: sendPositionMutation.isPending,
    sendPositionError: sendPositionMutation.error?.message || null,
    lastSentAt,
    startTracking,
    stopTracking,
    sendCurrentPosition,
  };
};

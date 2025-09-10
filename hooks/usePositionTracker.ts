import { useMutation } from "@tanstack/react-query";
import { useState, useCallback, useRef, useEffect } from "react";
import { useLocation, LocationData } from "./useLocation";
import * as TaskManager from "expo-task-manager";
import * as BackgroundFetch from "expo-background-fetch";
import * as Location from "expo-location";
import { AppState, AppStateStatus } from "react-native";
import api from "@/services/axios";

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

// Background location task
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error("❌ Background location error:", error);
    return;
  }

  if (data) {
    const { locations } = data as any;
    const location = locations[0];

    if (location && !location.mocked) {
      const payload: PositionPayload = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        recorded_at: Math.floor(Date.now() / 1000),
      };

      try {
        await sendPositionToAPI(payload);
        console.log("✅ Background position sent:", payload);
      } catch (error) {
        console.error("❌ Failed to send background position:", error);
      }
    } else {
      console.log("🚫 Mocked location detected in background, skipping");
    }
  }
});

// Background fetch task
TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    // Get current location
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    if (location && !location.mocked) {
      const payload: PositionPayload = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        recorded_at: Math.floor(Date.now() / 1000),
      };

      await sendPositionToAPI(payload);
      console.log("✅ Background fetch position sent:", payload);
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
      console.log("📍 Location ref updated:", location);
    }
  }, [location]);

  // Mutation for sending position to API
  const sendPositionMutation = useMutation({
    mutationFn: sendPositionToAPI,
    onSuccess: (data) => {
      setLastSentAt(new Date());
      console.log("✅ Position sent successfully:", data);
    },
    onError: (error: Error) => {
      console.error("❌ Failed to send position:", error.message);
    },
  });

  // Setup background tasks
  const setupBackgroundTasks = useCallback(async () => {
    try {
      // Request background permissions
      const { status: backgroundStatus } =
        await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus !== "granted") {
        console.warn("⚠️ Background location permission denied");
        return false;
      }

      // Register background fetch
      await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
        minimumInterval: interval, // 15 minutes
        stopOnTerminate: false, // Continue after app is killed
        startOnBoot: true, // Start when device boots
      });

      // Start background location tracking
      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.High,
        timeInterval: interval, // 15 minutes
        distanceInterval: 0, // Send regardless of distance
        deferredUpdatesInterval: interval,
        foregroundService: {
          notificationTitle: "Tracking Location",
          notificationBody: "App is tracking your location in the background",
        },
      });

      setBackgroundTaskRegistered(true);
      console.log("✅ Background tasks registered successfully");
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
        console.log("✅ Background location stopped");
      }

      if (isFetchTaskRegistered) {
        await BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
        console.log("✅ Background fetch unregistered");
      }

      setBackgroundTaskRegistered(false);
    } catch (error) {
      console.error("❌ Failed to cleanup background tasks:", error);
    }
  }, []);

  // Get current location with timeout
  const getLocationWithTimeout = useCallback(
    async (timeoutMs: number = 5000): Promise<LocationData | null> => {
      console.log("📍 Getting location with timeout:", timeoutMs, "ms");

      if (locationRef.current) {
        console.log("✅ Using cached location from ref");
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
    console.log("🔄 Attempting to send position...");

    const currentLocation = await getLocationWithTimeout(3000);

    if (!currentLocation) {
      console.log("❌ No location available after timeout, skipping send");
      return false;
    }

    if (currentLocation.mocked) {
      console.log("🚫 Fake GPS detected, skipping send");
      return false;
    }

    try {
      const payload: PositionPayload = {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        recorded_at: Math.floor(Date.now() / 1000),
      };

      console.log("📤 Sending position:", payload);
      await sendPositionMutation.mutateAsync(payload);
      console.log("✅ Position sent successfully!");
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
    console.log("⏰ Interval triggered - attempting automatic send");
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
        console.log("📱 App has come to the foreground!");
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
      console.log("⚠️ Already tracking, skipping start");
      return;
    }

    console.log("🚀 Starting automatic position tracking...");
    console.log("📊 Interval:", interval, "ms (", interval / 60000, "minutes)");

    try {
      // Start foreground location tracking
      await startWatchingLocation();
      console.log("📍 Foreground location watching started");

      // Setup background tasks
      const backgroundSetup = await setupBackgroundTasks();

      setIsTracking(true);

      // Send initial position
      const initialSuccess = await sendPositionRobust();

      if (initialSuccess) {
        console.log("✅ Initial position sent successfully");
      } else {
        console.log("⚠️ Initial send failed, will retry in first interval");
      }

      // Set up foreground interval as backup
      intervalRef.current = setInterval(intervalSendPosition, interval);
      console.log("✅ Foreground interval set up");

      if (backgroundSetup) {
        console.log("✅ Background tracking enabled");
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
      console.log("⚠️ Not tracking, skipping stop");
      return;
    }

    console.log("🛑 Stopping position tracking...");
    setIsTracking(false);

    // Stop foreground tracking
    stopWatchingLocation();

    // Clear foreground interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      console.log("✅ Foreground interval cleared");
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
      console.log("🚀 Auto-starting automatic position tracking...");
      isInitialized.current = true;
      setTimeout(() => {
        startTracking();
      }, 1000);
    }

    return () => {
      console.log("🧹 Cleanup: stopping automatic tracking");
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

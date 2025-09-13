// FIXED VERSION - Mengatasi spam stopping tracking

import api from "@/services/axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
import { LocationData, useLocation } from "./useLocation";

interface PositionPayload {
  latitude: number;
  longitude: number;
  recorded_at: number;
}

interface UsePositionTrackerOptions {
  autoTrack?: boolean;
  interval?: number;
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
  timeUntilNextSend: number;
  startTracking: () => void;
  stopTracking: () => void;
  sendCurrentPosition: () => Promise<void>;
}

const BACKGROUND_LOCATION_TASK = "background-location-task";

const QUERY_KEYS = {
  TRACKING_STATE: ["position-tracker", "tracking-state"],
  LAST_SEND_TIME: ["position-tracker", "last-send-time"],
};

const STORAGE_KEYS = {
  LAST_SEND_TIME: "position_tracker_last_send_time",
  TRACKING_STATE: "position_tracker_tracking_state",
  SEND_INTERVAL: "position_tracker_send_interval",
};

// Global variables
let lastBackgroundSendTime = 0;
let backgroundSendInterval = 60000;
let isSendingGlobal = false;
let sendPromise: Promise<boolean> | null = null;

// FIX: Add global flags to prevent multiple operations
let isStartingGlobal = false;
let isStoppingGlobal = false;

const storageUtils = {
  async getLastSendTime(): Promise<number> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SEND_TIME);
      return stored ? parseInt(stored, 10) : 0;
    } catch {
      return 0;
    }
  },

  async getTrackingState(): Promise<boolean> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.TRACKING_STATE);
      return stored === "true";
    } catch {
      return false;
    }
  },

  async saveLastSendTime(time: number): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_SEND_TIME, time.toString());
      lastBackgroundSendTime = time;
    } catch (error) {
      console.error("Failed to save last send time:", error);
    }
  },

  async saveTrackingState(isTracking: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.TRACKING_STATE,
        isTracking.toString()
      );
    } catch (error) {
      console.error("Failed to save tracking state:", error);
    }
  },
};

const sendPositionToAPI = async (position: PositionPayload): Promise<any> => {
  try {
    const response = await api.post("/api/delivery/position", position);
    if (response.status !== 200) {
      throw new Error(`Failed to send position: ${response.status}`);
    }
    return response.data;
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
};

const throttledSendPosition = async (
  location: LocationData,
  forceUpdate: boolean = false
): Promise<boolean> => {
  if (isSendingGlobal && sendPromise) {
    console.log("Waiting for existing send to complete...");
    return await sendPromise;
  }

  const currentTime = Date.now();
  const timeSinceLastSend = currentTime - lastBackgroundSendTime;

  if (!forceUpdate && timeSinceLastSend < backgroundSendInterval) {
    console.log(
      `Send throttled. Next send in ${Math.round((backgroundSendInterval - timeSinceLastSend) / 1000)}s`
    );
    return false;
  }

  if (location.mocked) {
    console.warn("Location is mocked, skipping send");
    return false;
  }

  isSendingGlobal = true;
  sendPromise = (async () => {
    try {
      const payload: PositionPayload = {
        latitude: location.latitude,
        longitude: location.longitude,
        recorded_at: Math.floor(currentTime / 1000),
      };

      await sendPositionToAPI(payload);
      await storageUtils.saveLastSendTime(currentTime);
      console.log("Position sent successfully");
      return true;
    } catch (error) {
      console.error("Failed to send position:", error);
      return false;
    } finally {
      isSendingGlobal = false;
      sendPromise = null;
    }
  })();

  return await sendPromise;
};

const initializeFromStorage = async () => {
  try {
    lastBackgroundSendTime = await storageUtils.getLastSendTime();
  } catch (error) {
    console.error("Failed to initialize from storage:", error);
  }
};

const initializeLocationTask = () => {
  if (TaskManager.isTaskDefined(BACKGROUND_LOCATION_TASK)) {
    return;
  }

  TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
    if (error) {
      console.error("Background location error:", error);
      return;
    }

    if (data) {
      const { locations } = data as any;
      const location = locations[0];

      if (lastBackgroundSendTime === 0) {
        await initializeFromStorage();
      }

      if (location && !location.mocked) {
        const locationData: LocationData = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy,
          mocked: location.mocked || false,
        };

        await throttledSendPosition(locationData);
      }
    }
  });
};

export const usePositionTracker = (
  options: UsePositionTrackerOptions = {}
): UsePositionTrackerReturn => {
  const { autoTrack = false, interval = 60000 } = options;

  const [isTracking, setIsTracking] = useState(false);
  const [backgroundTaskRegistered, setBackgroundTaskRegistered] =
    useState(false);
  const [timeUntilNextSend, setTimeUntilNextSend] = useState(0);

  // FIX: Add refs to prevent multiple operations
  const isTrackingRef = useRef(false);
  const isStoppingRef = useRef(false);
  const isStartingRef = useRef(false);

  const countdownRef = useRef<NodeJS.Timeout | null | number>(null);
  const isInitialized = useRef(false);
  const locationRef = useRef<LocationData | null>(null);
  const appStateRef = useRef(AppState.currentState);
  const appStateHandlerTimeoutRef = useRef<NodeJS.Timeout | null | number>(
    null
  );
  const lastAppStateChangeRef = useRef(0);

  const queryClient = useQueryClient();

  const {
    location,
    isLoading: isLoadingLocation,
    error: locationError,
    isMocked,
    startWatchingLocation,
    stopWatchingLocation,
    getCurrentLocation,
  } = useLocation();

  // FIX: Update refs when state changes
  useEffect(() => {
    isTrackingRef.current = isTracking;
  }, [isTracking]);

  const trackingStateQuery = useQuery({
    queryKey: QUERY_KEYS.TRACKING_STATE,
    queryFn: storageUtils.getTrackingState,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true,
  });

  const lastSendTimeQuery = useQuery({
    queryKey: QUERY_KEYS.LAST_SEND_TIME,
    queryFn: storageUtils.getLastSendTime,
    staleTime: 30000,
    refetchInterval: 30000,
  });

  const updateTrackingStateMutation = useMutation({
    mutationFn: async (isTracking: boolean) => {
      await storageUtils.saveTrackingState(isTracking);
      return isTracking;
    },
    onSuccess: (isTracking) => {
      queryClient.setQueryData(QUERY_KEYS.TRACKING_STATE, isTracking);
      setIsTracking(isTracking);
    },
  });

  const sendPositionMutation = useMutation({
    mutationFn: async ({
      location,
      forceUpdate = false,
    }: {
      location: LocationData;
      forceUpdate?: boolean;
    }) => {
      return await throttledSendPosition(location, forceUpdate);
    },
    onSuccess: (success) => {
      if (success) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LAST_SEND_TIME });
      }
    },
  });

  useEffect(() => {
    if (location) {
      locationRef.current = location;
    }
  }, [location]);

  useEffect(() => {
    const initialize = async () => {
      initializeLocationTask();
      await initializeFromStorage();
      backgroundSendInterval = interval;
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LAST_SEND_TIME });
    };
    initialize();
  }, [interval, queryClient]);

  const updateCountdown = useCallback(() => {
    const lastSentTime = lastSendTimeQuery.data || 0;
    if (lastSentTime === 0) {
      setTimeUntilNextSend(0);
      return;
    }

    const currentTime = Date.now();
    const timeSinceLastSend = currentTime - lastSentTime;
    const timeRemaining = Math.max(
      0,
      backgroundSendInterval - timeSinceLastSend
    );

    setTimeUntilNextSend(Math.ceil(timeRemaining / 1000));
  }, [lastSendTimeQuery.data]);

  useEffect(() => {
    if (isTracking) {
      updateCountdown();
      countdownRef.current = setInterval(updateCountdown, 1000);
    } else {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
      setTimeUntilNextSend(0);
    }

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, [isTracking, updateCountdown]);

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
        console.error("Failed to get location:", error);
        return null;
      }
    },
    [getCurrentLocation]
  );

  const sendPositionRobust = useCallback(
    async (forceUpdate: boolean = false): Promise<boolean> => {
      const currentLocation = await getLocationWithTimeout(3000);
      if (!currentLocation) {
        console.warn("No location available");
        return false;
      }

      try {
        return await sendPositionMutation.mutateAsync({
          location: currentLocation,
          forceUpdate,
        });
      } catch (error) {
        console.error("Failed to send position:", error);
        return false;
      }
    },
    [getLocationWithTimeout, sendPositionMutation]
  );

  const sendCurrentPosition = useCallback(async (): Promise<void> => {
    const success = await sendPositionRobust(true);
    if (!success) {
      throw new Error("Failed to send position");
    }
  }, [sendPositionRobust]);

  const handleAppStateChange = useCallback(
    async (nextAppState: AppStateStatus) => {
      const currentTime = Date.now();
      const currentState = appStateRef.current;

      if (appStateHandlerTimeoutRef.current) {
        clearTimeout(appStateHandlerTimeoutRef.current);
        appStateHandlerTimeoutRef.current = null;
      }

      if (currentTime - lastAppStateChangeRef.current < 2000) {
        console.log("App state change debounced");
        return;
      }

      lastAppStateChangeRef.current = currentTime;

      if (
        nextAppState === "active" &&
        (currentState === "inactive" || currentState === "background")
      ) {
        appStateHandlerTimeoutRef.current = setTimeout(async () => {
          console.log("App came to foreground (debounced)");

          try {
            queryClient.invalidateQueries({
              queryKey: QUERY_KEYS.LAST_SEND_TIME,
            });
            updateCountdown();

            // FIX: Use ref instead of state
            if (isTrackingRef.current) {
              const lastSentTime = await storageUtils.getLastSendTime();
              const timeSinceLastSend = currentTime - lastSentTime;

              if (timeSinceLastSend >= backgroundSendInterval) {
                console.log("Time to send position after foreground");
                sendPositionRobust(false);
              } else {
                console.log(
                  `Not time to send yet. ${Math.round((backgroundSendInterval - timeSinceLastSend) / 1000)}s remaining`
                );
              }
            }
          } catch (error) {
            console.error("Error handling app foreground:", error);
          }
        }, 3000);
      }

      appStateRef.current = nextAppState;
    },
    [sendPositionRobust, updateCountdown, queryClient] // FIX: Remove isTracking from dependencies
  );

  // FIX: Improved startTracking with better guards
  const startTracking = useCallback(async () => {
    // FIX: Check multiple conditions to prevent spam
    if (
      isTrackingRef.current ||
      isStartingRef.current ||
      isStartingGlobal ||
      updateTrackingStateMutation.isPending
    ) {
      console.log("Already tracking or start in progress");
      return;
    }

    isStartingRef.current = true;
    isStartingGlobal = true;

    try {
      console.log("Starting position tracking");

      await startWatchingLocation();

      const { status } = await Location.requestBackgroundPermissionsAsync();
      if (status !== "granted") {
        console.warn("Background location permission denied");
      } else {
        const isRegistered = await TaskManager.isTaskRegisteredAsync(
          BACKGROUND_LOCATION_TASK
        );
        if (!isRegistered) {
          await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: interval,
            distanceInterval: 50,
            deferredUpdatesInterval: interval,
            pausesUpdatesAutomatically: false,
            showsBackgroundLocationIndicator: false,
            foregroundService: {
              notificationTitle: "Location Tracking",
              notificationBody: "App is tracking your location",
              notificationColor: "#000000",
            },
          });
          setBackgroundTaskRegistered(true);
          console.log("Background location tracking started");
        }
      }

      await updateTrackingStateMutation.mutateAsync(true);

      const currentTime = Date.now();
      const lastSentTime = lastSendTimeQuery.data || 0;
      const timeSinceLastSend = currentTime - lastSentTime;

      if (lastSentTime === 0 || timeSinceLastSend >= backgroundSendInterval) {
        setTimeout(() => {
          sendPositionRobust(false);
        }, 2000);
      }

      console.log("Tracking started successfully");
    } catch (error) {
      console.error("Failed to start tracking:", error);
      await updateTrackingStateMutation.mutateAsync(false);
    } finally {
      // FIX: Reset flags
      isStartingRef.current = false;
      isStartingGlobal = false;
    }
  }, [
    interval,
    startWatchingLocation,
    sendPositionRobust,
    updateTrackingStateMutation,
    lastSendTimeQuery.data,
  ]);

  // FIX: Improved stopTracking with better guards
  const stopTracking = useCallback(async () => {
    // FIX: Check multiple conditions to prevent spam
    if (!isTrackingRef.current || isStoppingRef.current || isStoppingGlobal) {
      console.log("Already stopped or stop in progress");
      return;
    }

    isStoppingRef.current = true;
    isStoppingGlobal = true;

    try {
      console.log("Stopping position tracking");

      if (appStateHandlerTimeoutRef.current) {
        clearTimeout(appStateHandlerTimeoutRef.current);
        appStateHandlerTimeoutRef.current = null;
      }

      await updateTrackingStateMutation.mutateAsync(false);
      stopWatchingLocation();

      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }

      const isRegistered = await TaskManager.isTaskRegisteredAsync(
        BACKGROUND_LOCATION_TASK
      );
      if (isRegistered) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
        setBackgroundTaskRegistered(false);
        console.log("Background location tracking stopped");
      }

      console.log("Position tracking stopped");
    } catch (error) {
      console.error("Failed to stop tracking:", error);
    } finally {
      // FIX: Reset flags
      isStoppingRef.current = false;
      isStoppingGlobal = false;
    }
  }, [stopWatchingLocation, updateTrackingStateMutation]); // FIX: Remove isTracking from dependencies

  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );
    return () => subscription?.remove();
  }, [handleAppStateChange]);

  // FIX: Simplified auto-start logic
  useEffect(() => {
    if (autoTrack && !isInitialized.current && !isTrackingRef.current) {
      isInitialized.current = true;
      const timer = setTimeout(() => {
        startTracking();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [autoTrack, startTracking]);

  // FIX: Cleanup effect - only run on unmount
  useEffect(() => {
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
      if (appStateHandlerTimeoutRef.current) {
        clearTimeout(appStateHandlerTimeoutRef.current);
      }
      // FIX: Reset global flags on unmount
      isStoppingGlobal = false;
      isStartingGlobal = false;
    };
  }, []); // FIX: Empty dependency array

  useEffect(() => {
    if (
      trackingStateQuery.data !== undefined &&
      trackingStateQuery.data !== isTracking
    ) {
      setIsTracking(trackingStateQuery.data);
    }
  }, [trackingStateQuery.data, isTracking]);

  return {
    isTracking,
    location,
    isLoadingLocation,
    locationError,
    isMocked,
    backgroundTaskRegistered,
    isSendingPosition: sendPositionMutation.isPending || isSendingGlobal,
    sendPositionError: sendPositionMutation.error?.message || null,
    lastSentAt: lastSendTimeQuery.data
      ? new Date(lastSendTimeQuery.data)
      : null,
    timeUntilNextSend,
    startTracking,
    stopTracking,
    sendCurrentPosition,
  };
};

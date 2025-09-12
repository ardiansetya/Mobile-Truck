import api from "@/services/axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as BackgroundTask from "expo-background-task";
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
  timeUntilNextSend: number; // in seconds
  backgroundTaskStatus: BackgroundTask.BackgroundTaskStatus | null;
  trackingState: any; // Query state for tracking status
  startTracking: () => void;
  stopTracking: () => void;
  sendCurrentPosition: () => Promise<void>;
  triggerBackgroundTaskForTesting: () => Promise<void>;
}

// Task names
const BACKGROUND_LOCATION_TASK = "background-location-task";
const BACKGROUND_POSITION_TASK = "background-position-task";

// Query keys
const QUERY_KEYS = {
  TRACKING_STATE: ["position-tracker", "tracking-state"],
  LAST_SEND_TIME: ["position-tracker", "last-send-time"],
  BACKGROUND_TASK_STATUS: ["position-tracker", "background-task-status"],
  POSITION_HISTORY: ["position-tracker", "position-history"],
};

// Storage keys
const STORAGE_KEYS = {
  LAST_SEND_TIME: "position_tracker_last_send_time",
  TRACKING_STATE: "position_tracker_tracking_state",
  SEND_INTERVAL: "position_tracker_send_interval",
};

// Global variables with persistent storage
let lastBackgroundSendTime = 0;
let backgroundSendInterval = 30000; // 15 minutes default
let tasksInitialized = false;

// Storage utilities
const storageUtils = {
  async getLastSendTime(): Promise<number> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SEND_TIME);
      return stored ? parseInt(stored, 10) : 0;
    } catch {
      return 0;
    }
  },

  async getSendInterval(): Promise<number> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.SEND_INTERVAL);
      return stored ? parseInt(stored, 10) : 30000;
    } catch {
      return 30000;
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
      console.error("❌ Failed to save last send time:", error);
    }
  },

  async saveSendInterval(interval: number): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.SEND_INTERVAL,
        interval.toString()
      );
      backgroundSendInterval = interval;
    } catch (error) {
      console.error("❌ Failed to save send interval:", error);
    }
  },

  async saveTrackingState(isTracking: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.TRACKING_STATE,
        isTracking.toString()
      );
    } catch (error) {
      console.error("❌ Failed to save tracking state:", error);
    }
  },
};

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

// Initialize from storage
const initializeFromStorage = async () => {
  try {
    lastBackgroundSendTime = await storageUtils.getLastSendTime();
    backgroundSendInterval = await storageUtils.getSendInterval();
  } catch (error) {
    console.error("❌ Failed to initialize from storage:", error);
  }
};

// Initialize tasks - call this once at app startup
const initializeBackgroundTasks = async () => {
  if (tasksInitialized) {
    return;
  }

  try {
    console.log("🔧 Initializing background tasks...");

    // Background location task for continuous location updates
    TaskManager.defineTask(
      BACKGROUND_LOCATION_TASK,
      async ({ data, error }) => {
        if (error) {
          console.error("❌ Background location error:", error);
          return;
        }

        if (data) {
          const { locations } = data as any;
          const location = locations[0];
          const currentTime = Date.now();

          // Initialize from storage if needed
          if (lastBackgroundSendTime === 0) {
            await initializeFromStorage();
          }

          // Throttle background sends to prevent spam
          const timeSinceLastSend = currentTime - lastBackgroundSendTime;
          if (timeSinceLastSend < backgroundSendInterval) {
            console.log(
              `⏳ Background location send throttled. Next send in ${Math.round((backgroundSendInterval - timeSinceLastSend) / 1000)}s`
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
              await storageUtils.saveLastSendTime(currentTime);
              console.log("✅ Background location position sent successfully");
            } catch (error) {
              console.error(
                "❌ Failed to send background location position:",
                error
              );
            }
          }
        }
      }
    );

    // Background task for periodic position updates
    TaskManager.defineTask(BACKGROUND_POSITION_TASK, async () => {
      try {
        console.log("🔄 Background position task executing");
        const currentTime = Date.now();

        // Initialize from storage if needed
        if (lastBackgroundSendTime === 0) {
          await initializeFromStorage();
        }

        // Check if enough time has passed
        const timeSinceLastSend = currentTime - lastBackgroundSendTime;
        if (timeSinceLastSend < backgroundSendInterval) {
          console.log(
            `⏳ Background task throttled. Next send in ${Math.round((backgroundSendInterval - timeSinceLastSend) / 1000)}s`
          );
          return BackgroundTask.BackgroundTaskResult.Success;
        }

        // Get current location
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          console.warn("⚠️ Location permission not granted");
          return BackgroundTask.BackgroundTaskResult.Failed;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (location && !location.mocked) {
          const payload: PositionPayload = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            recorded_at: Math.floor(currentTime / 1000),
          };

          await sendPositionToAPI(payload);
          await storageUtils.saveLastSendTime(currentTime);
          console.log("✅ Background task position sent successfully");
          return BackgroundTask.BackgroundTaskResult.Success;
        }

        return BackgroundTask.BackgroundTaskResult.Success;
      } catch (error) {
        console.error("❌ Background task error:", error);
        return BackgroundTask.BackgroundTaskResult.Failed;
      }
    });

    tasksInitialized = true;
    console.log("✅ Background tasks initialized");
  } catch (error) {
    console.error("❌ Failed to initialize background tasks:", error);
    tasksInitialized = false;
  }
};

export const usePositionTracker = (
  options: UsePositionTrackerOptions = {}
): UsePositionTrackerReturn => {
  const { autoTrack = false, interval = 30000 } = options; // Default 15 minutes

  const [isTracking, setIsTracking] = useState(false);
  const [backgroundTaskRegistered, setBackgroundTaskRegistered] =
    useState(false);
  const [timeUntilNextSend, setTimeUntilNextSend] = useState(0);

  const intervalRef = useRef<NodeJS.Timeout | number | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | number | null>(null);
  const isInitialized = useRef(false);
  const locationRef = useRef<LocationData | null>(null);
  const appStateRef = useRef(AppState.currentState);
  const isHandlingAppStateChange = useRef(false);

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

  // Query for tracking state
  const trackingStateQuery = useQuery({
    queryKey: QUERY_KEYS.TRACKING_STATE,
    queryFn: storageUtils.getTrackingState,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true,
  });

  // Query for last send time
  const lastSendTimeQuery = useQuery({
    queryKey: QUERY_KEYS.LAST_SEND_TIME,
    queryFn: storageUtils.getLastSendTime,
    staleTime: 30000, // 30 seconds
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Query for background task status
  const backgroundTaskStatusQuery = useQuery({
    queryKey: QUERY_KEYS.BACKGROUND_TASK_STATUS,
    queryFn: async () => {
      try {
        return await BackgroundTask.getStatusAsync();
      } catch {
        return null;
      }
    },
    staleTime: 60000, // 1 minute
    refetchInterval: 60000,
  });

  // Mutation for updating tracking state
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

  // Mutation for updating last send time
  const updateLastSendTimeMutation = useMutation({
    mutationFn: async (timestamp: number) => {
      await storageUtils.saveLastSendTime(timestamp);
      return timestamp;
    },
    onSuccess: (timestamp) => {
      queryClient.setQueryData(QUERY_KEYS.LAST_SEND_TIME, timestamp);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LAST_SEND_TIME });
    },
  });

  // Mutation for sending position
  const sendPositionMutation = useMutation({
    mutationFn: sendPositionToAPI,
    onSuccess: async (data) => {
      const currentTime = Date.now();
      await updateLastSendTimeMutation.mutateAsync(currentTime);
      console.log("✅ Position sent successfully");
    },
    onError: (error: Error) => {
      console.error("❌ Failed to send position:", error.message);
    },
  });

  // Mutation for initializing background tasks
  const initializeTasksMutation = useMutation({
    mutationFn: initializeBackgroundTasks,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.BACKGROUND_TASK_STATUS,
      });
    },
  });

  // Update location ref whenever location changes
  useEffect(() => {
    if (location) {
      locationRef.current = location;
    }
  }, [location]);

  // Initialize everything on mount
  useEffect(() => {
    const initialize = async () => {
      // Initialize background tasks first
      await initializeTasksMutation.mutateAsync();

      // Initialize storage
      await initializeFromStorage();
      await storageUtils.saveSendInterval(interval);

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LAST_SEND_TIME });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.BACKGROUND_TASK_STATUS,
      });
    };

    initialize();
  }, [interval]);

  // Countdown timer to show time until next send
  const updateCountdown = useCallback(() => {
    const lastSentTime = lastSendTimeQuery.data || 0;
    if (lastSentTime === 0) return;

    const currentTime = Date.now();
    const timeSinceLastSend = currentTime - lastSentTime;
    const timeRemaining = Math.max(
      0,
      backgroundSendInterval - timeSinceLastSend
    );

    setTimeUntilNextSend(Math.ceil(timeRemaining / 1000));

    if (timeRemaining <= 0 && isTracking) {
      // Time's up, try to send position
      sendPositionRobust();
    }
  }, [isTracking, lastSendTimeQuery.data]);

  // Start countdown timer
  useEffect(() => {
    if (isTracking) {
      updateCountdown(); // Initial update
      countdownRef.current = setInterval(updateCountdown, 1000);
    } else {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    }

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, [isTracking, updateCountdown]);

  // Setup background tasks
  const setupBackgroundTasks = useCallback(async () => {
    try {
      // Ensure tasks are initialized first
      await initializeBackgroundTasks();

      // Check background task status
      const status = await BackgroundTask.getStatusAsync();
      queryClient.setQueryData(QUERY_KEYS.BACKGROUND_TASK_STATUS, status);

      if (status === BackgroundTask.BackgroundTaskStatus.Restricted) {
        console.warn("⚠️ Background tasks are restricted on this device");
        return false;
      }

      // Request background permissions
      const { status: backgroundStatus } =
        await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus !== "granted") {
        console.warn("⚠️ Background location permission denied");
        return false;
      }

      // Check if tasks are already registered to avoid duplicate registration
      const isPositionTaskRegistered = await TaskManager.isTaskRegisteredAsync(
        BACKGROUND_POSITION_TASK
      );
      const isLocationTaskRegistered = await TaskManager.isTaskRegisteredAsync(
        BACKGROUND_LOCATION_TASK
      );

      // Register the background task if not already registered
      if (!isPositionTaskRegistered) {
        await BackgroundTask.registerTaskAsync(BACKGROUND_POSITION_TASK, {
          minimumInterval: Math.max(Math.ceil(interval / 60000), 15), // Convert to minutes, minimum 15
        });
        console.log("✅ Background position task registered");
      }

      // Start background location tracking if not already started
      if (!isLocationTaskRegistered) {
        await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: Math.max(interval / 2, 60000), // More frequent checks
          distanceInterval: 10, // Only update if moved 10 meters
          deferredUpdatesInterval: interval,
          pausesUpdatesAutomatically: true,
          foregroundService: {
            notificationTitle: "Tracking Location",
            notificationBody: "App is tracking your location in the background",
            notificationColor: "#000000",
          },
        });
        console.log("✅ Background location tracking started");
      }

      setBackgroundTaskRegistered(true);
      console.log("✅ Background tasks setup completed");
      return true;
    } catch (error) {
      console.error("❌ Failed to setup background tasks:", error);
      return false;
    }
  }, [interval, queryClient]);

  // Cleanup background tasks
  const cleanupBackgroundTasks = useCallback(async () => {
    try {
      const isLocationTaskRegistered = await TaskManager.isTaskRegisteredAsync(
        BACKGROUND_LOCATION_TASK
      );
      const isPositionTaskRegistered = await TaskManager.isTaskRegisteredAsync(
        BACKGROUND_POSITION_TASK
      );

      if (isLocationTaskRegistered) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
        console.log("✅ Background location tracking stopped");
      }

      if (isPositionTaskRegistered) {
        await BackgroundTask.unregisterTaskAsync(BACKGROUND_POSITION_TASK);
        console.log("✅ Background position task unregistered");
      }

      setBackgroundTaskRegistered(false);
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.BACKGROUND_TASK_STATUS,
      });
      console.log("✅ Background tasks cleaned up");
    } catch (error) {
      console.error("❌ Failed to cleanup background tasks:", error);
    }
  }, [queryClient]);

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
    // Check if enough time has passed since last send
    const currentTime = Date.now();
    const lastSentTime = lastSendTimeQuery.data || 0;
    const timeSinceLastSend = currentTime - lastSentTime;

    if (timeSinceLastSend < backgroundSendInterval) {
      console.log(
        `⏳ Send throttled. Next send in ${Math.round((backgroundSendInterval - timeSinceLastSend) / 1000)}s`
      );
      return false;
    }

    const currentLocation = await getLocationWithTimeout(3000);

    if (!currentLocation) {
      console.warn("⚠️ No location available");
      return false;
    }

    if (currentLocation.mocked) {
      console.warn("⚠️ Location is mocked, skipping send");
      return false;
    }

    try {
      const payload: PositionPayload = {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        recorded_at: Math.floor(currentTime / 1000),
      };

      await sendPositionMutation.mutateAsync(payload);
      return true;
    } catch (error) {
      console.error("❌ Failed to send position:", error);
      return false;
    }
  }, [getLocationWithTimeout, sendPositionMutation, lastSendTimeQuery.data]);

  // Send current position (for external use)
  const sendCurrentPosition = useCallback(async (): Promise<void> => {
    const success = await sendPositionRobust();
    if (!success) {
      throw new Error("Failed to send position");
    }
  }, [sendPositionRobust]);

  // Trigger background task for testing (development only)
  const triggerBackgroundTaskForTesting =
    useCallback(async (): Promise<void> => {
      try {
        await BackgroundTask.triggerTaskWorkerForTestingAsync();
        console.log("🧪 Background task triggered for testing");
      } catch (error) {
        console.error(
          "❌ Failed to trigger background task for testing:",
          error
        );
        throw error;
      }
    }, []);

  // Interval function for automatic sending
  const intervalSendPosition = useCallback(async () => {
    await sendPositionRobust();
  }, [sendPositionRobust]);

  // Handle app state changes with debouncing
  const handleAppStateChange = useCallback(
    async (nextAppState: AppStateStatus) => {
      // Prevent multiple simultaneous executions
      if (isHandlingAppStateChange.current) {
        return;
      }

      const currentState = appStateRef.current;

      if (
        nextAppState === "active" &&
        (currentState === "inactive" || currentState === "background")
      ) {
        isHandlingAppStateChange.current = true;

        try {
          // App came to foreground
          console.log("📱 App came to foreground");

          // Refetch all queries
          queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.LAST_SEND_TIME,
          });
          queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.BACKGROUND_TASK_STATUS,
          });
          queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.TRACKING_STATE,
          });

          // Update countdown immediately
          updateCountdown();

          if (isTracking) {
            // Check if it's time to send
            const currentTime = Date.now();
            const lastSentTime = lastSendTimeQuery.data || 0;
            const timeSinceLastSend = currentTime - lastSentTime;

            if (timeSinceLastSend >= backgroundSendInterval) {
              console.log("⏰ Time to send position after foreground");
              sendPositionRobust();
            }
          }
        } finally {
          isHandlingAppStateChange.current = false;
        }
      }

      appStateRef.current = nextAppState;
    },
    [
      isTracking,
      sendPositionRobust,
      updateCountdown,
      queryClient,
      lastSendTimeQuery.data,
    ]
  );

  // Start tracking
  const startTracking = useCallback(async () => {
    if (isTracking) {
      console.log("⚠️ Already tracking, skipping start");
      return;
    }

    // Prevent multiple simultaneous starts
    if (updateTrackingStateMutation.isPending) {
      console.log("⚠️ Start tracking already in progress, skipping");
      return;
    }

    try {
      console.log("🚀 Starting position tracking");

      // Start foreground location tracking
      await startWatchingLocation();

      // Setup background tasks
      const backgroundSetup = await setupBackgroundTasks();

      // Update tracking state
      await updateTrackingStateMutation.mutateAsync(true);

      // Check if we should send immediately or wait
      const currentTime = Date.now();
      const lastSentTime = lastSendTimeQuery.data || 0;
      const timeSinceLastSend = currentTime - lastSentTime;

      if (lastSentTime === 0 || timeSinceLastSend >= backgroundSendInterval) {
        // Send initial position with delay to prevent conflicts
        setTimeout(async () => {
          if (!sendPositionMutation.isPending) {
            const initialSuccess = await sendPositionRobust();
            console.log(
              initialSuccess
                ? "✅ Initial position sent"
                : "❌ Failed to send initial position"
            );
          }
        }, 2000);
      } else {
        console.log(
          `⏳ Waiting ${Math.round((backgroundSendInterval - timeSinceLastSend) / 1000)}s for next send`
        );
      }

      // Set up foreground interval as backup with longer interval to prevent spam
      intervalRef.current = setInterval(
        intervalSendPosition,
        Math.max(interval, 300000) // Minimum 5 minutes to prevent spam
      );
      console.log("✅ Foreground tracking started");

      if (!backgroundSetup) {
        console.log(
          "⚠️ Foreground tracking only - background may not be available"
        );
      }
    } catch (error) {
      console.error("❌ Failed to start tracking:", error);
      await updateTrackingStateMutation.mutateAsync(false);
    }
  }, [
    isTracking,
    interval,
    startWatchingLocation,
    sendPositionRobust,
    intervalSendPosition,
    setupBackgroundTasks,
    updateTrackingStateMutation,
    lastSendTimeQuery.data,
    sendPositionMutation.isPending,
  ]);

  // Stop tracking
  const stopTracking = useCallback(async () => {
    if (!isTracking) {
      return;
    }

    console.log("🛑 Stopping position tracking");

    // Update tracking state
    await updateTrackingStateMutation.mutateAsync(false);

    // Stop foreground tracking
    stopWatchingLocation();

    // Clear intervals
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }

    // Cleanup background tasks
    await cleanupBackgroundTasks();

    console.log("✅ Position tracking stopped");
  }, [
    isTracking,
    stopWatchingLocation,
    cleanupBackgroundTasks,
    updateTrackingStateMutation,
  ]);

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
      // Delay auto-start to ensure everything is initialized
      setTimeout(() => {
        startTracking();
      }, 2000);
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
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, []);

  // Sync tracking state from query
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
    backgroundTaskStatus: backgroundTaskStatusQuery.data || null,
    trackingState: trackingStateQuery,
    isSendingPosition: sendPositionMutation.isPending,
    sendPositionError: sendPositionMutation.error?.message || null,
    lastSentAt: lastSendTimeQuery.data
      ? new Date(lastSendTimeQuery.data)
      : null,
    timeUntilNextSend,
    startTracking,
    stopTracking,
    sendCurrentPosition,
    triggerBackgroundTaskForTesting,
  };
};

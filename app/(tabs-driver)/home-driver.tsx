import DeliveryCard from "@/components/DeliveryCard";
import { useDeliveryByWorker } from "@/hooks/useDelivery";
import { useLocation } from "@/hooks/useLocation";
import { usePositionDrivers } from "@/hooks/usePositionDrivers";
import { usePositionTracker } from "@/hooks/usePositionTracker";
import { useProfile } from "@/hooks/useProfile";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

const DashboardDriver = () => {
  const insets = useSafeAreaInsets();
  const { data: user } = useProfile();
  const worker_id = user?.data.id || "";


  const {
    data: deliveriesData,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useDeliveryByWorker(worker_id);

  const deliveries = deliveriesData?.data || null;

  // Position tracking with corrected hook usage
  const {
    isTracking,
    location,
    isLoadingLocation,
    locationError,
    isSendingPosition,
    sendPositionError,
    lastSentAt,
    isMocked,
    backgroundTaskRegistered,
    timeUntilNextSend,
    startTracking,
    stopTracking,
    sendCurrentPosition,
  } = usePositionTracker({
    autoTrack: !!deliveries?.id,
    interval: 60000, // 1 minute - more reasonable interval
  });

  const router = useRouter();

  // Format countdown display
  const nextUpdateCountdown =
    timeUntilNextSend > 0
      ? `${Math.floor(timeUntilNextSend / 60)}m ${timeUntilNextSend % 60}s`
      : isTracking && !isMocked
        ? "Sending soon..."
        : "";

  // Enhanced error handling with user feedback for critical issues
  useEffect(() => {
    if (locationError) {
      console.error("Location error detected:", locationError);

      // Show alert only for critical permission errors
      if (
        locationError.includes("permission") ||
        locationError.includes("denied")
      ) {
        Alert.alert(
          "Izin Lokasi Diperlukan",
          "Aplikasi memerlukan izin lokasi untuk melacak pengiriman. Silakan aktifkan di pengaturan.",
          [
            { text: "Batal", style: "cancel" },
            {
              text: "Pengaturan",
              onPress: () => {
                // Could open device settings here if needed
              },
            },
          ]
        );
      }
    }
  }, [locationError]);

  // Handle critical position send errors
  useEffect(() => {
    if (sendPositionError) {
      console.error("Position send error:", sendPositionError);
      // Most errors should be handled silently by the auto-retry mechanism
    }
  }, [sendPositionError]);

  // Enhanced fake GPS detection
  useEffect(() => {
    if (isMocked) {
      Alert.alert(
        "Fake GPS Terdeteksi",
        "Lokasi kamu terdeteksi menggunakan aplikasi Fake GPS. Matikan aplikasi tersebut untuk melanjutkan tracking pengiriman.",
        [{ text: "OK" }]
      );
    }
  }, [isMocked]);

  // Monitor delivery status changes for tracking control
  useEffect(() => {
    console.log(
      `Delivery status changed. Active: ${!!deliveries?.id}, Tracking: ${isTracking}`
    );

    // Log background task status
    if (backgroundTaskRegistered) {
      console.log("Background tracking registered and active");
    } else if (isTracking) {
      console.log("Foreground tracking only - background may not be available");
    }
  }, [deliveries?.id, isTracking, backgroundTaskRegistered]);

  const handleRefresh = () => {
    refetch();
  };

  const handleDeliveryPress = (deliveryId: string) => {
    router.push(`/delivery/${deliveryId}`);
  };

  // Manual tracking controls (for debugging or manual override)
  const handleManualTrackingToggle = () => {
    if (isTracking) {
      Alert.alert(
        "Stop Tracking",
        "Apakah Anda yakin ingin menghentikan tracking lokasi?",
        [
          { text: "Batal", style: "cancel" },
          { text: "Stop", onPress: stopTracking, style: "destructive" },
        ]
      );
    } else {
      startTracking();
    }
  };

  // Manual send for testing
  const handleManualSend = async () => {
    try {
      await sendCurrentPosition();
      Alert.alert("Berhasil", "Posisi berhasil dikirim");
    } catch (error) {
      Alert.alert("Error", "Gagal mengirim posisi");
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <StatusBar barStyle="light-content" backgroundColor="#1E40AF" />
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#2563EB" />
          <Text className="text-gray-500 mt-4">Memuat data delivery...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <StatusBar barStyle="light-content" backgroundColor="#1E40AF" />
        <View className="flex-1 justify-center items-center px-6">
          <Ionicons name="alert-circle" size={64} color="#EF4444" />
          <Text className="text-gray-800 text-lg font-semibold mt-4 text-center">
            Gagal Memuat Data
          </Text>
          <Text className="text-gray-500 text-center mt-2 mb-6">
            Terjadi kesalahan saat mengambil data delivery aktif
          </Text>
          <TouchableOpacity
            className="bg-blue-600 px-6 py-3 rounded-xl"
            onPress={handleRefresh}>
            <Text className="text-white font-semibold">Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }


  return (
    <View style={{ marginBottom: insets.bottom }} className="flex-1 bg-gray-50">
      <StatusBar barStyle="light-content" backgroundColor="#1E40AF" />

      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            colors={["#2563EB"]}
            tintColor="#2563EB"
          />
        }>
        {/* Header with Location Status */}
        <View style={{ marginTop: insets.top }} className="mb-6">
          <View>
            <Text className="text-2xl font-bold text-gray-800 mb-4">
              Delivery Aktif
            </Text>
          </View>

          {/* Enhanced Fake GPS Warning Banner */}
          {isMocked && (
            <View className="bg-red-100 border border-red-400 rounded-xl p-3 mb-4">
              <View className="flex-row items-center mb-2">
                <Ionicons name="alert-circle" size={20} color="#DC2626" />
                <Text className="text-red-700 font-bold ml-2">
                  Fake GPS Terdeteksi!
                </Text>
              </View>
              <Text className="text-red-600 text-sm ml-6">
                Tracking pengiriman dihentikan sementara. Nonaktifkan aplikasi
                fake GPS untuk melanjutkan.
              </Text>
            </View>
          )}

          {/* Enhanced Status Overview Card */}
          <View className="bg-white rounded-2xl p-4 shadow-sm">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center">
                <Ionicons
                  name="radio"
                  size={20}
                  color={isTracking ? "#10B981" : "#9CA3AF"}
                />
                <Text className="text-base font-semibold text-gray-800 ml-2">
                  Status Tracking
                </Text>
              </View>
              {(isSendingPosition || isLoadingLocation) && (
                <ActivityIndicator size="small" color="#2563EB" />
              )}
            </View>

            <View className="space-y-2">
              {/* Enhanced Tracking Status */}
              <View className="flex-row items-center">
                <View
                  className={`w-2 h-2 rounded-full mr-3 ${
                    isMocked
                      ? "bg-red-500"
                      : isLoadingLocation
                        ? "bg-yellow-500"
                        : isTracking
                          ? "bg-green-500"
                          : "bg-gray-400"
                  }`}
                />
                <Text
                  className={`text-sm font-medium ${
                    isMocked
                      ? "text-red-600"
                      : isLoadingLocation
                        ? "text-yellow-600"
                        : isTracking
                          ? "text-green-600"
                          : "text-gray-500"
                  }`}>
                  {isMocked
                    ? "Fake GPS - Tracking dihentikan"
                    : isLoadingLocation
                      ? "Menginisialisasi lokasi..."
                      : isTracking
                        ? "Auto-tracking aktif"
                        : deliveries?.id
                          ? "Memulai tracking..."
                          : "Menunggu delivery aktif"}
                </Text>
              </View>

              {/* Background Status Indicator */}
              {isTracking && (
                <View className="flex-row items-center">
                  <View
                    className={`w-2 h-2 rounded-full mr-3 ${
                      backgroundTaskRegistered ? "bg-blue-500" : "bg-orange-500"
                    }`}
                  />
                  <Text
                    className={`text-xs ${
                      backgroundTaskRegistered
                        ? "text-blue-600"
                        : "text-orange-600"
                    }`}>
                    {backgroundTaskRegistered
                      ? "Background tracking aktif"
                      : "Foreground only - terbatas saat app tertutup"}
                  </Text>
                </View>
              )}

              {/* Location Info */}
              {location && !isMocked && (
                <View className="flex-row items-start">
                  <Ionicons
                    name="location"
                    size={14}
                    color="#6B7280"
                    style={{ marginTop: 1 }}
                  />
                  <Text
                    className="text-sm text-gray-600 ml-2 flex-1"
                    numberOfLines={2}>
                    {location.city}, {location.address}
                    {location.accuracy && ` (±${Math.round(location.accuracy)}m)`}
                  </Text>
                </View>
              )}

              {/* Last Sent Info */}
              {isTracking && lastSentAt && !isMocked && (
                <View className="flex-row items-center">
                  <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                  <Text className="text-xs text-gray-500 ml-2">
                    Terakhir dikirim: {lastSentAt.toLocaleTimeString()}
                  </Text>
                </View>
              )}

              {/* Countdown from Hook */}
              {nextUpdateCountdown && isTracking && !isMocked && (
                <View className="flex-row items-center">
                  <Ionicons name="timer-outline" size={14} color="#2563EB" />
                  <Text className="text-xs text-blue-600 ml-2 font-medium">
                    Update berikutnya: {nextUpdateCountdown}
                  </Text>
                </View>
              )}

              {/* Enhanced Error Indicators */}
              {!isTracking &&
                !isLoadingLocation &&
                deliveries?.id &&
                !isMocked && (
                  <View className="flex-row items-center">
                    <Ionicons name="sync" size={14} color="#F59E0B" />
                    <Text className="text-xs text-orange-600 ml-2">
                      Memulai tracking otomatis...
                    </Text>
                  </View>
                )}

              {locationError && (
                <View className="flex-row items-center">
                  <Ionicons name="warning-outline" size={14} color="#EF4444" />
                  <Text className="text-xs text-red-600 ml-2" numberOfLines={2}>
                    Masalah lokasi: {locationError}
                  </Text>
                </View>
              )}

              {sendPositionError && (
                <View className="flex-row items-center">
                  <Ionicons
                    name="cloud-offline-outline"
                    size={14}
                    color="#F59E0B"
                  />
                  <Text className="text-xs text-orange-600 ml-2">
                    Masalah koneksi - akan mencoba lagi otomatis
                  </Text>
                </View>
              )}
            </View>

            {/* Control buttons */}
            {deliveries && (
              <View className="mt-3 flex-row space-x-2">
                <TouchableOpacity
                  onPress={handleManualTrackingToggle}
                  className="flex-1 p-2 bg-gray-100 rounded-lg">
                  <Text className="text-xs text-gray-600 text-center">
                    {isTracking ? "Stop" : "Start"} Tracking
                  </Text>
                </TouchableOpacity>

                {/* Manual send button for testing */}
                {isTracking && !isMocked && (
                  <TouchableOpacity
                    onPress={handleManualSend}
                    disabled={isSendingPosition}
                    className={`flex-1 p-2 rounded-lg ${
                      isSendingPosition
                        ? "bg-gray-200"
                        : "bg-blue-100"
                    }`}>
                    <Text className={`text-xs text-center ${
                      isSendingPosition
                        ? "text-gray-500"
                        : "text-blue-600"
                    }`}>
                      {isSendingPosition ? "Sending..." : "Send Now"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Delivery List */}
        {!deliveries || !deliveries.id ? (
          <View className="bg-white rounded-2xl p-8 items-center shadow-sm">
            <Ionicons name="cube-outline" size={48} color="#9CA3AF" />
            <Text className="text-gray-500 text-lg font-medium mt-4">
              Tidak Ada Delivery Aktif
            </Text>
            <Text className="text-gray-400 text-center mt-2">
              Tracking lokasi akan dimulai otomatis saat ada delivery baru
            </Text>
          </View>
        ) : (
          <DeliveryCard
            key={deliveries.id}
            delivery={deliveries}
            onPress={() => handleDeliveryPress(deliveries.id)}
          />
        )}
      </ScrollView>
    </View>
  );
};

export default DashboardDriver;
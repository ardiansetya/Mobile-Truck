import DeliveryCard from "@/components/DeliveryCard";
import { useDeliveryByWorker } from "@/hooks/useDelivery";
import { usePositionTracker } from "@/hooks/usePositionTracker";
import { useProfile } from "@/hooks/useProfile";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
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
  const [nextUpdateCountdown, setNextUpdateCountdown] = useState<string>("");

  const {
    data: deliveriesData,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useDeliveryByWorker(worker_id);

  const deliveries = deliveriesData?.data || null;

  // Position tracking with automatic start and 15-minute intervals
  const {
    isTracking,
    location,
    isLoadingLocation,
    locationError,
    isSendingPosition,
    sendPositionError,
    lastSentAt,
    isMocked,
  } = usePositionTracker({
    autoTrack: !!deliveries?.id, // when delivery active
    interval: 900000,
  });

  const router = useRouter();

  // Countdown timer for next update
  useEffect(() => {
    if (!isTracking || !lastSentAt) {
      setNextUpdateCountdown("");
      return;
    }

    const updateCountdown = () => {
      const now = Date.now();
      const lastSent = lastSentAt.getTime();
      const nextUpdate = lastSent + 900000; // 15 minutes
      const timeLeft = nextUpdate - now;

      if (timeLeft <= 0) {
        setNextUpdateCountdown("Sending soon...");
      } else {
        const minutes = Math.floor(timeLeft / 60000);
        const seconds = Math.floor((timeLeft % 60000) / 1000);
        setNextUpdateCountdown(`${minutes}m ${seconds}s`);
      }
    };

    updateCountdown();
    const countdownInterval = setInterval(updateCountdown, 1000);

    return () => clearInterval(countdownInterval);
  }, [isTracking, lastSentAt]);

  // Handle location errors with automatic retry
  useEffect(() => {
    if (locationError) {
      console.error("Location error detected:", locationError);
      // Just log the error, don't show alert for automatic system
      // The system will automatically retry in the next interval
    }
  }, [locationError]);

  // Handle position send errors (silent logging for automatic system)
  useEffect(() => {
    if (sendPositionError) {
      console.error("Automatic position send error:", sendPositionError);
      // Silent error handling - system will automatically retry in next interval
    }
  }, [sendPositionError]);

  const handleRefresh = () => {
    refetch();
  };

  useEffect(() => {
    if (isMocked) {
      Alert.alert(
        "🚨 Fake GPS Terdeteksi",
        "Lokasi kamu terdeteksi menggunakan aplikasi Fake GPS. Matikan aplikasi tersebut untuk melanjutkan.",
        [{ text: "OK" }]
      );
    }
  }, [isMocked]);

  const handleDeliveryPress = (deliveryId: string) => {
    router.push(`/delivery/${deliveryId}`);
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

console.log(error);

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
          <Text className="text-2xl font-bold text-gray-800 mb-4">
            Delivery Aktif
          </Text>

          {/* Fake GPS Warning Banner */}
          {isMocked && (
            <View className="bg-red-100 border border-red-400 rounded-xl p-3 mb-4 flex-row items-center">
              <Ionicons name="alert-circle" size={20} color="#DC2626" />
              <Text className="text-red-700 font-medium ml-2">
                Fake GPS terdeteksi! Nonaktifkan segera 🚨
              </Text>
            </View>
          )}

          {/* Status Overview Card */}
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
              {/* Tracking Status */}
              <View className="flex-row items-center">
                <View
                  className={`w-2 h-2 rounded-full mr-3 ${
                    isLoadingLocation
                      ? "bg-yellow-500"
                      : isTracking
                        ? "bg-green-500"
                        : "bg-gray-400"
                  }`}
                />
                <Text
                  className={`text-sm font-medium ${
                    isLoadingLocation
                      ? "text-yellow-600"
                      : isTracking
                        ? "text-green-600"
                        : "text-gray-500"
                  }`}>
                  {isLoadingLocation
                    ? "Menginisialisasi lokasi..."
                    : isTracking
                      ? "Auto-tracking aktif "
                      : "Menghubungkan ke layanan lokasi..."}
                </Text>
              </View>

              {/* Location Info */}
              {location && (
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
                    {location.city
                      ? location.address
                      : `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`}
                  </Text>
                </View>
              )}

              {/* Last Sent Info */}
              {isTracking && lastSentAt && (
                <View className="flex-row items-center">
                  <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                  <Text className="text-xs text-gray-500 ml-2">
                    Terakhir dikirim: {lastSentAt.toLocaleTimeString()}
                  </Text>
                </View>
              )}

              {/* Next Update Countdown */}
              {nextUpdateCountdown && isTracking && (
                <View className="flex-row items-center">
                  <Ionicons name="timer-outline" size={14} color="#2563EB" />
                  <Text className="text-xs text-blue-600 ml-2 font-medium">
                    Update berikutnya: {nextUpdateCountdown}
                  </Text>
                </View>
              )}

              {/* Error Indicators */}
              {!isTracking && !isLoadingLocation && (
                <View className="flex-row items-center">
                  <Ionicons name="sync" size={14} color="#F59E0B" />
                  <Text className="text-xs text-orange-600 ml-2">
                    Memulai tracking otomatis...
                  </Text>
                </View>
              )}

              {sendPositionError && (
                <View className="flex-row items-center">
                  <Ionicons name="warning-outline" size={14} color="#F59E0B" />
                  <Text className="text-xs text-orange-600 ml-2">
                    Masalah koneksi - akan mencoba lagi otomatis
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Delivery List */}
        {!deliveries || !deliveries.id  ? (
          <View className="bg-white rounded-2xl p-8 items-center shadow-sm">
            <Ionicons name="cube-outline" size={48} color="#9CA3AF" />
            <Text className="text-gray-500 text-lg font-medium mt-4">
              Tidak Ada Delivery Aktif
            </Text>
            <Text className="text-gray-400 text-center mt-2">
              Belum ada delivery yang sedang berjalan saat ini
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

import DeliveryHistoryCard from "@/components/DeliveryHistoryCard";
import { useAuth } from "@/context/AuthContext";
import { useDeliveryHistory } from "@/hooks/useDelivery";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
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

const DeliveryHistory = () => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth(); // Mendapatkan data driver yang sedang login
  const {
    data: historyData,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useDeliveryHistory();

  const router = useRouter();

  const handleRefresh = () => {
    refetch();
  };

  const handleDeliveryPress = (deliveryId: string) => {
    // Navigate to delivery detail screen
    router.push(`/delivery/${deliveryId}`);
  };

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <StatusBar barStyle="light-content" backgroundColor="#1E40AF" />

        {/* Loading Content */}
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#2563EB" />
          <Text className="text-gray-500 mt-4">Memuat riwayat delivery...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <StatusBar barStyle="light-content" backgroundColor="#1E40AF" />

        {/* Error Content */}
        <View className="flex-1 justify-center items-center px-6">
          <Ionicons name="alert-circle" size={64} color="#EF4444" />
          <Text className="text-gray-800 text-lg font-semibold mt-4 text-center">
            Gagal Memuat Riwayat
          </Text>
          <Text className="text-gray-500 text-center mt-2 mb-6">
            Terjadi kesalahan saat mengambil riwayat delivery
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

  const allDeliveries = historyData?.data || [];

  // Data sudah difilter dari backend berdasarkan workerId
  const driverDeliveries = allDeliveries;

  // Group deliveries by date
  const groupedDeliveries = driverDeliveries.reduce(
    (groups, delivery) => {
      const date = new Date(delivery.started_at * 1000).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(delivery);
      return groups;
    },
    {} as Record<string, typeof driverDeliveries>
  );

  // Sort dates in descending order (newest first)
  const sortedDates = Object.keys(groupedDeliveries).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  // Hitung statistik untuk driver yang sedang login
  const thisMonth = new Date().getMonth();
  const thisYear = new Date().getFullYear();
  const deliveriesThisMonth = driverDeliveries.filter((d) => {
    const deliveryDate = new Date(d.started_at * 1000);
    return (
      deliveryDate.getMonth() === thisMonth &&
      deliveryDate.getFullYear() === thisYear
    );
  });

  return (
    <View style={{ marginBottom: insets.bottom }} className="flex-1 bg-gray-50">
      <StatusBar barStyle="light-content" backgroundColor="#1E40AF" />

      {/* Stats Cards */}
      <View className="px-6 py-4">
        <View className="flex-row justify-between">
          <View className="bg-white rounded-2xl p-4 flex-1 mr-2 shadow-sm">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-gray-500 text-sm">Total Selesai</Text>
                <Text className="text-2xl font-bold text-gray-800 mt-1">
                  {driverDeliveries.length}
                </Text>
              </View>
              <View className="w-12 h-12 bg-green-100 rounded-xl items-center justify-center">
                <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              </View>
            </View>
          </View>

          <View className="bg-white rounded-2xl p-4 flex-1 ml-2 shadow-sm">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-gray-500 text-sm">Bulan Ini</Text>
                <Text className="text-2xl font-bold text-gray-800 mt-1">
                  {deliveriesThisMonth.length}
                </Text>
              </View>
              <View className="w-12 h-12 bg-blue-100 rounded-xl items-center justify-center">
                <Ionicons name="calendar" size={24} color="#3B82F6" />
              </View>
            </View>
          </View>
        </View>
      </View>

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
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-xl font-bold text-gray-800">
            Riwayat Pengiriman Saya
          </Text>
        </View>

        {/* Content */}
        {driverDeliveries.length === 0 ? (
          <View className="bg-white rounded-2xl p-8 items-center shadow-sm">
            <Ionicons name="document-text-outline" size={48} color="#9CA3AF" />
            <Text className="text-gray-500 text-lg font-medium mt-4">
              Belum Ada Riwayat
            </Text>
            <Text className="text-gray-400 text-center mt-2">
              Riwayat delivery yang telah Anda selesaikan akan tampil di sini
            </Text>
          </View>
        ) : (
          sortedDates.map((dateString) => {
            const date = new Date(dateString);
            const isToday = date.toDateString() === new Date().toDateString();
            const isYesterday =
              date.toDateString() ===
              new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();

            let dateLabel = date.toLocaleDateString("id-ID", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            });

            if (isToday) dateLabel = "Hari Ini";
            else if (isYesterday) dateLabel = "Kemarin";

            return (
              <View key={dateString} className="mb-6">
                {/* Date Header */}
                <View className="flex-row items-center mb-4">
                  <Text className="text-lg font-bold text-gray-800 mr-3">
                    {dateLabel}
                  </Text>
                  <View className="flex-1 h-px bg-gray-200" />
                  <Text className="text-gray-500 text-sm ml-3">
                    {groupedDeliveries[dateString].length} delivery
                  </Text>
                </View>

                {/* Deliveries for this date */}
                {groupedDeliveries[dateString].map((delivery) => (
                  <DeliveryHistoryCard
                    key={delivery.id}
                    delivery={delivery}
                    onPress={() => handleDeliveryPress(delivery.id)}
                  />
                ))}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

export default DeliveryHistory;

import React from "react";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useActiveDeliveries } from "@/hooks/useDelivery";
import DeliveryCard from "@/components/DeliveryCard";
import { ActivityIndicator, RefreshControl, ScrollView, StatusBar, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";

const Dashboard = () => {
  const insets = useSafeAreaInsets();
  const { 
    data: deliveriesData, 
    isLoading, 
    error, 
    refetch, 
    isRefetching 
  } = useActiveDeliveries();

  const router = useRouter();

  const handleRefresh = () => {
    refetch();
  };

  const handleDeliveryPress = (deliveryId: string) => {
    // Navigate to delivery detail screen
    console.log('Navigate to delivery:', deliveryId);
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


        {/* Error Content */}
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
            onPress={handleRefresh}
          >
            <Text className="text-white font-semibold">Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const deliveries = deliveriesData?.data || [];

  return (
    <View style={{ marginBottom: insets.bottom }} className="flex-1 bg-gray-50">

      

      <StatusBar barStyle="light-content" backgroundColor="#1E40AF" />
      {/* Stats Cards */}
      <View className="px-6 py-4">
        <View className="flex-row justify-between">
          <View className="bg-white rounded-2xl p-4 flex-1 mr-2 shadow-sm">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-gray-499 text-sm">Total Aktif</Text>
                <Text className="text-2xl font-bold text-gray-800 mt-1">
                  {deliveries.length}
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
                <Text className="text-gray-500 text-sm">Hari Ini</Text>
                <Text className="text-2xl font-bold text-gray-800 mt-1">
                  {deliveries.filter(d => {
                    const today = new Date().toDateString();
                    const deliveryDate = new Date(d.started_at * 1000).toDateString();
                    return today === deliveryDate;
                  }).length}
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
            colors={['#2563EB']}
            tintColor="#2563EB"
          />
        }
      >
        {/* Section Header */}
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-xl font-bold text-gray-800">
            Delivery Aktif
          </Text>
        </View>

        {/* Delivery List */}
        {deliveries.length === 0 ? (
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
          deliveries.map((delivery) => (
            <DeliveryCard
              key={delivery.id}
              delivery={delivery}
              onPress={() => handleDeliveryPress(delivery.id)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
};

export default Dashboard;
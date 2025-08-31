import {
  useDeliveryDetailsByWorker,
  useRoute,
  useTruck,
  useWorker,
} from "@/hooks/useDelivery";
import { useProfile } from "@/hooks/useProfile";
import {
  getCityName,
  TransitRequest,
  useCities,
  useSubmitTransit,
  useTransitPointDriver,
} from "@/hooks/useTransit";

import { Feather, Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

const TransitDriver = () => {
  const insets = useSafeAreaInsets();
  const [selectedDelivery, setSelectedDelivery] = useState<string>("");
  const [selectedTransitPoint, setSelectedTransitPoint] = useState<
    number | null
  >(null);
  const [customDeliveryId, setCustomDeliveryId] = useState<string>("");
  const [useCustomId, setUseCustomId] = useState<boolean>(false);

  // Hooks
  const {
    data: deliveriesData,
    isLoading: deliveriesLoading,
    error: deliveriesError,
    refetch: refetchDeliveries,
    isRefetching: deliveriesRefetching,
  } = useDeliveryDetailsByWorker();

  const { data: userData } = useProfile();
  const worker_id = userData?.data.id;

  const {
    data: transitPointsData,
    isLoading: transitPointsLoading,
    error: transitPointsError,
  } = useTransitPointDriver(worker_id!);

  const { data: citiesData, isLoading: citiesLoading } = useCities();

  const { mutate: submitTransit, isPending: isSubmitting } = useSubmitTransit();

  const deliveries = deliveriesData?.data
    ? Array.isArray(deliveriesData.data)
      ? deliveriesData.data
      : [deliveriesData.data]
    : [];
  const transitPoints = transitPointsData?.data || [];
  const cities = citiesData?.data || [];
  const routeId = deliveriesData?.data.route_id;
  const workerId = deliveriesData?.data.worker_id;
  const truckId = deliveriesData?.data.truck_id;

  const { data: routeData } = useRoute(routeId!);
  const { data: workerData } = useWorker(workerId!);
  const { data: truckData } = useTruck(truckId!);

  // Format durasi
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}j ${mins}m` : `${mins}m`;
  };

  // Format rupiah
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Refresh deliveries
  const handleRefresh = () => {
    refetchDeliveries();
  };

  // Submit transit
  const handleSubmitTransit = () => {
    const delivery_id = useCustomId
      ? customDeliveryId.trim()
      : selectedDelivery;

    if (!delivery_id) {
      Alert.alert("Error", "Pilih delivery atau masukkan Delivery ID");
      return;
    }
    if (!selectedTransitPoint) {
      Alert.alert("Error", "Pilih titik transit");
      return;
    }

    // Ambil data transit point terpilih
    const selectedPoint = transitPoints.find(
      (p) => p.id === selectedTransitPoint
    );
    const loadingCity = getCityName(
      selectedPoint?.loading_city_id || 0,
      cities
    );
    const unloadingCity = getCityName(
      selectedPoint?.unloading_city_id || 0,
      cities
    );

    const transitData: TransitRequest = {
      delivery_id,
      transit_point_id: selectedTransitPoint,
    };

    Alert.alert(
      "Konfirmasi Transit",
      `Yakin ingin melakukan transit untuk delivery ${delivery_id}?\n\nRute: ${loadingCity} → ${unloadingCity}`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Ya, Lanjutkan",
          onPress: () => {
            submitTransit(transitData, {
              onSuccess: (response) => {
                Alert.alert(
                  "Berhasil",
                  response.message || "Transit berhasil dicatat"
                );
                setSelectedDelivery("");
                setSelectedTransitPoint(null);
                setCustomDeliveryId("");
                setUseCustomId(false);
              },
              onError: (error: any) => {
                Alert.alert(
                  "Error",
                  error?.response?.data?.message || "Gagal melakukan transit"
                );
              },
            });
          },
        },
      ]
    );
  };

  // Jika masih loading data
  if (deliveriesLoading || transitPointsLoading || citiesLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#007bff" />
          <Text className="text-gray-500 mt-4">Memuat data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View
      className="flex-1 bg-gray-50"
      style={{ marginBottom: insets.bottom, padding: 16 }}>
      {/* === PILIH DELIVERY === */}
      <View className="bg-white rounded-2xl p-5 shadow-sm mb-6">
        <Text className="text-gray-800 text-lg font-semibold mb-4">
          Pilih Delivery
        </Text>

        {/* Toggle Daftar / Manual */}
        <View className="flex-row mb-4">
          {["Dari Daftar", "Input Manual"].map((label, index) => {
            const isSelected =
              (index === 0 && !useCustomId) || (index === 1 && useCustomId);
            return (
              <TouchableOpacity
                key={index}
                onPress={() => setUseCustomId(index === 1)}
                className={`flex-1 py-3 rounded-xl mx-1 ${
                  isSelected ? "bg-blue-100" : "bg-gray-100"
                }`}>
                <Text
                  className={`text-center font-medium ${
                    isSelected ? "text-blue-600" : "text-gray-600"
                  }`}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* List Delivery atau Input */}
        {!useCustomId ? (
          deliveriesError ? (
            <View className="py-8 items-center">
              <Ionicons name="cube-outline" size={48} color="#9CA3AF" />
              <Text className="text-gray-500 mt-2">
                Tidak ada delivery aktif
              </Text>
            </View>
          ) : deliveries.length === 0 ? (
            <Text className="text-red-500 text-center">
              Tidak ada delivery aktif
            </Text>
          ) : (
            deliveries.map((delivery) => (
              <TouchableOpacity
                key={delivery.id}
                onPress={() => setSelectedDelivery(delivery.id)}
                className={`border-2 rounded-xl p-4 mb-3 ${
                  selectedDelivery === delivery.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200"
                }`}>
                <View className="flex-row justify-between items-center">
                  <View className="flex-1">
                    <View className="items-center justify-between flex-row">
                      <Text className="font-semibold text-gray-800">
                        {truckData?.data.license_plate} -{" "}
                        {truckData?.data.model}
                      </Text>
                      <Text className="font-semibold text-xs text-gray-500">
                        #{delivery.id.slice(-8).toUpperCase()}
                      </Text>
                    </View>
                    <Text className="text-gray-500 text-sm mt-1">
                      Rute: {routeData?.data.start_city_name} →{" "}
                      {routeData?.data.end_city_name} (
                      {routeData?.data.cargo_type})
                    </Text>
                    <Text className="text-gray-500 text-sm">
                      Driver: {workerData?.data.username}
                    </Text>
                  </View>
                  {selectedDelivery === delivery.id && (
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color="#007bff"
                    />
                  )}
                </View>
              </TouchableOpacity>
            ))
          )
        ) : (
          <View>
            <Text className="text-gray-600 text-sm mb-2">Delivery ID</Text>
            <TextInput
              value={customDeliveryId}
              onChangeText={setCustomDeliveryId}
              placeholder="Masukkan Delivery ID"
              className="border border-gray-300 rounded-xl px-4 py-3 text-gray-800"
              autoCapitalize="none"
            />
          </View>
        )}
      </View>

      {/* === PILIH TITIK TRANSIT === */}
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-gray-800 text-lg font-semibold">
          Pilih Titik Transit
        </Text>
        <TouchableOpacity
          onPress={handleSubmitTransit}
          disabled={isSubmitting}
          className={`flex-row items-center px-3 py-2 rounded-lg ${
            isSubmitting ? "bg-blue-400" : "bg-blue-600"
          }`}>
          {isSubmitting ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Feather name="map-pin" size={18} color="white" />
          )}
          <Text className="text-white font-medium text-sm ml-2">
            {isSubmitting ? "Memproses..." : "Catat"}
          </Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={deliveriesRefetching}
            onRefresh={handleRefresh}
            colors={["#007bff"]}
            tintColor="#007bff"
          />
        }>
        <View className="bg-white rounded-2xl p-5 shadow-sm mb-6">
          {transitPointsError ? (
            <Text className="text-red-500 text-center">
              Gagal memuat titik transit
            </Text>
          ) : transitPoints.length === 0 ? (
            <View className="py-8 items-center">
              <Ionicons name="location-outline" size={48} color="#9CA3AF" />
              <Text className="text-gray-500 mt-2">
                Tidak ada titik transit tersedia
              </Text>
            </View>
          ) : (
            transitPoints.map((point) => (
              <TouchableOpacity
                key={point.id}
                onPress={() => setSelectedTransitPoint(point.id)}
                className={`border-2 rounded-xl p-4 mb-3 ${
                  selectedTransitPoint === point.id
                    ? "border-green-500 bg-green-50"
                    : "border-gray-200"
                }`}>
                <View className="flex-row justify-between">
                  <View className="flex-1">
                    <Text
                      className="font-semibold text-gray-800 "
                      style={{ lineHeight: 20 }}>
                      {getCityName(point.loading_city_id, cities)} →{" "}
                      {getCityName(point.unloading_city_id, cities)} (
                      {point.cargo_type})
                    </Text>
                    <Text className="text-gray-500 text-sm mt-1">
                      ⏱ Estimasi:{" "}
                      {formatDuration(point.estimated_duration_minute)}
                    </Text>
                    {point.extra_cost > 0 && (
                      <Text className="text-gray-500 text-sm mt-1">
                        💰 Biaya tambahan: {formatCurrency(point.extra_cost)}
                      </Text>
                    )}
                  </View>
                  {selectedTransitPoint === point.id && (
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color="#10B981"
                    />
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default TransitDriver;

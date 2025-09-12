import { useRoute, useTruck, useWorker } from "@/hooks/useDelivery";
import { useDeliveryDetail } from "@/hooks/useDeliveryDetail";
import { usePositionDrivers } from "@/hooks/usePositionDrivers"; // Add this import
import { getCityName, useCities } from "@/hooks/useTransit";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const DeliveryDetail = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [refreshInterval, setRefreshInterval] = useState<
    NodeJS.Timeout | number | null
  >(null);

  const delivery_id = Array.isArray(id) ? id[0] : id;

  const {
    data: delivery_data,
    isLoading: delivery_loading,
    error: delivery_error,
  } = useDeliveryDetail(delivery_id);

  const delivery = delivery_data?.data;
  delivery?.transits.forEach((transit) => {});

  const { data: worker_data } = useWorker(delivery?.worker_id || "");
  const { data: truck_data } = useTruck(delivery?.truck_id || "");
  const { data: route_data } = useRoute(delivery?.route_id || "");
  const { data: citiesData } = useCities();

  // Add position tracking hook
  const {
    data: positionData,
    isLoading: positionLoading,
    error: positionError,
    refetch: refetchPosition,
  } = usePositionDrivers(delivery_id || "");

  const worker = worker_data?.data;
  const truck = truck_data?.data;
  const route = route_data?.data;
  const positions = positionData?.data || [];
  const currentPosition = positions.length > 0 ? positions[0] : null; // Latest position

  // Auto-refresh positions for active deliveries
  useEffect(() => {
    const isActiveDelivery =
      delivery?.started_at! > 0 && delivery?.finished_at === 0;

    if (isActiveDelivery) {
      const interval = setInterval(() => {
        refetchPosition();
      }, 3000); // Refresh every 15 menit

      setRefreshInterval(interval);

      return () => {
        if (interval) {
          clearInterval(interval);
        }
      };
    } else {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
    }
  }, [
    delivery?.started_at,
    delivery?.finished_at,
    refetchPosition,
    refreshInterval,
  ]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatPositionTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const calculateTotalCost = () => {
    let total = route?.base_price || 0;

    // Add extra costs from transits
    delivery?.transits.forEach((transit) => {
      if (transit.is_accepted) {
        total += transit.transit_point.extra_cost;
      }
    });

    return total;
  };

  const getDeliveryStatus = () => {
    if (!delivery) return { status: "Unknown", color: "gray" };

    if (delivery.finished_at > 0) {
      return { status: "Selesai", color: "green" };
    } else if (delivery.started_at > 0) {
      return { status: "Dalam Perjalanan", color: "blue" };
    } else {
      return { status: "Menunggu", color: "orange" };
    }
  };

  if (delivery_loading) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top }} className="bg-gray-50">
        <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#2563EB" />
          <Text className="text-gray-500 mt-4">Memuat detail delivery...</Text>
        </View>
      </View>
    );
  }

  if (delivery_error || !delivery) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top }} className="bg-gray-50">
        <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

        <View className="flex-1 justify-center items-center px-6">
          <Ionicons name="alert-circle" size={64} color="#EF4444" />
          <Text className="text-gray-800 text-lg font-semibold mt-4 text-center">
            Delivery Tidak Ditemukan
          </Text>
          <Text className="text-gray-500 text-center mt-2">
            Data delivery tidak dapat dimuat
          </Text>
        </View>
      </View>
    );
  }

  const status = getDeliveryStatus();
  const total_cost = calculateTotalCost();

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-gray-50">
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      {/* Header */}
      <View className="bg-white px-6 py-4 border-b border-gray-200">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => router.back()} className="mr-4">
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-gray-800">
              Detail Delivery
            </Text>
          </View>
          <View className={`px-3 py-1 rounded-full bg-${status.color}-100`}>
            <Text className={`text-sm font-medium text-${status.color}-700`}>
              {status.status}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Nota Header */}
        <View className="bg-white mx-6 mt-6 rounded-t-2xl border border-gray-200">
          <View className="bg-blue-600 rounded-t-2xl px-6 py-4">
            <Text className="text-white text-center text-lg font-bold">
              NOTA DELIVERY
            </Text>
            <Text className="text-blue-100 text-center text-sm mt-1">
              #{delivery.id.slice(-8).toUpperCase()}
            </Text>
          </View>

          {/* Delivery Info */}
          <View className="px-6 py-4">
            <View className="flex-row justify-between items-start mb-4">
              <View className="flex-1">
                <Text className="text-gray-500 text-sm mb-1">
                  Tanggal Mulai
                </Text>
                <Text className="text-gray-800 font-medium">
                  {formatDate(delivery.started_at)}
                </Text>
              </View>
              {delivery.finished_at > 0 && (
                <View className="flex-1">
                  <Text className="text-gray-500 text-sm mb-1">
                    Tanggal Selesai
                  </Text>
                  <Text className="text-gray-800 font-medium">
                    {formatDate(delivery.finished_at)}
                  </Text>
                </View>
              )}
            </View>

            {/* Current Position (only show for active deliveries) */}
            {delivery.started_at > 0 && delivery.finished_at === null && (
              <View className="bg-purple-50 rounded-xl p-4 mb-4">
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center">
                    <Ionicons name="location" size={20} color="#7C3AED" />
                    <Text className="text-purple-800 font-semibold ml-2">
                      Posisi Saat Ini
                    </Text>
                  </View>
                  {/* <TouchableOpacity onPress={() => refetchPosition()}>
                    <Ionicons
                      name="refresh"
                      size={20}
                      color={positionLoading ? "#9CA3AF" : "#7C3AED"}
                    />
                  </TouchableOpacity> */}
                </View>

                {positionLoading ? (
                  <View className="flex-row items-center">
                    <ActivityIndicator size="small" color="#7C3AED" />
                    <Text className="text-gray-600 ml-2">Memuat posisi...</Text>
                  </View>
                ) : positionError || !currentPosition ? (
                  <Text className="text-red-600 text-sm">
                    Posisi tidak dapat dimuat
                  </Text>
                ) : (
                  <>
                    <Text className="text-gray-800 font-medium text-base mb-1">
                      {currentPosition.city ||
                        currentPosition.formatted_address}
                    </Text>
                    <Text className="text-gray-600 text-sm mb-2">
                      {currentPosition.city}, {currentPosition.state},{" "}
                      {currentPosition.country}
                    </Text>
                    <View className="flex-row items-center justify-between">
                      <Text className="text-gray-500 text-xs">
                        Koordinat: {currentPosition.latitude.toFixed(6)},{" "}
                        {currentPosition.longitude.toFixed(6)}
                      </Text>
                      <Text className="text-gray-500 text-xs">
                        {formatPositionTime(currentPosition.recorded_at)}
                      </Text>
                    </View>
                  </>
                )}
              </View>
            )}

            {/* Driver Info */}
            <View className="bg-blue-50 rounded-xl p-4 mb-4">
              <View className="flex-row items-center mb-2">
                <Ionicons name="person" size={20} color="#2563EB" />
                <Text className="text-blue-800 font-semibold ml-2">Driver</Text>
              </View>
              <Text className="text-gray-800 font-medium text-lg">
                {worker?.username || "Loading..."}
              </Text>
              {worker?.phone_number && (
                <Text className="text-gray-600 text-sm mt-1">
                  {worker.phone_number}
                </Text>
              )}
            </View>

            {/* Truck Info */}
            <View className="bg-orange-50 rounded-xl p-4 mb-4">
              <View className="flex-row items-center mb-2">
                <Ionicons name="car" size={20} color="#EA580C" />
                <Text className="text-orange-800 font-semibold ml-2">
                  Kendaraan
                </Text>
              </View>
              <Text className="text-gray-800 font-bold text-xl">
                {truck?.license_plate || delivery.truck_id}
              </Text>
              {truck?.model && (
                <Text className="text-gray-600 text-sm mt-1">
                  {truck.model} • Kapasitas: {truck.capacity_kg} kg
                </Text>
              )}
            </View>

            {/* Route Info */}
            <View className="bg-green-50 rounded-xl p-4 mb-6">
              <View className="flex-row items-center mb-2">
                <Ionicons name="location" size={20} color="#059669" />
                <Text className="text-green-800 font-semibold ml-2">Rute</Text>
              </View>
              <Text className="text-gray-800 font-medium text-lg">
                {route
                  ? `${route.start_city_name} → ${route.end_city_name}`
                  : "Loading..."}{" "}
                ({route?.cargo_type})
              </Text>
              {route && (
                <Text className="text-gray-600 text-sm mt-1">
                  {route.distance_km} km • {route.estimated_duration_hours} jam
                  estimasi
                </Text>
              )}
            </View>

            {/* Position History (show last 5 positions for completed deliveries) */}
            {delivery.finished_at > 0 && positions.length > 1 && (
              <View className="bg-gray-50 rounded-xl p-4 mb-6">
                <View className="flex-row items-center mb-3">
                  <Ionicons name="trail-sign" size={20} color="#6B7280" />
                  <Text className="text-gray-700 font-semibold ml-2">
                    Riwayat Perjalanan
                  </Text>
                </View>
                {positions.slice(0, 5).map((position, index) => (
                  <View
                    key={index}
                    className="mb-2 pb-2 border-b border-gray-200 last:border-b-0">
                    <Text className="text-gray-800 font-medium text-sm">
                      {position.name || position.formatted_address}
                    </Text>
                    <Text className="text-gray-600 text-xs">
                      {position.city}, {position.state} •{" "}
                      {formatPositionTime(position.recorded_at)}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Cost Breakdown */}
            <View className="border-t border-gray-200 pt-4">
              <Text className="text-gray-800 font-bold text-lg mb-4">
                Rincian Biaya
              </Text>

              <View className="space-y-2">
                <View className="flex-row justify-between">
                  <Text style={{ lineHeight: 22 }} className="text-gray-600">
                    {route
                      ? `${route.start_city_name} → ${route.end_city_name}`
                      : "Loading..."}{" "}
                    ({route?.cargo_type})
                  </Text>
                  <Text className="text-gray-800 font-medium">
                    {formatCurrency(route?.base_price || 0)}
                  </Text>
                </View>

                {delivery.transits.map(
                  (transit, index) =>
                    transit.is_accepted && (
                      <View
                        key={transit.id}
                        className="flex-row justify-between mt-2">
                        <Text className="text-gray-600">
                          {getCityName(
                            transit.transit_point.loading_city_id,
                            citiesData?.data
                          )}{" "}
                          →{" "}
                          {getCityName(
                            transit.transit_point.unloading_city_id,
                            citiesData?.data
                          )}{" "}
                          ({transit.transit_point.cargo_type ?? "-"})
                        </Text>
                        <Text
                          style={{ lineHeight: 22 }}
                          className="text-gray-800 font-medium">
                          {formatCurrency(transit.transit_point.extra_cost)}
                        </Text>
                      </View>
                    )
                )}

                <View className="border-t border-gray-200 pt-2 mt-2">
                  <View className="flex-row justify-between">
                    <Text className="text-gray-800 font-bold text-lg">
                      Total Biaya
                    </Text>
                    <Text className="text-blue-600 font-bold text-xl">
                      {formatCurrency(total_cost)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View className="h-6" />
      </ScrollView>
    </View>
  );
};

export default DeliveryDetail;

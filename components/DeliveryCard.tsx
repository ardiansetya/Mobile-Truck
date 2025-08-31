import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useDeliveryWithDetails } from "@/hooks/useDelivery";

interface DeliveryCardProps {
  delivery: {
    id: string;
    worker_id: string;
    truck_id: string;
    route_id: string;
    add_by_operator_id: string;
    started_at: number;
  };
  onPress?: () => void;
}

const DeliveryCard: React.FC<DeliveryCardProps> = ({ delivery, onPress }) => {
  const { worker, truck, route, isLoading } = useDeliveryWithDetails(delivery);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000); 
    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTimeDifference = (start_time: number) => {
    const now = Date.now();
    const diff = now - start_time;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}j ${minutes}m yang lalu`;
    }
    return `${minutes}m yang lalu`;
  };

  const formatDistance = (distance_km: number) => {
    if (distance_km >= 1000) {
      return `${(distance_km / 1000).toFixed(1)}k km`;
    }
    return `${distance_km} km`;
  };

  const formatCapacity = (capacity_kg: number) => {
    if (capacity_kg >= 1000) {
      return `${(capacity_kg / 1000).toFixed(1)} ton`;
    }
    return `${capacity_kg} kg`;
  };

  return (
    <TouchableOpacity
      className="bg-white rounded-2xl mt-4 p-5 mb-4 shadow-sm border border-gray-100"
      onPress={onPress}
      activeOpacity={0.7}>
      {/* Header */}
      <View className="flex-row justify-between items-start mb-4">
        <View className="flex-1">
          <Text className="text-lg font-semibold text-gray-800 mb-1">
            Delivery #{delivery.id.slice(-6)}
          </Text>
          <View className="flex-row items-center">
            <View className="w-2 h-2 bg-green-500 rounded-full mr-2" />
            <Text className="text-sm text-green-600 font-medium">Aktif</Text>
          </View>
        </View>
        <TouchableOpacity className="p-2">
          <Ionicons name="ellipsis-vertical" size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* Driver Info */}
      <View className="flex-row items-center mb-4 p-3 bg-blue-50 rounded-xl">
        <View className="w-10 h-10 bg-blue-500 rounded-full items-center justify-center mr-3">
          <Ionicons name="person" size={20} color="white" />
        </View>
        <View className="flex-1">
          <Text className="text-xs text-gray-500 mb-1">Driver</Text>
          {isLoading ? (
            <View className="flex-row items-center">
              <ActivityIndicator size="small" color="#6B7280" />
              <Text className="text-sm text-gray-500 ml-2">Loading...</Text>
            </View>
          ) : (
            <Text className="text-sm font-medium text-gray-800">
              {worker?.username || "Unknown Driver"}
            </Text>
          )}
        </View>
        {worker?.role && (
          <View className="bg-blue-100 px-2 py-1 rounded-md">
            <Text className="text-xs text-blue-700 font-medium">
              {worker.role}
            </Text>
          </View>
        )}
      </View>

      {/* Truck Info */}
      <View className="flex-row items-center mb-4 p-3 bg-orange-50 rounded-xl">
        <View className="w-10 h-10 bg-orange-500 rounded-full items-center justify-center mr-3">
          <Ionicons name="car" size={20} color="white" />
        </View>
        <View className="flex-1">
          <Text className="text-xs text-gray-500 mb-1">Truck</Text>
          {isLoading ? (
            <View className="flex-row items-center">
              <ActivityIndicator size="small" color="#6B7280" />
              <Text className="text-sm text-gray-500 ml-2">Loading...</Text>
            </View>
          ) : (
            <View>
              <Text className="text-sm font-medium text-gray-800">
                {truck?.license_plate || delivery.truck_id}
              </Text>
              {truck?.model && (
                <Text className="text-xs text-gray-500">{truck.model}</Text>
              )}
            </View>
          )}
        </View>
        {truck?.capacity_kg && (
          <View className="bg-orange-100 px-2 py-1 rounded-md">
            <Text className="text-xs text-orange-700 font-medium">
              {formatCapacity(truck.capacity_kg)}
            </Text>
          </View>
        )}
      </View>

      {/* Route Info */}
      <View className="flex-row items-center mb-4 p-3 bg-green-50 rounded-xl">
        <View className="w-10 h-10 bg-green-500 rounded-full items-center justify-center mr-3">
          <Ionicons name="location" size={20} color="white" />
        </View>
        <View className="flex-1">
          <Text className="text-xs text-gray-500 mb-1">Route</Text>
          {isLoading ? (
            <View className="flex-row items-center">
              <ActivityIndicator size="small" color="#6B7280" />
              <Text className="text-sm text-gray-500 ml-2">Loading...</Text>
            </View>
          ) : (
            <View>
              <Text className="text-sm font-medium text-gray-800">
                {route
                  ? `${route.start_city_name} → ${route.end_city_name} (${route.cargo_type})`
                  : delivery.route_id}
              </Text>
              {route?.distance_km && (
                <Text className="text-xs text-gray-500">
                  {formatDistance(route.distance_km)} •{" "}
                  {route.estimated_duration_hours}j estimasi
                </Text>
              )}
            </View>
          )}
        </View>
        {route?.base_price && (
          <View className="bg-green-100 px-2 py-1 rounded-md">
            <Text className="text-xs text-green-700 font-medium">
              Rp {route.base_price.toLocaleString("id-ID")}
            </Text>
          </View>
        )}
      </View>

      {/* Time Info */}
      <View className="border-t border-gray-100 pt-4">
        <View className="flex-row justify-between items-center">
          <View>
            <Text className="text-xs text-gray-500 mb-1">Dimulai</Text>
            <Text className="text-sm text-gray-700">
              {formatDate(delivery.started_at)}
            </Text>
          </View>
          <View className="items-end">
            <Text className="text-xs text-gray-500 mb-1">Durasi</Text>
            <Text className="text-sm font-medium text-blue-600">
              {getTimeDifference(delivery.started_at)}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default DeliveryCard;

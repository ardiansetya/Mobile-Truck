import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DeliveryHistoryItem, useDeliveryDetail, useDeliveryWithDetails } from "@/hooks/useDelivery";

interface DeliveryHistoryCardProps {
  delivery: DeliveryHistoryItem;
  onPress?: () => void;
}

const DeliveryHistoryCard: React.FC<DeliveryHistoryCardProps> = ({
  delivery,
  onPress,
}) => {
  // Format timestamp to readable date
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000); // Convert seconds to milliseconds
    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Format time
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Calculate duration
  const calculateDuration = (startTime: number, endTime: number) => {
    const durationMs = (endTime - startTime) * 1000;
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}j ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const { worker, truck, route } = useDeliveryWithDetails(delivery);

  return (
    <TouchableOpacity
      className="bg-white rounded-2xl p-4 mb-3 shadow-sm"
      onPress={onPress}
      activeOpacity={0.7}>
      {/* Header */}
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-1">
          <Text className="text-gray-800 font-semibold text-base mb-1">
            Delivery #{delivery.id.slice(-8).toUpperCase()}
          </Text>
          <Text className="text-gray-500 text-sm">
            {formatDate(delivery.started_at)}
          </Text>
        </View>
        <View className="w-10 h-10 bg-green-100 rounded-xl items-center justify-center">
          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
        </View>
      </View>

      {/* Details */}
      <View className="space-y-2">
        {/* Worker & Truck Info */}
        <View className="flex-row justify-between">
          <View className="flex-1 mr-4">
            <Text className="text-gray-400 text-xs uppercase tracking-wide mb-1">
              Pekerja
            </Text>
            <Text className="text-gray-700 text-sm font-medium">
              {worker?.username}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-gray-400 text-xs uppercase tracking-wide mb-1">
              Truk
            </Text>
            <Text className="text-gray-700 text-sm font-medium">
              {truck?.license_plate}
            </Text>
          </View>
        </View>

        {/* Route Info */}
        <View className="mt-2">
          <Text className="text-gray-400 text-xs uppercase tracking-wide mb-1">
            Rute
          </Text>
          <Text className="text-gray-700 text-sm font-medium">
            {route?.start_city_name} - {route?.end_city_name}
          </Text>
        </View>

        {/* Time Info */}
        <View className="flex-row justify-between pt-2 border-t mt-2 border-gray-100">
          <View className="flex-row items-center">
            <Ionicons name="time-outline" size={16} color="#6B7280" />
            <Text className="text-gray-500 text-sm ml-2">
              {formatTime(delivery.started_at)} -{" "}
              {formatTime(delivery.finished_at)}
            </Text>
          </View>
          <View className="flex-row items-center">
            <Ionicons name="timer-outline" size={16} color="#6B7280" />
            <Text className="text-gray-500 text-sm ml-2">
              {calculateDuration(delivery.started_at, delivery.finished_at)}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default DeliveryHistoryCard;

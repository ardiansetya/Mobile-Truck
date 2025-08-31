// components/DeliveryList.tsx
import { View, Text, TouchableOpacity } from "react-native";
import React from "react";
import { AllDeliveryActiveResponse } from "@/types/delivery.types";

// ✅ Perbaiki Props type - gunakan AllDeliveryActiveResponse bukan DeliveryDetailResponse
type Props = {
  deliveries: AllDeliveryActiveResponse[];
  onSelect: (id: string) => void; // ✅ Ubah dari number ke string
};

const DeliveryList = ({ deliveries, onSelect }: Props) => {
  // ✅ Tambahkan handling untuk empty state
  if (!deliveries || deliveries.length === 0) {
    return (
      <View className="px-4 py-8 items-center">
        <Text className="text-gray-500 text-center text-lg">
          Tidak ada pengiriman aktif
        </Text>
        <Text className="text-gray-400 text-center text-sm mt-2">
          Semua pengiriman telah selesai atau belum ada yang dimulai
        </Text>
      </View>
    );
  }

  // ✅ Helper function untuk format tanggal
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <View className="px-4 space-y-4">
      {deliveries.map((delivery) => (
        <TouchableOpacity
          key={delivery.id}
          className="bg-white shadow-md rounded-xl p-4 border border-gray-200"
          onPress={() => onSelect(delivery.id)}>
          {/* ✅ Header dengan status */}
          <View className="flex-row justify-between items-start mb-3">
            <Text className="font-semibold text-lg text-blue-600">
              Pengiriman #{delivery.id.slice(-6)}
            </Text>
            <View className="bg-green-100 px-3 py-1 rounded-full">
              <Text className="text-green-600 text-xs font-medium">AKTIF</Text>
            </View>
          </View>

          {/* ✅ Informasi pengiriman berdasarkan data yang tersedia */}
          <View className="space-y-2">
            <View className="flex-row">
              <Text className="text-gray-500 w-20">Truck:</Text>
              <Text className="text-gray-800 font-medium flex-1">
                {delivery.truckId}
              </Text>
            </View>

            <View className="flex-row">
              <Text className="text-gray-500 w-20">Route:</Text>
              <Text className="text-gray-800 font-medium flex-1">
                {delivery.routeId}
              </Text>
            </View>

            <View className="flex-row">
              <Text className="text-gray-500 w-20">Driver:</Text>
              <Text className="text-gray-800 font-medium flex-1">
                {delivery.workerId}
              </Text>
            </View>

            <View className="flex-row">
              <Text className="text-gray-500 w-20">Mulai:</Text>
              <Text className="text-gray-800 font-medium flex-1">
                {formatDate(delivery.startedAt)}
              </Text>
            </View>
          </View>

          {/* ✅ Footer dengan action hint */}
          <View className="mt-3 pt-3 border-t border-gray-100">
            <Text className="text-blue-500 text-sm text-center">
              Tap untuk melihat detail →
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
};

export default DeliveryList;

import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useProfile } from "@/hooks/useProfile";
import { useLogout } from "@/hooks/useAuth";
// import { useAuth } from "@/context/AuthContext"; // Uncomment when auth context is available

const Profile = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    data: profile_data,
    isLoading,
    isError,
    error,
    refetch,
  } = useProfile();

  const { handleLogout } = useLogout();
  const profile = profile_data?.data;

  useFocusEffect(
    React.useCallback(() => {
      refetch();
    }, [refetch])
  );

  const logout = () => {
    Alert.alert(
      "Konfirmasi Logout",
      "Apakah Anda yakin ingin keluar dari aplikasi?",
      [
        {
          text: "Batal",
          style: "cancel",
        },
        {
          text: "Keluar",
          style: "destructive",
          onPress: async () => {
            try {
              console.log("🔄 Proses logout...");
              await handleLogout();
              console.log("✅ Logout pressed");
              router.replace("/login");
            } catch (error) {
              console.error("❌ Gagal logout:", error);
            }
          },
        },
      ]
    );
  };

  const handleEditProfile = () => {
    router.push(`/profile/edit/${profile?.id}`);
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top }} className="bg-gray-50">
        <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />


        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#2563EB" />
          <Text className="mt-4 text-gray-600">Memuat profil...</Text>
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top }} className="bg-gray-50">
        <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

       

        <View className="flex-1 justify-center items-center px-6">
          <Ionicons name="alert-circle" size={64} color="#EF4444" />
          <Text className="text-red-500 text-center text-lg font-semibold mt-4">
            Gagal Memuat Profil
          </Text>
          <Text className="text-gray-500 text-center mt-2 mb-6">
            {(error as Error)?.message ||
              "Terjadi kesalahan saat memuat profil"}
          </Text>
          <TouchableOpacity
            className="bg-blue-600 px-6 py-3 rounded-xl"
            onPress={() => refetch()}>
            <Text className="text-white font-semibold">Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View
      style={{ flex: 1, paddingTop: insets.top, marginBottom: insets.bottom }}
      className="bg-gray-50">
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

     

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 24,
          paddingTop: 24,
        }}
        showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          {/* Avatar Section */}
          <View className="items-center mb-6">
            <View className="w-24 h-24 rounded-full bg-blue-600 items-center justify-center mb-4 shadow-sm">
              <Text className="text-white text-3xl font-bold">
                {profile?.username?.charAt(0)?.toUpperCase() || "U"}
              </Text>
            </View>
            <Text className="text-2xl font-semibold text-gray-800 mb-1">
              {profile?.username || "Pengguna"}
            </Text>
            {profile?.role && (
              <View className="bg-blue-100 px-3 py-1 rounded-full">
                <Text className="text-blue-700 text-sm font-medium capitalize">
                  {profile.role}
                </Text>
              </View>
            )}
          </View>

          {/* Info Section */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-gray-800 mb-4">
              Informasi Akun
            </Text>
            <View className="space-y-4">
              <InfoRow
                icon="person-outline"
                label="Username"
                value={profile?.username}
              />
              <InfoRow
                icon="mail-outline"
                label="Email"
                value={profile?.email}
              />
              <InfoRow
                icon="call-outline"
                label="Telepon"
                value={profile?.phone_number}
              />
              <InfoRow
                icon="calendar-outline"
                label="Umur"
                value={profile?.age ? `${profile.age} tahun` : "-"}
              />
            </View>
          </View>

          {/* Actions */}
          <View className="gap-5">
            <TouchableOpacity
              className="bg-blue-600 h-12 rounded-xl justify-center items-center shadow-sm active:bg-blue-700 flex-row"
              onPress={handleEditProfile}>
              <Ionicons name="create-outline" size={20} color="white" />
              <Text className="text-white font-semibold text-base ml-2">
                Edit Profil
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={logout}
              className="bg-red-500 h-12 rounded-xl justify-center items-center shadow-sm active:bg-red-600 flex-row">
              <Ionicons name="log-out-outline" size={20} color="white" />
              <Text className="text-white font-semibold text-base ml-2">
                Keluar
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Additional Info Cards */}
        <View className="bg-white rounded-2xl shadow-sm p-6">
          <Text className="text-lg font-semibold text-gray-800 mb-4">
            Informasi Aplikasi
          </Text>
          <View className="space-y-4">
            <InfoRow
              icon="information-circle-outline"
              label="Versi Aplikasi"
              value="1.0.0"
            />
            <InfoRow
              icon="shield-checkmark-outline"
              label="Status Akun"
              value="Aktif"
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const InfoRow = ({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value?: string;
}) => (
  <View className="flex-row items-center py-3 border-b border-gray-100">
    <View className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center mr-3">
      <Ionicons name={icon as any} size={18} color="#6B7280" />
    </View>
    <View className="flex-1">
      <Text className="text-gray-600 text-sm">{label}</Text>
      <Text className="text-gray-800 font-medium">{value || "-"}</Text>
    </View>
  </View>
);

export default Profile;

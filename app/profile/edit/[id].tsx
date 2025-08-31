import * as SecureStore from "expo-secure-store";

import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Ionicons } from "@expo/vector-icons";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { useTokenRefresh } from "@/hooks/useAuth";


// Zod validation schema
const updateProfileSchema = z.object({
  username: z
    .string()
    .min(1, "Username tidak boleh kosong")
    .min(3, "Username minimal 3 karakter")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username hanya boleh mengandung huruf, angka, dan underscore"
    ),
  email: z
    .string()
    .min(1, "Email tidak boleh kosong")
    .email("Format email tidak valid"),
  phone_number: z
    .string()
    .min(1, "Nomor telepon tidak boleh kosong")
    .min(10, "Nomor telepon minimal 10 digit")
    .regex(/^[0-9]+$/, "Nomor telepon hanya boleh mengandung angka"),
  age: z
    .string()
    .min(1, "Umur tidak boleh kosong")
    .refine((val) => {
      const num = parseInt(val);
      return !isNaN(num) && num >= 13 && num <= 120;
    }, "Umur harus antara 13-120 tahun"),
});

type UpdateProfileFormData = z.infer<typeof updateProfileSchema>;

const EditProfile = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: profile_data, isLoading: profile_loading } = useProfile();
  const updateProfileMutation = useUpdateProfile();

  const profile = profile_data?.data;

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateProfileFormData>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      username: profile?.username || "",
      email: profile?.email || "",
      phone_number: profile?.phone_number || "",
      age: profile?.age?.toString() || "",
    },
  });

  const { handleRefreshToken } = useTokenRefresh()

  const onSubmit = async (data: UpdateProfileFormData) => {
    try {
      const updateData = {
        username: data.username,
        email: data.email,
        phone_number: data.phone_number,
        age: parseInt(data.age),
      };

      const response = await updateProfileMutation.mutateAsync(updateData);

      if (response?.data?.refresh_token) {
        await SecureStore.setItemAsync("refresh_token", response.data.refresh_token);

        await handleRefreshToken();
      }

      Alert.alert("Sukses", "Profil berhasil diperbarui!", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.message || "Terjadi kesalahan saat memperbarui profil"
      );
    }
  };

  const renderInput = (
    name: keyof UpdateProfileFormData,
    label: string,
    placeholder: string,
    icon: string,
    props?: any
  ) => (
    <View className="mb-6">
      <Text className="text-sm font-medium text-gray-700 mb-2">{label}</Text>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, onBlur, value } }) => (
          <View className="relative">
            <View className="absolute left-4 top-4 z-10">
              <Ionicons name={icon as any} size={20} color="#6B7280" />
            </View>
            <TextInput
              className={`h-14 bg-gray-50 border rounded-xl pl-12 pr-4 text-gray-800 text-base ${
                errors[name]
                  ? "border-red-300 focus:border-red-500"
                  : "border-gray-200 focus:border-blue-500 focus:bg-white"
              }`}
              placeholder={placeholder}
              placeholderTextColor="#9CA3AF"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              {...props}
            />
          </View>
        )}
      />
      {errors[name] && (
        <Text className="text-red-500 text-sm mt-1">
          {errors[name]?.message}
        </Text>
      )}
    </View>
  );

  if (profile_loading) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top }} className="bg-gray-50">
        <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />


        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-500">Memuat data profil...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-gray-50">
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

     

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 24,
          paddingTop: 24,
        }}
        showsVerticalScrollIndicator={false}>
        {/* Avatar Section */}
        <View className="items-center mb-8">
          <View className="w-24 h-24 rounded-full bg-blue-600 items-center justify-center mb-4 shadow-sm">
            <Text className="text-white text-3xl font-bold">
              {profile?.username?.charAt(0)?.toUpperCase() || "U"}
            </Text>
          </View>
          <Text className="text-lg font-semibold text-gray-800">
            Perbarui Informasi Profil
          </Text>
          <Text className="text-gray-500 text-sm text-center mt-1">
            Pastikan informasi yang Anda masukkan sudah benar
          </Text>
        </View>

        {/* Form */}
        <View className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          {renderInput(
            "username",
            "Username",
            "Masukkan username Anda",
            "person-outline",
            {
              autoCapitalize: "none",
            }
          )}

          {renderInput(
            "email",
            "Email",
            "Masukkan email Anda",
            "mail-outline",
            {
              keyboardType: "email-address",
              autoCapitalize: "none",
            }
          )}

          {renderInput(
            "phone_number",
            "Nomor Telepon",
            "Masukkan nomor telepon Anda",
            "call-outline",
            {
              keyboardType: "numeric",
            }
          )}

          {renderInput(
            "age",
            "Umur",
            "Masukkan umur Anda",
            "calendar-outline",
            {
              keyboardType: "numeric",
            }
          )}

          {/* Submit Button */}
          <TouchableOpacity
            className={`h-14 rounded-xl justify-center items-center shadow-sm ${
              updateProfileMutation.isPending
                ? "bg-gray-400"
                : "bg-blue-600 active:bg-blue-700"
            }`}
            onPress={handleSubmit(onSubmit)}
            disabled={updateProfileMutation.isPending}>
            {updateProfileMutation.isPending ? (
              <View className="flex-row items-center">
                <Text className="text-white font-semibold text-lg mr-2">
                  Menyimpan...
                </Text>
              </View>
            ) : (
              <View className="flex-row items-center">
                <Ionicons name="save-outline" size={20} color="white" />
                <Text className="text-white font-semibold text-lg ml-2">
                  Simpan Perubahan
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Info Card */}
        <View className="bg-blue-50 rounded-2xl p-4 border border-blue-200">
          <View className="flex-row items-start">
            <Ionicons name="information-circle" size={20} color="#2563EB" />
            <View className="flex-1 ml-3">
              <Text className="text-blue-800 font-medium text-sm">
                Catatan Penting
              </Text>
              <Text className="text-blue-700 text-sm mt-1">
                Pastikan email yang Anda masukkan masih aktif dan dapat diakses
                untuk keperluan pemulihan akun.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default EditProfile;

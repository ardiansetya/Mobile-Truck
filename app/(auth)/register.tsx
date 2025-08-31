import { useRegister } from "@/hooks/useAuth";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useRouter } from "expo-router";
import React from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { z } from "zod";

// Zod validation schema
const registerSchema = z.object({
  username: z
    .string()
    .min(1, "Username tidak boleh kosong")
    .min(3, "Username minimal 3 karakter")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username hanya boleh mengandung huruf, angka, dan underscore"
    ),
  password: z
    .string()
    .min(1, "Password tidak boleh kosong")
    .min(8, "Password minimal 8 karakter"),
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
    }),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterScreen() {
  const router = useRouter();
  const { handleRegister, isLoading, error, clearError } = useRegister();

  const insets = useSafeAreaInsets();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      email: "",
      phone_number: "",
      age: "",
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      clearError();
      // Convert age to number for API payload
      const payload = {
        ...data,
        age: parseInt(data.age),
      };

      await handleRegister(payload);
      Alert.alert("Sukses", "Registrasi berhasil! Silakan login.", [
        {
          text: "OK",
          onPress: () => router.replace("/login"),
        },
      ]);
    } catch (error: any) {
      // Error is already handled by useRegister hook
    }
  };

  const renderInput = (
    name: keyof RegisterFormData,
    label: string,
    placeholder: string,
    props?: any
  ) => (
    <View className="mb-6">
      <Text className="text-sm font-medium text-gray-700 mb-2">{label}</Text>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            className={`h-14 bg-gray-50 border rounded-xl px-4 text-gray-800 text-base ${
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
        )}
      />
      {errors[name] && (
        <Text className="text-red-500 text-sm mt-1">
          {errors[name]?.message}
        </Text>
      )}
    </View>
  );

  return (
    <View
      style={{ paddingTop: insets.top }}
      className="flex-1 bg-gradient-to-br from-slate-50 to-gray-100">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="flex-1 justify-center px-8 py-12">
          <View className="mb-8">
            <Text className="text-4xl font-light text-gray-800 text-center mb-2">
              Daftar Akun
            </Text>
            <Text className="text-base text-gray-500 text-center font-light">
              Buat akun baru untuk memulai
            </Text>
          </View>

          <View className="bg-white rounded-2xl shadow-lg p-8 mb-8">
            {renderInput("username", "Username", "Masukkan username Anda", {
              autoCapitalize: "none",
            })}

            {renderInput("email", "Email", "Masukkan email Anda", {
              keyboardType: "email-address",
              autoCapitalize: "none",
            })}

            {renderInput("password", "Password", "Masukkan password Anda", {
              secureTextEntry: true,
            })}

            {renderInput(
              "phone_number",
              "Nomor Telepon",
              "Masukkan nomor telepon Anda",
              {
                keyboardType: "numeric",
              }
            )}

            {renderInput("age", "Umur", "Masukkan umur Anda", {
              keyboardType: "numeric",
            })}

            {/* Error Message from Hook */}
            {error && (
              <View className="mb-6 bg-red-50 border border-red-200 rounded-lg p-3">
                <Text className="text-red-600 text-center text-sm">
                  {error}
                </Text>
              </View>
            )}

            <TouchableOpacity
              className={`h-14 rounded-xl justify-center items-center mb-4 shadow-sm ${
                isLoading ? "bg-gray-400" : "bg-blue-600 active:bg-blue-700"
              }`}
              onPress={handleSubmit(onSubmit)}
              disabled={isLoading}>
              <Text className="text-white font-semibold text-lg">
                {isLoading ? "Mendaftar..." : "Daftar"}
              </Text>
            </TouchableOpacity>
          </View>

          <View className="items-center">
            <Link href="/login" asChild>
              <TouchableOpacity className="py-3 px-6">
                <Text className="text-gray-600 text-center text-base">
                  Sudah punya akun?{" "}
                  <Text className="text-blue-600 font-medium">
                    Masuk di sini
                  </Text>
                </Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

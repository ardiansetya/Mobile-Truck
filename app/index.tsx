import { useLogin } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { z } from "zod";

const loginSchema = z.object({
  username: z
    .string()
    .min(1, "Username tidak boleh kosong")
    .min(3, "Username minimal 3 karakter"),
  password: z
    .string()
    .min(1, "Password tidak boleh kosong")
    .min(6, "Password minimal 6 karakter"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const router = useRouter();
  const { handleLogin, isLoading, error, clearError } = useLogin();
  const { data: profile, isLoading: isProfileLoading } = useProfile();
  const [loginSuccess, setLoginSuccess] = useState(false);
  const queryClient = useQueryClient();

  //

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      clearError();
      await handleLogin(data);
      await queryClient.invalidateQueries({ queryKey: ["user_profile"] });
      setLoginSuccess(true); // Mark login as successful
    } catch (error: any) {}
  };

  // Route based on profile role after login
  useEffect(() => {
    if (loginSuccess && !isProfileLoading && profile?.data) {
      //
      if (profile.data.role === "OWNER") {
        router.replace("/(tabs-owner)/home-owner");
      } else if (profile.data.role === "DRIVER") {
        router.replace("/(tabs-driver)/home-driver");
      } else {
        router.replace("/");
      }
    }
  }, [loginSuccess, isProfileLoading, profile, router]);

  const renderInput = (
    name: keyof LoginFormData,
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
    <View className="flex-1 bg-gradient-to-br from-slate-50 to-gray-100">
      <View className="flex-1 justify-center px-8">
        <View className="mb-12">
          <Text className="text-4xl font-light text-gray-800 text-center mb-2">
            Selamat Datang
          </Text>
          <Text className="text-base text-gray-500 text-center font-light">
            Silakan masuk ke akun Anda
          </Text>
        </View>

        <View className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          {renderInput("username", "Username", "Masukkan username Anda", {
            autoCapitalize: "none",
          })}

          {renderInput("password", "Password", "Masukkan password Anda", {
            secureTextEntry: true,
          })}

          {error && (
            <View className="mb-6 bg-red-50 border border-red-200 rounded-lg p-3">
              <Text className="text-red-600 text-center text-sm">{error}</Text>
            </View>
          )}

          <TouchableOpacity
            className={`h-14 rounded-xl justify-center items-center mb-4 shadow-sm ${
              isLoading ? "bg-gray-400" : "bg-blue-600 active:bg-blue-700"
            }`}
            onPress={handleSubmit(onSubmit)}
            disabled={isLoading}>
            <Text className="text-white font-semibold text-lg">
              {isLoading ? "Masuk..." : "Masuk"}
            </Text>
          </TouchableOpacity>
        </View>

        <View className="items-center">
          <Link href="/register" asChild>
            <TouchableOpacity className="py-3 px-6">
              <Text className="text-gray-600 text-center text-base">
                Belum punya akun?{" "}
                <Text className="text-blue-600 font-medium">
                  Daftar di sini
                </Text>
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </View>
  );
}


import { SafeAreaProvider } from "react-native-safe-area-context";
import TabLayoutDriver from "./driver/_layout";
import TabLayoutOwner from "./owner/_layout";
import { ActivityIndicator, Text, View } from "react-native";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { useProfile } from "@/hooks/useProfile";
import { useAuthStatus } from "@/hooks/useAuth";





type UserRole = "OWNER" | "DRIVER" | null;

const Layout = () => {
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [isReady, setIsReady] = useState(false);


  const { isAuthenticated, isLoading: authLoading } = useAuthStatus();
  const {
    data: user,
    isLoading: profileLoading,
    error: profileError,
  } = useProfile();


  useEffect(() => {
    // ✅ Wait for both auth and profile to be ready
    if (!authLoading && !profileLoading) {
      if (isAuthenticated && user?.data?.role) {
        setUserRole(user.data.role as UserRole);
      }
      setIsReady(true);
    }
  }, [authLoading, profileLoading, isAuthenticated, user]);

  // ✅ Still loading
  if (!isReady) {
    return (
      <SafeAreaProvider>
        <View className="flex-1 justify-center items-center bg-gray-50">
          <ActivityIndicator size="large" color="#007bff" />
          <Text className="text-gray-500 mt-4">Initializing...</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  // ✅ Not authenticated
  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  // ✅ Profile error
  if (profileError || !userRole) {
    return (
      <SafeAreaProvider>
        <View className="flex-1 justify-center items-center bg-gray-50 px-6">
          <Text className="text-red-500 text-lg font-semibold">
            Profile Error
          </Text>
          <Text className="text-gray-500 text-center mt-2">
            Please restart the app or contact support
          </Text>
        </View>
      </SafeAreaProvider>
    );
  }

  // ✅ Render based on role
  return (
    <SafeAreaProvider>
      {userRole === "OWNER" ? <TabLayoutOwner /> : <TabLayoutDriver />}
    </SafeAreaProvider>
  );
};



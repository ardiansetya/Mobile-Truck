// import CustomHeader from "@/components/Header";
// import { useAuthStatus } from "@/hooks/useAuth";
// import { Feather, Ionicons } from "@expo/vector-icons";
// import { Redirect, Tabs } from "expo-router";
// import { ActivityIndicator, Text, View } from "react-native";
// import { useSafeAreaInsets } from "react-native-safe-area-context";

// const TabLayoutDriver = () => {
//   const insets = useSafeAreaInsets();

//   const { isAuthenticated, isLoading } = useAuthStatus();

//   if (isLoading) {
//     return (
//       <View className="flex-1 justify-center items-center">
//         <ActivityIndicator size="large" />
//       </View>
//     );
//   }

//   if (!isAuthenticated) {
//     return <Redirect href="/" />;
//   }

//   return (
//     <Tabs
//       screenOptions={{
//         tabBarShowLabel: false,
//         tabBarActiveTintColor: "#007bff",
//         tabBarInactiveTintColor: "#999",
//         tabBarItemStyle: {
//           flex: 1,
//           justifyContent: "center",
//           alignItems: "center",
//           paddingVertical: 8,
//         },
//         tabBarStyle: {
//           backgroundColor: "white",
//           borderRadius: 30,
//           marginHorizontal: 20,
//           marginBottom: insets.bottom,
//           height: 60,
//           position: "absolute",
//           borderTopWidth: 0,
//           shadowColor: "#000",
//           shadowOffset: {
//             width: 0,
//             height: 2,
//           },
//           shadowOpacity: 0.1,
//           shadowRadius: 4,
//           elevation: 5,
//         },
//       }}>
//       <Tabs.Screen
//         name="index"
//         options={{
//           title: "Home",
//           header: () => <CustomHeader />,
//           tabBarIcon: ({ focused, color }) => (
//             <View className="items-center h-full">
//               <Feather name="home" size={24} color={color} />
//               <Text
//                 className={`text-xs mt-1 ${focused ? "text-blue-600 font-medium" : "text-gray-500"}`}>
//                 Home
//               </Text>
//             </View>
//           ),
//         }}
//       />
//       <Tabs.Screen
//         name="transit"
//         options={{
//           header: () => <CustomHeader />,
//           tabBarLabel: "Transit",
//           tabBarIcon: ({ focused, color }) => (
//             <View className="items-center h-full">
//               <Feather name="truck" size={24} color={color} />
//               <Text
//                 className={`w-full text-xs mt-1 ${focused ? "text-blue-600 font-medium" : "text-gray-500"}`}>
//                 Transit
//               </Text>
//             </View>
//           ),
//         }}
//       />
//       <Tabs.Screen
//         name="profile"
//         options={{
//           title: "Profile",
//           tabBarLabel: "Profile",
//           header: () => <CustomHeader />,
//           tabBarIcon: ({ focused, color }) => (
//             <View className="items-center h-full">
//               <Ionicons
//                 name={focused ? "person" : "person-outline"}
//                 size={24}
//                 color={color}
//               />
//               <Text
//                 className={`text-xs mt-1 ${focused ? "text-blue-600 font-medium" : "text-gray-500"}`}>
//                 Profile
//               </Text>
//             </View>
//           ),
//         }}
//       />
//     </Tabs>
//   );
// };

// export default TabLayoutDriver;
import CustomHeader from "@/components/Header";
import { useAuthStatus } from "@/hooks/useAuth";
import { Feather, Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import { ActivityIndicator, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TabLayoutDriver = () => {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, isLoading } = useAuthStatus();

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarShowLabel: false,
        tabBarActiveTintColor: "#007bff",
        tabBarInactiveTintColor: "#999",
        tabBarItemStyle: {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingVertical: 8,
        },
        tabBarStyle: {
          backgroundColor: "white",
          borderRadius: 30,
          marginHorizontal: 20,
          marginBottom: insets.bottom,
          height: 60,
          position: "absolute",
          borderTopWidth: 0,
          shadowColor: "#000",
          shadowOffset: {
            width: 0,
            height: 2,
          },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 5,
        },
      }}>
      <Tabs.Screen
        name="home-driver"
        options={{
          title: "Home",
          header: () => <CustomHeader />,
          tabBarIcon: ({ focused, color }) => (
            <View className="items-center h-full">
              <Feather name="home" size={24} color={color} />
              <Text
                className={`text-xs mt-1 ${
                  focused ? "text-blue-600 font-medium" : "text-gray-500"
                }`}>
                Home
              </Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="transit"
        options={{
          header: () => <CustomHeader />,
          tabBarLabel: "Transit",
          tabBarIcon: ({ focused, color }) => (
            <View className="items-center h-full">
              <Feather name="truck" size={24} color={color} />
              <Text
                className={`text-xs mt-1 ${
                  focused ? "text-blue-600 font-medium" : "text-gray-500"
                }`}>
                Transit
              </Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="history-delivery"
        options={{
          header: () => <CustomHeader />,
          tabBarLabel: "History",
          tabBarIcon: ({ focused, color }) => (
            <View className="items-center h-full">
              <Ionicons name="albums-outline" size={24} color={color} />
              <Text
                className={`text-xs mt-1 ${
                  focused ? "text-blue-600 font-medium" : "text-gray-500"
                }`}>
                History
              </Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarLabel: "Profile",
          header: () => <CustomHeader />,
          tabBarIcon: ({ focused, color }) => (
            <View className="items-center h-full">
              <Ionicons
                name={focused ? "person" : "person-outline"}
                size={24}
                color={color}
              />
              <Text
                className={`text-xs mt-1 ${
                  focused ? "text-blue-600 font-medium" : "text-gray-500"
                }`}>
                Profile
              </Text>
            </View>
          ),
        }}
      />
    </Tabs>
  );
};

export default TabLayoutDriver;
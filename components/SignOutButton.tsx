import { useClerk } from "@clerk/clerk-expo";
import * as Linking from "expo-linking";
import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export const SignOutButton = () => {
  const { signOut } = useClerk();

  const handleSignOut = async () => {
    try {
      await signOut();
      Linking.openURL(Linking.createURL("/"));
    } catch (err) {
      console.error(JSON.stringify(err, null, 2));
    }
  };

  return (
    <TouchableOpacity
      onPress={handleSignOut}
      className="flex-row items-center bg-red-600 px-4 py-2 rounded-xl shadow-md active:bg-red-700">
      <Ionicons name="log-out-outline" size={20} color="white" />
      <Text className="text-white font-semibold text-base ml-2">Sign Out</Text>
    </TouchableOpacity>
  );
};

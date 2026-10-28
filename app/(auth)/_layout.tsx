import { Redirect, Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import Toast from "react-native-toast-message";
import { useAuth } from "../../context/AuthContext";
import { C } from "@/constants/theme";

export default function AuthLayout() {
  const { loading, isLoggedIn } = useAuth();

  // Wait for the saved session before showing any login or signup screen.
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.page }}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  if (isLoggedIn) return <Redirect href="/(tabs)" />;

  return (
    <>
      <Toast />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
import { Stack } from "expo-router";
import Toast from "react-native-toast-message";

export default function AuthLayout() {
  return (
    <>
      <Toast />
      <Stack screenOptions={{ headerShown: false }} />;
    </>
  );
}

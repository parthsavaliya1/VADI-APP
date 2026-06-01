import { AddressProvider } from "@/context/AddressContext";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { CustomAlertProvider } from "@/context/CustomAlertContext";
import { OrderProvider } from "@/context/OrderContext";
import { getApiUrl, loadRemoteConfig } from "@/firebase";
import { setBaseUrl } from "@/utils/api";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import Toast from "react-native-toast-message";

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);

  // Load Remote Config & set base URL before anything renders (same as VADI-HISAB).
  useEffect(() => {
    const init = async () => {
      try {
        await Promise.race([
          loadRemoteConfig(),
          new Promise((resolve) => setTimeout(resolve, 3000)),
        ]);

        const url = getApiUrl();
        console.log("🔥 Remote API URL:", url);
        // setBaseUrl("http://192.168.1.5:5000");

        setBaseUrl(url);
      } catch (err) {
        console.warn("⚠️ Remote Config failed, using default BASE_URL:", err);
      } finally {
        setIsReady(true);
      }
    };

    init();
  }, []);

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  return (
    <AuthProvider>
      <CustomAlertProvider>
        <AddressProvider>
          <CartProvider>
            <OrderProvider>
              {[
                <Stack key="stack" screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="(auth)" />
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="driver" />
                </Stack>,
                <Toast key="toast" />,
                <StatusBar key="statusbar" style="auto" />,
              ]}
            </OrderProvider>
          </CartProvider>
        </AddressProvider>
      </CustomAlertProvider>
    </AuthProvider>
  );
}

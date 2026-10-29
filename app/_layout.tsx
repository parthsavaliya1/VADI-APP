import { useAuth , AuthProvider } from "@/context/AuthContext";
import { AddressProvider } from "@/context/AddressContext";
import { CartProvider } from "@/context/CartContext";
import { CustomAlertProvider } from "@/context/CustomAlertContext";
import { OrderProvider } from "@/context/OrderContext";
import { C } from "@/constants/theme";
import { getApiUrl, loadRemoteConfig } from "@/firebase";
import { resolveStartupApiUrl, setBaseUrl } from "@/utils/api";
import { loadAppTheme } from "@/utils/appTheme";
import { ensurePushChannel } from "@/utils/pushNotifications";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import Toast from "react-native-toast-message";
import { RazorpayHost } from "@/components/RazorpayCheckout";
import SeasonalAtmosphere from "@/components/SeasonalAtmosphere";

function AccountProviders({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return <AddressProvider key={user?._id || "guest"}>
    <CartProvider><OrderProvider>{children}</OrderProvider></CartProvider>
  </AddressProvider>;
}

function ReviewBanner() {
  const { user } = useAuth();
  if (!user?.isDemo) return null;
  return <View style={{ backgroundColor: "#fff3cd", padding: 6 }}><Text style={{ color: "#664d03", textAlign: "center", fontSize: 12 }}>Demo sandbox — no real charges or deliveries</Text></View>;
}

function PushOpenListener() {
  useEffect(() => {
    let sub: { remove: () => void } | undefined;
    let alive = true;
    (async () => {
      try {
        const Notifications = await import("expo-notifications");
        if (!alive) return;
        sub = Notifications.addNotificationResponseReceivedListener(() => {
          router.push("/notifications");
        });
      } catch {
        // Expo Go on Android does not support remote push.
      }
    })();
    return () => { alive = false; sub?.remove(); };
  }, []);
  return null;
}

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

        // Local dev override: set EXPO_PUBLIC_API_URL in vadi-app/.env.local (git-ignored).
        const url = resolveStartupApiUrl(process.env.EXPO_PUBLIC_API_URL, getApiUrl());
        console.log("🔥 Remote API URL:", url);
        setBaseUrl(url);
        await Promise.race([ensurePushChannel(), new Promise(resolve => setTimeout(resolve, 3000))]);
      } catch (err) {
        console.warn("⚠️ Remote Config failed, using default BASE_URL:", err);
      } finally {
        // Colour theme selected in the admin panel; must be set before first render.
        try {
          await Promise.race([loadAppTheme(), new Promise(resolve => setTimeout(resolve, 4000))]);
        } catch (error) { console.warn("Theme unavailable, using default", error); }
        finally { setIsReady(true); }
      }
    };

    init();
  }, []);

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
    <AuthProvider>
      <CustomAlertProvider>
        <AccountProviders>
              <RazorpayHost>
              <PushOpenListener />
              <ReviewBanner />
              {[
                <Stack key="stack" screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="(auth)" />
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="driver" />
                </Stack>,
                <Toast key="toast" />,
                <StatusBar key="statusbar" style="auto" />,
              ]}
              </RazorpayHost>
        </AccountProviders>
      </CustomAlertProvider>
    </AuthProvider>
    <SeasonalAtmosphere />
    </View>
  );
}

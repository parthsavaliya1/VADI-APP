import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { AppHeader } from "@/components/AppHeader";
import { getDriverToken } from "@/utils/driverSession";
import { API } from "@/utils/api";
import { showAlert } from "@/context/CustomAlertContext";
import { C, themed } from "@/constants/theme";

export default function DriverHomeScreen() {
  const [checking, setChecking] = useState(true);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const t = await getDriverToken();
      if (!alive) return;
      setChecking(false);
      if (!t) {
        router.replace("/driver/login");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (checking) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <AppHeader title="Delivery staff" showBack showCart={false} />
      <View style={styles.content}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="bicycle" size={26} color={C.primary} />
          </View>
          <Text style={styles.title}>You are signed in</Text>
          <Text style={styles.sub}>
            Ask the customer for the 6-digit code in their app, then confirm it here to complete the delivery.
          </Text>
        </View>

        <Pressable
          style={({ pressed }) => [styles.action, pressed && { opacity: 0.9 }]}
          onPress={() => router.push("/driver/confirm-handover")}
        >
          <View style={styles.actionIcon}>
            <Ionicons name="keypad" size={22} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.actionTitle}>Confirm customer code</Text>
            <Text style={styles.actionHint}>Marks the order as delivered</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={C.tabInactive} />
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.action, pressed && { opacity: 0.9 }]}
          disabled={sharing}
          onPress={() => {
            void (async () => {
              setSharing(true);
              try {
                const permission = await Location.requestForegroundPermissionsAsync();
                if (permission.status !== "granted") {
                  showAlert("Location", "Allow location to share where you are.");
                  return;
                }
                const position = await Location.getCurrentPositionAsync({});
                const token = await getDriverToken();
                await API.post(
                  "/api/driver/location",
                  { lat: position.coords.latitude, lng: position.coords.longitude },
                  { headers: token ? { Authorization: `Bearer ${token}` } : {} },
                );
                showAlert("Location shared", "The customer can open your latest location on the tracking screen.");
              } catch (error: any) {
                showAlert("Location", error?.response?.data?.message || "Could not share location");
              } finally {
                setSharing(false);
              }
            })();
          }}
        >
          <View style={styles.actionIcon}>
            <Ionicons name="navigate" size={22} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.actionTitle}>{sharing ? "Sharing..." : "Share my location"}</Text>
            <Text style={styles.actionHint}>Updates orders that are on the way</Text>
          </View>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.signOut, pressed && { opacity: 0.85 }]}
          onPress={async () => {
            const { clearDriverToken } = await import("@/utils/driverSession");
            await clearDriverToken();
            router.replace("/driver/login");
          }}
        >
          <Ionicons name="log-out-outline" size={18} color={C.primary} />
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.page },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    content: { padding: 16 },
    hero: {
      backgroundColor: C.soft,
      borderRadius: 20,
      padding: 18,
      borderWidth: 1,
      borderColor: C.line,
    },
    heroIcon: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: C.card,
      alignItems: "center",
      justifyContent: "center",
    },
    title: { marginTop: 12, fontSize: 22, fontWeight: "800", color: C.ink },
    sub: { marginTop: 6, fontSize: 14, lineHeight: 21, color: C.muted },
    action: {
      marginTop: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: C.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: C.line,
      padding: 14,
    },
    actionIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: C.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    actionTitle: { fontSize: 15, fontWeight: "800", color: C.ink },
    actionHint: { marginTop: 2, fontSize: 12, color: C.muted },
    signOut: {
      marginTop: 12,
      height: 50,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: C.primary,
      backgroundColor: C.card,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    signOutText: { color: C.primary, fontSize: 15, fontWeight: "800" },
  }),
);

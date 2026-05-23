import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { getDriverToken } from "@/utils/driverSession";

export default function DriverHomeScreen() {
  const [checking, setChecking] = useState(true);

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
          <ActivityIndicator size="large" color="#1E7A35" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>VADI Delivery</Text>
        <Text style={styles.sub}>Signed in as delivery staff</Text>

        <Pressable
          style={({ pressed }) => [styles.btn, pressed && { opacity: 0.9 }]}
          onPress={() => router.push("/driver/confirm-handover")}
        >
          <Text style={styles.btnText}>Confirm customer code</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.btnOutline, pressed && { opacity: 0.85 }]}
          onPress={async () => {
            const { clearDriverToken } = await import("@/utils/driverSession");
            await clearDriverToken();
            router.replace("/driver/login");
          }}
        >
          <Text style={styles.btnOutlineText}>Sign out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F7F2" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { flex: 1, padding: 24, paddingTop: 48 },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1B5E20",
    marginBottom: 8,
  },
  sub: { fontSize: 15, color: "#4E7C50", marginBottom: 32 },
  btn: {
    backgroundColor: "#2E7D32",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 14,
  },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  btnOutline: {
    borderWidth: 2,
    borderColor: "#2E7D32",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  btnOutlineText: { color: "#2E7D32", fontSize: 15, fontWeight: "600" },
});

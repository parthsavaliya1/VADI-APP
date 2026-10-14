import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppHeader } from "@/components/AppHeader";
import { API } from "@/utils/api";
import { getDriverToken } from "@/utils/driverSession";
import { C, themed } from "@/constants/theme";

export default function DriverConfirmHandoverScreen() {
  const [orderId, setOrderId] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      const t = await getDriverToken();
      if (!alive) return;
      if (!t) router.replace("/driver/login");
    })();
    return () => {
      alive = false;
    };
  }, []);

  const submit = async () => {
    setError("");
    setMessage("");
    const ref = orderId.trim().replace(/^#/, "").trim();
    const c = code.replace(/\D/g, "");
    if (!ref) {
      setError("Enter the order number, for example ORD…, or the id from admin.");
      return;
    }
    if (c.length !== 6) {
      setError("Enter the 6-digit code from the customer.");
      return;
    }

    const token = await getDriverToken();
    if (!token) {
      router.replace("/driver/login");
      return;
    }

    setLoading(true);
    try {
      const pathRef = encodeURIComponent(ref);
      const { data } = await API.post(
        `/orders/${pathRef}/verify-delivery-handover`,
        { code: c },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (data?.success) {
        setMessage(data.message || "Delivery confirmed.");
        setCode("");
      } else {
        setError(data?.message || "Verification failed");
      }
    } catch (e: unknown) {
      const ax = e as {
        response?: { status?: number; data?: { message?: string } };
      };
      if (ax.response?.status === 401) {
        router.replace("/driver/login");
        return;
      }
      setError(ax.response?.data?.message || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <AppHeader title="Confirm code" showBack showCart={false} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <Ionicons name="keypad" size={24} color={C.primary} />
            </View>
            <Text style={styles.title}>Hand the order over</Text>
            <Text style={styles.sub}>
              Ask for the code on the customer&apos;s tracking screen. A matching code marks the order delivered.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Order number</Text>
            <TextInput
              placeholder="ORD… or admin order id"
              placeholderTextColor={C.tabInactive}
              autoCapitalize="characters"
              value={orderId}
              onChangeText={setOrderId}
              style={styles.input}
            />

            <Text style={styles.label}>Customer code</Text>
            <TextInput
              placeholder="6 digits"
              placeholderTextColor={C.tabInactive}
              keyboardType="number-pad"
              maxLength={6}
              value={code}
              onChangeText={(t) => setCode(t.replace(/\D/g, ""))}
              style={styles.codeInput}
            />

            <Pressable
              style={[styles.cta, loading && { opacity: 0.7 }]}
              onPress={() => void submit()}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.ctaText}>Verify code</Text>
              )}
            </Pressable>

            {message ? (
              <View style={styles.okBox}>
                <Ionicons name="checkmark-circle" size={18} color={C.primary} />
                <Text style={styles.ok}>{message}</Text>
              </View>
            ) : null}
            {error ? (
              <View style={styles.errBox}>
                <Ionicons name="alert-circle" size={18} color="#C62828" />
                <Text style={styles.err}>{error}</Text>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.page },
    content: { padding: 16, paddingBottom: 32 },
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
    card: {
      marginTop: 14,
      backgroundColor: C.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: C.line,
      padding: 16,
    },
    label: {
      marginBottom: 8,
      marginTop: 4,
      fontSize: 12,
      fontWeight: "800",
      letterSpacing: 0.4,
      textTransform: "uppercase",
      color: C.muted,
    },
    input: {
      backgroundColor: C.page,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: C.line,
      paddingHorizontal: 14,
      paddingVertical: 14,
      fontSize: 15,
      color: C.ink,
      marginBottom: 12,
    },
    codeInput: {
      backgroundColor: C.page,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: C.line,
      paddingVertical: 14,
      textAlign: "center",
      fontSize: 24,
      fontWeight: "800",
      letterSpacing: 8,
      color: C.ink,
    },
    cta: {
      marginTop: 16,
      height: 52,
      borderRadius: 14,
      backgroundColor: C.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    ctaText: { color: "#fff", fontSize: 16, fontWeight: "800" },
    okBox: {
      marginTop: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: C.soft,
      borderRadius: 12,
      padding: 12,
    },
    ok: { flex: 1, color: C.primary, fontWeight: "700" },
    errBox: {
      marginTop: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: "#FDECEC",
      borderRadius: 12,
      padding: 12,
    },
    err: { flex: 1, color: "#C62828", fontWeight: "600" },
  }),
);

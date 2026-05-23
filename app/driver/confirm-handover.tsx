import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { API } from "@/utils/api";
import { getDriverToken } from "@/utils/driverSession";

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
      setError("Enter order number (e.g. ORD…) or the 24-character ID from admin.");
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
        setMessage(data.message || "Verified successfully.");
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
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.container}>
          <Text style={styles.title}>Confirm delivery code</Text>
          <Text style={styles.sub}>
            Enter the customer&apos;s 6-digit code from their app. A correct code marks
            the order delivered immediately.
          </Text>

          <Text style={styles.label}>Order number or ID</Text>
          <TextInput
            placeholder="e.g. ORD23908068615 or ID from admin URL"
            autoCapitalize="none"
            value={orderId}
            onChangeText={setOrderId}
            style={styles.inputMono}
          />

          <Text style={styles.label}>Customer code</Text>
          <TextInput
            placeholder="6 digits"
            keyboardType="number-pad"
            maxLength={6}
            value={code}
            onChangeText={(t) => setCode(t.replace(/\D/g, ""))}
            style={styles.input}
          />

          <Pressable
            style={[styles.cta, loading && { opacity: 0.6 }]}
            onPress={() => void submit()}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.ctaText}>Verify code</Text>
            )}
          </Pressable>

          {message ? <Text style={styles.ok}>{message}</Text> : null}
          {error ? <Text style={styles.err}>{error}</Text> : null}

          <Pressable onPress={() => router.back()} style={styles.back}>
            <Text style={styles.backText}>← Back</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F7F2" },
  container: { flex: 1, padding: 24, paddingTop: 24 },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1B5E20",
    marginBottom: 8,
  },
  sub: { fontSize: 14, color: "#4E7C50", marginBottom: 22, lineHeight: 20 },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    fontSize: 22,
    letterSpacing: 6,
    marginBottom: 16,
    fontWeight: "700",
  },
  inputMono: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    fontSize: 13,
    marginBottom: 16,
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }),
  },
  cta: {
    backgroundColor: "#5B21B6",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8,
  },
  ctaText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  ok: { color: "#166534", marginTop: 16, textAlign: "center", fontWeight: "600" },
  err: { color: "#B42318", marginTop: 16, textAlign: "center" },
  back: { marginTop: 28, alignSelf: "flex-start" },
  backText: { color: "#6B7280", fontSize: 15 },
});

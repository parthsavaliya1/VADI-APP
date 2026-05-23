import { useState } from "react";
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
import { clearDriverToken, setDriverToken } from "@/utils/driverSession";

export default function DriverLoginScreen() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [lockedPhone, setLockedPhone] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const normalized =
    phone.replace(/\D/g, "").length >= 10
      ? phone.startsWith("+91")
        ? phone.trim()
        : `+91${phone.replace(/\D/g, "").slice(-10)}`
      : "";

  const sendOtp = async () => {
    setError("");
    if (normalized.length < 12) {
      setError("Enter a valid 10-digit mobile number");
      return;
    }
    setLoading(true);
    try {
      await clearDriverToken();
      const { data } = await API.post("/api/driver/send-otp", {
        phone: normalized,
        forceResend: true,
      });
      if (!data?.success) {
        setError(data?.error || "Could not send OTP");
        return;
      }
      setLockedPhone(normalized);
      setStep("otp");
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || "Failed to send OTP";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    setError("");
    if (otp.replace(/\D/g, "").length !== 6) {
      setError("Enter the 6-digit OTP");
      return;
    }
    setLoading(true);
    try {
      const { data } = await API.post("/api/driver/verify-otp", {
        phone: lockedPhone,
        otp: otp.replace(/\D/g, ""),
      });
      if (!data?.success || !data.token) {
        setError(data?.error || "Verification failed");
        return;
      }
      await setDriverToken(data.token);
      router.replace("/driver");
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || "Invalid OTP";
      setError(msg);
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
          <Text style={styles.title}>Delivery staff login</Text>
          <Text style={styles.sub}>
            Use the phone number your admin registered. OTP is sent via SMS
            (2factor.in).
          </Text>

          {step === "phone" ? (
            <>
              <TextInput
                placeholder="Mobile number"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                style={styles.input}
              />
              <Pressable
                style={[styles.cta, loading && { opacity: 0.6 }]}
                onPress={() => void sendOtp()}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.ctaText}>Send OTP</Text>
                )}
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.sentTo}>Code sent to {lockedPhone}</Text>
              <TextInput
                placeholder="6-digit OTP"
                keyboardType="number-pad"
                maxLength={6}
                value={otp}
                onChangeText={(t) => setOtp(t.replace(/\D/g, ""))}
                style={styles.input}
              />
              <Pressable
                style={[styles.cta, loading && { opacity: 0.6 }]}
                onPress={() => void verifyOtp()}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.ctaText}>Verify & continue</Text>
                )}
              </Pressable>
              <Pressable onPress={() => setStep("phone")} style={styles.link}>
                <Text style={styles.linkText}>Change number</Text>
              </Pressable>
            </>
          )}

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
  container: { flex: 1, padding: 24, paddingTop: 40 },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1B5E20",
    marginBottom: 8,
  },
  sub: { fontSize: 14, color: "#4E7C50", marginBottom: 24, lineHeight: 20 },
  input: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    fontSize: 17,
    marginBottom: 16,
  },
  cta: {
    backgroundColor: "#2E7D32",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  ctaText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  sentTo: { fontSize: 13, color: "#374151", marginBottom: 12 },
  link: { marginTop: 16, alignSelf: "center" },
  linkText: { color: "#2E7D32", fontWeight: "600" },
  err: { color: "#B42318", marginTop: 12, textAlign: "center" },
  back: { marginTop: 32, alignSelf: "flex-start" },
  backText: { color: "#6B7280", fontSize: 15 },
});

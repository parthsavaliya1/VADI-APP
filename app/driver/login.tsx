import { AnimatedLoader } from "@/components/AnimatedLoader";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
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
import { clearDriverToken, setDriverToken } from "@/utils/driverSession";
import { C, themed } from "@/constants/theme";

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
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <AppHeader title="Delivery staff" showBack showCart={false} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.content}>
          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <Ionicons name="bicycle" size={26} color={C.primary} />
            </View>
            <Text style={styles.title}>
              {step === "phone" ? "Staff sign in" : "Enter the code"}
            </Text>
            <Text style={styles.sub}>
              {step === "phone"
                ? "Use the mobile number an admin added under Staff. We will text you a one-time code."
                : `We sent a 6-digit code to ${lockedPhone}.`}
            </Text>
          </View>

          <View style={styles.card}>
            {step === "phone" ? (
              <>
                <Text style={styles.label}>Mobile number</Text>
                <View style={styles.phoneRow}>
                  <Text style={styles.code}>+91</Text>
                  <TextInput
                    placeholder="10-digit number"
                    placeholderTextColor={C.tabInactive}
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={setPhone}
                    style={styles.phoneInput}
                    maxLength={14}
                  />
                </View>
                <Pressable
                  style={[styles.cta, loading && { opacity: 0.7 }]}
                  onPress={() => void sendOtp()}
                  disabled={loading}
                >
                  {loading ? (
                    <AnimatedLoader color="#fff" />
                  ) : (
                    <Text style={styles.ctaText}>Send OTP</Text>
                  )}
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.label}>One-time code</Text>
                <TextInput
                  placeholder="••••••"
                  placeholderTextColor={C.tabInactive}
                  keyboardType="number-pad"
                  maxLength={6}
                  value={otp}
                  onChangeText={(t) => setOtp(t.replace(/\D/g, ""))}
                  style={styles.otp}
                />
                <Pressable
                  style={[styles.cta, loading && { opacity: 0.7 }]}
                  onPress={() => void verifyOtp()}
                  disabled={loading}
                >
                  {loading ? (
                    <AnimatedLoader color="#fff" />
                  ) : (
                    <Text style={styles.ctaText}>Verify and continue</Text>
                  )}
                </Pressable>
                <Pressable onPress={() => setStep("phone")} style={styles.link}>
                  <Text style={styles.linkText}>Use a different number</Text>
                </Pressable>
              </>
            )}
            {error ? <Text style={styles.err}>{error}</Text> : null}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.page },
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
      fontSize: 12,
      fontWeight: "800",
      letterSpacing: 0.4,
      textTransform: "uppercase",
      color: C.muted,
    },
    phoneRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: C.page,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: C.line,
      paddingHorizontal: 14,
    },
    code: { fontSize: 16, fontWeight: "800", color: C.ink, marginRight: 8 },
    phoneInput: { flex: 1, fontSize: 16, color: C.ink, paddingVertical: 14 },
    otp: {
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
      marginTop: 14,
      height: 52,
      borderRadius: 14,
      backgroundColor: C.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    ctaText: { color: "#fff", fontSize: 16, fontWeight: "800" },
    link: { marginTop: 14, alignSelf: "center" },
    linkText: { color: C.primary, fontWeight: "700" },
    err: { color: "#C62828", marginTop: 12, textAlign: "center", fontWeight: "600" },
  }),
);

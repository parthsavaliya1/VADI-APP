import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";

export default function VerifyOtpScreen() {
  const params = useLocalSearchParams<any>();
  const { verifyOtp, signup, loginWithOtp } = useAuth(); // ✅ UPDATED
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerifyOtp = async () => {
    if (otp.length !== 6 || loading) return;

    try {
      setLoading(true);

      // 🔐 FIREBASE OTP VERIFY
      await verifyOtp(otp);

      // 🧠 AFTER OTP SUCCESS
      if (params.mode === "signup") {
        await signup({
          name: params.name,
          phone: params.phone,
          password: params.password,
          dob: params.dob,
          role: params.role,
        });
      } else {
        await loginWithOtp(params.phone);
      }

      router.replace("/(tabs)");
    } catch (err) {
      console.log("❌ OTP verification failed", err);
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
          <Text style={styles.title}>Verify OTP</Text>
          <Text style={styles.subtitle}>OTP sent to {params.phone}</Text>

          <TextInput
            placeholder="Enter 6-digit OTP"
            keyboardType="number-pad"
            value={otp}
            onChangeText={setOtp}
            maxLength={6}
            style={styles.input}
          />

          <TouchableOpacity
            style={[
              styles.cta,
              (otp.length !== 6 || loading) && { opacity: 0.5 },
            ]}
            onPress={handleVerifyOtp}
          >
            <Text style={styles.ctaText}>
              {loading ? "Verifying..." : "Verify & Continue"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.link}>Change number</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* 🎨 STYLES — UNCHANGED */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F7F2" },
  container: { padding: 20, paddingTop: 60 },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1B5E20",
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    color: "#4E7C50",
    marginTop: 8,
    marginBottom: 30,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    fontSize: 18,
    letterSpacing: 8,
    textAlign: "center",
    marginBottom: 20,
  },
  cta: {
    backgroundColor: "#2E7D32",
    paddingVertical: 16,
    borderRadius: 16,
  },
  ctaText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "800",
    fontSize: 16,
  },
  link: {
    textAlign: "center",
    marginTop: 18,
    color: "#2E7D32",
  },
});

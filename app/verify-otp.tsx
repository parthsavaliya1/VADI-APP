import { API } from "@/utils/api";
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
import { useAuth } from "../context/AuthContext";

export default function VerifyOtpScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { login } = useAuth();

  const [otp, setOtp] = useState("");

  const verifyOtp = async () => {
    if (otp.length !== 6) return;

    // ⚠️ TEMP DEMO OTP
    await API.post("/api/auth/verify-otp", { phone, otp });

    // 🔐 Fake login using OTP
    await login(phone!, "otp-login");
    router.replace("/(tabs)");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.container}>
          <Text style={styles.title}>Verify OTP</Text>
          <Text style={styles.subtitle}>OTP sent to {phone}</Text>

          <TextInput
            placeholder="Enter 6-digit OTP"
            keyboardType="number-pad"
            value={otp}
            onChangeText={setOtp}
            maxLength={6}
            style={styles.input}
          />

          <TouchableOpacity
            style={[styles.cta, otp.length !== 6 && { opacity: 0.5 }]}
            onPress={verifyOtp}
          >
            <Text style={styles.ctaText}>Verify & Continue</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.link}>Change number</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

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
    elevation: 3,
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

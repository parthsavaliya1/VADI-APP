import { router } from "expo-router";
import { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext"; // ✅ ADD THIS

export default function LoginOtpScreen() {
  const { sendOtp } = useAuth(); // ✅ ADD THIS
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false); // ✅ ADD THIS

  const normalizedPhone = phone.startsWith("+91") ? phone : `+91${phone}`;
  const isValid = phone.length >= 10;

  const handleSendOtp = async () => {
    if (!isValid || loading) return;

    try {
      setLoading(true);

      // 🔐 FIREBASE OTP SEND
      await sendOtp(normalizedPhone);

      // ➡️ GO TO VERIFY OTP
      router.push({
        pathname: "/(auth)/verify-otp",
        params: {
          phone: normalizedPhone,
          mode: "login",
        },
      });
    } catch (err) {
      console.log("❌ OTP send failed", err);
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
          <View style={styles.logoWrap}>
            <Image
              source={require("../../assets/images/VADI.png")}
              style={styles.logo}
            />
          </View>

          <Text style={styles.title}>Login with OTP</Text>
          <Text style={styles.subtitle}>
            Enter your mobile number to continue
          </Text>

          <TextInput
            placeholder="Mobile number"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            style={styles.input}
          />

          <TouchableOpacity
            style={[styles.cta, (!isValid || loading) && { opacity: 0.5 }]}
            onPress={handleSendOtp}
          >
            <Text style={styles.ctaText}>
              {loading ? "Sending..." : "Send OTP"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
            <Text style={styles.link}>Login with password instead</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* 🎨 STYLES — UNCHANGED */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F7F2" },
  container: { padding: 20, paddingTop: 40 },
  logoWrap: { alignItems: "center", marginBottom: 20 },
  logo: { width: 90, height: 90, resizeMode: "contain" },
  title: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    color: "#1B5E20",
  },
  subtitle: {
    textAlign: "center",
    color: "#4E7C50",
    marginTop: 6,
    marginBottom: 24,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    fontSize: 15,
    marginBottom: 16,
    elevation: 2,
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
    marginTop: 18,
    textAlign: "center",
    color: "#2E7D32",
  },
});

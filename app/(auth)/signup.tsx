import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext"; // ✅ ADD

export default function SignupScreen() {
  const { sendOtp } = useAuth(); // ✅ ADD
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [dob, setDob] = useState("");
  const [role, setRole] = useState<"user" | "admin">("user");
  const [loading, setLoading] = useState(false);

  const normalizedPhone = phone.startsWith("+91") ? phone : `+91${phone}`;
  const isAdminNumber = normalizedPhone === "+919909049699";

  const isFormValid = useMemo(() => {
    return (
      name.length >= 2 &&
      phone.length >= 10 &&
      password.length >= 6 &&
      dob.length >= 8
    );
  }, [name, phone, password, dob]);

  const passwordStrength =
    password.length === 0
      ? ""
      : password.length < 6
        ? "Weak"
        : password.length < 9
          ? "Good"
          : "Strong";

  const handleSignup = async () => {
    if (!isFormValid || loading) return;

    try {
      setLoading(true);

      // 🔐 FIREBASE OTP SEND
      await sendOtp(normalizedPhone);

      router.push({
        pathname: "/(auth)/verify-otp",
        params: {
          mode: "signup",
          phone: normalizedPhone,
          name,
          password,
          dob,
          role: isAdminNumber ? role : "user",
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
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
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

            <Text style={styles.title}>Create your account</Text>
            <Text style={styles.subtitle}>
              Fresh groceries delivered in minutes 🚀
            </Text>

            <View style={styles.inputBox}>
              <TextInput
                placeholder="Full name"
                value={name}
                onChangeText={setName}
                style={[styles.input, name && styles.inputActive]}
              />

              <TextInput
                placeholder="Mobile number"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                style={[styles.input, phone && styles.inputActive]}
              />

              <TextInput
                placeholder="Password (min 6 chars)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={[styles.input, password && styles.inputActive]}
              />

              {passwordStrength !== "" && (
                <Text style={styles.hint}>
                  Password strength: {passwordStrength}
                </Text>
              )}

              <TextInput
                placeholder="Date of Birth (YYYY-MM-DD)"
                value={dob}
                onChangeText={setDob}
                style={[styles.input, dob && styles.inputActive]}
              />
            </View>

            {isAdminNumber && (
              <TouchableOpacity
                style={styles.roleBtn}
                onPress={() => setRole(role === "user" ? "admin" : "user")}
              >
                <Text style={styles.roleText}>
                  Admin access enabled • Role: {role.toUpperCase()}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.cta,
                (!isFormValid || loading) && { opacity: 0.5 },
              ]}
              onPress={handleSignup}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.ctaText}>Continue</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
              <Text style={styles.loginText}>
                Already have an account?{" "}
                <Text style={{ fontWeight: "800" }}>Login</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

/* 🎨 STYLES — UNCHANGED */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F7F2" },
  container: { paddingHorizontal: 20, paddingTop: 30 },
  logoWrap: { alignItems: "center", marginBottom: 20 },
  logo: { width: 90, height: 90 },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1B5E20",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#4E7C50",
    textAlign: "center",
    marginBottom: 24,
  },
  inputBox: { marginBottom: 6 },
  input: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#eee",
  },
  inputActive: { borderColor: "#2E7D32" },
  hint: { fontSize: 12, marginBottom: 8 },
  roleBtn: {
    backgroundColor: "#E8F5E9",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  roleText: { textAlign: "center", fontWeight: "700" },
  cta: {
    backgroundColor: "#2E7D32",
    paddingVertical: 16,
    borderRadius: 16,
  },
  ctaText: { color: "#fff", textAlign: "center", fontWeight: "800" },
  loginText: { textAlign: "center", marginTop: 18, color: "#2E7D32" },
});

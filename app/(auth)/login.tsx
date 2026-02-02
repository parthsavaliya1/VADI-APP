import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import { useAuth } from "../../context/AuthContext";

export default function LoginScreen() {
  const { login } = useAuth();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // 📱 Normalize phone number
  const normalizedPhone = phone.startsWith("+91") ? phone : `+91${phone}`;

  // ✅ Simple validation
  const isFormValid = useMemo(() => {
    return phone.length >= 10 && password.length >= 6;
  }, [phone, password]);

  const handleLogin = async () => {
    if (!isFormValid || loading) return;

    try {
      setLoading(true);
      await login(normalizedPhone, password);
      router.replace("/(tabs)");
    } catch (err) {
      console.log("Login error", err);
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
          {/* 🟢 LOGO */}
          <View style={styles.logoWrap}>
            <Image
              source={require("../../assets/images/VADI.png")}
              style={styles.logo}
            />
          </View>

          {/* 📝 TITLE */}
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Login to continue shopping 🛒</Text>

          {/* 🔤 INPUTS */}
          <View style={styles.inputBox}>
            <TextInput
              placeholder="Mobile number"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              style={[styles.input, phone.length > 0 && styles.inputActive]}
            />

            <TextInput
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={[styles.input, password.length > 0 && styles.inputActive]}
            />
          </View>

          {/* ✅ CTA BUTTON */}
          <TouchableOpacity
            style={[styles.cta, !isFormValid && { opacity: 0.5 }]}
            onPress={handleLogin}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.ctaText}>Login</Text>
            )}
          </TouchableOpacity>

          {/* 🔁 SIGNUP LINK */}
          <TouchableOpacity onPress={() => router.push("/(auth)/signup")}>
            <Text style={styles.signupText}>
              New here?{" "}
              <Text style={{ fontWeight: "800" }}>Create account</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F6F7F2",
  },

  container: {
    paddingHorizontal: 20,
    paddingTop: 30,
  },

  /* LOGO */
  logoWrap: {
    alignItems: "center",
    marginBottom: 20,
  },

  logo: {
    width: 90,
    height: 90,
    resizeMode: "contain",
  },

  /* TEXT */
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
    marginTop: 6,
    marginBottom: 24,
  },

  /* INPUTS */
  inputBox: {
    marginBottom: 10,
  },

  input: {
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    marginBottom: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#eee",
  },

  inputActive: {
    borderColor: "#2E7D32",
  },

  /* CTA */
  cta: {
    backgroundColor: "#2E7D32",
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 8,
    elevation: 4,
  },

  ctaText: {
    color: "#fff",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "800",
  },

  /* SIGNUP */
  signupText: {
    textAlign: "center",
    marginTop: 18,
    color: "#2E7D32",
    fontSize: 14,
  },
});

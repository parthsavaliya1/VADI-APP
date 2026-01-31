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
import { useAuth } from "../context/AuthContext";

export default function SignupScreen() {
  const { signup } = useAuth();

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

      await signup({
        name,
        phone: normalizedPhone,
        password,
        dob,
        role: isAdminNumber ? role : "user",
      });

      router.replace("/(tabs)");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <View style={styles.container}>
            {/* LOGO */}
            <View style={styles.logoWrap}>
              <Image
                source={require("../assets/images/VADI.png")}
                style={styles.logo}
              />
            </View>

            {/* TITLE */}
            <Text style={styles.title}>Create your account</Text>
            <Text style={styles.subtitle}>
              Fresh groceries delivered in minutes 🚀
            </Text>

            {/* INPUTS */}
            <View style={styles.inputBox}>
              <TextInput
                placeholder="Full name"
                value={name}
                onChangeText={setName}
                style={[styles.input, name.length > 0 && styles.inputActive]}
              />

              <TextInput
                placeholder="Mobile number"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                style={[styles.input, phone.length > 0 && styles.inputActive]}
              />

              <TextInput
                placeholder="Password (min 6 chars)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={[
                  styles.input,
                  password.length > 0 && styles.inputActive,
                ]}
              />

              {passwordStrength !== "" && (
                <Text
                  style={[
                    styles.hint,
                    passwordStrength === "Weak" && { color: "#D32F2F" },
                    passwordStrength === "Good" && { color: "#F9A825" },
                    passwordStrength === "Strong" && { color: "#2E7D32" },
                  ]}
                >
                  Password strength: {passwordStrength}
                </Text>
              )}

              <TextInput
                placeholder="Date of Birth (YYYY-MM-DD)"
                value={dob}
                onChangeText={setDob}
                style={[styles.input, dob.length > 0 && styles.inputActive]}
              />
            </View>

            {/* ADMIN ROLE */}
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

            {/* CTA */}
            <TouchableOpacity
              style={[styles.cta, !isFormValid && { opacity: 0.5 }]}
              onPress={handleSignup}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.ctaText}>Continue</Text>
              )}
            </TouchableOpacity>

            {/* LOGIN */}
            <TouchableOpacity onPress={() => router.push("/login")}>
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

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F6F7F2",
  },

  container: {
    paddingHorizontal: 20,
    paddingTop: 30,
  },

  logoWrap: {
    alignItems: "center",
    marginBottom: 20,
  },

  logo: {
    width: 90,
    height: 90,
    resizeMode: "contain",
  },

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

  inputBox: {
    marginBottom: 6,
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

  hint: {
    fontSize: 12,
    marginBottom: 8,
    marginLeft: 4,
  },

  roleBtn: {
    backgroundColor: "#E8F5E9",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },

  roleText: {
    textAlign: "center",
    color: "#1B5E20",
    fontWeight: "700",
    fontSize: 13,
  },

  cta: {
    backgroundColor: "#2E7D32",
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 10,
    elevation: 4,
  },

  ctaText: {
    color: "#fff",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "800",
  },

  loginText: {
    textAlign: "center",
    marginTop: 18,
    color: "#2E7D32",
    fontSize: 14,
  },
});

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
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
import { useAuth } from "../../context/AuthContext";

const { width } = Dimensions.get("window");

export default function EnhancedSignupScreen() {
  const { sendOtp } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [dob, setDob] = useState("");
  const [role, setRole] = useState<"user" | "admin">("user");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const logoScaleAnim = useRef(new Animated.Value(0)).current;
  const logoRotateAnim = useRef(new Animated.Value(0)).current;
  const inputScaleAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

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

  const getPasswordColor = () => {
    if (passwordStrength === "Weak") return "#FF5252";
    if (passwordStrength === "Good") return "#FFA726";
    return "#4CAF50";
  };

  // Entrance animations
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.spring(logoScaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Stagger input animations
    inputScaleAnims.forEach((anim, index) => {
      Animated.spring(anim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        delay: 400 + index * 100,
        useNativeDriver: true,
      }).start();
    });

    // Logo rotation animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoRotateAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(logoRotateAnim, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  const handleSignup = async () => {
    if (!isFormValid || loading) return;

    try {
      setLoading(true);
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

  const logoRotate = logoRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["-5deg", "5deg"],
  });

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient
        colors={["#F5F7F2", "#E8F5E9", "#F5F7F2"]}
        style={styles.gradient}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ flex: 1 }}
          >
            <Animated.ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              style={{ opacity: fadeAnim }}
            >
              {/* Logo Section */}
              <Animated.View
                style={[
                  styles.logoContainer,
                  {
                    transform: [
                      { scale: logoScaleAnim },
                      { rotate: logoRotate },
                    ],
                  },
                ]}
              >
                <LinearGradient
                  colors={["#4CAF50", "#2E7D32"]}
                  style={styles.logoCircle}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Image
                    source={require("../../assets/images/VADI.png")}
                    style={styles.logo}
                  />
                </LinearGradient>
              </Animated.View>

              {/* Title Section */}
              <Animated.View
                style={[
                  styles.titleContainer,
                  { transform: [{ translateY: slideAnim }] },
                ]}
              >
                <Text style={styles.title}>Create Account</Text>
                <View style={styles.subtitleRow}>
                  <Ionicons name="leaf" size={16} color="#4CAF50" />
                  <Text style={styles.subtitle}>
                    Fresh groceries delivered in minutes
                  </Text>
                  <Text style={styles.emoji}>🚀</Text>
                </View>
              </Animated.View>

              {/* Form Section */}
              <View style={styles.formContainer}>
                {/* Name Input */}
                <Animated.View
                  style={[
                    styles.inputWrapper,
                    { transform: [{ scale: inputScaleAnims[0] }] },
                  ]}
                >
                  <View
                    style={[styles.inputContainer, name && styles.inputActive]}
                  >
                    <Ionicons name="person-outline" size={20} color="#4CAF50" />
                    <TextInput
                      placeholder="Full name"
                      value={name}
                      onChangeText={setName}
                      style={styles.input}
                      placeholderTextColor="#999"
                    />
                    {name.length >= 2 && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color="#4CAF50"
                      />
                    )}
                  </View>
                </Animated.View>

                {/* Phone Input */}
                <Animated.View
                  style={[
                    styles.inputWrapper,
                    { transform: [{ scale: inputScaleAnims[1] }] },
                  ]}
                >
                  <View
                    style={[styles.inputContainer, phone && styles.inputActive]}
                  >
                    <Ionicons name="call-outline" size={20} color="#4CAF50" />
                    <TextInput
                      placeholder="Mobile number"
                      value={phone}
                      onChangeText={setPhone}
                      keyboardType="phone-pad"
                      style={styles.input}
                      placeholderTextColor="#999"
                      maxLength={10}
                    />
                    {phone.length >= 10 && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color="#4CAF50"
                      />
                    )}
                  </View>
                </Animated.View>

                {/* Password Input */}
                <Animated.View
                  style={[
                    styles.inputWrapper,
                    { transform: [{ scale: inputScaleAnims[2] }] },
                  ]}
                >
                  <View
                    style={[
                      styles.inputContainer,
                      password && styles.inputActive,
                    ]}
                  >
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color="#4CAF50"
                    />
                    <TextInput
                      placeholder="Password (min 6 chars)"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      style={styles.input}
                      placeholderTextColor="#999"
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons
                        name={showPassword ? "eye-outline" : "eye-off-outline"}
                        size={20}
                        color="#4CAF50"
                      />
                    </TouchableOpacity>
                  </View>

                  {passwordStrength !== "" && (
                    <View style={styles.strengthContainer}>
                      <View style={styles.strengthBar}>
                        <View
                          style={[
                            styles.strengthFill,
                            {
                              width:
                                passwordStrength === "Weak"
                                  ? "33%"
                                  : passwordStrength === "Good"
                                    ? "66%"
                                    : "100%",
                              backgroundColor: getPasswordColor(),
                            },
                          ]}
                        />
                      </View>
                      <Text
                        style={[
                          styles.strengthText,
                          { color: getPasswordColor() },
                        ]}
                      >
                        {passwordStrength}
                      </Text>
                    </View>
                  )}
                </Animated.View>

                {/* DOB Input */}
                <Animated.View
                  style={[
                    styles.inputWrapper,
                    { transform: [{ scale: inputScaleAnims[3] }] },
                  ]}
                >
                  <View
                    style={[styles.inputContainer, dob && styles.inputActive]}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={20}
                      color="#4CAF50"
                    />
                    <TextInput
                      placeholder="Date of Birth (YYYY-MM-DD)"
                      value={dob}
                      onChangeText={setDob}
                      style={styles.input}
                      placeholderTextColor="#999"
                      maxLength={10}
                    />
                    {dob.length >= 8 && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color="#4CAF50"
                      />
                    )}
                  </View>
                </Animated.View>

                {/* Admin Role Toggle */}
                {isAdminNumber && (
                  <TouchableOpacity
                    style={styles.adminToggle}
                    onPress={() => setRole(role === "user" ? "admin" : "user")}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={
                        role === "admin"
                          ? ["#FF6B6B", "#FF8E53"]
                          : ["#E8F5E9", "#C8E6C9"]
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.adminGradient}
                    >
                      <Ionicons
                        name="shield-checkmark"
                        size={20}
                        color={role === "admin" ? "#fff" : "#2E7D32"}
                      />
                      <Text
                        style={[
                          styles.adminText,
                          { color: role === "admin" ? "#fff" : "#2E7D32" },
                        ]}
                      >
                        Admin Mode: {role.toUpperCase()}
                      </Text>
                      <View
                        style={[
                          styles.toggleSwitch,
                          {
                            backgroundColor:
                              role === "admin" ? "#fff" : "#2E7D32",
                          },
                        ]}
                      >
                        <Ionicons
                          name={role === "admin" ? "checkmark" : "close"}
                          size={14}
                          color={role === "admin" ? "#FF6B6B" : "#fff"}
                        />
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                )}

                {/* Continue Button */}
                <TouchableOpacity
                  style={[
                    styles.ctaButton,
                    (!isFormValid || loading) && styles.ctaDisabled,
                  ]}
                  onPress={handleSignup}
                  activeOpacity={0.8}
                  disabled={!isFormValid || loading}
                >
                  <LinearGradient
                    colors={
                      isFormValid
                        ? ["#4CAF50", "#2E7D32"]
                        : ["#BDBDBD", "#9E9E9E"]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.ctaGradient}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Text style={styles.ctaText}>Continue</Text>
                        <Ionicons name="arrow-forward" size={20} color="#fff" />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {/* Login Link */}
                <TouchableOpacity
                  style={styles.loginLink}
                  onPress={() => router.push("/(auth)/login")}
                  activeOpacity={0.7}
                >
                  <Text style={styles.loginText}>
                    Already have an account?{" "}
                    <Text style={styles.loginBold}>Login</Text>
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Decorative Elements */}
              <View style={styles.decorativeContainer}>
                <View style={styles.decorativeCircle1} />
                <View style={styles.decorativeCircle2} />
              </View>
            </Animated.ScrollView>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F5F7F2",
  },

  gradient: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },

  // LOGO
  logoContainer: {
    alignItems: "center",
    marginBottom: 32,
  },

  logoCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#2E7D32",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 10,
      },
    }),
  },

  logo: {
    width: 70,
    height: 70,
    resizeMode: "contain",
  },

  // TITLE
  titleContainer: {
    alignItems: "center",
    marginBottom: 32,
  },

  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#1B5E20",
    marginBottom: 8,
  },

  subtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  subtitle: {
    fontSize: 15,
    color: "#4E7C50",
  },

  emoji: {
    fontSize: 16,
  },

  // FORM
  formContainer: {
    gap: 16,
  },

  inputWrapper: {
    width: "100%",
  },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderWidth: 2,
    borderColor: "transparent",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },

  inputActive: {
    borderColor: "#4CAF50",
    backgroundColor: "#F1F8F4",
  },

  input: {
    flex: 1,
    fontSize: 15,
    color: "#333",
  },

  // PASSWORD STRENGTH
  strengthContainer: {
    marginTop: 8,
    gap: 6,
  },

  strengthBar: {
    height: 4,
    backgroundColor: "#E0E0E0",
    borderRadius: 2,
    overflow: "hidden",
  },

  strengthFill: {
    height: "100%",
    borderRadius: 2,
  },

  strengthText: {
    fontSize: 12,
    fontWeight: "600",
    alignSelf: "flex-end",
  },

  // ADMIN TOGGLE
  adminToggle: {
    marginTop: 8,
  },

  adminGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 16,
    gap: 10,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },

  adminText: {
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
  },

  toggleSwitch: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  // CTA BUTTON
  ctaButton: {
    marginTop: 8,
  },

  ctaGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#2E7D32",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
    }),
  },

  ctaDisabled: {
    opacity: 0.6,
  },

  ctaText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
  },

  // LOGIN LINK
  loginLink: {
    alignItems: "center",
    marginTop: 8,
    paddingVertical: 8,
  },

  loginText: {
    fontSize: 14,
    color: "#666",
  },

  loginBold: {
    fontWeight: "800",
    color: "#2E7D32",
  },

  // DECORATIVE
  decorativeContainer: {
    position: "absolute",
    width: "100%",
    height: "100%",
    zIndex: -1,
  },

  decorativeCircle1: {
    position: "absolute",
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(76, 175, 80, 0.05)",
  },

  decorativeCircle2: {
    position: "absolute",
    bottom: -80,
    left: -80,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: "rgba(46, 125, 50, 0.03)",
  },
});

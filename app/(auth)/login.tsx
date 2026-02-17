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

export default function EnhancedLoginScreen() {
  const { sendOtp } = useAuth();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
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
  ]).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const normalizedPhone = phone.startsWith("+91") ? phone : `+91${phone}`;

  const isFormValid = useMemo(() => {
    return phone.length >= 10 && password.length >= 6;
  }, [phone, password]);

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
        delay: 400 + index * 150,
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

    // Pulse animation for CTA when form is valid
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.03,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  const handleLogin = async () => {
    if (!isFormValid || loading) return;

    try {
      setLoading(true);
      await sendOtp(normalizedPhone);

      router.push({
        pathname: "/(auth)/verify-otp",
        params: { phone: normalizedPhone },
      });
    } catch (err) {
      console.log("Login error", err);
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
            <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
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

                {/* Decorative rings */}
                <View style={styles.logoRing1} />
                <View style={styles.logoRing2} />
              </Animated.View>

              {/* Title Section */}
              <Animated.View
                style={[
                  styles.titleContainer,
                  { transform: [{ translateY: slideAnim }] },
                ]}
              >
                <Text style={styles.title}>Welcome Back!</Text>
                <View style={styles.subtitleRow}>
                  <Ionicons name="cart" size={16} color="#4CAF50" />
                  <Text style={styles.subtitle}>
                    Login to continue shopping
                  </Text>
                  <Text style={styles.emoji}>🛒</Text>
                </View>
              </Animated.View>

              {/* Form Section */}
              <View style={styles.formContainer}>
                {/* Phone Input */}
                <Animated.View
                  style={[
                    styles.inputWrapper,
                    { transform: [{ scale: inputScaleAnims[0] }] },
                  ]}
                >
                  <View
                    style={[styles.inputContainer, phone && styles.inputActive]}
                  >
                    <View style={styles.iconCircle}>
                      <Ionicons name="call" size={18} color="#4CAF50" />
                    </View>
                    <View style={styles.inputContent}>
                      <Text style={styles.inputLabel}>Mobile Number</Text>
                      <TextInput
                        placeholder="Enter your phone number"
                        value={phone}
                        onChangeText={setPhone}
                        keyboardType="phone-pad"
                        style={styles.input}
                        placeholderTextColor="#999"
                        maxLength={10}
                      />
                    </View>
                    {phone.length >= 10 && (
                      <View style={styles.checkCircle}>
                        <Ionicons name="checkmark" size={16} color="#fff" />
                      </View>
                    )}
                  </View>
                </Animated.View>

                {/* Password Input */}
                <Animated.View
                  style={[
                    styles.inputWrapper,
                    { transform: [{ scale: inputScaleAnims[1] }] },
                  ]}
                >
                  <View
                    style={[
                      styles.inputContainer,
                      password && styles.inputActive,
                    ]}
                  >
                    <View style={styles.iconCircle}>
                      <Ionicons name="lock-closed" size={18} color="#4CAF50" />
                    </View>
                    <View style={styles.inputContent}>
                      <Text style={styles.inputLabel}>Password</Text>
                      <TextInput
                        placeholder="Enter your password"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                        style={styles.input}
                        placeholderTextColor="#999"
                      />
                    </View>
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      style={styles.eyeButton}
                    >
                      <Ionicons
                        name={showPassword ? "eye" : "eye-off"}
                        size={20}
                        color="#4CAF50"
                      />
                    </TouchableOpacity>
                  </View>
                </Animated.View>

                {/* Forgot Password */}
                <TouchableOpacity
                  style={styles.forgotPassword}
                  activeOpacity={0.7}
                >
                  <Text style={styles.forgotText}>Forgot Password?</Text>
                </TouchableOpacity>

                {/* Login Button */}
                <Animated.View
                  style={[
                    styles.ctaWrapper,
                    {
                      transform: [{ scale: isFormValid ? pulseAnim : 1 }],
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={[
                      styles.ctaButton,
                      (!isFormValid || loading) && styles.ctaDisabled,
                    ]}
                    onPress={handleLogin}
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
                          <Ionicons name="log-in" size={22} color="#fff" />
                          <Text style={styles.ctaText}>Login</Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>

                {/* Divider */}
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>OR</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Social Login Buttons */}
                {/* <View style={styles.socialContainer}>
                  <TouchableOpacity
                    style={styles.socialButton}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={["#fff", "#f8f9fa"]}
                      style={styles.socialGradient}
                    >
                      <Ionicons name="logo-google" size={22} color="#DB4437" />
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.socialButton}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={["#fff", "#f8f9fa"]}
                      style={styles.socialGradient}
                    >
                      <Ionicons name="logo-apple" size={22} color="#000" />
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.socialButton}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={["#fff", "#f8f9fa"]}
                      style={styles.socialGradient}
                    >
                      <Ionicons
                        name="logo-facebook"
                        size={22}
                        color="#4267B2"
                      />
                    </LinearGradient>
                  </TouchableOpacity>
                </View> */}

                {/* Signup Link */}
                <TouchableOpacity
                  style={styles.signupLink}
                  onPress={() => router.push("/(auth)/signup")}
                  activeOpacity={0.7}
                >
                  <Text style={styles.signupText}>
                    New here?{" "}
                    <Text style={styles.signupBold}>Create account</Text>
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Decorative Elements */}
              <View style={styles.decorativeContainer}>
                <View style={styles.decorativeCircle1} />
                <View style={styles.decorativeCircle2} />
                <View style={styles.decorativeCircle3} />
              </View>
            </Animated.View>
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

  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 24,
  },

  // LOGO
  logoContainer: {
    alignItems: "center",
    marginBottom: 40,
    position: "relative",
  },

  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#2E7D32",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
      },
      android: {
        elevation: 12,
      },
    }),
  },

  logo: {
    width: 75,
    height: 75,
    resizeMode: "contain",
  },

  logoRing1: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 2,
    borderColor: "rgba(76, 175, 80, 0.2)",
    borderStyle: "dashed",
  },

  logoRing2: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1,
    borderColor: "rgba(76, 175, 80, 0.1)",
  },

  // TITLE
  titleContainer: {
    alignItems: "center",
    marginBottom: 36,
  },

  title: {
    fontSize: 34,
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
    gap: 20,
  },

  inputWrapper: {
    width: "100%",
  },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    borderWidth: 2,
    borderColor: "transparent",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
    }),
  },

  inputActive: {
    borderColor: "#4CAF50",
    backgroundColor: "#F1F8F4",
  },

  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
  },

  inputContent: {
    flex: 1,
    gap: 2,
  },

  inputLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  input: {
    fontSize: 15,
    color: "#333",
    paddingVertical: 0,
  },

  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
  },

  eyeButton: {
    padding: 4,
  },

  // FORGOT PASSWORD
  forgotPassword: {
    alignSelf: "flex-end",
    marginTop: -8,
  },

  forgotText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2E7D32",
  },

  // CTA BUTTON
  ctaWrapper: {
    marginTop: 8,
  },

  ctaButton: {
    borderRadius: 18,
  },

  ctaGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    borderRadius: 18,
    gap: 10,
    ...Platform.select({
      ios: {
        shadowColor: "#2E7D32",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },

  ctaDisabled: {
    opacity: 0.6,
  },

  ctaText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },

  // DIVIDER
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginVertical: 8,
  },

  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E0E0E0",
  },

  dividerText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#999",
  },

  // SOCIAL BUTTONS
  socialContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
  },

  socialButton: {
    width: 60,
    height: 60,
  },

  socialGradient: {
    width: "100%",
    height: "100%",
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },

  // SIGNUP LINK
  signupLink: {
    alignItems: "center",
    marginTop: 8,
    paddingVertical: 8,
  },

  signupText: {
    fontSize: 14,
    color: "#666",
  },

  signupBold: {
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
    top: -60,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(76, 175, 80, 0.05)",
  },

  decorativeCircle2: {
    position: "absolute",
    bottom: -100,
    left: -100,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(46, 125, 50, 0.03)",
  },

  decorativeCircle3: {
    position: "absolute",
    top: "40%",
    right: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(139, 195, 74, 0.04)",
  },
});

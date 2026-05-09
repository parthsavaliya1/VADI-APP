import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { AuthScreenBackground } from "../../components/auth/AuthScreenBackground";
import {
  AUTH_FARM_SECTION_HEIGHT,
  BG_GRADIENT_MID,
  BG_SURFACE,
} from "../../constants/authScreenTheme";
import { useAuth } from "../../context/AuthContext";

export default function EnhancedSignupScreen() {
  const { sendOtp } = useAuth();
  const insets = useSafeAreaInsets();
  const farmBandHeight = AUTH_FARM_SECTION_HEIGHT + insets.bottom;
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasAcceptedPrivacy, setHasAcceptedPrivacy] = useState(false);
  const [privacyTouched, setPrivacyTouched] = useState(false);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const logoScaleAnim = useRef(new Animated.Value(0.8)).current;

  const normalizedPhone = phone.startsWith("+91") ? phone : `+91${phone}`;

  const isFormValid = useMemo(() => {
    return name.length >= 2 && phone.length >= 10 && hasAcceptedPrivacy;
  }, [name, phone, hasAcceptedPrivacy]);

  useEffect(() => {
    const loadPrivacy = async () => {
      try {
        const stored = await AsyncStorage.getItem("PRIVACY_ACCEPTED");
        if (stored === "true") setHasAcceptedPrivacy(true);
      } catch (e) {
        console.log("Privacy flag load failed", e);
      }
    };

    loadPrivacy();

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(logoScaleAnim, {
        toValue: 1,
        tension: 60,
        friction: 8,
        delay: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleSignup = async () => {
    setPrivacyTouched(true);
    if (!hasAcceptedPrivacy) return;
    if (!isFormValid || loading) return;

    try {
      setLoading(true);
      await sendOtp(normalizedPhone, "signup");

      router.push({
        pathname: "/(auth)/verify-otp",
        params: {
          mode: "signup",
          phone: normalizedPhone,
          name,
          role: "user",
          privacyAccepted: hasAcceptedPrivacy ? "true" : "false",
        },
      });
    } catch (err: any) {
      const message =
        err?.message || err?.response?.data?.error || "Something went wrong";
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <LinearGradient
        colors={[BG_SURFACE, BG_GRADIENT_MID, BG_SURFACE]}
        style={styles.gradient}
      >
        <AuthScreenBackground farmBandHeight={farmBandHeight} />

        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ flex: 1 }}
          >
            <Animated.View
              style={[
                styles.wrapper,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                  zIndex: 2,
                },
              ]}
            >
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[
                  styles.scrollContent,
                  { paddingBottom: farmBandHeight + 16 },
                ]}
                keyboardShouldPersistTaps="handled"
              >
                {/* ── LOGO SECTION ── */}
                <Animated.View
                  style={[
                    styles.logoSection,
                    { transform: [{ scale: logoScaleAnim }] },
                  ]}
                >
                  <Image
                    source={require("../../assets/images/vadi-brand-logo.png")}
                    style={styles.logoImage}
                  />

                </Animated.View>

                {/* ── WELCOME TEXT ── */}
                <View style={styles.welcomeSection}>
                  <Text style={styles.welcomeTitle}>Create Account</Text>
                  <Text style={styles.welcomeSubtitle}>
                    Fresh groceries delivered to your doorstep
                  </Text>
                </View>

                {/* ── FORM SECTION ── */}
                <View style={styles.formSection}>
                  {/* Name Input */}
                  <View style={styles.inputCard}>
                    <View style={styles.inputIconCircle}>
                      <Ionicons name="person" size={16} color="#4CAF50" />
                    </View>
                    <View style={styles.inputDivider} />
                    <TextInput
                      placeholder="Enter full name"
                      value={name}
                      onChangeText={setName}
                      style={styles.textInput}
                      placeholderTextColor="#AABBA8"
                      autoCapitalize="words"
                    />
                    {name.length >= 2 && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color="#4CAF50"
                        style={{ marginLeft: 4 }}
                      />
                    )}
                  </View>

                  {/* Phone Input */}
                  <View style={styles.inputCard}>
                    {/* Country code pill */}
                    <View style={styles.countryPill}>
                      <View style={styles.phoneIconCircle}>
                        <Ionicons name="call" size={16} color="#4CAF50" />
                      </View>
                      <Text style={styles.countryCode}>+91</Text>
                      <Ionicons name="chevron-down" size={14} color="#888" />
                    </View>
                    <View style={styles.inputDivider} />
                    <TextInput
                      placeholder="Enter mobile number"
                      value={phone}
                      onChangeText={setPhone}
                      keyboardType="phone-pad"
                      style={styles.textInput}
                      placeholderTextColor="#AABBA8"
                      maxLength={10}
                    />
                    {phone.length >= 10 && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color="#4CAF50"
                        style={{ marginLeft: 4 }}
                      />
                    )}
                  </View>

                  {/* Privacy Policy Checkbox */}
                  <View style={styles.privacyContainer}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={styles.privacyRow}
                      onPress={async () => {
                        const next = !hasAcceptedPrivacy;
                        setHasAcceptedPrivacy(next);
                        setPrivacyTouched(true);
                        try {
                          await AsyncStorage.setItem(
                            "PRIVACY_ACCEPTED",
                            next ? "true" : "false"
                          );
                        } catch (e) {
                          console.log("Privacy flag save failed", e);
                        }
                      }}
                    >
                      <View
                        style={[
                          styles.checkbox,
                          hasAcceptedPrivacy && styles.checkboxChecked,
                        ]}
                      >
                        {hasAcceptedPrivacy && (
                          <Ionicons name="checkmark" size={13} color="#fff" />
                        )}
                      </View>
                      <Text style={styles.privacyText}>
                        By continuing you agree to our{" "}
                        <Text style={styles.privacyLink}>Privacy Policy</Text>
                      </Text>
                    </TouchableOpacity>

                    {!hasAcceptedPrivacy && privacyTouched && (
                      <Text style={styles.privacyError}>
                        Please accept the privacy policy to continue.
                      </Text>
                    )}
                  </View>

                  {/* Continue Button */}
                  <TouchableOpacity
                    onPress={handleSignup}
                    activeOpacity={0.85}
                    disabled={loading}
                    style={styles.continueButtonWrapper}
                  >
                    <LinearGradient
                      colors={
                        isFormValid
                          ? ["#5CB85C", "#3A8A3A"]
                          : ["#C8DFC8", "#B8D0B8"]
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.continueButton}
                    >
                      {loading ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <>
                          <Text style={styles.continueText}>Continue</Text>
                          <Ionicons
                            name="arrow-forward"
                            size={20}
                            color="#fff"
                          />
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                  {/* OR Divider */}
                  <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>OR</Text>
                    <View style={styles.dividerLine} />
                  </View>

                  <View style={styles.authFooterLinkWrap}>
                    <View style={styles.authFooterLinkRow}>
                      <Text style={styles.authFooterMuted}>
                        Already have an account?{" "}
                      </Text>
                      <Pressable
                        onPress={() => router.push("/(auth)/login")}
                        accessibilityRole="link"
                        accessibilityLabel="Log in to existing account"
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={({ pressed }) => [
                          pressed && styles.authFooterLinkPressed,
                        ]}
                      >
                        <Text style={styles.authFooterLink}>Login</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              </ScrollView>
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
    backgroundColor: BG_SURFACE,
  },

  gradient: {
    flex: 1,
  },

  // ── MAIN WRAPPER ──
  wrapper: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },

  // ── LOGO SECTION ──
  logoSection: {
    alignItems: "center",
    marginBottom: 24,
  },

  logoImage: {
    width: 120,
    height: 120,
    resizeMode: "contain",
    marginBottom: 8,
  },

  brandName: {
    fontSize: 32,
    fontWeight: "800",
    color: "#3A8A3A",
    letterSpacing: 6,
    marginBottom: 4,
  },

  brandTagline: {
    fontSize: 13,
    color: "#7A9E7A",
    letterSpacing: 0.3,
  },

  // ── WELCOME TEXT ──
  welcomeSection: {
    alignItems: "center",
    marginBottom: 24,
  },

  welcomeTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#1E3A1E",
    marginBottom: 6,
  },

  welcomeSubtitle: {
    fontSize: 14,
    color: "#6B8C6B",
  },

  // ── FORM ──
  formSection: {
    gap: 14,
  },

  // Input cards
  inputCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#D8EDD8",
    paddingVertical: 4,
    paddingHorizontal: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#2E7D32",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
    }),
  },

  // Name input icon
  inputIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#EAF5EA",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 12,
  },

  // Country code pill (phone)
  countryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 12,
    paddingRight: 8,
  },

  phoneIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#EAF5EA",
    justifyContent: "center",
    alignItems: "center",
  },

  countryCode: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },

  inputDivider: {
    width: 1,
    height: 30,
    backgroundColor: "#D8EDD8",
    marginHorizontal: 8,
  },

  textInput: {
    flex: 1,
    fontSize: 15,
    color: "#222",
    paddingVertical: 12,
    letterSpacing: 0.3,
  },

  // Privacy
  privacyContainer: {
    paddingHorizontal: 2,
  },

  privacyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#A5D6A7",
    backgroundColor: "#F0FAF0",
    alignItems: "center",
    justifyContent: "center",
  },

  checkboxChecked: {
    borderColor: "#3A8A3A",
    backgroundColor: "#4CAF50",
  },

  privacyText: {
    flex: 1,
    fontSize: 13,
    color: "#5A7A5A",
    lineHeight: 18,
  },

  privacyLink: {
    color: "#3A8A3A",
    fontWeight: "700",
  },

  privacyError: {
    marginTop: 4,
    marginLeft: 30,
    fontSize: 11,
    color: "#C62828",
    fontWeight: "500",
  },

  // Continue button
  continueButtonWrapper: {
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 4,
    ...Platform.select({
      ios: {
        shadowColor: "#2E7D32",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.28,
        shadowRadius: 10,
      },
      android: { elevation: 6 },
    }),
  },

  continueButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 17,
    gap: 10,
    borderRadius: 14,
  },

  continueText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.3,
  },

  // Divider
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 2,
  },

  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#C8DEC8",
  },

  dividerText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#AAC4AA",
    letterSpacing: 1,
  },

  authFooterLinkWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    marginTop: 4,
  },

  authFooterLinkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
  },

  authFooterMuted: {
    fontSize: 15,
    color: "#6B8C6B",
  },

  authFooterLinkPressed: {
    opacity: 0.65,
  },

  authFooterLink: {
    fontSize: 15,
    fontWeight: "600",
    color: "#3A8A3A",
    textDecorationLine: "underline",
  },
});
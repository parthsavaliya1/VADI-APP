import { AnimatedLoader } from "@/components/AnimatedLoader";
import { showLoginError } from "../../utils/loginError";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Animated,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
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
import { C, themed } from "@/constants/theme";

export default function EnhancedLoginScreen() {
  const { sendOtp } = useAuth();
  const insets = useSafeAreaInsets();

  /** Farm strip reaches the physical bottom (includes home indicator area) */
  const farmBandHeight = AUTH_FARM_SECTION_HEIGHT + insets.bottom;

  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasAcceptedPrivacy, setHasAcceptedPrivacy] = useState(false);
  const [privacyTouched, setPrivacyTouched] = useState(false);

  // Animation refs
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [slideAnim] = useState(() => new Animated.Value(30));
  const [logoScaleAnim] = useState(() => new Animated.Value(0.8));

  const normalizedPhone = phone.startsWith("+91") ? phone : `+91${phone}`;

  const isFormValid = useMemo(
    () => phone.length >= 10 && hasAcceptedPrivacy,
    [phone, hasAcceptedPrivacy]
  );

  useEffect(() => {
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

  const togglePrivacy = () => {
    setHasAcceptedPrivacy((prev) => !prev);
    setPrivacyTouched(true);
  };

  const handleLogin = async () => {
    setPrivacyTouched(true);
    if (!hasAcceptedPrivacy) return;
    if (!isFormValid || loading) return;

    try {
      setLoading(true);
      await sendOtp(normalizedPhone, "login");

      router.push({
        pathname: "/(auth)/verify-otp",
        params: {
          phone: normalizedPhone,
          privacyAccepted: hasAcceptedPrivacy ? "true" : "false",
        },
      });
    } catch (err) {
      showLoginError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      {/* Background gradient + farm illustration area */}
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
                styles.container,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                  paddingBottom: farmBandHeight + 16,
                },
              ]}
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
                <Text style={styles.welcomeTitle}>Welcome to VADI</Text>
                <Text style={styles.welcomeSubtitle}>
                  Fresh products delivered to your doorstep
                </Text>
              </View>

              {/* ── FORM SECTION ── */}
              <View style={styles.formSection}>
                {/* Phone Input */}
                <View style={styles.phoneInputCard}>
                  {/* Country code pill */}
                  <View style={styles.countryPill}>
                    <View style={styles.phoneIconCircle}>
                      <Ionicons name="call" size={16} color={C.primary} />
                    </View>
                    <Text style={styles.countryCode}>+91</Text>
                    <Ionicons name="chevron-down" size={14} color={C.muted} />
                  </View>

                  {/* Vertical divider */}
                  <View style={styles.inputDivider} />

                  {/* Number input */}
                  <TextInput
                    placeholder="Enter mobile number"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    style={styles.phoneInput}
                    placeholderTextColor="#AABBA8"
                    maxLength={10}
                  />
                </View>

                {/* Privacy Policy Checkbox */}
                <View style={styles.privacyContainer}>
                  <View style={styles.privacyRow}>
                    <Pressable
                      onPress={togglePrivacy}
                      hitSlop={10}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: hasAcceptedPrivacy }}
                      accessibilityLabel="I agree to VADI’s Privacy Policy"
                      style={[
                        styles.checkbox,
                        hasAcceptedPrivacy && styles.checkboxChecked,
                        !hasAcceptedPrivacy && privacyTouched && styles.checkboxError,
                      ]}
                    >
                      {hasAcceptedPrivacy && (
                        <Ionicons name="checkmark" size={14} color="#fff" />
                      )}
                    </Pressable>
                    <Text style={styles.privacyText}>
                      <Text onPress={togglePrivacy}>I agree to VADI’s </Text>
                      <Text
                        onPress={() => router.push("/privacy-policy")}
                        accessibilityRole="link"
                        style={styles.privacyLink}
                      >
                        Privacy Policy
                      </Text>
                    </Text>
                  </View>

                  {!hasAcceptedPrivacy && privacyTouched && (
                    <Text style={styles.privacyError}>
                      Please accept the Privacy Policy to continue.
                    </Text>
                  )}
                </View>

                {/* Continue Button */}
                <TouchableOpacity
                  onPress={handleLogin}
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
                      <AnimatedLoader color="#fff" size="small" />
                    ) : (
                      <>
                        <Text style={styles.continueText}>Continue</Text>
                        <Ionicons name="arrow-forward" size={20} color="#fff" />
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
                      Don&apos;t have an account?{" "}
                    </Text>
                    <Pressable
                      onPress={() => router.push("/(auth)/signup")}
                      accessibilityRole="link"
                      accessibilityLabel="Create New Account"
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={({ pressed }) => [
                        pressed && styles.authFooterLinkPressed,
                      ]}
                    >
                      <Text style={styles.authFooterLink}>Create New Account</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </Animated.View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = themed(() => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG_SURFACE,
  },

  gradient: {
    flex: 1,
  },

  // ── MAIN CONTAINER ──
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    zIndex: 2,
  },

  // ── LOGO SECTION ──
  logoSection: {
    alignItems: "center",
    marginBottom: 28,
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
    marginBottom: 28,
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

  // Phone input card
  phoneInputCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#D8EDD8",
    paddingVertical: 4,
    paddingHorizontal: 12,
    ...Platform.select({
      ios: {
        shadowColor: C.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
    }),
  },

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
    color: C.ink,
  },

  inputDivider: {
    width: 1,
    height: 30,
    backgroundColor: "#D8EDD8",
    marginHorizontal: 8,
  },

  phoneInput: {
    flex: 1,
    fontSize: 15,
    color: C.ink,
    paddingVertical: 12,
    letterSpacing: 0.5,
  },

  // Privacy
  privacyContainer: {
    paddingHorizontal: 2,
  },

  privacyRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    gap: 10,
  },

  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#A5D6A7",
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },

  checkboxChecked: {
    borderColor: C.primary,
    backgroundColor: C.primary,
  },

  checkboxError: {
    borderColor: "#C62828",
  },

  privacyText: {
    flex: 1,
    fontSize: 14,
    color: C.muted,
    lineHeight: 22,
  },

  privacyLink: {
    color: C.primary,
    fontWeight: "600",
    textDecorationLine: "underline",
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
        shadowColor: C.primary,
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
}));
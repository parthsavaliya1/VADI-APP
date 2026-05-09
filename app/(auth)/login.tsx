import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
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

/** Bottom farm banner from design asset; width tracks screen */
const AUTH_FARM_SECTION_HEIGHT = Math.round((width * 170) / 473);
const AUTH_LEAF_DISPLAY_WIDTH = Math.min(Math.round(width * 0.4), 200);

export default function EnhancedLoginScreen() {
  const { sendOtp } = useAuth();

  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasAcceptedPrivacy, setHasAcceptedPrivacy] = useState(false);
  const [privacyTouched, setPrivacyTouched] = useState(false);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const logoScaleAnim = useRef(new Animated.Value(0.8)).current;

  const normalizedPhone = phone.startsWith("+91") ? phone : `+91${phone}`;

  const isFormValid = useMemo(
    () => phone.length >= 10 && hasAcceptedPrivacy,
    [phone, hasAcceptedPrivacy]
  );

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

  const handleLogin = async () => {
    setPrivacyTouched(true);
    if (!hasAcceptedPrivacy) return;
    if (!isFormValid || loading) return;

    try {
      setLoading(true);
      const { demoLoggedIn } = await sendOtp(normalizedPhone, "login");

      if (demoLoggedIn) {
        router.replace("/(tabs)");
        return;
      }

      router.push({
        pathname: "/(auth)/verify-otp",
        params: {
          phone: normalizedPhone,
          privacyAccepted: hasAcceptedPrivacy ? "true" : "false",
        },
      });
    } catch (err) {
      console.log("Login error", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Background gradient + farm illustration area */}
      <LinearGradient
        colors={["#F4F8F0", "#EAF3E6", "#F4F8F0"]}
        style={styles.gradient}
      >
        {/* Bottom landscape (matches design); behind form */}
        <Image
          source={require("../../assets/images/auth-bg-farm.png")}
          style={[
            styles.bgFarmImage,
            { height: AUTH_FARM_SECTION_HEIGHT },
          ]}
          resizeMode="stretch"
          pointerEvents="none"
        />
        {/* Watercolor leaves top-right */}
        <Image
          source={require("../../assets/images/auth-bg-leaves.png")}
          style={[
            styles.bgLeavesImage,
            {
              width: AUTH_LEAF_DISPLAY_WIDTH,
              height: Math.round((AUTH_LEAF_DISPLAY_WIDTH * 236) / 150),
            },
          ]}
          resizeMode="contain"
          pointerEvents="none"
        />

        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ flex: 1 }}
          >
            <Animated.View
              style={[
                styles.container,
                { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
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
                <Text style={styles.brandName}>VADI</Text>
                <Text style={styles.brandTagline}>
                  Fresh Grocery &amp; Farm Products
                </Text>
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
                      <Ionicons name="call" size={16} color="#4CAF50" />
                    </View>
                    <Text style={styles.countryCode}>+91</Text>
                    <Ionicons name="chevron-down" size={14} color="#888" />
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
                      <ActivityIndicator color="#fff" size="small" />
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

                {/* Create New Account */}
                <TouchableOpacity
                  style={styles.createAccountCard}
                  onPress={() => router.push("/(auth)/signup")}
                  activeOpacity={0.8}
                >
                  <View style={styles.createAccountLeft}>
                    <View style={styles.userIconCircle}>
                      <Ionicons name="person" size={18} color="#4CAF50" />
                    </View>
                    <Text style={styles.createAccountText}>
                      Create New Account
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#888" />
                </TouchableOpacity>
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
    backgroundColor: "#F4F8F0",
  },

  gradient: {
    flex: 1,
  },

  bgFarmImage: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width,
    zIndex: 0,
  },

  bgLeavesImage: {
    position: "absolute",
    top: 4,
    right: -6,
    zIndex: 0,
    opacity: 0.95,
  },

  // ── MAIN CONTAINER ──
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: AUTH_FARM_SECTION_HEIGHT + 16,
    zIndex: 1,
  },

  // ── LOGO SECTION ──
  logoSection: {
    alignItems: "center",
    marginBottom: 28,
  },

  logoImage: {
    width: 90,
    height: 90,
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

  phoneInput: {
    flex: 1,
    fontSize: 15,
    color: "#222",
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

  // Create account card
  createAccountCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#D8EDD8",
    paddingVertical: 16,
    paddingHorizontal: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: { elevation: 2 },
    }),
  },

  createAccountLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  userIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EAF5EA",
    justifyContent: "center",
    alignItems: "center",
  },

  createAccountText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E3A1E",
  },

  // ── FARM ILLUSTRATION ──
  farmIllustration: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: FARM_HEIGHT,
    overflow: "hidden",
  },

  hill1: {
    position: "absolute",
    bottom: -20,
    left: -40,
    width: width * 0.7,
    height: 90,
    borderRadius: 999,
    backgroundColor: "rgba(139,195,74,0.22)",
  },

  hill2: {
    position: "absolute",
    bottom: -30,
    right: -20,
    width: width * 0.65,
    height: 80,
    borderRadius: 999,
    backgroundColor: "rgba(100,160,80,0.18)",
  },

  hill3: {
    position: "absolute",
    bottom: -10,
    left: width * 0.2,
    width: width * 0.6,
    height: 55,
    borderRadius: 999,
    backgroundColor: "rgba(76,175,80,0.14)",
  },

  barn: {
    position: "absolute",
    bottom: 28,
    right: width * 0.28,
  },

  barnRoof: {
    width: 0,
    height: 0,
    borderLeftWidth: 20,
    borderRightWidth: 20,
    borderBottomWidth: 18,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "rgba(90,140,70,0.35)",
  },

  barnBody: {
    width: 40,
    height: 28,
    backgroundColor: "rgba(90,140,70,0.28)",
    borderRadius: 2,
  },

  windmill: {
    position: "absolute",
    bottom: 30,
    right: width * 0.15,
    alignItems: "center",
  },

  windmillPole: {
    width: 4,
    height: 40,
    backgroundColor: "rgba(90,140,70,0.3)",
    borderRadius: 2,
  },

  windmillHead: {
    position: "absolute",
    top: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3,
    borderColor: "rgba(90,140,70,0.3)",
  },

  tree: {
    position: "absolute",
    alignItems: "center",
  },

  treeTrunk: {
    width: 5,
    height: 14,
    backgroundColor: "rgba(90,130,70,0.3)",
    borderRadius: 2,
  },

  treeTop: {
    position: "absolute",
    bottom: 10,
    width: 26,
    height: 36,
    borderRadius: 13,
    backgroundColor: "rgba(100,170,70,0.28)",
  },
});
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
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

/** Countdown until user can tap Resend OTP */
const RESEND_COOLDOWN_SEC = 120;

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function pickParam(value: string | string[] | undefined): string | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

export default function VerifyOtpScreen() {
  const params = useLocalSearchParams<{
    phone?: string | string[];
    mode?: string | string[];
    name?: string | string[];
    role?: string | string[];
    privacyAccepted?: string | string[];
  }>();

  const phone = pickParam(params.phone);
  const mode = pickParam(params.mode);
  const name = pickParam(params.name) ?? "";
  const role = pickParam(params.role) || "user";
  const privacyAccepted = pickParam(params.privacyAccepted);

  const { verifyOtpAndLogin, verifyOtpAndSignup, sendOtp } = useAuth();
  const insets = useSafeAreaInsets();

  const farmBandHeight = AUTH_FARM_SECTION_HEIGHT + insets.bottom;

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [secondsUntilResend, setSecondsUntilResend] =
    useState(RESEND_COOLDOWN_SEC);
  const [resendBusy, setResendBusy] = useState(false);

  const otpInputRef = useRef<TextInput>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const logoScaleAnim = useRef(new Animated.Value(0.8)).current;

  const isFormValid = useMemo(() => otp.length === 6, [otp]);

  const setNormalizedOtp = (raw: string) => {
    setOtp(raw.replace(/\D/g, "").slice(0, 6));
  };

  useEffect(() => {
    if (secondsUntilResend <= 0) return;
    const t = setTimeout(
      () => setSecondsUntilResend((x) => x - 1),
      1000
    );
    return () => clearTimeout(t);
  }, [secondsUntilResend]);

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

  const phoneDisplay = phone ?? "your number";

  const handleVerifyOtp = async () => {
    if (!isFormValid || loading || !phone) return;

    const accepted = privacyAccepted === "true";

    try {
      setLoading(true);

      if (mode === "signup") {
        await verifyOtpAndSignup(phone, otp, name, role, accepted);
      } else {
        await verifyOtpAndLogin(phone, otp, accepted);
      }

      router.replace("/(tabs)");
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: string }).message)
          : "";
      console.log("Verification failed", message);
      alert(message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const canResend =
    !!phone &&
    secondsUntilResend <= 0 &&
    !resendBusy &&
    !loading;

  const handleResendOtp = async () => {
    if (!phone || !canResend) return;
    try {
      setResendBusy(true);
      const { demoLoggedIn } = await sendOtp(
        phone,
        mode === "signup" ? "signup" : "login",
        { forceResend: true }
      );
      if (demoLoggedIn) {
        router.replace("/(tabs)");
        return;
      }
      setOtp("");
      setSecondsUntilResend(RESEND_COOLDOWN_SEC);
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: string }).message)
          : "";
      alert(message || "Could not resend OTP");
    } finally {
      setResendBusy(false);
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
                styles.container,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                  paddingBottom: farmBandHeight + 16,
                },
              ]}
            >
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

              <View style={styles.welcomeSection}>
                <Text style={styles.welcomeTitle}>Verify OTP</Text>
                <Text style={styles.welcomeSubtitle}>
                  Code sent to {phoneDisplay}
                </Text>
              </View>

                <View style={styles.formSection}>
                <View style={styles.otpRowWithStatus}>
                  <Pressable
                    onPress={() => otpInputRef.current?.focus()}
                    accessibilityHint="Opens keyboard to enter or paste OTP"
                    style={styles.otpBoxesWrap}
                  >
                    <View style={styles.otpBoxesRow} pointerEvents="none">
                      {Array.from({ length: 6 }, (_, i) => (
                        <View
                          key={String(i)}
                          style={[
                            styles.otpBox,
                            otp.length === i && styles.otpBoxActive,
                            otp.length > i && styles.otpBoxFilled,
                          ]}
                        >
                          <Text style={styles.otpBoxDigit}>
                            {otp[i] ?? ""}
                          </Text>
                        </View>
                      ))}
                    </View>
                    <TextInput
                      ref={otpInputRef}
                      value={otp}
                      onChangeText={setNormalizedOtp}
                      keyboardType="number-pad"
                      inputMode="numeric"
                      maxLength={6}
                      accessibilityLabel="OTP code"
                      textContentType={Platform.OS === "ios" ? "oneTimeCode" : undefined}
                      autoComplete={Platform.OS === "android" ? "sms-otp" : "one-time-code"}
                      importantForAutofill="yes"
                      autoCorrect={false}
                      spellCheck={false}
                      autoCapitalize="none"
                      caretHidden
                      underlineColorAndroid="transparent"
                      style={styles.otpHiddenInput}
                      autoFocus
                    />
                  </Pressable>
                  {otp.length === 6 && (
                    <Ionicons
                      name="checkmark-circle"
                      size={26}
                      color="#4CAF50"
                      style={styles.otpCompleteIcon}
                    />
                  )}
                </View>

                <View style={styles.resendRow}>
                  {secondsUntilResend > 0 ? (
                    <Text style={styles.resendTimerText}>
                      Resend OTP in{" "}
                      <Text style={styles.resendTimerDigits}>
                        {formatCountdown(secondsUntilResend)}
                      </Text>
                    </Text>
                  ) : null}
                  <Pressable
                    onPress={handleResendOtp}
                    disabled={!canResend}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !canResend }}
                    accessibilityLabel="Resend OTP"
                    hitSlop={{ top: 8, bottom: 8 }}
                    style={({ pressed }) => [
                      styles.resendButton,
                      !canResend && styles.resendButtonDisabled,
                      pressed && canResend && styles.resendButtonPressed,
                    ]}
                  >
                    {resendBusy ? (
                      <ActivityIndicator size="small" color="#3A8A3A" />
                    ) : (
                      <Text
                        style={[
                          styles.resendButtonLabel,
                          !canResend && styles.resendButtonLabelDisabled,
                        ]}
                      >
                        Resend OTP
                      </Text>
                    )}
                  </Pressable>
                </View>

                <TouchableOpacity
                  onPress={handleVerifyOtp}
                  activeOpacity={0.85}
                  disabled={!isFormValid || loading}
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
                        <Text style={styles.continueText}>Verify & Continue</Text>
                        <Ionicons name="arrow-forward" size={20} color="#fff" />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <View style={styles.authFooterLinkWrap}>
                  <Pressable
                    onPress={() => router.back()}
                    accessibilityRole="link"
                    accessibilityLabel="Change mobile number"
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={({ pressed }) => [
                      pressed && styles.authFooterLinkPressed,
                    ]}
                  >
                    <Text style={styles.authFooterLink}>Change number</Text>
                  </Pressable>
                </View>
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
    backgroundColor: BG_SURFACE,
  },
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    zIndex: 2,
  },
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
    textAlign: "center",
  },
  formSection: {
    gap: 14,
  },
  otpRowWithStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    width: "100%",
  },
  otpCompleteIcon: {
    flexShrink: 0,
    marginBottom: 2,
  },
  /** Transparent wrap — digits only sit on gradient (SMS / paste overlay input) */
  otpBoxesWrap: {
    flex: 1,
    position: "relative",
    justifyContent: "center",
    minHeight: 52,
  },
  otpBoxesRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    width: "100%",
  },
  otpBox: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 52,
    minHeight: 48,
    maxHeight: 56,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(168,196,168,0.85)",
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  otpBoxActive: {
    borderColor: "#5CB85C",
    backgroundColor: "rgba(92,184,92,0.08)",
    borderWidth: 2,
  },
  otpBoxFilled: {
    borderColor: "#82C382",
    backgroundColor: "transparent",
  },
  resendRow: {
    alignItems: "center",
    gap: 8,
    marginTop: 4,
    marginBottom: -2,
  },
  resendTimerText: {
    fontSize: 14,
    color: "#6B8C6B",
    textAlign: "center",
  },
  resendTimerDigits: {
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
    color: "#4A744A",
  },
  resendButton: {
    minHeight: 22,
    justifyContent: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  resendButtonDisabled: {
    opacity: 0.85,
  },
  resendButtonPressed: {
    opacity: 0.6,
  },
  resendButtonLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#3A8A3A",
    textDecorationLine: "underline",
  },
  resendButtonLabelDisabled: {
    color: "#AABBA8",
    textDecorationLine: "underline",
    fontWeight: "500",
  },
  otpBoxDigit: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E3A1E",
  },
  otpHiddenInput: {
    ...StyleSheet.absoluteFillObject,
    color: Platform.select({ ios: "rgba(0,0,0,0.01)", default: "transparent" }),
    fontSize: Platform.select({ ios: 16, android: 1 }),
    zIndex: 2,
    padding: 0,
    margin: 0,
  },
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
  authFooterLinkWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    marginTop: 4,
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

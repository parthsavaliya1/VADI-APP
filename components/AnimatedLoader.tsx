import { useEffect, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Image, StyleSheet, View } from "react-native";
import type { ColorValue, StyleProp, ViewStyle } from "react-native";
import { C } from "@/constants/theme";

type Props = {
  size?: "small" | "large" | number;
  color?: ColorValue;
  style?: StyleProp<ViewStyle>;
  fullScreen?: boolean;
  accessibilityLabel?: string;
};

/** Shared logo loader for page, section and button loading states. */
export function AnimatedLoader({ size, color = C.primary, style, fullScreen = false, accessibilityLabel = "Loading" }: Props) {
  const diameter = typeof size === "number" ? Math.max(20, size) : size === "large" || fullScreen ? 112 : 28;
  const [rotation] = useState(() => new Animated.Value(0));
  const [pulse] = useState(() => new Animated.Value(0));
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    let preferenceChanged = false;
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", (enabled) => {
      preferenceChanged = true;
      if (active) setReduceMotion(enabled);
    });
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => { if (active && !preferenceChanged) setReduceMotion(enabled); })
      .catch(() => { if (active && !preferenceChanged) setReduceMotion(true); });
    return () => { active = false; subscription.remove(); };
  }, []);

  useEffect(() => {
    if (reduceMotion !== false) {
      rotation.setValue(0);
      pulse.setValue(0);
      return;
    }
    const spin = Animated.loop(Animated.timing(rotation, {
      toValue: 1, duration: 1800, easing: Easing.linear, useNativeDriver: true,
    }));
    const breathe = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]));
    spin.start();
    breathe.start();
    return () => { spin.stop(); breathe.stop(); };
  }, [pulse, reduceMotion, rotation]);

  const frame = { width: diameter, height: diameter, borderRadius: diameter / 2 };
  const borderWidth = diameter > 48 ? 2 : 1.5;
  return (
    <View style={[fullScreen ? styles.fullScreen : styles.inline, style]} accessible accessibilityRole="progressbar" accessibilityLabel={accessibilityLabel}>
      <View style={[styles.frame, frame]}>
        <Animated.View style={[styles.ring, frame, {
          borderColor: color, borderWidth, opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.18] }),
          transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) }],
        }]} />
        <View style={[styles.ring, frame, { borderWidth, borderColor: color, opacity: 0.15 }]} />
        <Animated.View style={[styles.ring, frame, {
          borderWidth, borderColor: "transparent", borderTopColor: color, borderRightColor: color,
          transform: [{ rotate: rotation.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) }],
        }]} />
        <Animated.View style={[styles.logoDisc, {
          width: diameter * 0.82, height: diameter * 0.82, borderRadius: diameter / 2,
          transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.03] }) }],
        }]}>
          <Image source={require("../assets/images/vadi-brand-logo.png")} style={styles.logo} resizeMode="contain" accessible={false} />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreen: { flex: 1, alignSelf: "stretch", alignItems: "center", justifyContent: "center" },
  inline: { alignItems: "center", justifyContent: "center" },
  frame: { alignItems: "center", justifyContent: "center" },
  ring: { position: "absolute" },
  logoDisc: { alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF", overflow: "hidden" },
  logo: { width: "100%", height: "100%" },
});

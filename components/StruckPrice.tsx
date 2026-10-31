import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { StyleProp, TextStyle } from "react-native";
import { C } from "@/constants/theme";

/** Center the strike on the price itself, independently of Android font padding. */
export function StruckPrice({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const { marginTop, marginBottom, ...textStyle } = StyleSheet.flatten(style) || {};
  return (
    <View style={{ alignSelf: "flex-start", maxWidth: "100%", marginTop, marginBottom }}>
      <Text numberOfLines={1} style={[textStyle, { includeFontPadding: false, textDecorationLine: "none" }]}>{children}</Text>
      <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: "50%", height: 1, marginTop: -0.5, backgroundColor: textStyle.color || C.muted }} />
    </View>
  );
}

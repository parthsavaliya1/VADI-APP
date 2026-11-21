import type { ReactNode } from "react";
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Fonts, themed } from "@/constants/theme";
import { HomeColors as C } from "@/constants/homeDesign";

// One visual language for product discovery, saved products and cart rows.
// Callers keep their own navigation, stock, add and quantity behaviour.
export function ProductCardImage({ uri, children, style }: {
  uri?: string; children?: ReactNode; style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[productCardStyles.prodImgZone, style]}>
      <View pointerEvents="none" style={productCardStyles.imageArch} />
      {uri ? <Image source={{ uri }} style={productCardStyles.prodImg} resizeMode="contain" />
        : <Ionicons name="image-outline" size={28} color={C.muted} />}
      {children}
    </View>
  );
}

export const productCardStyles = themed(() => StyleSheet.create({
  botanicalAccent: { position: "absolute", top: 0, right: 0, width: 84, height: 130, opacity: 0.3, resizeMode: "cover" },
  prodCard: { backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.line, overflow: "hidden" },
  prodImgZone: { height: 140, margin: 10, marginBottom: 0, justifyContent: "center", alignItems: "center", position: "relative", overflow: "hidden", borderRadius: 8 },
  imageArch: { position: "absolute", top: 8, bottom: 0, left: 0, right: 0, backgroundColor: C.soft, borderTopLeftRadius: 100, borderTopRightRadius: 100, borderBottomLeftRadius: 8, borderBottomRightRadius: 8 },
  prodImg: { width: "88%", height: "94%", resizeMode: "contain" },
  trendBadge: { position: "absolute", top: 2, left: 2, backgroundColor: C.soft, borderRadius: 12, padding: 5 },
  offBadge: { position: "absolute", top: 0, right: 0, backgroundColor: C.badge, borderRadius: 16, paddingHorizontal: 8, paddingVertical: 5 },
  prodBadgeTxt: { color: C.badgeText, fontSize: 9, fontWeight: "700", letterSpacing: 0.2 },
  productDetails: { flex: 1, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12, gap: 3 },
  prodName: { fontFamily: Fonts.serif, fontSize: 16, fontWeight: "700", color: C.ink, lineHeight: 21 },
  prodUnit: { fontSize: 11, color: C.muted, marginBottom: 5 },
  prodFooter: { flexWrap: "wrap", gap: 4, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: "auto" },
  prodPrice: { fontSize: 16, fontWeight: "800", color: C.primary },
  addBtn: { backgroundColor: C.primary, borderWidth: 1, borderColor: C.primary, borderRadius: 22, minWidth: 40, minHeight: 40, padding: 6, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  rectangularAdd: { minWidth: 64, minHeight: 40, borderRadius: 8, paddingHorizontal: 14 },
  addBtnActive: { backgroundColor: C.primaryDark, borderColor: C.primaryDark },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 10 },
  horizontalBody: { flexDirection: "row", padding: 2 },
  horizontalDetails: { justifyContent: "center", paddingVertical: 16 },
  trendingCard: { borderRadius: 20 },
  trendingImgZone: { width: 118, height: 136, marginBottom: 10 },
  cardFooterStacked: { flexDirection: "column", alignItems: "stretch", gap: 8 },
  strikePrice: { fontSize: 10, color: C.muted, textDecorationLine: "line-through", marginTop: 2 },
}));

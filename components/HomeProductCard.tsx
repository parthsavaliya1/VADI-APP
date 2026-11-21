import { useState } from "react";
import { Animated, Image, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedLoader } from "@/components/AnimatedLoader";
import { StruckPrice } from "@/components/StruckPrice";
import { Fonts, themed } from "@/constants/theme";
import { HomeColors as C, botanicalLeaves } from "@/constants/homeDesign";
import { getProductLayout } from "@/utils/productLayout";

type ProductCardProduct = {
  _id: string;
  name: string;
  image?: string;
  discount?: number;
  variants: { _id: string; packSize: number; packUnit: string; price: number; mrp: number; isDefault?: boolean }[];
};

export function HomeProductCard({
  item, onAdd, inCart, onPress, showTrendingBadge = false, compact = false, disabled = false,
}: {
  item: ProductCardProduct; onAdd: () => void; inCart: boolean; onPress: () => void; showTrendingBadge?: boolean; compact?: boolean; disabled?: boolean;
}) {
  const { width, fontScale } = useWindowDimensions();
  const { gridCardWidth: CARD_WIDTH, stackActions } = getProductLayout(width, fontScale);
  const [scale] = useState(() => new Animated.Value(1));
  const [isAdding, setIsAdding] = useState(false);
  const v = item.variants.find((variant) => variant.isDefault) || item.variants[0];
  if (!v) return null;
  const disc = v.mrp > 0 ? Math.round(((v.mrp - v.price) / v.mrp) * 100) : item.discount || 0;

  const handleAdd = () => {
    setIsAdding(true);
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.96, duration: 80, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, tension: 120, friction: 4, useNativeDriver: true }),
    ]).start(() => setIsAdding(false));
    onAdd();
  };

  return (
    <Animated.View style={[s.prodCard, compact && s.trendingCard, { transform: [{ scale }], width: compact ? Math.max(1, width - 32) : CARD_WIDTH }]}>
      <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={[{ flex: 1 }, compact && !stackActions && s.horizontalBody]}>
        {compact && <Image source={botanicalLeaves} pointerEvents="none" accessible={false} style={s.botanicalAccent} />}
        <View style={[s.prodImgZone, compact && !stackActions && s.trendingImgZone]}>
          <View pointerEvents="none" style={s.imageArch} />
          <Image source={{ uri: item.image || "https://via.placeholder.com/150" }} style={s.prodImg} />
          {showTrendingBadge && (
            <View style={s.trendBadge}><Ionicons name="trending-up" size={14} color={C.primary} /></View>
          )}
          {disc > 0 && (
            <View style={s.offBadge}><Text style={s.prodBadgeTxt}>{disc}% OFF</Text></View>
          )}
        </View>
        <View style={[s.productDetails, compact && s.horizontalDetails]}>
        <Text style={s.prodName}>{item.name}</Text>
        <Text style={s.prodUnit}>{v.packSize}{v.packUnit}</Text>
        <View style={[s.prodFooter, stackActions && s.cardFooterStacked]}>
          <View style={{ flex: stackActions ? 0 : 1, minWidth: 0, marginRight: 6 }}>
            <Text style={s.prodPrice}>₹{v.price.toFixed(2)}</Text>
            {disc > 0 && <StruckPrice style={s.strikePrice}>₹{v.mrp.toFixed(2)}</StruckPrice>}
          </View>
          <TouchableOpacity
            hitSlop={{ top: 7, bottom: 7, left: 0, right: 0 }} accessibilityRole="button" accessibilityLabel={disabled ? `${item.name} is out of stock` : inCart ? `${item.name} added to cart` : `Add ${item.name} to cart`}
            style={[s.addBtn, inCart && s.addBtnActive, (isAdding || disabled) && { opacity: 0.6 }]}
            onPress={(e) => { e.stopPropagation(); if (!inCart && !disabled) handleAdd(); }}
            disabled={isAdding || disabled}
            activeOpacity={0.8}
          >
            {isAdding ? (
              <AnimatedLoader size={20} color="#fff" />
            ) : inCart ? (
              <Ionicons name="checkmark" size={15} color="#fff" />
            ) : (
              <>{disabled ? <Text style={s.addBtnText}>OUT</Text> : <Ionicons name="add" size={22} color="#fff" />}</>
            )}
          </TouchableOpacity>
        </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const s = themed(() => StyleSheet.create({
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
  prodFooter: { gap: 4, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: "auto" },
  prodPrice: { fontSize: 16, fontWeight: "800", color: C.primary },
  addBtn: { backgroundColor: C.primary, borderWidth: 1, borderColor: C.primary, borderRadius: 22, minWidth: 40, minHeight: 40, padding: 6, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  addBtnActive: { backgroundColor: C.primaryDark, borderColor: C.primaryDark },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 10 },
  horizontalBody: { flexDirection: "row", padding: 2 },
  horizontalDetails: { justifyContent: "center", paddingVertical: 16 },
  trendingCard: { borderRadius: 20 },
  trendingImgZone: { width: 118, height: 136, marginBottom: 10 },
  cardFooterStacked: { flexDirection: "column", alignItems: "stretch", gap: 8 },
  strikePrice: { fontSize: 10, color: C.muted, textDecorationLine: "line-through", marginTop: 2 },
}));

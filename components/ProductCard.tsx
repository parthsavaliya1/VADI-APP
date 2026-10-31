import { useState } from "react";
import { Animated, Image, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedLoader } from "@/components/AnimatedLoader";
import { StruckPrice } from "@/components/StruckPrice";
import { C, themed } from "@/constants/theme";
import { getProductLayout } from "@/utils/productLayout";

type ProductCardProduct = {
  _id: string;
  name: string;
  image?: string;
  discount?: number;
  variants: { _id: string; packSize: number; packUnit: string; price: number; mrp: number; isDefault?: boolean }[];
};

export function ProductCard({
  item, onAdd, inCart, onPress, showTrendingBadge = false, compact = false, disabled = false,
}: {
  item: ProductCardProduct; onAdd: () => void; inCart: boolean; onPress: () => void; showTrendingBadge?: boolean; compact?: boolean; disabled?: boolean;
}) {
  const { width, fontScale } = useWindowDimensions();
  const { gridCardWidth: CARD_WIDTH, trendingCardWidth: TRENDING_CARD_W, stackActions } = getProductLayout(width, fontScale);
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
    <Animated.View style={[s.prodCard, compact && s.trendingCard, { transform: [{ scale }], width: compact ? TRENDING_CARD_W : CARD_WIDTH }]}>
      <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={{ flex: 1 }}>
        <View style={[s.prodImgZone, compact && s.trendingImgZone]}>
          <Image source={{ uri: item.image || "https://via.placeholder.com/150" }} style={s.prodImg} />
          {showTrendingBadge && (
            <View style={s.trendBadge}><Ionicons name="trending-up" size={14} color={C.badgeText} /></View>
          )}
          {disc > 0 && (
            <View style={s.offBadge}><Text style={s.prodBadgeTxt}>{disc}% OFF</Text></View>
          )}
        </View>
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
              <AnimatedLoader size={20} color={C.primary} />
            ) : inCart ? (
              <Ionicons name="checkmark" size={15} color="#fff" />
            ) : (
              <Text style={s.addBtnText}>{disabled ? "OUT" : "ADD"}</Text>
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const s = themed(() => StyleSheet.create({
  prodCard: {
    backgroundColor: C.card, borderRadius: 20, elevation: 2,
    shadowColor: C.ink, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8,
    borderWidth: 1, borderColor: C.line, overflow: "hidden",
  },
  prodImgZone: { backgroundColor: C.card, height: 104, justifyContent: "center", alignItems: "center", position: "relative" },
  prodImg: { width: "100%", height: "100%", resizeMode: "contain" },
  trendBadge: { position: "absolute", top: 8, left: 8, backgroundColor: C.badge, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  offBadge: { position: "absolute", top: 8, right: 8, backgroundColor: C.badge, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  prodBadgeTxt: { color: C.badgeText, fontSize: 8, fontWeight: "800", letterSpacing: 0.3 },
  prodName: { fontSize: 12, fontWeight: "700", color: C.ink, paddingHorizontal: 10, paddingTop: 6, lineHeight: 16 },
  prodUnit: { fontSize: 10, color: C.muted, fontWeight: "600", marginTop: 2, marginBottom: 4, paddingHorizontal: 10 },
  prodFooter: { gap: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 10, paddingBottom: 8 },
  prodPrice: { fontSize: 13, fontWeight: "800", color: C.primary },
  addBtn: { borderWidth: 1.5, borderColor: C.primary, borderRadius: 8, minWidth: 44, minHeight: 30, paddingHorizontal: 8, paddingVertical: 3, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  addBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  addBtnText: { color: C.primary, fontWeight: "800", fontSize: 10 },

  trendingCard: { borderRadius: 16, elevation: 0, shadowOpacity: 0 },
  trendingImgZone: { height: 96 },
  cardFooterStacked: { flexDirection: "column", alignItems: "stretch", gap: 8 },
  strikePrice: { fontSize: 10, color: C.muted, textDecorationLine: "line-through", marginTop: 2 },
}));

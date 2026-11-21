import { useState } from "react";
import { Animated, Image, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedLoader } from "@/components/AnimatedLoader";
import { StruckPrice } from "@/components/StruckPrice";
import { ProductCardImage, productCardStyles as s } from "@/components/ProductCardVisuals";
import { HomeColors as C, botanicalLeaves } from "@/constants/homeDesign";
import { getProductLayout } from "@/utils/productLayout";

type ProductCardProduct = {
  _id: string;
  name: string;
  image?: string;
  discount?: number;
  variants: { _id: string; packSize: number; packUnit: string; price: number; mrp: number; isDefault?: boolean }[];
};

export function ProductCard({
  item, onAdd, inCart, onPress, showTrendingBadge = false, compact = false, disabled = false, rectangularAdd = false,
}: {
  item: ProductCardProduct; onAdd: () => void; inCart: boolean; onPress: () => void; showTrendingBadge?: boolean; compact?: boolean; disabled?: boolean; rectangularAdd?: boolean;
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
        <ProductCardImage uri={item.image || "https://via.placeholder.com/150"} style={compact && !stackActions ? s.trendingImgZone : undefined}>
          {showTrendingBadge && (
            <View style={s.trendBadge}><Ionicons name="trending-up" size={14} color={C.primary} /></View>
          )}
          {disc > 0 && (
            <View style={s.offBadge}><Text style={s.prodBadgeTxt}>{disc}% OFF</Text></View>
          )}
        </ProductCardImage>
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
            style={[s.addBtn, rectangularAdd && s.rectangularAdd, inCart && s.addBtnActive, (isAdding || disabled) && { opacity: 0.6 }]}
            onPress={(e) => { e.stopPropagation(); if (!inCart && !disabled) handleAdd(); }}
            disabled={isAdding || disabled}
            activeOpacity={0.8}
          >
            {isAdding ? (
              <AnimatedLoader size={20} color="#fff" />
            ) : inCart ? (
              <Ionicons name="checkmark" size={15} color="#fff" />
            ) : (
              <>{disabled || rectangularAdd ? <Text style={s.addBtnText}>{disabled ? "OUT" : "ADD"}</Text> : <Ionicons name="add" size={22} color="#fff" />}</>
            )}
          </TouchableOpacity>
        </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

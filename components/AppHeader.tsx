import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import type { ReactNode } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useCart } from "@/context/CartContext";
import { C, themed } from "@/constants/theme";

type Props = {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  showLogo?: boolean;
  showCart?: boolean;
  onBack?: () => void;
  right?: ReactNode;
};

/** Property Setu page header: cream bar, outlined back button, title on the left. */
export function AppHeader({
  title,
  subtitle,
  showBack = false,
  showCart = false,
  onBack,
  right,
}: Props) {
  const { items } = useCart();
  const count = items.reduce((sum, item) => sum + (item.qty || 1), 0);

  return (
    <View style={styles.bar}>
      {showBack ? (
        <TouchableOpacity
          onPress={onBack || (() => router.back())}
          activeOpacity={0.7}
          hitSlop={10}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color={C.ink} />
        </TouchableOpacity>
      ) : null}

      <View style={[styles.titles, showBack && styles.titlesAfterBack]}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {right ? (
        right
      ) : showCart ? (
        <TouchableOpacity onPress={() => router.push("/cart")} hitSlop={8} style={styles.cartBtn}>
          <Ionicons name="cart-outline" size={24} color={C.ink} />
          {count > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{count > 99 ? "99" : count}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      ) : (
        <View style={styles.spacer} />
      )}
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 4,
    marginBottom: 12,
    backgroundColor: "transparent",
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  titles: { flex: 1 },
  titlesAfterBack: { marginLeft: 12 },
  title: { fontSize: 20, fontWeight: "800", color: C.ink },
  subtitle: { marginTop: 2, fontSize: 13, color: C.muted },
  spacer: { width: 46 },
  cartBtn: { width: 46, height: 46, alignItems: "center", justifyContent: "center" },
  badge: {
    position: "absolute",
    top: 4,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: { color: "#fff", fontSize: 9, fontWeight: "800" },
}));

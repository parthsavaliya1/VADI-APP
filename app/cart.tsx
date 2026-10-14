import { Ionicons } from "@expo/vector-icons";
import { showAlert } from "@/context/CustomAlertContext";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppHeader } from "@/components/AppHeader";
import { CartItem, useCart } from "../context/CartContext";
import {
  DEFAULT_FEE_SETTINGS,
  fetchFeeSettings,
  quoteDeliveryFee,
  type FeeSettings,
} from "../utils/deliveryQuote";
import { C, themed } from "@/constants/theme";

export default function CartScreen() {
  const {
    items,
    updateQty,
    removeFromCart,
    clearCart,
    getCartTotal,
    getCartItemCount,
  } = useCart();

  const [loading, setLoading] = useState(false);
  const [fees, setFees] = useState<FeeSettings>(DEFAULT_FEE_SETTINGS);

  useEffect(() => {
    fetchFeeSettings().then(setFees);
  }, []);

  const handleRemoveItem = (
    productId: string,
    variantId: string,
    name: string,
  ) => {
    showAlert("Remove Item", `Remove ${name} from cart?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => removeFromCart(productId, variantId),
      },
    ]);
  };

  const handleClearCart = () => {
    showAlert("Clear Cart", "Are you sure you want to remove all items?", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear All", style: "destructive", onPress: () => clearCart() },
    ]);
  };

  const handleCheckout = () => {
    if (items.length === 0) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.push("/checkout");
    }, 500);
  };

  const incrementQty = (item: CartItem) =>
    updateQty(item.productId, item.variantId, item.qty + 1);
  const decrementQty = (item: CartItem) => {
    if (item.qty > 1) updateQty(item.productId, item.variantId, item.qty - 1);
    else removeFromCart(item.productId, item.variantId);
  };

  const total = getCartTotal();
  const deliveryFee = quoteDeliveryFee(total, fees);
  const freeAbove = fees.freeDeliveryAbove;
  const discount = total > 1000 ? total * 0.1 : 0;
  const finalTotal = total + deliveryFee - discount;
  const totalQty = items.reduce((sum, item) => sum + item.qty, 0);

  // ── EMPTY STATE ─────────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <AppHeader
          title="My Cart"
          showBack
          showCart={false}
        />

        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="cart-outline" size={64} color={C.line} />
          </View>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySubtitle}>
            Add some products to get started
          </Text>
          <TouchableOpacity
            style={styles.shopNowBtn}
            onPress={() => router.push("/(tabs)")}
          >
            <Ionicons name="storefront-outline" size={18} color="#fff" />
            <Text style={styles.shopNowText}>Shop Now</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── MAIN CART ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      {/* HEADER */}
      <AppHeader
        title="My Cart"
        subtitle={`${getCartItemCount()} items`}
        showBack
        showCart={false}
        right={
          <TouchableOpacity onPress={handleClearCart} style={styles.clearBtn}>
            <Ionicons name="trash-outline" size={20} color="#F44336" />
          </TouchableOpacity>
        }
      />

      {/* FREE DELIVERY PROGRESS BANNER */}
      {freeAbove > 0 && total <= freeAbove ? (
        <View style={styles.progressBanner}>
          <Ionicons name="bicycle-outline" size={18} color={C.primary} />
          <View style={styles.progressTextGroup}>
            <Text style={styles.progressLabel}>
              Add{" "}
              <Text style={styles.progressHighlight}>
                ₹{(freeAbove - total).toFixed(0)}
              </Text>{" "}
              more for free delivery!
            </Text>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.min((total / freeAbove) * 100, 100)}%` as any },
                ]}
              />
            </View>
          </View>
        </View>
      ) : freeAbove > 0 ? (
        <View style={[styles.progressBanner, styles.progressBannerSuccess]}>
          <Ionicons name="checkmark-circle" size={18} color={C.primary} />
          <Text style={styles.progressLabel}>
            🎉 You've unlocked{" "}
            <Text style={styles.progressHighlight}>free delivery!</Text>
          </Text>
        </View>
      ) : null}

      {/* CART ITEMS */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.cartItem}>
            {/* Image */}
            <View style={styles.imageWrapper}>
              <Image
                source={{
                  uri: item.image || "https://via.placeholder.com/80",
                }}
                style={styles.itemImage}
              />
            </View>

            {/* Details */}
            <View style={styles.itemDetails}>
              <View style={styles.itemTopRow}>
                <Text style={styles.itemName} numberOfLines={2}>
                  {item.name}
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    handleRemoveItem(item.productId, item.variantId, item.name)
                  }
                  style={styles.removeBtn}
                  hitSlop={8}
                >
                  <Ionicons
                    name="close-circle-outline"
                    size={20}
                    color="#BDBDBD"
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.variantChip}>
                <Text style={styles.variantChipText}>{item.variantLabel}</Text>
              </View>

              <View style={styles.itemBottomRow}>
                {/* Qty Stepper */}
                <View style={styles.qtyContainer}>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => decrementQty(item)}
                  >
                    <Ionicons
                      name={item.qty === 1 ? "trash-outline" : "remove"}
                      size={15}
                      color={item.qty === 1 ? "#F44336" : C.primary}
                    />
                  </TouchableOpacity>
                  <Text style={styles.qtyText}>{item.qty}</Text>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => incrementQty(item)}
                  >
                    <Ionicons name="add" size={15} color={C.primary} />
                  </TouchableOpacity>
                </View>

                {/* Price */}
                <View style={styles.priceGroup}>
                  <Text style={styles.itemUnitPrice}>₹{item.price}/unit</Text>
                  <Text style={styles.itemTotal}>
                    ₹{(item.price * item.qty).toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}
      />

      {/* BILL SUMMARY */}
      <View style={styles.billContainer}>
        <View style={styles.billTitleRow}>
          <Ionicons name="receipt-outline" size={15} color={C.ink} />
          <Text style={styles.billTitle}>Bill Summary</Text>
        </View>

        <View style={styles.billRow}>
          <Text style={styles.billLabel}>Subtotal ({totalQty} items)</Text>
          <Text style={styles.billValue}>₹{total.toFixed(2)}</Text>
        </View>

        {discount > 0 && (
          <View style={styles.billRow}>
            <Text style={[styles.billLabel, styles.discountLabel]}>
              Discount (10%)
            </Text>
            <Text style={[styles.billValue, styles.discountValue]}>
              -₹{discount.toFixed(2)}
            </Text>
          </View>
        )}

        <View style={styles.billRow}>
          <View style={styles.deliveryRow}>
            <Text style={styles.billLabel}>Delivery Fee</Text>
            {freeAbove > 0 && total > freeAbove && (
              <View style={styles.freeBadge}>
                <Text style={styles.freeText}>FREE</Text>
              </View>
            )}
          </View>
          <Text style={[styles.billValue, deliveryFee === 0 && styles.freePrice]}>
            {deliveryFee === 0 ? "₹0.00" : `₹${deliveryFee.toFixed(2)}`}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.totalValue}>₹{finalTotal.toFixed(2)}</Text>
        </View>

        {discount > 0 && (
          <View style={styles.savingsContainer}>
            <Ionicons name="gift-outline" size={15} color={C.primary} />
            <Text style={styles.savingsText}>
              You saved ₹{discount.toFixed(2)} on this order!
            </Text>
          </View>
        )}
      </View>

      {/* CHECKOUT BUTTON */}
      <View style={styles.checkoutContainer}>
        <TouchableOpacity
          style={[styles.checkoutBtn, loading && styles.checkoutBtnDisabled]}
          onPress={handleCheckout}
          disabled={loading}
          activeOpacity={0.88}
        >
          <View style={styles.checkoutLeft}>
            <Text style={styles.checkoutTotal}>₹{finalTotal.toFixed(2)}</Text>
            <Text style={styles.checkoutSubtext}>
              {totalQty} item{totalQty !== 1 ? "s" : ""}
            </Text>
          </View>
          <View style={styles.checkoutRight}>
            <Text style={styles.checkoutText}>
              {loading ? "Processing…" : "Proceed to Checkout"}
            </Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = themed(() => StyleSheet.create({
  // ── original background preserved ──────────────────────────────────────────
  safe: { flex: 1, backgroundColor: C.page },

  /* HEADER */
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: C.soft,
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 17, fontWeight: "800", color: C.ink },
  headerSubtitle: {
    fontSize: 11,
    color: C.muted,
    marginTop: 1,
    fontWeight: "500",
  },
  clearBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
  },

  /* PROGRESS BANNER */
  progressBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: C.soft,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  progressBannerSuccess: {
    backgroundColor: "#F1F8E9",
    borderBottomColor: "#DCEDC8",
  },
  progressTextGroup: { flex: 1, gap: 5 },
  progressLabel: { fontSize: 12, color: C.primary, fontWeight: "600" },
  progressHighlight: { fontWeight: "800", color: C.ink },
  progressBarBg: {
    height: 4,
    backgroundColor: C.line,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: { height: 4, backgroundColor: C.primary, borderRadius: 4 },

  /* LIST */
  listContent: { padding: 14, paddingBottom: 420 },

  /* CART ITEM */
  cartItem: {
    flexDirection: "row",
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 13,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    gap: 12,
  },
  imageWrapper: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: C.page,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    flexShrink: 0,
  },
  itemImage: { width: "100%", height: "100%", resizeMode: "cover" },

  /* ITEM DETAILS */
  itemDetails: { flex: 1, justifyContent: "space-between" },
  itemTopRow: { flexDirection: "row", alignItems: "flex-start", gap: 4 },
  itemName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: C.ink,
    lineHeight: 20,
  },
  removeBtn: { padding: 2 },

  variantChip: {
    alignSelf: "flex-start",
    backgroundColor: C.soft,
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 4,
  },
  variantChipText: { fontSize: 11, color: C.primary, fontWeight: "600" },

  itemBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },

  /* QTY */
  qtyContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.page,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: C.line,
    overflow: "hidden",
  },
  qtyBtn: { paddingHorizontal: 10, paddingVertical: 7 },
  qtyText: {
    fontSize: 14,
    fontWeight: "800",
    color: C.primary,
    minWidth: 22,
    textAlign: "center",
  },

  /* PRICE */
  priceGroup: { alignItems: "flex-end" },
  itemUnitPrice: { fontSize: 11, color: C.muted, fontWeight: "500" },
  itemTotal: { fontSize: 16, fontWeight: "800", color: C.primary },

  /* BILL */
  billContainer: {
    position: "absolute",
    bottom: 88,
    left: 14,
    right: 14,
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 16,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  billTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  billTitle: { fontSize: 15, fontWeight: "800", color: C.ink },
  billRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 9,
  },
  billLabel: { fontSize: 13, color: C.muted },
  billValue: { fontSize: 13, fontWeight: "600", color: C.ink },
  discountLabel: { color: C.primary },
  discountValue: { color: C.primary },
  deliveryRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  freeBadge: {
    backgroundColor: C.badge,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  freeText: { fontSize: 10, fontWeight: "700", color: C.badgeText },
  freePrice: { color: C.primary },
  divider: { height: 1, backgroundColor: "#EEEEEE", marginVertical: 10 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: { fontSize: 15, fontWeight: "700", color: C.ink },
  totalValue: { fontSize: 20, fontWeight: "900", color: C.primary },
  savingsContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.badge,
    padding: 9,
    borderRadius: 9,
    marginTop: 10,
    gap: 6,
  },
  savingsText: { fontSize: 12, fontWeight: "600", color: C.badgeText },

  /* CHECKOUT */
  checkoutContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: C.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
    paddingBottom: 20,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  checkoutBtn: {
    backgroundColor: C.primary,
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 4,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  checkoutBtnDisabled: { opacity: 0.7 },
  checkoutLeft: {},
  checkoutTotal: { fontSize: 19, fontWeight: "900", color: "#fff" },
  checkoutSubtext: {
    fontSize: 11,
    color: "#fff",
    marginTop: 1,
    fontWeight: "500",
  },
  checkoutRight: { flexDirection: "row", alignItems: "center", gap: 7 },
  checkoutText: { fontSize: 14, fontWeight: "700", color: "#fff" },

  /* EMPTY */
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyIconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: C.page,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 2,
    borderColor: C.line,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: C.ink,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: C.muted,
    marginBottom: 32,
    textAlign: "center",
  },
  shopNowBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    elevation: 4,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  shopNowText: { color: "#fff", fontSize: 15, fontWeight: "700" },
}));

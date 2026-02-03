import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCart } from "../context/CartContext";

export default function CartScreen() {
  const { items, updateQty, removeFromCart, clearCart, getCartTotal } =
    useCart();
  const [loading, setLoading] = useState(false);

  const handleRemoveItem = (id: string, name: string) => {
    Alert.alert("Remove Item", `Remove ${name} from cart?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => removeFromCart(id),
      },
    ]);
  };

  const handleClearCart = () => {
    Alert.alert("Clear Cart", "Are you sure you want to remove all items?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear All",
        style: "destructive",
        onPress: () => clearCart(),
      },
    ]);
  };

  const handleCheckout = () => {
    if (items.length === 0) return;

    setLoading(true);
    // Simulate checkout process
    setTimeout(() => {
      setLoading(false);
      router.push("/checkout");
    }, 500);
  };

  const incrementQty = (id: string, currentQty: number) => {
    updateQty(id, currentQty + 1);
  };

  const decrementQty = (id: string, currentQty: number) => {
    if (currentQty > 1) {
      updateQty(id, currentQty - 1);
    } else {
      const item = items.find((i) => i.id === id);
      if (item) handleRemoveItem(id, item.name);
    }
  };

  const total = getCartTotal();
  const deliveryFee = total > 500 ? 0 : 40;
  const discount = total > 1000 ? total * 0.1 : 0;
  const finalTotal = total + deliveryFee - discount;

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={24} color="#1B5E20" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Cart</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="cart-outline" size={64} color="#C8E6C9" />
          </View>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySubtitle}>
            Add some products to get started
          </Text>
          <TouchableOpacity
            style={styles.shopNowBtn}
            onPress={() => router.push("/(tabs)")}
          >
            <Text style={styles.shopNowText}>Shop Now</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1B5E20" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>My Cart</Text>
          <Text style={styles.headerSubtitle}>{items.length} items</Text>
        </View>
        <TouchableOpacity onPress={handleClearCart} style={styles.clearBtn}>
          <Ionicons name="trash-outline" size={22} color="#F44336" />
        </TouchableOpacity>
      </View>

      {/* CART ITEMS */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.cartItem}>
            <Image
              source={{ uri: "https://via.placeholder.com/80" }}
              style={styles.itemImage}
            />

            <View style={styles.itemDetails}>
              <Text style={styles.itemName} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={styles.itemPrice}>₹{item.price}</Text>

              {/* Quantity Controls */}
              <View style={styles.qtyContainer}>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => decrementQty(item.id, item.qty)}
                >
                  <Ionicons
                    name={item.qty === 1 ? "trash-outline" : "remove"}
                    size={18}
                    color={item.qty === 1 ? "#F44336" : "#2E7D32"}
                  />
                </TouchableOpacity>

                <Text style={styles.qtyText}>{item.qty}</Text>

                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => incrementQty(item.id, item.qty)}
                >
                  <Ionicons name="add" size={18} color="#2E7D32" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.itemRight}>
              <TouchableOpacity
                onPress={() => handleRemoveItem(item.id, item.name)}
                style={styles.removeBtn}
              >
                <Ionicons name="close" size={20} color="#999" />
              </TouchableOpacity>
              <Text style={styles.itemTotal}>
                ₹{(item.price * item.qty).toFixed(2)}
              </Text>
            </View>
          </View>
        )}
      />

      {/* BILL SUMMARY */}
      <View style={styles.billContainer}>
        <Text style={styles.billTitle}>Bill Summary</Text>

        <View style={styles.billRow}>
          <Text style={styles.billLabel}>Subtotal</Text>
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
            {total > 500 && (
              <View style={styles.freeBadge}>
                <Text style={styles.freeText}>FREE</Text>
              </View>
            )}
          </View>
          <Text style={[styles.billValue, total > 500 && styles.freePrice]}>
            {total > 500 ? "₹0.00" : `₹${deliveryFee.toFixed(2)}`}
          </Text>
        </View>

        {total <= 500 && (
          <View style={styles.tipContainer}>
            <Ionicons name="information-circle" size={16} color="#FF9800" />
            <Text style={styles.tipText}>
              Add ₹{(500 - total).toFixed(2)} more for free delivery
            </Text>
          </View>
        )}

        <View style={styles.divider} />

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.totalValue}>₹{finalTotal.toFixed(2)}</Text>
        </View>

        {discount > 0 && (
          <View style={styles.savingsContainer}>
            <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
            <Text style={styles.savingsText}>
              You saved ₹{discount.toFixed(2)} on this order
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
        >
          <View style={styles.checkoutLeft}>
            <Text style={styles.checkoutTotal}>₹{finalTotal.toFixed(2)}</Text>
            <Text style={styles.checkoutSubtext}>
              {items.reduce((sum, item) => sum + item.qty, 0)} items
            </Text>
          </View>

          <View style={styles.checkoutRight}>
            <Text style={styles.checkoutText}>
              {loading ? "Processing..." : "Proceed to Checkout"}
            </Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F5F7F2",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#fff",
    elevation: 2,
  },
  backBtn: {
    padding: 4,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1B5E20",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  clearBtn: {
    padding: 4,
  },
  listContent: {
    padding: 14,
    paddingBottom: 400,
  },
  cartItem: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: "#F5F7F2",
  },
  itemDetails: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "space-between",
  },
  itemName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#222",
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  qtyContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F7F2",
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  qtyBtn: {
    padding: 8,
  },
  qtyText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1B5E20",
    marginHorizontal: 12,
    minWidth: 20,
    textAlign: "center",
  },
  itemRight: {
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  removeBtn: {
    padding: 4,
  },
  itemTotal: {
    fontSize: 17,
    fontWeight: "800",
    color: "#2E7D32",
  },
  billContainer: {
    position: "absolute",
    bottom: 90,
    left: 14,
    right: 14,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  billTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1B5E20",
    marginBottom: 12,
  },
  billRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  billLabel: {
    fontSize: 14,
    color: "#666",
  },
  billValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#222",
  },
  discountLabel: {
    color: "#4CAF50",
  },
  discountValue: {
    color: "#4CAF50",
  },
  deliveryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  freeBadge: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  freeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#4CAF50",
  },
  freePrice: {
    color: "#4CAF50",
  },
  tipContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF3E0",
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  tipText: {
    fontSize: 12,
    color: "#F57C00",
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: "#E0E0E0",
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1B5E20",
  },
  totalValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#2E7D32",
  },
  savingsContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
    gap: 6,
  },
  savingsText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4CAF50",
  },
  checkoutContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    padding: 14,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  checkoutBtn: {
    backgroundColor: "#2E7D32",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 4,
  },
  checkoutBtnDisabled: {
    opacity: 0.7,
  },
  checkoutLeft: {},
  checkoutTotal: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
  },
  checkoutSubtext: {
    fontSize: 12,
    color: "#E8F5E9",
    marginTop: 2,
  },
  checkoutRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  checkoutText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
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
    backgroundColor: "#F5F7F2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1B5E20",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 32,
  },
  shopNowBtn: {
    backgroundColor: "#2E7D32",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    elevation: 4,
  },
  shopNowText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});

import { useAddress } from "@/context/AddressContext";
import { useOrders } from "@/context/OrderContext";
import { openRazorpay } from "@/utils/razorpay";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCart } from "../context/CartContext";

export default function CheckoutScreen() {
  const { items, clearCart } = useCart();
  const { placeOrder } = useOrders();
  const { selectedAddress, refreshAddress } = useAddress();
  const [isProcessing, setIsProcessing] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(1));

  const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const deliveryFee = total > 500 ? 0 : 40;
  const grandTotal = total + deliveryFee;

  // Refresh address when screen focuses
  useEffect(() => {
    refreshAddress();
  }, []);

  const handleChangeAddress = () => {
    router.push({
      pathname: "/my-addresses",
      params: { fromCheckout: "true" },
    });
  };

  const handlePlaceOrder = () => {
    if (items.length === 0) {
      Alert.alert("Empty Cart", "Your cart is empty");
      return;
    }

    if (!selectedAddress) {
      Alert.alert(
        "No Address",
        "Please add a delivery address before placing order",
        [
          {
            text: "Add Address",
            onPress: () => router.push("/add-address"),
          },
          {
            text: "Cancel",
            style: "cancel",
          },
        ],
      );
      return;
    }

    // Button press animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    setIsProcessing(true);

    openRazorpay({
      amount: grandTotal,
      onSuccess: (paymentId) => {
        placeOrder(items, grandTotal);
        clearCart();
        setIsProcessing(false);
        Alert.alert("Success!", `Payment successful\nOrder ID: ${paymentId}`, [
          {
            text: "View Orders",
            onPress: () => router.replace("/(tabs)/orders"),
          },
        ]);
      },
      onFailure: () => {
        setIsProcessing(false);
        Alert.alert("Payment Failed", "Your payment was cancelled or failed");
      },
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Checkout</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* DELIVERY ADDRESS */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="location" size={20} color="#2E7D32" />
            <Text style={styles.sectionTitle}>Delivery Address</Text>
          </View>

          {selectedAddress ? (
            <>
              <View style={styles.addressBox}>
                <View style={styles.addressTop}>
                  <Text style={styles.addressTitle}>
                    {selectedAddress.name}
                  </Text>
                  {selectedAddress.isDefault && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultText}>DEFAULT</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.address}>
                  {selectedAddress.addressLine}
                </Text>
                <Text style={styles.addressCity}>
                  {selectedAddress.city}, {selectedAddress.state} -{" "}
                  {selectedAddress.pincode}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.changeBtn}
                onPress={handleChangeAddress}
              >
                <Ionicons name="create-outline" size={16} color="#2E7D32" />
                <Text style={styles.changeBtnText}>Change Address</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles.addAddressBtn}
              onPress={() => router.push("/add-address")}
            >
              <Ionicons name="add-circle-outline" size={24} color="#2E7D32" />
              <View style={styles.addAddressTextContainer}>
                <Text style={styles.addAddressTitle}>Add Delivery Address</Text>
                <Text style={styles.addAddressSubtitle}>
                  Required to place order
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {/* ORDER ITEMS */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="cart" size={20} color="#2E7D32" />
            <Text style={styles.sectionTitle}>Order Summary</Text>
          </View>

          {items.map((item, index) => (
            <View
              key={item.id}
              style={[
                styles.itemRow,
                index !== items.length - 1 && styles.itemBorder,
              ]}
            >
              <View style={styles.itemLeft}>
                <View style={styles.qtyBadge}>
                  <Text style={styles.qtyText}>{item.qty}x</Text>
                </View>
                <Text style={styles.itemName}>{item.name}</Text>
              </View>
              <Text style={styles.itemPrice}>₹{item.price * item.qty}</Text>
            </View>
          ))}
        </View>

        {/* BILL DETAILS */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="receipt" size={20} color="#2E7D32" />
            <Text style={styles.sectionTitle}>Bill Details</Text>
          </View>

          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Item Total</Text>
            <Text style={styles.billValue}>₹{total}</Text>
          </View>

          <View style={styles.billRow}>
            <View style={styles.deliveryLabel}>
              <Text style={styles.billLabel}>Delivery Fee</Text>
              {deliveryFee === 0 && <Text style={styles.freeTag}>FREE</Text>}
            </View>
            <Text
              style={[
                styles.billValue,
                deliveryFee === 0 && styles.strikethrough,
              ]}
            >
              ₹{deliveryFee === 0 ? 40 : deliveryFee}
            </Text>
          </View>

          {total < 500 && (
            <View style={styles.savingTip}>
              <Ionicons name="information-circle" size={16} color="#FF9800" />
              <Text style={styles.savingText}>
                Add ₹{500 - total} more to get FREE delivery
              </Text>
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>To Pay</Text>
            <Text style={styles.totalAmount}>₹{grandTotal}</Text>
          </View>
        </View>

        {/* PAYMENT METHOD */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="card" size={20} color="#2E7D32" />
            <Text style={styles.sectionTitle}>Payment Method</Text>
          </View>
          <View style={styles.paymentOption}>
            <Ionicons name="logo-google" size={20} color="#4285F4" />
            <Text style={styles.paymentText}>
              Razorpay (Cards, UPI, Wallet)
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FIXED BOTTOM */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomLeft}>
          <Text style={styles.bottomTotal}>₹{grandTotal}</Text>
          <Text style={styles.bottomLabel}>Total Amount</Text>
        </View>
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <TouchableOpacity
            style={[
              styles.placeOrderBtn,
              (isProcessing || !selectedAddress) &&
                styles.placeOrderBtnDisabled,
            ]}
            onPress={handlePlaceOrder}
            disabled={isProcessing || !selectedAddress}
          >
            {isProcessing ? (
              <Text style={styles.placeOrderText}>Processing...</Text>
            ) : (
              <>
                <Text style={styles.placeOrderText}>PLACE ORDER</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F6F7F2",
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  backBtn: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 15,
    marginTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
  },
  addressBox: {
    backgroundColor: "#F5F5F5",
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  addressTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  addressTitle: {
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
  },
  defaultBadge: {
    backgroundColor: "#2E7D32",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  defaultText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  address: {
    color: "#666",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  addressCity: {
    color: "#666",
    fontSize: 13,
  },
  changeBtn: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  changeBtnText: {
    color: "#2E7D32",
    fontWeight: "600",
    fontSize: 14,
  },
  addAddressBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF9E6",
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FFD700",
    borderStyle: "dashed",
  },
  addAddressTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  addAddressTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2E7D32",
    marginBottom: 2,
  },
  addAddressSubtitle: {
    fontSize: 12,
    color: "#666",
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  qtyBadge: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  qtyText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2E7D32",
  },
  itemName: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000",
  },
  billRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  billLabel: {
    fontSize: 14,
    color: "#666",
  },
  billValue: {
    fontSize: 14,
    color: "#000",
    fontWeight: "600",
  },
  deliveryLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  freeTag: {
    backgroundColor: "#2E7D32",
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  strikethrough: {
    textDecorationLine: "line-through",
    color: "#999",
  },
  savingTip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFF3E0",
    padding: 10,
    borderRadius: 6,
    marginTop: 4,
  },
  savingText: {
    fontSize: 12,
    color: "#E65100",
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
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2E7D32",
  },
  paymentOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    padding: 14,
    borderRadius: 8,
    gap: 10,
  },
  paymentText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  bottomLeft: {
    flex: 1,
  },
  bottomTotal: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2E7D32",
  },
  bottomLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  placeOrderBtn: {
    backgroundColor: "#2E7D32",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  placeOrderBtnDisabled: {
    backgroundColor: "#9E9E9E",
  },
  placeOrderText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});

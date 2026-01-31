import { useOrders } from "@/context/OrderContext";
import { openRazorpay } from "@/utils/razorpay";
import { router } from "expo-router";
import {
  FlatList,
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

  const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);

  const handlePlaceOrder = () => {
    if (items.length === 0) {
      alert("Cart is empty");
      return;
    }

    openRazorpay({
      amount: total,
      onSuccess: (paymentId) => {
        placeOrder(items, total);
        clearCart();
        alert("Payment successful ✅\n" + paymentId);
        router.replace("/(tabs)/orders");
      },
      onFailure: () => {
        alert("Payment cancelled ❌");
      },
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Checkout</Text>

        {/* ADDRESS */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>
          <Text style={styles.address}>
            VADI Farm,
            {"\n"}Village Road,
            {"\n"}Maharashtra, India
          </Text>
        </View>

        {/* ORDER ITEMS */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Order Summary</Text>

          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <Text style={styles.itemName}>
                  {item.name} × {item.qty}
                </Text>
                <Text style={styles.price}>₹{item.price * item.qty}</Text>
              </View>
            )}
          />
        </View>

        {/* TOTAL */}
        <View style={styles.totalRow}>
          <Text style={styles.totalText}>Total</Text>
          <Text style={styles.totalAmount}>₹{total}</Text>
        </View>

        {/* PLACE ORDER */}
        <TouchableOpacity
          style={styles.placeOrderBtn}
          onPress={handlePlaceOrder}
        >
          <Text style={styles.placeOrderText}>PLACE ORDER</Text>
        </TouchableOpacity>
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
    padding: 15,
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 15,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    marginBottom: 12,
  },
  sectionTitle: {
    fontWeight: "700",
    marginBottom: 8,
  },
  address: {
    color: "#555",
    lineHeight: 20,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  itemName: {
    fontWeight: "600",
  },
  price: {
    fontWeight: "600",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 15,
  },
  totalText: {
    fontSize: 18,
    fontWeight: "700",
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2E7D32",
  },
  placeOrderBtn: {
    backgroundColor: "#2E7D32",
    padding: 15,
    borderRadius: 8,
  },
  placeOrderText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
});

import { FlatList, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useOrders } from "../../context/OrderContext";

export default function OrdersScreen() {
  const { orders } = useOrders();

  if (orders.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.empty}>No orders yet 📦</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>My Orders</Text>

        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View>
                <Text style={styles.orderId}>Order #{item.id.slice(-4)}</Text>
                <Text style={styles.date}>{item.date}</Text>
                <Text style={styles.status}>Status: {item.status}</Text>
              </View>

              <Text style={styles.amount}>₹{item.total}</Text>
            </View>
          )}
        />
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
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 10,
  },
  card: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  orderId: {
    fontWeight: "700",
  },
  date: {
    color: "#555",
    marginVertical: 3,
  },
  status: {
    color: "#2E7D32",
    fontWeight: "600",
  },
  amount: {
    fontWeight: "700",
    fontSize: 16,
  },
  empty: {
    marginTop: 100,
    textAlign: "center",
    fontSize: 18,
  },
});

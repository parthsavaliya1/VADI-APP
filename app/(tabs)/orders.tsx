import { useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useOrders } from "../../context/OrderContext";

export default function OrdersScreen() {
  const { orders } = useOrders();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "placed":
        return "#FF9800";
      case "processing":
        return "#2196F3";
      case "shipped":
        return "#9C27B0";
      case "delivered":
        return "#4CAF50";
      case "cancelled":
        return "#F44336";
      default:
        return "#757575";
    }
  };

  if (orders.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📦</Text>
          <Text style={styles.emptyTitle}>No Orders Yet</Text>
          <Text style={styles.emptySubtitle}>
            Your order history will appear here
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>My Orders</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{orders.length}</Text>
          </View>
        </View>

        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const isExpanded = expandedId === item.id;
            const statusColor = getStatusColor(item.status);

            return (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => toggleExpand(item.id)}
                style={styles.card}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.orderInfo}>
                    <Text style={styles.orderId}>
                      Order #{item.id.slice(-6)}
                    </Text>
                    <Text style={styles.date}>📅 {item.date}</Text>
                  </View>

                  <View style={styles.cardRight}>
                    <Text style={styles.amount}>₹{item.total.toFixed(2)}</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: statusColor + "20" },
                      ]}
                    >
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: statusColor },
                        ]}
                      />
                      <Text style={[styles.status, { color: statusColor }]}>
                        {item.status}
                      </Text>
                    </View>
                  </View>
                </View>

                {isExpanded && (
                  <View style={styles.expandedContent}>
                    <View style={styles.divider} />

                    <Text style={styles.itemsTitle}>
                      Order Items ({item.items.length})
                    </Text>

                    {item.items.map((product, index) => (
                      <View key={index} style={styles.itemRow}>
                        <View style={styles.itemInfo}>
                          <Text style={styles.itemName} numberOfLines={1}>
                            {product.name}
                          </Text>
                          <Text style={styles.itemQuantity}>
                            Qty: {product.quantity}
                          </Text>
                        </View>
                        <Text style={styles.itemPrice}>
                          ₹{(product.price * product.quantity).toFixed(2)}
                        </Text>
                      </View>
                    ))}

                    <View style={styles.totalRow}>
                      <Text style={styles.totalLabel}>Total Amount</Text>
                      <Text style={styles.totalAmount}>
                        ₹{item.total.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                )}

                <View style={styles.expandIndicator}>
                  <Text style={styles.expandText}>
                    {isExpanded ? "Tap to collapse ▲" : "Tap for details ▼"}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
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
    flex: 1,
    paddingHorizontal: 15,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    gap: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1a1a1a",
  },
  badge: {
    backgroundColor: "#4CAF50",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: "center",
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  listContent: {
    paddingBottom: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  orderInfo: {
    flex: 1,
  },
  orderId: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  date: {
    fontSize: 13,
    color: "#666",
  },
  cardRight: {
    alignItems: "flex-end",
    gap: 6,
  },
  amount: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1a1a1a",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  status: {
    fontSize: 12,
    fontWeight: "600",
  },
  expandIndicator: {
    marginTop: 12,
    alignItems: "center",
  },
  expandText: {
    fontSize: 12,
    color: "#999",
    fontWeight: "500",
  },
  expandedContent: {
    marginTop: 16,
  },
  divider: {
    height: 1,
    backgroundColor: "#f0f0f0",
    marginBottom: 16,
  },
  itemsTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    marginBottom: 6,
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  itemQuantity: {
    fontSize: 12,
    color: "#666",
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#333",
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: "800",
    color: "#4CAF50",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
});

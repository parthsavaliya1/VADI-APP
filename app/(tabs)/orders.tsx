import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useOrders } from "../../context/OrderContext";

interface OrderItem {
  product: {
    _id: string;
    name: string;
    image: string;
  };
  variantId: string;
  productName: string;
  image: string;
  packSize: number;
  packUnit: string;
  unitPrice: number;
  mrp: number;
  discount: number;
  tax: {
    gstPercent: number;
    inclusive: boolean;
  };
  quantity: number;
  subtotal: number;
  seller: {
    sellerId: string;
    sellerName: string;
  };
}

interface Order {
  _id: string;
  orderNumber: string;
  items: OrderItem[];
  totalItems: number;
  totalQuantity: number;
  subtotal: number;
  totalDiscount: number;
  taxAmount: number;
  deliveryFee: number;
  grandTotal: number;
  payment: {
    method: string;
    status: string;
    isCod: boolean;
    codCollected: boolean;
  };
  address: {
    addressId: string;
    snapshot: {
      name: string;
      phone: string;
      city: string;
      state: string;
      pincode: string;
      landmark?: string;
    };
  };
  status: string;
  createdAt: string;
  updatedAt: string;
}

export default function OrdersScreen() {
  const { orders, fetchOrders, loading } = useOrders();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "placed":
        return "#FF9800";
      case "confirmed":
        return "#2196F3";
      case "packed":
        return "#9C27B0";
      case "out_for_delivery":
        return "#FF6F00";
      case "delivered":
        return "#4CAF50";
      case "cancelled":
        return "#F44336";
      case "returned":
        return "#E91E63";
      default:
        return "#757575";
    }
  };

  const getStatusText = (status: string) => {
    return status
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case "cod":
        return "💵";
      case "upi":
        return "📱";
      case "card":
        return "💳";
      case "wallet":
        return "👛";
      default:
        return "💰";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    return date.toLocaleDateString("en-IN", options);
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading your orders...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!orders || orders.length === 0) {
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
          keyExtractor={(item) => item._id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#4CAF50"]}
              tintColor="#4CAF50"
            />
          }
          renderItem={({ item }: { item: Order }) => {
            const isExpanded = expandedId === item._id;
            const statusColor = getStatusColor(item.status);
            const statusText = getStatusText(item.status);

            return (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => toggleExpand(item._id)}
                style={styles.card}
              >
                {/* Card Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.orderInfo}>
                    <Text style={styles.orderId}>#{item.orderNumber}</Text>
                    <Text style={styles.date}>
                      📅 {formatDate(item.createdAt)}
                    </Text>
                  </View>

                  <View style={styles.cardRight}>
                    <Text style={styles.amount}>₹{item.grandTotal}</Text>
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
                      <Text style={[styles.statusTag, { color: statusColor }]}>
                        {statusText}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Quick Summary */}
                <View style={styles.quickSummary}>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Items</Text>
                    <Text style={styles.summaryValue}>
                      {item.totalItems} ({item.totalQuantity} qty)
                    </Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Payment</Text>
                    <Text style={styles.summaryValue}>
                      {getPaymentMethodIcon(item.payment.method)}{" "}
                      {item.payment.method.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {/* Expanded Content */}
                {isExpanded && (
                  <View style={styles.expandedContent}>
                    <View style={styles.divider} />

                    {/* Order Items */}
                    <Text style={styles.sectionTitle}>
                      📦 Order Items ({item.items.length})
                    </Text>

                    {item.items.map((product, index) => (
                      <View key={index} style={styles.itemRow}>
                        <Image
                          source={{ uri: product.image }}
                          style={styles.itemImage}
                          resizeMode="cover"
                        />
                        <View style={styles.itemDetails}>
                          <Text style={styles.itemName} numberOfLines={2}>
                            {product.productName}
                          </Text>
                          <Text style={styles.itemMeta}>
                            {product.packSize} {product.packUnit} × ₹
                            {product.unitPrice}
                          </Text>
                          <Text style={styles.itemQuantity}>
                            Qty: {product.quantity}
                          </Text>
                          {product.discount > 0 && (
                            <View style={styles.discountBadge}>
                              <Text style={styles.discountText}>
                                {product.discount}% OFF
                              </Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.itemPriceContainer}>
                          <Text style={styles.itemPrice}>
                            ₹{product.subtotal}
                          </Text>
                          {product.mrp > product.unitPrice && (
                            <Text style={styles.itemMrp}>₹{product.mrp}</Text>
                          )}
                        </View>
                      </View>
                    ))}

                    {/* Price Breakdown */}
                    <View style={styles.priceBreakdown}>
                      <Text style={styles.sectionTitle}>💰 Price Details</Text>

                      <View style={styles.priceRow}>
                        <Text style={styles.priceLabel}>Subtotal</Text>
                        <Text style={styles.priceValue}>₹{item.subtotal}</Text>
                      </View>

                      {item.totalDiscount > 0 && (
                        <View style={styles.priceRow}>
                          <Text style={styles.priceLabel}>Discount</Text>
                          <Text style={styles.discountPrice}>
                            -₹{item.totalDiscount}
                          </Text>
                        </View>
                      )}

                      <View style={styles.priceRow}>
                        <Text style={styles.priceLabel}>Tax (GST)</Text>
                        <Text style={styles.priceValue}>
                          ₹{item.taxAmount.toFixed(2)}
                        </Text>
                      </View>

                      <View style={styles.priceRow}>
                        <Text style={styles.priceLabel}>Delivery Fee</Text>
                        <Text style={styles.priceValue}>
                          {item.deliveryFee === 0
                            ? "FREE"
                            : `₹${item.deliveryFee}`}
                        </Text>
                      </View>

                      <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Grand Total</Text>
                        <Text style={styles.totalAmount}>
                          ₹{item.grandTotal}
                        </Text>
                      </View>
                    </View>

                    {/* Delivery Address */}
                    <View style={styles.addressSection}>
                      <Text style={styles.sectionTitle}>
                        📍 Delivery Address
                      </Text>
                      <View style={styles.addressCard}>
                        <Text style={styles.addressName}>
                          {item.address.snapshot.name}
                        </Text>
                        <Text style={styles.addressPhone}>
                          📞 {item.address.snapshot.phone}
                        </Text>
                        <Text style={styles.addressText}>
                          {item.address.snapshot.city},{" "}
                          {item.address.snapshot.state} -{" "}
                          {item.address.snapshot.pincode}
                        </Text>
                        {item.address.snapshot.landmark && (
                          <Text style={styles.addressLandmark}>
                            Landmark: {item.address.snapshot.landmark}
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* Payment Status */}
                    <View style={styles.paymentSection}>
                      <Text style={styles.sectionTitle}>💳 Payment Info</Text>
                      <View style={styles.paymentCard}>
                        <View style={styles.paymentRow}>
                          <Text style={styles.paymentLabel}>Method:</Text>
                          <Text style={styles.paymentValue}>
                            {item.payment.method.toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.paymentRow}>
                          <Text style={styles.paymentLabel}>Status:</Text>
                          <Text
                            style={[
                              styles.paymentValue,
                              {
                                color:
                                  item.payment.status === "paid"
                                    ? "#4CAF50"
                                    : "#FF9800",
                              },
                            ]}
                          >
                            {item.payment.status.toUpperCase()}
                          </Text>
                        </View>
                        {item.payment.isCod && (
                          <View style={styles.codBadge}>
                            <Text style={styles.codText}>
                              💵 Cash on Delivery
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                )}

                {/* Expand Indicator */}
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
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
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderId: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  date: {
    fontSize: 12,
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
  statusTag: {
    fontSize: 11,
    fontWeight: "600",
  },
  quickSummary: {
    flexDirection: "row",
    backgroundColor: "#F9F9F9",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: "#E0E0E0",
  },
  summaryLabel: {
    fontSize: 11,
    color: "#666",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1a1a1a",
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
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: "row",
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    alignItems: "center",
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
  },
  itemDetails: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  itemMeta: {
    fontSize: 12,
    color: "#666",
    marginBottom: 2,
  },
  itemQuantity: {
    fontSize: 12,
    color: "#666",
  },
  discountBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#4CAF50",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  discountText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
  },
  itemPriceContainer: {
    alignItems: "flex-end",
    marginLeft: 8,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  itemMrp: {
    fontSize: 12,
    color: "#999",
    textDecorationLine: "line-through",
  },
  priceBreakdown: {
    marginTop: 16,
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
    padding: 12,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  priceLabel: {
    fontSize: 13,
    color: "#666",
  },
  priceValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
  },
  discountPrice: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4CAF50",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
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
  addressSection: {
    marginTop: 16,
  },
  addressCard: {
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#4CAF50",
  },
  addressName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  addressPhone: {
    fontSize: 13,
    color: "#666",
    marginBottom: 6,
  },
  addressText: {
    fontSize: 13,
    color: "#333",
    lineHeight: 18,
  },
  addressLandmark: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    fontStyle: "italic",
  },
  paymentSection: {
    marginTop: 16,
  },
  paymentCard: {
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
    padding: 12,
  },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  paymentLabel: {
    fontSize: 13,
    color: "#666",
  },
  paymentValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
  },
  codBadge: {
    marginTop: 8,
    backgroundColor: "#FF9800",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  codText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
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

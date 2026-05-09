import { useEffect, useRef, useState } from "react";
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
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const listRef = useRef<FlatList<Order> | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  };

  const getStatusColors = (status: string) => {
    switch (status.toLowerCase()) {
      case "placed":
      case "confirmed":
      case "packed":
      case "out_for_delivery":
      case "processing":
        return { text: "#2F80ED", bg: "#E8F1FF" };
      case "shipped":
        return { text: "#2F80ED", bg: "#E8F1FF" };
      case "delivered":
        return { text: "#2E7D32", bg: "#E9F7EC" };
      case "cancelled":
      case "returned":
        return { text: "#D32F2F", bg: "#FDECEC" };
      default:
        return { text: "#64748B", bg: "#EEF2F7" };
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

  const getFilterValue = (status: string) => {
    const normalized = status
      .toLowerCase()
      .trim()
      .replace(/[-\s]+/g, "_");

    if (
      normalized.includes("cancel") ||
      normalized.includes("return") ||
      normalized.includes("failed") ||
      normalized.includes("reject")
    ) {
      return "cancelled";
    }

    if (
      normalized.includes("deliver") ||
      normalized.includes("complete") ||
      normalized.includes("fulfilled")
    ) {
      return "delivered";
    }

    if (normalized.includes("ship") || normalized.includes("dispatch")) {
      return "shipped";
    }
    return "processing";
  };

  const filters = [
    { key: "all", label: "All" },
    { key: "processing", label: "Processing" },
    { key: "shipped", label: "Shipped" },
    { key: "delivered", label: "Delivered" },
    { key: "cancelled", label: "Cancelled" },
  ];

  const filteredOrders =
    selectedFilter === "all"
      ? orders
      : orders.filter((order) => getFilterValue(order.status) === selectedFilter);

  useEffect(() => {
    setExpandedId(null);
    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
    });
  }, [selectedFilter]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getImagePreview = (orderItems: OrderItem[]) => {
    return orderItems.slice(0, 3);
  };

  const renderStatusFilter = () => (
    <FlatList
      horizontal
      data={filters}
      keyExtractor={(item) => item.key}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterRow}
      renderItem={({ item: filter }) => {
        const isActive = selectedFilter === filter.key;
        return (
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.filterChip, isActive && styles.filterChipActive]}
            onPress={() => setSelectedFilter(filter.key)}
          >
            <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
              {filter.label}
            </Text>
          </TouchableOpacity>
        );
      }}
    />
  );

  const renderOrderCard = ({ item }: { item: Order }) => {
    const statusText = getStatusText(item.status);
    const statusColors = getStatusColors(item.status);
    const imagePreview = getImagePreview(item.items);
    const isExpanded = expandedId === item._id;

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View>
            <Text style={styles.orderId}>Order #{item.orderNumber}</Text>
            <Text style={styles.orderDate}>{formatDate(item.createdAt)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
            <Text style={[styles.statusText, { color: statusColors.text }]}>
              {statusText}
            </Text>
          </View>
        </View>

        <View style={styles.imageRow}>
          {imagePreview.map((orderItem, index) => (
            <View key={`${orderItem.variantId}-${index}`} style={styles.imageWrap}>
              <Image
                source={{ uri: orderItem.image }}
                style={styles.itemImage}
                resizeMode="cover"
              />
            </View>
          ))}
        </View>

        <View style={styles.cardBottom}>
          <Text style={styles.itemCount}>
            {item.totalItems} {item.totalItems > 1 ? "items" : "item"}
          </Text>
          <Text style={styles.amount}>₹{item.grandTotal.toFixed(2)}</Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.viewDetailsBtn}
          onPress={() =>
            setExpandedId((prev) => (prev === item._id ? null : item._id))
          }
        >
          <Text style={styles.viewDetailsText}>
            {isExpanded ? "Hide Details" : "View Details"}
          </Text>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.expandedContent}>
            <Text style={styles.sectionTitle}>
              Order Items ({item.items.length})
            </Text>
            {item.items.map((product, index) => (
              <View key={`${product.variantId}-${index}-detail`} style={styles.detailItemRow}>
                <Image
                  source={{ uri: product.image }}
                  style={styles.detailItemImage}
                  resizeMode="cover"
                />
                <View style={styles.detailItemInfo}>
                  <Text style={styles.detailItemName} numberOfLines={2}>
                    {product.productName}
                  </Text>
                  <Text style={styles.detailItemMeta}>
                    {product.packSize} {product.packUnit} x ₹{product.unitPrice} | Qty:{" "}
                    {product.quantity}
                  </Text>
                </View>
                <Text style={styles.detailItemPrice}>₹{product.subtotal}</Text>
              </View>
            ))}

            <View style={styles.detailsBlock}>
              <Text style={styles.sectionTitle}>Price Details</Text>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Subtotal</Text>
                <Text style={styles.priceValue}>₹{item.subtotal}</Text>
              </View>
              {item.totalDiscount > 0 && (
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Discount</Text>
                  <Text style={styles.discountValue}>-₹{item.totalDiscount}</Text>
                </View>
              )}
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Tax</Text>
                <Text style={styles.priceValue}>₹{item.taxAmount.toFixed(2)}</Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Delivery</Text>
                <Text style={styles.priceValue}>
                  {item.deliveryFee === 0 ? "FREE" : `₹${item.deliveryFee}`}
                </Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Grand Total</Text>
                <Text style={styles.totalValue}>₹{item.grandTotal}</Text>
              </View>
            </View>

            <View style={styles.detailsBlock}>
              <Text style={styles.sectionTitle}>Delivery Address</Text>
              <Text style={styles.addressName}>{item.address.snapshot.name}</Text>
              <Text style={styles.addressMeta}>{item.address.snapshot.phone}</Text>
              <Text style={styles.addressMeta}>
                {item.address.snapshot.city}, {item.address.snapshot.state} -{" "}
                {item.address.snapshot.pincode}
              </Text>
              {!!item.address.snapshot.landmark && (
                <Text style={styles.addressMeta}>
                  Landmark: {item.address.snapshot.landmark}
                </Text>
              )}
            </View>

            <View style={styles.detailsBlock}>
              <Text style={styles.sectionTitle}>Payment Info</Text>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Method</Text>
                <Text style={styles.priceValue}>
                  {getPaymentMethodIcon(item.payment.method)}{" "}
                  {item.payment.method.toUpperCase()}
                </Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Status</Text>
                <Text style={styles.priceValue}>
                  {item.payment.status.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E7A35" />
          <Text style={styles.loadingText}>Loading your orders...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.emptyContainer}>
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
        <FlatList
          ref={listRef}
          key={selectedFilter}
          data={filteredOrders}
          keyExtractor={(item) => item._id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContent,
            filteredOrders.length === 0 && styles.emptyListContent,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#1E7A35"]}
              tintColor="#1E7A35"
            />
          }
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Text style={styles.pageTitle}>My Orders</Text>
              {renderStatusFilter()}
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyFilterContainer}>
              <Text style={styles.emptyFilterText}>
                No orders in {filters.find((f) => f.key === selectedFilter)?.label}.
              </Text>
            </View>
          }
          renderItem={renderOrderCard}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F8F9F8",
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: "#6B7280",
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
    marginTop: 4,
    marginBottom: 12,
  },
  listHeader: {
    paddingBottom: 8,
  },
  filterRow: {
    alignItems: "center",
    paddingRight: 8,
    paddingBottom: 8,
  },
  filterChip: {
    borderRadius: 8,
    backgroundColor: "#ECEFEC",
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: "#1E7A35",
  },
  filterText: {
    color: "#4B5563",
    fontSize: 12,
    fontWeight: "600",
  },
  filterTextActive: {
    color: "#FFFFFF",
  },
  listContent: {
    paddingBottom: 16,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: "flex-start",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EBEEEB",
    padding: 14,
    marginBottom: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  orderId: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  orderDate: {
    marginTop: 2,
    fontSize: 12,
    color: "#6B7280",
  },
  statusBadge: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  imageRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  imageWrap: {
    width: 56,
    height: 56,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
    backgroundColor: "#F9FAFB",
  },
  itemImage: {
    width: "100%",
    height: "100%",
  },
  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  itemCount: {
    fontSize: 13,
    color: "#6B7280",
  },
  amount: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
  },
  viewDetailsBtn: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 10,
  },
  viewDetailsText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E7A35",
  },
  expandedContent: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 10,
  },
  detailItemRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    padding: 8,
  },
  detailItemImage: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: "#EEF2F7",
  },
  detailItemInfo: {
    flex: 1,
    marginLeft: 8,
    marginRight: 8,
  },
  detailItemName: {
    fontSize: 13,
    color: "#111827",
    fontWeight: "600",
  },
  detailItemMeta: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  detailItemPrice: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  detailsBlock: {
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  priceLabel: {
    fontSize: 13,
    color: "#6B7280",
  },
  priceValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  discountValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E7A35",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  totalValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  addressName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  addressMeta: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
  emptyFilterContainer: {
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 20,
  },
  emptyFilterText: {
    fontSize: 14,
    color: "#6B7280",
  },
});

import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Image,
  LayoutAnimation,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useOrders } from "../../context/OrderContext";
import * as Haptics from "expo-haptics";
import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/context/AuthContext";
import { showAlert } from "@/context/CustomAlertContext";
import { API } from "@/utils/api";
import { downloadOrderInvoicePdf } from "@/utils/orderInvoice";
import { C, themed } from "@/constants/theme";

if (Platform.OS === "android") {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrderItem {
  product: { _id: string; name: string; image: string };
  variantId: string;
  productName: string;
  image: string;
  packSize: number;
  packUnit: string;
  unitPrice: number;
  mrp: number;
  discount: number;
  tax: { gstPercent: number; inclusive: boolean };
  quantity: number;
  subtotal: number;
  seller: { sellerId: string; sellerName: string };
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
  payment: { method: string; status: string; isCod: boolean; codCollected: boolean };
  address: {
    addressId: string;
    snapshot: {
      name: string;
      phone: string;
      addressLine?: string;
      city: string;
      state: string;
      pincode: string;
      landmark?: string;
    };
  };
  status: string;
  deliveredAt?: string;
  returnRequest?: {
    status?: string;
    reason?: string;
    refundedTo?: string;
    refundAmount?: number;
    items?: { productName?: string; quantity?: number; action?: string }[];
  };
  createdAt: string;
  updatedAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (ds: string) =>
  new Date(ds).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

const normalizeStatus = (status: string) =>
  status.toLowerCase().trim().replace(/[-\s]+/g, "_");

const formatStatus = (s: string) =>
  normalizeStatus(s)
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");

const getStatusConfig = (status: string) => {
  const normalized = normalizeStatus(status);
  switch (normalized) {
    case "delivered":
      return { text: C.ink, bg: C.soft, dot: C.primary, icon: "checkmark-done-circle", label: formatStatus(normalized) };
    case "cancelled":
    case "returned":
      return { text: "#991B1B", bg: "#FEE2E2", dot: "#EF4444", icon: "close-circle", label: formatStatus(normalized) };
    case "shipped":
    case "dispatched":
      return { text: "#1E40AF", bg: "#DBEAFE", dot: "#3B82F6", icon: "cube", label: formatStatus(normalized) };
    case "out_for_delivery":
      return { text: "#92400E", bg: "#FEF3C7", dot: "#F59E0B", icon: "bicycle", label: formatStatus(normalized) };
    case "packed":
      return { text: C.ink, bg: C.soft, dot: "#EA580C", icon: "archive", label: formatStatus(normalized) };
    default:
      return { text: "#5B21B6", bg: "#EDE9FE", dot: "#8B5CF6", icon: "time", label: formatStatus(normalized) };
  }
};

const getFilterValue = (status: string) => {
  const n = status.toLowerCase().replace(/[-\s]+/g, "_");
  if (n.includes("cancel") || n.includes("return")) return "cancelled";
  if (n.includes("deliver") || n.includes("complete")) return "delivered";
  if (n === "shipped" || n === "out_for_delivery") return "shipped";
  return "processing";
};

/** Primary CTA still opens tracking/timeline; copy matches whether the shipment is ongoing or finished */
const getOrderPrimaryAction = (status: string) => {
  const bucket = getFilterValue(status);
  if (bucket === "delivered") {
    return { label: "View Timeline", icon: "reader-outline" as const };
  }
  if (bucket === "cancelled") {
    return { label: "Order Details", icon: "information-circle-outline" as const };
  }
  return { label: "Track Order", icon: "navigate-outline" as const };
};

const getPaymentIcon = (method: string) => {
  switch (method.toLowerCase()) {
    case "cod": return "cash-outline";
    case "upi": return "phone-portrait-outline";
    case "card": return "card-outline";
    default: return "wallet-outline";
  }
};

// ─── Filter Chip ──────────────────────────────────────────────────────────────

const FILTERS = [
  { key: "all", label: "All Orders", icon: "apps-outline" },
  { key: "processing", label: "Processing", icon: "time-outline" },
  { key: "shipped", label: "On the way", icon: "cube-outline" },
  { key: "delivered", label: "Delivered", icon: "checkmark-done-outline" },
  { key: "cancelled", label: "Cancelled", icon: "close-circle-outline" },
];

function FilterChip({
  filter,
  isActive,
  onPress,
  count,
}: {
  filter: (typeof FILTERS)[number];
  isActive: boolean;
  onPress: () => void;
  count?: number;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Haptics.selectionAsync();
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.92, duration: 80, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, tension: 200, friction: 8, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={[styles.filterChip, isActive && styles.filterChipActive]}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        <Ionicons
          name={filter.icon as any}
          size={13}
          color={isActive ? "#fff" : C.muted}
          style={{ marginRight: 4 }}
        />
        <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
          {filter.label}
        </Text>
        {count !== undefined && count > 0 && (
          <View style={[styles.filterBadge, isActive && styles.filterBadgeActive]}>
            <Text style={[styles.filterBadgeText, isActive && styles.filterBadgeTextActive]}>
              {count}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Order Card ───────────────────────────────────────────────────────────────

function OrderCard({
  item,
  index,
  expandedId,
  setExpandedId,
  onTrack,
  userId,
  onRefresh,
}: {
  item: Order;
  index: number;
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  onTrack: (order: Order) => void;
  userId: string;
  onRefresh: () => void;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const trackBtnScale = useRef(new Animated.Value(1)).current;
  const [invoiceBusy, setInvoiceBusy] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [returnBusy, setReturnBusy] = useState(false);
  const [reorderBusy, setReorderBusy] = useState(false);
  const [selectedReturns, setSelectedReturns] = useState<Record<string, "refund" | "replace">>({});
  const isExpanded = expandedId === item._id;
  const statusConfig = getStatusConfig(item.status);
  const primaryAction = getOrderPrimaryAction(item.status);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 80,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: index * 80,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const toggleExpand = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(isExpanded ? null : item._id);
  };

  const handleTrack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.timing(trackBtnScale, { toValue: 0.94, duration: 90, useNativeDriver: true }),
      Animated.spring(trackBtnScale, { toValue: 1, tension: 180, friction: 6, useNativeDriver: true }),
    ]).start();
    onTrack(item);
  };

  const previewItems = item.items.slice(0, 3);
  const extraCount = item.items.length - 3;

  return (
    <Animated.View
      style={[
        styles.card,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      {/* ── Card Top ── */}
      <View style={styles.cardTop}>
        <View style={styles.cardTopLeft}>
          <View style={[styles.statusDot, { backgroundColor: statusConfig.dot }]} />
          <View>
            <Text style={styles.orderNumber}>#{item.orderNumber}</Text>
            <Text style={styles.orderDate}>{formatDate(item.createdAt)}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
          <Ionicons name={statusConfig.icon as any} size={11} color={statusConfig.text} style={{ marginRight: 4 }} />
          <Text style={[styles.statusBadgeText, { color: statusConfig.text }]}>
            {statusConfig.label}
          </Text>
        </View>
      </View>

      {/* ── Image Strip + Amount ── */}
      <View style={styles.cardMid}>
        <View style={styles.imageStrip}>
          {previewItems.map((oi, i) => (
            <View
              key={`${oi.variantId}-${i}`}
              style={[styles.imageBox, { marginLeft: i > 0 ? -10 : 0, zIndex: previewItems.length - i }]}
            >
              <Image source={{ uri: oi.image }} style={styles.itemThumb} resizeMode="cover" />
            </View>
          ))}
          {extraCount > 0 && (
            <View style={[styles.imageBox, styles.imageBoxExtra, { marginLeft: -10 }]}>
              <Text style={styles.extraText}>+{extraCount}</Text>
            </View>
          )}
          <Text style={styles.itemCountText}>
            {item.totalItems} {item.totalItems > 1 ? "items" : "item"}
          </Text>
        </View>

        <View style={styles.amountBlock}>
          <Text style={styles.amountLabel}>Total</Text>
          <Text style={styles.amountValue}>₹{item.grandTotal.toFixed(0)}</Text>
          <View style={styles.paymentPill}>
            <Ionicons name={getPaymentIcon(item.payment.method) as any} size={10} color={C.muted} />
            <Text style={styles.paymentText}>{item.payment.method.toUpperCase()}</Text>
          </View>
        </View>
      </View>

      {/* ── Action Row ── */}
      {normalizeStatus(item.status) === "out_for_delivery" && (
        <View style={styles.codeHint}>
          <Ionicons name="key-outline" size={14} color={C.ink} />
          <Text style={styles.codeHintText}>
            Open tracking and share the 6-digit code with the rider to finish delivery.
          </Text>
        </View>
      )}

      <View style={styles.actionRow}>
        <Animated.View style={[styles.trackBtnWrap, { transform: [{ scale: trackBtnScale }] }]}>
          <Pressable
            style={styles.trackBtn}
            onPress={handleTrack}
            android_ripple={{ color: "rgba(255,255,255,0.2)", borderless: false }}
          >
            <Ionicons name={primaryAction.icon as any} size={15} color="#fff" />
            <Text style={styles.trackBtnText}>{primaryAction.label}</Text>
          </Pressable>
        </Animated.View>

        <TouchableOpacity style={styles.detailsBtn} onPress={toggleExpand} activeOpacity={0.75}>
          <Text style={styles.detailsBtnText}>{isExpanded ? "Hide" : "Details"}</Text>
          <Ionicons
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={14}
            color={C.primary}
          />
        </TouchableOpacity>
      </View>

      {/* ── Expanded Section ── */}
      {isExpanded && (
        <View style={styles.expandedWrap}>
          <View style={styles.expandDivider} />

          {/* Items */}
          <Text style={styles.sectionLabel}>Items in this order</Text>
          {item.items.map((p, i) => (
            <View key={`${p.variantId}-${i}-d`} style={styles.detailItem}>
              <Image source={{ uri: p.image }} style={styles.detailItemImg} resizeMode="cover" />
              <View style={styles.detailItemInfo}>
                <Text style={styles.detailItemName} numberOfLines={2}>{p.productName}</Text>
                <Text style={styles.detailItemMeta}>
                  {p.packSize}{p.packUnit} · Qty {p.quantity} · ₹{p.unitPrice}/unit
                </Text>
              </View>
              <View style={styles.detailItemRight}>
                <Text style={styles.detailItemPrice}>₹{p.subtotal}</Text>
                {p.discount > 0 && (
                  <Text style={styles.detailItemDiscount}>{p.discount}% off</Text>
                )}
              </View>
            </View>
          ))}

          {/* Price Breakdown */}
          <View style={styles.detailBlock}>
            <Text style={styles.sectionLabel}>Price Breakdown</Text>
            <PriceRow label="Subtotal" value={`₹${item.subtotal}`} />
            {item.totalDiscount > 0 && (
              <PriceRow label="Discount" value={`-₹${item.totalDiscount}`} valueStyle={{ color: C.primary, fontWeight: "700" }} />
            )}
            <PriceRow label="Tax" value={`₹${item.taxAmount.toFixed(2)}`} />
            <PriceRow
              label="Delivery"
              value={item.deliveryFee === 0 ? "FREE" : `₹${item.deliveryFee}`}
              valueStyle={item.deliveryFee === 0 ? { color: C.primary, fontWeight: "700" } : {}}
            />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Grand Total</Text>
              <Text style={styles.totalValue}>₹{item.grandTotal}</Text>
            </View>
          </View>

          {/* Address */}
          <View style={styles.detailBlock}>
            <Text style={styles.sectionLabel}>Delivery Address</Text>
            <View style={styles.addressCard}>
              <View style={styles.addressIconWrap}>
                <Ionicons name="location" size={16} color={C.ink} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.addressName}>{item.address.snapshot.name}</Text>
                <Text style={styles.addressLine}>{item.address.snapshot.phone}</Text>
                {!!item.address.snapshot.addressLine && (
                  <Text style={styles.addressLine}>{item.address.snapshot.addressLine}</Text>
                )}
                <Text style={styles.addressLine}>
                  {item.address.snapshot.city}, {item.address.snapshot.state} – {item.address.snapshot.pincode}
                </Text>
                {!!item.address.snapshot.landmark && (
                  <Text style={styles.addressLine}>Near {item.address.snapshot.landmark}</Text>
                )}
              </View>
            </View>
          </View>

          {/* Payment */}
          <View style={styles.detailBlock}>
            <Text style={styles.sectionLabel}>Payment</Text>
            <View style={styles.paymentRow}>
              <View style={styles.paymentMethodBadge}>
                <Ionicons name={getPaymentIcon(item.payment.method) as any} size={16} color={C.ink} />
                <Text style={styles.paymentMethodText}>{item.payment.method.toUpperCase()}</Text>
              </View>
              <View style={[
                styles.paymentStatusBadge,
                item.payment.status.toLowerCase() === "paid"
                  ? styles.paymentStatusPaid
                  : styles.paymentStatusPending,
              ]}>
                <Text style={[
                  styles.paymentStatusText,
                  item.payment.status.toLowerCase() === "paid"
                    ? styles.paymentStatusTextPaid
                    : styles.paymentStatusTextPending,
                ]}>
                  {item.payment.status.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>

          {userId ? (
            <View style={styles.detailBlock}>
              <TouchableOpacity
                style={styles.invoiceDownloadBtn}
                disabled={reorderBusy}
                onPress={() => {
                  void (async () => {
                    setReorderBusy(true);
                    try {
                      const res = await API.post(`/orders/${item._id}/reorder`, { userId });
                      showAlert("Buy again", res.data?.message || "Items added to your cart", [
                        { text: "View cart", onPress: () => router.push("/cart") },
                        { text: "OK" },
                      ]);
                    } catch (error: any) {
                      showAlert("Buy again", error?.response?.data?.message || "Could not add these items");
                    } finally {
                      setReorderBusy(false);
                    }
                  })();
                }}
              >
                <Text style={styles.invoiceDownloadBtnText}>
                  {reorderBusy ? "Adding..." : "Buy again"}
                </Text>
              </TouchableOpacity>
              {getFilterValue(item.status) === "delivered" ? (
                <TouchableOpacity
                  style={[styles.invoiceDownloadBtn, { marginTop: 8, backgroundColor: "#1F2937" }]}
                  onPress={() => {
                    void (async () => {
                      try {
                        const res = await API.post(`/orders/${item._id}/repeat`, { userId });
                        showAlert("Weekly reminder", res.data?.message || "Reminder saved");
                      } catch (error: any) {
                        showAlert("Weekly reminder", error?.response?.data?.message || "Could not save the reminder");
                      }
                    })();
                  }}
                >
                  <Text style={styles.invoiceDownloadBtnText}>Remind me every week</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          {getFilterValue(item.status) === "delivered" && userId ? (
            <View style={styles.detailBlock}>
              <Text style={styles.sectionLabel}>Invoice</Text>
              <TouchableOpacity
                style={styles.invoiceDownloadBtn}
                activeOpacity={0.85}
                onPress={() => {
                  void (async () => {
                    setInvoiceBusy(true);
                    try {
                      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      await downloadOrderInvoicePdf(item._id, userId);
                    } finally {
                      setInvoiceBusy(false);
                    }
                  })();
                }}
                disabled={invoiceBusy}
              >
                {invoiceBusy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="download-outline" size={18} color="#fff" />
                    <Text style={styles.invoiceDownloadBtnText}>Download PDF invoice</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : null}

          {getFilterValue(item.status) === "delivered" && userId ? (
            <View style={styles.detailBlock}>
              <Text style={styles.sectionLabel}>Return</Text>
              {item.returnRequest?.status ? (
                <Text style={styles.addressLine}>
                  Request {item.returnRequest.status}
                  {item.returnRequest.refundedTo === "wallet"
                    ? ` · ₹${item.returnRequest.refundAmount || 0} refunded to wallet`
                    : ""}
                </Text>
              ) : (
                <>
                  {item.items.map((line) => {
                    const selected = selectedReturns[line.variantId];
                    return (
                      <View key={line.variantId} style={{ marginBottom: 8 }}>
                        <Text style={styles.addressLine}>
                          {line.productName} · {line.quantity}
                        </Text>
                        <View style={{ flexDirection: "row", gap: 8 }}>
                          <TouchableOpacity
                            onPress={() =>
                              setSelectedReturns((current) => {
                                const next = { ...current };
                                if (selected === "refund") delete next[line.variantId];
                                else next[line.variantId] = "refund";
                                return next;
                              })
                            }
                          >
                            <Text style={{ color: selected === "refund" ? C.primary : "#6B7280", fontWeight: "700" }}>
                              {selected === "refund" ? "Refund selected" : "Refund"}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() =>
                              setSelectedReturns((current) => {
                                const next = { ...current };
                                if (selected === "replace") delete next[line.variantId];
                                else next[line.variantId] = "replace";
                                return next;
                              })
                            }
                          >
                            <Text style={{ color: selected === "replace" ? C.primary : "#6B7280", fontWeight: "700" }}>
                              {selected === "replace" ? "Replace selected" : "Replace"}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                  <TextInput
                    value={returnReason}
                    onChangeText={setReturnReason}
                    placeholder="What went wrong? Returns are accepted within 24 hours."
                    placeholderTextColor="#9CA3AF"
                    style={{
                      borderWidth: 1,
                      borderColor: "#E5E7EB",
                      borderRadius: 10,
                      padding: 10,
                      marginBottom: 8,
                      color: "#111",
                    }}
                  />
                  <TouchableOpacity
                    style={styles.invoiceDownloadBtn}
                    disabled={returnBusy}
                    onPress={() => {
                      void (async () => {
                        setReturnBusy(true);
                        try {
                          await API.post(`/orders/${item._id}/return`, {
                            userId,
                            reason: returnReason,
                            items: Object.entries(selectedReturns).map(([variantId, action]) => ({
                              variantId,
                              quantity: item.items.find((line) => line.variantId === variantId)?.quantity || 1,
                              action,
                            })),
                          });
                          showAlert("Return requested", "We will review this within the return window.");
                          onRefresh();
                        } catch (error: any) {
                          showAlert("Return", error?.response?.data?.message || "Could not request a return");
                        } finally {
                          setReturnBusy(false);
                        }
                      })();
                    }}
                  >
                    <Text style={styles.invoiceDownloadBtnText}>
                      {returnBusy ? "Sending..." : "Request return"}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          ) : null}
        </View>
      )}
    </Animated.View>
  );
}

function PriceRow({
  label,
  value,
  valueStyle = {},
}: {
  label: string;
  value: string;
  valueStyle?: object;
}) {
  return (
    <View style={styles.priceRow}>
      <Text style={styles.priceLabel}>{label}</Text>
      <Text style={[styles.priceValue, valueStyle]}>{value}</Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function OrdersScreen() {
  const { orders, fetchOrders, loading } = useOrders();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const listRef = useRef<FlatList<Order> | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const onRefresh = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  };

  const filteredOrders =
    selectedFilter === "all"
      ? orders
      : orders.filter((o) => getFilterValue(o.status) === selectedFilter);

  const getCount = (key: string) =>
    key === "all" ? orders.length : orders.filter((o) => getFilterValue(o.status) === key).length;

  useEffect(() => {
    setExpandedId(null);
    requestAnimationFrame(() => listRef.current?.scrollToOffset({ offset: 0, animated: false }));
  }, [selectedFilter]);

  const openTrackingPage = (order: Order) => {
    router.push({
      pathname: "/order-tracking",
      params: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        createdAt: order.createdAt,
        totalItems: String(order.totalItems),
        grandTotal: String(order.grandTotal),
        userId: user?._id ? String(user._id) : "",
      },
    });
  };

  // ── Loading ──
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safe}>
        <AppHeader title="Orders" showCart />
        <View style={styles.centered}>
          <View style={styles.loadingSpinnerWrap}>
            <ActivityIndicator size="large" color={C.primary} />
          </View>
          <Text style={styles.loadingTitle}>Fetching orders</Text>
          <Text style={styles.loadingSubtitle}>Just a moment…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Empty ──
  if (!orders || orders.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <AppHeader title="Orders" showCart />
        <View style={styles.centered}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="bag-outline" size={48} color={C.primary} />
          </View>
          <Text style={styles.emptyTitle}>No orders yet</Text>
          <Text style={styles.emptySubtitle}>Your purchases will appear here</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <AppHeader title="Orders" subtitle="Track, details, and delivery code" showCart />

      <View style={styles.filtersWrap}>
        <FlatList
          horizontal
          data={FILTERS}
          keyExtractor={(f) => f.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          renderItem={({ item: filter }) => (
            <FilterChip
              filter={filter}
              isActive={selectedFilter === filter.key}
              onPress={() => setSelectedFilter(filter.key)}
              count={filter.key !== "all" ? getCount(filter.key) : undefined}
            />
          )}
        />
      </View>

      <FlatList
        ref={listRef}
        key={selectedFilter}
        data={filteredOrders}
        keyExtractor={(item) => item._id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          filteredOrders.length === 0 && { flexGrow: 1 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[C.primary]}
            tintColor={C.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyFilter}>
            <Ionicons name="file-tray-outline" size={40} color="#D1D5DB" />
            <Text style={styles.emptyFilterText}>
              No {FILTERS.find((f) => f.key === selectedFilter)?.label.toLowerCase()} orders
            </Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <OrderCard
            item={item}
            index={index}
            expandedId={expandedId}
            setExpandedId={setExpandedId}
            onTrack={openTrackingPage}
            userId={user?._id ? String(user._id) : ""}
            onRefresh={fetchOrders}
          />
        )}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = themed(() => StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.page },
  listContent: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 32 },

  // Screen header
  screenHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerLogo: {
    width: 30,
    height: 30,
    resizeMode: "contain",
  },
  filtersWrap: {
    paddingHorizontal: 14,
    paddingTop: 2,
    paddingBottom: 6,
    backgroundColor: C.page,
  },
  screenHeaderTitle: { fontSize: 22, fontWeight: "700", color: C.ink },
  screenHeaderSub: { fontSize: 12, color: "#78716C", marginTop: 1 },
  iconBtn: {
    position: "relative",
    padding: 6,
    backgroundColor: C.card,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  badge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: C.badge,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: C.badgeText,
    fontSize: 10,
    fontWeight: "700",
  },

  // Filter chips
  filterRow: { gap: 8 },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  filterChipActive: { backgroundColor: C.primary, borderColor: C.primary },
  filterText: { fontSize: 11, color: C.muted, fontWeight: "700" },
  filterTextActive: { color: "#fff" },
  filterBadge: {
    marginLeft: 5,
    backgroundColor: C.line,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  filterBadgeActive: { backgroundColor: "rgba(255,255,255,0.25)" },
  filterBadgeText: { fontSize: 10, fontWeight: "700", color: C.muted },
  filterBadgeTextActive: { color: "#fff" },

  // Card
  card: {
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.line,
    shadowColor: C.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardTopLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  orderNumber: { fontSize: 14, fontWeight: "800", color: C.ink },
  orderDate: { fontSize: 11, color: C.muted, marginTop: 1 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  statusBadgeText: { fontSize: 11, fontWeight: "700" },

  // Card Mid
  cardMid: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  imageStrip: { flexDirection: "row", alignItems: "center" },
  imageBox: {
    width: 56,
    height: 56,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#fff",
    overflow: "hidden",
    backgroundColor: C.soft,
  },
  imageBoxExtra: {
    backgroundColor: C.line,
    alignItems: "center",
    justifyContent: "center",
  },
  extraText: { fontSize: 11, fontWeight: "700", color: C.muted },
  itemThumb: { width: "100%", height: "100%" },
  itemCountText: { marginLeft: 10, fontSize: 12, color: C.muted, fontWeight: "500" },
  amountBlock: { alignItems: "flex-end" },
  amountLabel: { fontSize: 10, color: C.muted, fontWeight: "600", letterSpacing: 0.5, textTransform: "uppercase" },
  amountValue: { fontSize: 18, fontWeight: "800", color: C.primary, letterSpacing: -0.3 },
  codeHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFF7ED",
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  codeHintText: { flex: 1, fontSize: 12, color: C.ink, fontWeight: "600", lineHeight: 16 },
  paymentPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: C.soft,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginTop: 2,
  },
  paymentText: { fontSize: 10, color: C.muted, fontWeight: "600" },

  // Action row
  actionRow: { flexDirection: "row", gap: 10 },
  trackBtnWrap: { flex: 1 },
  trackBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: C.primary,
    borderRadius: 12,
    paddingVertical: 13,
    shadowColor: C.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 3,
  },
  trackBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  detailsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderWidth: 1.5,
    borderColor: C.line,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    backgroundColor: C.soft,
  },
  detailsBtnText: { fontSize: 14, fontWeight: "700", color: C.primaryDark },

  // Expanded
  expandedWrap: { marginTop: 4 },
  expandDivider: { height: 1, backgroundColor: C.line, marginVertical: 14 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: C.muted,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 10,
  },

  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  detailItemImg: { width: 46, height: 46, borderRadius: 10, backgroundColor: C.line },
  detailItemInfo: { flex: 1, marginHorizontal: 10 },
  detailItemName: { fontSize: 13, fontWeight: "600", color: C.ink },
  detailItemMeta: { fontSize: 11, color: C.muted, marginTop: 2 },
  detailItemRight: { alignItems: "flex-end" },
  detailItemPrice: { fontSize: 13, fontWeight: "800", color: C.ink },
  detailItemDiscount: { fontSize: 10, color: C.primary, fontWeight: "600", marginTop: 2 },

  detailBlock: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  priceRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  priceLabel: { fontSize: 13, color: C.muted },
  priceValue: { fontSize: 13, fontWeight: "600", color: C.ink },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
  totalLabel: { fontSize: 14, fontWeight: "700", color: C.ink },
  totalValue: { fontSize: 16, fontWeight: "800", color: C.ink },

  addressCard: { flexDirection: "row", gap: 10 },
  addressIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.soft,
    alignItems: "center",
    justifyContent: "center",
  },
  addressName: { fontSize: 13, fontWeight: "700", color: C.ink, marginBottom: 2 },
  addressLine: { fontSize: 12, color: C.muted, lineHeight: 18 },

  paymentRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  paymentMethodBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.badge,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  paymentMethodText: { fontSize: 13, fontWeight: "700", color: C.badgeText },
  paymentStatusBadge: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  paymentStatusPaid: { backgroundColor: C.soft },
  paymentStatusPending: { backgroundColor: "#FEF3C7" },
  paymentStatusText: { fontSize: 12, fontWeight: "700" },
  paymentStatusTextPaid: { color: "#166534" },
  paymentStatusTextPending: { color: "#92400E" },
  invoiceDownloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: C.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  invoiceDownloadBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  // Empty / Loading
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  loadingSpinnerWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: C.soft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  loadingTitle: { fontSize: 17, fontWeight: "700", color: C.ink },
  loadingSubtitle: { fontSize: 13, color: C.muted, marginTop: 4 },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: C.soft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: C.ink },
  emptySubtitle: { fontSize: 14, color: C.muted, marginTop: 4, textAlign: "center" },
  emptyFilter: { flex: 1, alignItems: "center", paddingTop: 60, gap: 10 },
  emptyFilterText: { fontSize: 14, color: C.muted, fontWeight: "500" },
}));
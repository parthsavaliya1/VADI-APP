import React, { useCallback, useEffect, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useCart } from "@/context/CartContext";
import { API } from "@/utils/api";
import { downloadOrderInvoicePdf } from "@/utils/orderInvoice";
import { useAuth } from "@/context/AuthContext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ─── Constants ────────────────────────────────────────────────────────────────

const TRACKING_STEPS = [
  {
    key: "placed",
    label: "Order Placed",
    subLabel: "We received your order",
    icon: "receipt-outline" as const,
  },
  {
    key: "confirmed",
    label: "Order Confirmed",
    subLabel: "Seller confirmed your order",
    icon: "checkmark-circle-outline" as const,
  },
  {
    key: "packed",
    label: "Packed",
    subLabel: "Your items are packed",
    icon: "cube-outline" as const,
  },
  {
    key: "shipped",
    label: "Shipped",
    subLabel: "Package is on the way to your area",
    icon: "airplane-outline" as const,
  },
  {
    key: "out_for_delivery",
    label: "Out for Delivery",
    subLabel: "Arriving today",
    icon: "bicycle-outline" as const,
  },
  {
    key: "delivered",
    label: "Delivered",
    subLabel: "Package received",
    icon: "home-outline" as const,
  },
];

const STATUS_TO_STEP_INDEX: Record<string, number> = {
  placed: 0,
  confirmed: 1,
  packed: 2,
  processing: 1,
  shipped: 3,
  dispatched: 3,
  out_for_delivery: 4,
  delivered: 5,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const normalizeStatus = (status: string) =>
  status.toLowerCase().trim().replace(/[-\s]+/g, "_");

const formatStatus = (status: string) =>
  status
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

// ─── Animated Step Component ─────────────────────────────────────────────────

interface StepProps {
  step: (typeof TRACKING_STEPS)[number];
  index: number;
  isCompleted: boolean;
  isActive: boolean;
  isLast: boolean;
  delay: number;
  lineProgress: Animated.Value;
}

function TrackingStep({
  step,
  index,
  isCompleted,
  isActive,
  isLast,
  delay,
  lineProgress,
}: StepProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const dotScale = useRef(new Animated.Value(isCompleted ? 1 : 0.6)).current;
  const dotPulse = useRef(new Animated.Value(1)).current;
  const checkOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 420,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 420,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    if (isCompleted) {
      Animated.sequence([
        Animated.delay(delay + 200),
        Animated.spring(dotScale, {
          toValue: 1,
          tension: 100,
          friction: 6,
          useNativeDriver: true,
        }),
      ]).start();

      Animated.sequence([
        Animated.delay(delay + 350),
        Animated.timing(checkOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }

    if (isActive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(dotPulse, {
            toValue: 1.3,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(dotPulse, {
            toValue: 1,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, []);

  const lineHeight = lineProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <Animated.View
      style={[
        styles.stepRow,
        { opacity: fadeAnim, transform: [{ translateX: slideAnim }] },
      ]}
    >
      {/* Left: dot + line */}
      <View style={styles.stepMarkerWrap}>
        <Animated.View
          style={[
            styles.dotOuter,
            isCompleted && styles.dotOuterCompleted,
            isActive && styles.dotOuterActive,
            { transform: [{ scale: isActive ? dotPulse : dotScale }] },
          ]}
        >
          <Animated.View style={{ opacity: checkOpacity }}>
            {isCompleted ? (
              <Ionicons name="checkmark" size={10} color="#fff" />
            ) : null}
          </Animated.View>
          {!isCompleted && (
            <View
              style={[styles.dotInner, isActive && styles.dotInnerActive]}
            />
          )}
        </Animated.View>

        {!isLast && (
          <View style={styles.lineTrack}>
            {isCompleted && !isActive ? (
              <View style={styles.lineFilledFull} />
            ) : isActive ? (
              <Animated.View style={[styles.lineFilled, { height: lineHeight }]} />
            ) : (
              <View style={styles.lineEmpty} />
            )}
          </View>
        )}
      </View>

      {/* Right: text */}
      <View style={styles.stepContent}>
        <View style={styles.stepHeader}>
          <View
            style={[
              styles.iconBadge,
              isCompleted && styles.iconBadgeCompleted,
              isActive && styles.iconBadgeActive,
            ]}
          >
            <Ionicons
              name={step.icon}
              size={14}
              color={
                isCompleted ? "#1E7A35" : isActive ? "#F59E0B" : "#9CA3AF"
              }
            />
          </View>
          <Text
            style={[
              styles.stepLabel,
              isCompleted && styles.stepLabelCompleted,
              isActive && styles.stepLabelActive,
            ]}
          >
            {step.label}
          </Text>
          {isActive && (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          )}
        </View>
        <Text
          style={[
            styles.stepSubLabel,
            (isCompleted || isActive) && styles.stepSubLabelVisible,
          ]}
        >
          {step.subLabel}
        </Text>
      </View>
    </Animated.View>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  delay,
}: {
  icon: string;
  label: string;
  value: string;
  delay: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: 1,
      tension: 60,
      friction: 8,
      delay,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.statCard,
        {
          opacity: anim,
          transform: [{ scale: anim }],
        },
      ]}
    >
      <Ionicons name={icon as any} size={18} color="#1E7A35" />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function OrderTrackingScreen() {
  const { items } = useCart();
  const { user } = useAuth();
  const [invoiceBusy, setInvoiceBusy] = useState(false);
  const params = useLocalSearchParams<{
    orderId?: string;
    orderNumber?: string;
    status?: string;
    createdAt?: string;
    totalItems?: string;
    grandTotal?: string;
    userId?: string;
  }>();

  const [liveOrder, setLiveOrder] = useState<{
    status?: string;
    orderNumber?: string;
    createdAt?: string;
    totalItems?: number;
    grandTotal?: number;
    deliveryHandoverCode?: string;
  } | null>(null);
  const [orderLoading, setOrderLoading] = useState(false);

  const paramUserId = params.userId || "";
  const effectiveUserId = user?._id ? String(user._id) : paramUserId;

  const fetchLiveOrder = useCallback(async () => {
    const oid = params.orderId?.trim();
    if (!oid || !effectiveUserId) return;
    setOrderLoading(true);
    try {
      const { data } = await API.get(`/orders/${oid}`, {
        params: { userId: effectiveUserId },
      });
      if (!data?.success) {
        setLiveOrder(null);
        return;
      }
      const o = data.data?.order ?? data.data;
      if (o && typeof o === "object") setLiveOrder(o);
    } catch {
      setLiveOrder(null);
    } finally {
      setOrderLoading(false);
    }
  }, [params.orderId, effectiveUserId]);

  useFocusEffect(
    useCallback(() => {
      void fetchLiveOrder();
    }, [fetchLiveOrder]),
  );

  // Prefer fresh API data when available (shows delivery handover code when OFD)
  const status =
    liveOrder?.status || params.status || "placed";
  const orderNumber =
    liveOrder?.orderNumber || params.orderNumber || "ORD-20094";
  const createdAt =
    liveOrder?.createdAt ||
    params.createdAt ||
    new Date(Date.now() - 2 * 86400000).toISOString();
  const totalItems = String(
    liveOrder?.totalItems ?? params.totalItems ?? "3",
  );
  const grandTotal = String(
    liveOrder?.grandTotal ?? params.grandTotal ?? "1249.00",
  );
  const deliveryHandoverCode = liveOrder?.deliveryHandoverCode;

  const normalizedStatus = normalizeStatus(status);
  const currentStepIndex = STATUS_TO_STEP_INDEX[normalizedStatus] ?? 0;
  const isDelivered = normalizedStatus === "delivered";
  const isCancelled =
    normalizedStatus === "cancelled" || normalizedStatus === "returned";

  const orderDate = formatDate(createdAt);
  const expectedDate = formatDate(
    new Date(new Date(createdAt).getTime() + 3 * 24 * 60 * 60 * 1000).toISOString()
  );

  const progressPercent =
    ((currentStepIndex + 1) / TRACKING_STEPS.length) * 100;

  // Header animation
  const headerAnim = useRef(new Animated.Value(0)).current;
  const heroAnim = useRef(new Animated.Value(0)).current;
  const lineProgressRef = useRef(new Animated.Value(0)).current;
  const progressFillAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(100, [
      Animated.timing(headerAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(heroAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    Animated.timing(lineProgressRef, {
      toValue: 1,
      duration: 1200,
      delay: 400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    Animated.timing(progressFillAnim, {
      toValue: 1,
      duration: 700,
      delay: 450,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F0F7F1" />

      {/* ── Header ── */}
      <Animated.View
        style={[
          styles.header,
          {
            opacity: headerAnim,
            transform: [
              {
                translateY: headerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-16, 0],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => {
            Haptics.selectionAsync();
            router.replace("/(tabs)/orders");
          }}
          style={styles.backBtn}
        >
          <View style={styles.iconButton}>
            <Ionicons name="arrow-back" size={24} color="#1B5E20" />
          </View>
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Track Order
          </Text>
          <View style={styles.headerOrderBadge}>
            <Text style={styles.headerOrderBadgeText}>#{orderNumber}</Text>
          </View>
        </View>

        <TouchableOpacity onPress={() => router.push("/cart")}>
          <View style={styles.iconButton}>
            <Ionicons name="cart-outline" size={24} color="#1B5E20" />
            {items.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{items.length}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero Progress Card ── */}
        <Animated.View
          style={[
            styles.heroCard,
            {
              opacity: heroAnim,
              transform: [
                {
                  translateY: heroAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [24, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {/* Background decorative circle */}
          <View style={styles.heroBgCircle} />

          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroStatusLabel}>Current Status</Text>
              <Text
                style={[
                  styles.heroStatus,
                  isDelivered && { color: "#1B5E20" },
                  isCancelled && { color: "#B42318" },
                ]}
              >
                {formatStatus(normalizedStatus)}
              </Text>
            </View>
            <View
              style={[
                styles.statusOrb,
                isDelivered && styles.statusOrbSuccess,
                isCancelled && styles.statusOrbDanger,
              ]}
            >
              <Ionicons
                name={
                  isDelivered
                    ? "checkmark-done"
                    : isCancelled
                    ? "close"
                    : "bicycle"
                }
                size={22}
                color={
                  isDelivered ? "#1B5E20" : isCancelled ? "#B42318" : "#F59E0B"
                }
              />
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarTrack}>
            <Animated.View
              style={[
                styles.progressBarFill,
                isDelivered && styles.progressBarFillSuccess,
                isCancelled && styles.progressBarFillDanger,
                {
                  width: progressFillAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0%", `${progressPercent}%`],
                  }),
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            Step {currentStepIndex + 1} of {TRACKING_STEPS.length}
          </Text>

          {/* Stat row */}
          <View style={styles.statRow}>
            <StatCard
              icon="calendar-outline"
              label="Ordered"
              value={orderDate}
              delay={300}
            />
            <View style={styles.statDivider} />
            <StatCard
              icon="cube-outline"
              label="Items"
              value={totalItems}
              delay={400}
            />
            <View style={styles.statDivider} />
            <StatCard
              icon="cash-outline"
              label="Total"
              value={`₹${Number(grandTotal).toLocaleString("en-IN")}`}
              delay={500}
            />
          </View>
        </Animated.View>

        {/* ── ETA Banner ── */}
        {!isDelivered && !isCancelled && (
          <View style={styles.etaBanner}>
            <View style={styles.etaBannerLeft}>
              <Ionicons name="time-outline" size={20} color="#92400E" />
              <View style={{ marginLeft: 8 }}>
                <Text style={styles.etaSmall}>Expected Delivery</Text>
                <Text style={styles.etaBig}>{expectedDate}</Text>
              </View>
            </View>
            <View style={styles.etaBannerRight}>
              <Text style={styles.etaDays}>~1-3 days</Text>
            </View>
          </View>
        )}

        {isDelivered && (
          <View style={[styles.etaBanner, styles.deliveredBanner]}>
            <Ionicons name="checkmark-done-circle" size={22} color="#1B5E20" />
            <View style={{ marginLeft: 10 }}>
              <Text style={[styles.etaSmall, { color: "#2E7D32" }]}>
                Delivered Successfully
              </Text>
              <Text style={[styles.etaBig, { color: "#1B5E20" }]}>
                Thank you for your order!
              </Text>
            </View>
          </View>
        )}

        {isDelivered && params.orderId && effectiveUserId ? (
          <Pressable
            style={({ pressed }) => [
              styles.invoiceBtn,
              pressed && { opacity: 0.88 },
              invoiceBusy && { opacity: 0.6 },
            ]}
            disabled={invoiceBusy}
            onPress={() => {
              void (async () => {
                setInvoiceBusy(true);
                try {
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  await downloadOrderInvoicePdf(
                    String(params.orderId).trim(),
                    effectiveUserId,
                  );
                } finally {
                  setInvoiceBusy(false);
                }
              })();
            }}
          >
            {invoiceBusy ? (
              <ActivityIndicator color="#1B5E20" size="small" />
            ) : (
              <Ionicons name="document-text-outline" size={20} color="#1B5E20" />
            )}
            <Text style={styles.invoiceBtnText}>
              {invoiceBusy ? "Preparing…" : "Download invoice (PDF)"}
            </Text>
          </Pressable>
        ) : null}

        {isCancelled && (
          <View style={[styles.etaBanner, styles.cancelledBanner]}>
            <Ionicons name="close-circle" size={22} color="#B42318" />
            <View style={{ marginLeft: 10 }}>
              <Text style={[styles.etaSmall, { color: "#B42318" }]}>
                Order Closed
              </Text>
              <Text style={[styles.etaBig, { color: "#7F1D1D" }]}>
                Marked as {formatStatus(normalizedStatus)}
              </Text>
            </View>
          </View>
        )}

        {orderLoading && params.orderId && effectiveUserId ? (
          <View style={styles.handoverLoading}>
            <ActivityIndicator color="#1E7A35" />
            <Text style={styles.handoverLoadingText}>Updating order…</Text>
          </View>
        ) : null}

        {normalizedStatus === "out_for_delivery" &&
        deliveryHandoverCode &&
        deliveryHandoverCode.length === 6 ? (
          <View style={styles.handoverCard}>
            <View style={styles.handoverIconWrap}>
              <Ionicons name="keypad" size={22} color="#5B21B6" />
            </View>
            <Text style={styles.handoverTitle}>Delivery confirmation code</Text>
            <Text style={styles.handoverHint}>
              Tell this code to the delivery person only when you receive your
              package.
            </Text>
            <Text style={styles.handoverCode}>{deliveryHandoverCode}</Text>
          </View>
        ) : null}

        {/* ── Timeline ── */}
        <View style={styles.timelineCard}>
          <Text style={styles.timelineTitle}>Shipment Progress</Text>
          {TRACKING_STEPS.map((step, index) => {
            const isCompleted = index <= currentStepIndex;
            const isActive = index === currentStepIndex && !isDelivered;
            return (
              <TrackingStep
                key={step.key}
                step={step}
                index={index}
                isCompleted={isCompleted}
                isActive={isActive}
                isLast={index === TRACKING_STEPS.length - 1}
                delay={index * 100 + 200}
                lineProgress={lineProgressRef}
              />
            );
          })}
        </View>

        {/* ── Action Buttons ── */}
        <View style={styles.actionRow}>
          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              styles.actionBtnOutline,
              pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] },
            ]}
            onPress={() => Haptics.selectionAsync()}
          >
            <Ionicons name="headset-outline" size={18} color="#1E7A35" />
            <Text style={styles.actionBtnOutlineText}>Support</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              styles.actionBtnFilled,
              pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
            ]}
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          >
            <Ionicons name="share-social-outline" size={18} color="#fff" />
            <Text style={styles.actionBtnFilledText}>Share</Text>
          </Pressable>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F0F7F1",
  },

  // Header (aligned with `all-products`)
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E8F5E9",
    elevation: 4,
    shadowColor: "#1B5E20",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  backBtn: {},
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F1F8F4",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1B5E20",
    letterSpacing: 0.3,
  },
  headerOrderBadge: {
    marginTop: 2,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: "#E8F5E9",
    borderRadius: 10,
  },
  headerOrderBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#2E7D32",
    textTransform: "uppercase",
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#F44336",
    borderRadius: 12,
    minWidth: 22,
    height: 22,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: "#fff",
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },

  handoverLoading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    marginBottom: 8,
  },
  handoverLoadingText: {
    fontSize: 14,
    color: "#4B5563",
  },

  handoverCard: {
    backgroundColor: "#F5F3FF",
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: "#DDD6FE",
  },
  handoverIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#EDE9FE",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  handoverTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#4C1D95",
    marginBottom: 6,
  },
  handoverHint: {
    fontSize: 13,
    color: "#6B21A8",
    lineHeight: 19,
    marginBottom: 14,
  },
  handoverCode: {
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: 8,
    color: "#1B5E20",
    textAlign: "center",
  },

  // Hero Card
  heroCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: "#1B5E20",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  heroBgCircle: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "#E9F7EC",
    top: -60,
    right: -50,
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  heroStatusLabel: {
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: "600",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  heroStatus: {
    fontSize: 22,
    fontWeight: "800",
    color: "#F59E0B",
    marginTop: 2,
    letterSpacing: -0.3,
  },
  statusOrb: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  },
  statusOrbSuccess: {
    backgroundColor: "#D1FAE5",
  },
  statusOrbDanger: {
    backgroundColor: "#FEE2E2",
  },

  // Progress Bar
  progressBarTrack: {
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 6,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#F59E0B",
    borderRadius: 4,
  },
  progressBarFillSuccess: {
    backgroundColor: "#1E7A35",
  },
  progressBarFillDanger: {
    backgroundColor: "#EF4444",
  },
  progressText: {
    fontSize: 11,
    color: "#9CA3AF",
    textAlign: "right",
    marginBottom: 16,
  },

  // Stats
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
    marginTop: 2,
    textAlign: "center",
  },
  statLabel: {
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: "500",
    textAlign: "center",
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: "#E5E7EB",
  },

  // ETA Banner
  etaBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FEF3C7",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  etaBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  etaBannerRight: {},
  etaSmall: {
    fontSize: 11,
    color: "#92400E",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  etaBig: {
    fontSize: 15,
    fontWeight: "800",
    color: "#78350F",
    marginTop: 1,
  },
  etaDays: {
    fontSize: 13,
    color: "#92400E",
    fontWeight: "700",
    backgroundColor: "#FDE68A",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  deliveredBanner: {
    backgroundColor: "#D1FAE5",
    borderColor: "#6EE7B7",
  },
  cancelledBanner: {
    backgroundColor: "#FEE2E2",
    borderColor: "#FECACA",
  },
  invoiceBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#86EFAC",
  },
  invoiceBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#14532D",
  },

  // Timeline Card
  timelineCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    shadowColor: "#1B5E20",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  timelineTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 16,
  },

  // Step
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    minHeight: 62,
  },
  stepMarkerWrap: {
    width: 28,
    alignItems: "center",
  },
  dotOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
  },
  dotOuterCompleted: {
    borderColor: "#1E7A35",
    backgroundColor: "#1E7A35",
  },
  dotOuterActive: {
    borderColor: "#F59E0B",
    backgroundColor: "#FEF3C7",
  },
  dotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#D1D5DB",
  },
  dotInnerActive: {
    backgroundColor: "#F59E0B",
  },
  lineTrack: {
    flex: 1,
    width: 2,
    marginTop: 3,
    overflow: "hidden",
    minHeight: 30,
  },
  lineFilledFull: {
    flex: 1,
    backgroundColor: "#1E7A35",
    width: 2,
    alignSelf: "center",
  },
  lineFilled: {
    backgroundColor: "#1E7A35",
    width: 2,
    alignSelf: "center",
  },
  lineEmpty: {
    flex: 1,
    backgroundColor: "#E5E7EB",
    width: 2,
    alignSelf: "center",
  },

  stepContent: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 16,
  },
  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  iconBadgeCompleted: {
    backgroundColor: "#D1FAE5",
  },
  iconBadgeActive: {
    backgroundColor: "#FEF3C7",
  },
  stepLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#9CA3AF",
    flex: 1,
  },
  stepLabelCompleted: {
    color: "#111827",
    fontWeight: "700",
  },
  stepLabelActive: {
    color: "#B45309",
    fontWeight: "800",
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#EF4444",
  },
  liveText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#B45309",
    letterSpacing: 0.8,
  },
  stepSubLabel: {
    fontSize: 12,
    color: "#D1D5DB",
    marginTop: 2,
    marginLeft: 32,
    fontWeight: "500",
  },
  stepSubLabelVisible: {
    color: "#6B7280",
  },

  // Action Buttons
  actionRow: {
    flexDirection: "row",
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    gap: 6,
  },
  actionBtnOutline: {
    borderWidth: 2,
    borderColor: "#1E7A35",
    backgroundColor: "#fff",
  },
  actionBtnFilled: {
    backgroundColor: "#1E7A35",
  },
  actionBtnOutlineText: {
    color: "#1E7A35",
    fontWeight: "700",
    fontSize: 14,
  },
  actionBtnFilledText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
});
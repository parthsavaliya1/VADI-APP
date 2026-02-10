import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useRef } from "react";
import {
  Alert,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { useOrders } from "../../context/OrderContext";

/* ── Avatar initials helper ── */
function getInitials(name?: string) {
  if (!name) return "U";
  const parts = name.trim().split(" ");
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : parts[0].slice(0, 2).toUpperCase();
}

/* ── Avatar colour from name ── */
const AVATAR_COLORS = [
  ["#1B5E20", "#A5D6A7"],
  ["#1A237E", "#90CAF9"],
  ["#4A148C", "#CE93D8"],
  ["#B71C1C", "#EF9A9A"],
  ["#E65100", "#FFCC80"],
  ["#006064", "#80DEEA"],
];
function avatarColor(name?: string) {
  const idx = (name?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

/* ══════════════════════════════════════
   BENEFIT ROW (for guest view)
══════════════════════════════════════ */
function BenefitRow({
  icon,
  text,
  delay,
}: {
  icon: any;
  text: string;
  delay: number;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: 0,
        duration: 300,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[styles.benefitRow, { opacity, transform: [{ translateX }] }]}
    >
      <Ionicons name={icon} size={20} color="#2E7D32" />
      <Text style={styles.benefitText}>{text}</Text>
    </Animated.View>
  );
}

/* ══════════════════════════════════════
   GUEST PROFILE VIEW
══════════════════════════════════════ */
function GuestProfileView() {
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideUp, {
        toValue: 0,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.guestContainer}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.guestContent,
            { opacity: fadeIn, transform: [{ translateY: slideUp }] },
          ]}
        >
          {/* Icon */}
          <View style={styles.guestIconWrap}>
            <View style={styles.guestIconCircle}>
              <Ionicons name="person-outline" size={64} color="#2E7D32" />
            </View>
          </View>

          {/* Heading */}
          <Text style={styles.guestTitle}>Welcome to VADI!</Text>
          <Text style={styles.guestSubtitle}>
            Sign in to track orders, save addresses, and get personalized
            recommendations
          </Text>

          {/* Benefits List */}
          <View style={styles.benefitsList}>
            <BenefitRow
              icon="checkmark-circle"
              text="Track your orders in real-time"
              delay={100}
            />
            <BenefitRow
              icon="location"
              text="Save delivery addresses"
              delay={200}
            />
            <BenefitRow
              icon="time"
              text="Quick reorders from history"
              delay={300}
            />
            <BenefitRow
              icon="gift"
              text="Exclusive offers & rewards"
              delay={400}
            />
          </View>

          {/* CTA Buttons */}
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => router.push("/(auth)/login")}
            activeOpacity={0.85}
          >
            <Text style={styles.loginBtnText}>Sign In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.signupBtn}
            onPress={() => router.push("/(auth)/signup")}
            activeOpacity={0.85}
          >
            <Text style={styles.signupBtnText}>Create Account</Text>
          </TouchableOpacity>

          {/* Browse as guest */}
          <TouchableOpacity
            onPress={() => router.push("/(tabs)")}
            style={styles.browseGuest}
          >
            <Text style={styles.browseGuestText}>Continue browsing</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ══════════════════════════════════════
   ANIMATED MENU ROW
══════════════════════════════════════ */
function MenuRow({
  icon,
  label,
  subtitle,
  onPress,
  delay = 0,
  accent = false,
  rightBadge,
}: {
  icon: any;
  label: string;
  subtitle?: string;
  onPress?: () => void;
  delay?: number;
  accent?: boolean;
  rightBadge?: string;
}) {
  const scale = useRef(new Animated.Value(0.92)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 320,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        delay,
        tension: 70,
        friction: 9,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const onPressIn = () =>
    Animated.spring(pressScale, {
      toValue: 0.97,
      tension: 200,
      friction: 10,
      useNativeDriver: true,
    }).start();

  const onPressOut = () =>
    Animated.spring(pressScale, {
      toValue: 1,
      tension: 200,
      friction: 10,
      useNativeDriver: true,
    }).start();

  return (
    <Animated.View
      style={{ opacity, transform: [{ scale }, { scale: pressScale }] }}
    >
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={({ pressed }) => [
          styles.menuRow,
          pressed && styles.menuRowPressed,
        ]}
      >
        <View
          style={[
            styles.menuIconWrap,
            accent && { backgroundColor: "#FFF3E0" },
          ]}
        >
          <Ionicons
            name={icon}
            size={20}
            color={accent ? "#E65100" : "#2E7D32"}
          />
        </View>
        <View style={styles.menuTextWrap}>
          <Text style={[styles.menuLabel, accent && { color: "#E65100" }]}>
            {label}
          </Text>
          {subtitle && <Text style={styles.menuSub}>{subtitle}</Text>}
        </View>
        {rightBadge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{rightBadge}</Text>
          </View>
        ) : (
          <View style={styles.menuChevronWrap}>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={accent ? "#E65100" : "#BDBDBD"}
            />
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

/* ══════════════════════════════════════
   SECTION CARD WRAPPER
══════════════════════════════════════ */
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

/* ══════════════════════════════════════
   STAT TILE
══════════════════════════════════════ */
function StatTile({
  value,
  label,
  icon,
  color,
  delay,
}: {
  value: string | number;
  label: string;
  icon: any;
  color: string;
  delay: number;
}) {
  const scale = useRef(new Animated.Value(0.7)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 350,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        delay,
        tension: 65,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[styles.statTile, { opacity, transform: [{ scale }] }]}
    >
      <View style={[styles.statIconWrap, { backgroundColor: color + "22" }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Animated.View>
  );
}

/* ══════════════════════════════════════
   MAIN SCREEN
══════════════════════════════════════ */
export default function ProfileScreen() {
  const { logout, user } = useAuth();
  const { clearCart } = useCart();
  const { orders, fetchOrders } = useOrders();

  const headerAnim = useRef(new Animated.Value(-30)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const avatarScale = useRef(new Animated.Value(0)).current;

  const [avatarFg, avatarBg] = avatarColor(user?.name || user?.phone);
  const initials = getInitials(user?.name || user?.phone);

  const totalOrders = orders.length;
  const deliveredOrders = orders.filter((o) => o.status === "delivered").length;
  const activeOrders = orders.filter(
    (o) => !["delivered", "cancelled"].includes(o.status),
  ).length;

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
    Animated.parallel([
      Animated.timing(headerFade, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
      Animated.spring(headerAnim, {
        toValue: 0,
        tension: 55,
        friction: 9,
        useNativeDriver: true,
      }),
      Animated.spring(avatarScale, {
        toValue: 1,
        delay: 150,
        tension: 60,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, [user]);

  const confirmLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: () => {
          clearCart();
          logout();
          router.replace("/login");
        },
      },
    ]);
  };

  const requireAuth = (callback: () => void) => {
    if (!user) {
      Alert.alert("Login Required", "Please login to continue", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Login",
          onPress: () => router.push("/(auth)/login"),
        },
      ]);
      return;
    }
    callback();
  };

  // Show guest view if not logged in
  if (!user) {
    return <GuestProfileView />;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* ── HERO HEADER ── */}
        <Animated.View
          style={[
            styles.hero,
            {
              opacity: headerFade,
              transform: [{ translateY: headerAnim }],
            },
          ]}
        >
          {/* Background decoration */}
          <View style={styles.heroBubble1} />
          <View style={styles.heroBubble2} />

          {/* Avatar */}
          <Animated.View
            style={[styles.avatarRing, { transform: [{ scale: avatarScale }] }]}
          >
            <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
              <Text style={[styles.avatarText, { color: avatarFg }]}>
                {initials}
              </Text>
            </View>
            {/* Online dot */}
            <View style={styles.onlineDot} />
          </Animated.View>

          <Text style={styles.heroName}>{user?.name || "VADI Customer"}</Text>
          <View style={styles.heroPill}>
            <Ionicons name="call" size={12} color="#2E7D32" />
            <Text style={styles.heroPillText}>
              {user?.phone || "+91 XXXXXXXXXX"}
            </Text>
          </View>
        </Animated.View>

        {/* ── STATS ROW ── */}
        <View style={styles.statsRow}>
          <StatTile
            value={totalOrders}
            label="Total Orders"
            icon="bag-outline"
            color="#2E7D32"
            delay={200}
          />
          <StatTile
            value={deliveredOrders}
            label="Delivered"
            icon="checkmark-done-circle-outline"
            color="#0288D1"
            delay={280}
          />
          <StatTile
            value={activeOrders}
            label="Active"
            icon="time-outline"
            color="#F59E0B"
            delay={360}
          />
        </View>

        {/* ── ACCOUNT SECTION ── */}
        <Section title="Account">
          <MenuRow
            icon="receipt-outline"
            label="My Orders"
            subtitle="Track & view your orders"
            onPress={() => requireAuth(() => router.push("/(tabs)/orders"))}
            delay={250}
          />
          <View style={styles.rowDivider} />
          <MenuRow
            icon="location-outline"
            label="My Addresses"
            subtitle="Manage delivery locations"
            onPress={() => requireAuth(() => router.push("/my-addresses"))}
            delay={310}
          />
        </Section>

        {/* ── SUPPORT SECTION ── */}
        <Section title="Support">
          <MenuRow
            icon="chatbubble-ellipses-outline"
            label="Help & Support"
            subtitle="FAQs, chat with us"
            onPress={() => {}}
            delay={370}
          />
          <View style={styles.rowDivider} />
          <MenuRow
            icon="star-outline"
            label="Rate the App"
            subtitle="Tell us how we're doing"
            onPress={() => {}}
            delay={420}
          />
          <View style={styles.rowDivider} />
          <MenuRow
            icon="information-circle-outline"
            label="About VADI"
            subtitle="Version 1.0.0"
            onPress={() => {}}
            delay={470}
          />
        </Section>

        {/* ── LOGOUT ── */}
        <Animated.View
          style={{
            opacity: headerFade,
            transform: [{ translateY: headerAnim }],
          }}
        >
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={confirmLogout}
            activeOpacity={0.85}
          >
            <Ionicons name="log-out-outline" size={20} color="#fff" />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </Animated.View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* ══════════════════════════════════════
   STYLES
══════════════════════════════════════ */
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F0F4F0",
  },
  scroll: {
    paddingBottom: 20,
  },

  /* ── Hero ── */
  hero: {
    backgroundColor: "#fff",
    alignItems: "center",
    paddingTop: 36,
    paddingBottom: 28,
    paddingHorizontal: 24,
    marginBottom: 0,
    overflow: "hidden",
    position: "relative",
  },
  heroBubble1: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "#E8F5E9",
    top: -80,
    right: -60,
  },
  heroBubble2: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#F1F8E9",
    top: -30,
    left: -40,
  },
  avatarRing: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 3,
    borderColor: "#2E7D32",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    position: "relative",
  },
  avatar: {
    width: 82,
    height: 82,
    borderRadius: 41,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 1,
  },
  onlineDot: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#4CAF50",
    borderWidth: 2,
    borderColor: "#fff",
  },
  heroName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1A1A1A",
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  heroPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  heroPillText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2E7D32",
  },

  /* ── Stats ── */
  statsRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
    gap: 10,
  },
  statTile: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: "#888",
    fontWeight: "600",
    textAlign: "center",
  },

  /* ── Section ── */
  section: {
    marginHorizontal: 16,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#888",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },

  /* ── Menu row ── */
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  menuRowPressed: {
    backgroundColor: "#F8FAF8",
  },
  menuIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#E8F5E9",
    alignItems: "center",
    justifyContent: "center",
  },
  menuTextWrap: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 1,
  },
  menuSub: {
    fontSize: 12,
    color: "#999",
    fontWeight: "500",
  },
  menuChevronWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    backgroundColor: "#2E7D32",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  rowDivider: {
    height: 1,
    backgroundColor: "#F2F4F2",
    marginLeft: 70,
  },

  /* ── Logout ── */
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#D32F2F",
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: "#D32F2F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  logoutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  /* ── Guest View ── */
  guestContainer: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  guestContent: {
    alignItems: "center",
  },
  guestIconWrap: {
    marginBottom: 24,
  },
  guestIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#E8F5E9",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#2E7D32",
  },
  guestTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1A1A1A",
    marginBottom: 12,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  guestSubtitle: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  benefitsList: {
    width: "100%",
    gap: 16,
    marginBottom: 40,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  benefitText: {
    fontSize: 15,
    color: "#333",
    fontWeight: "500",
    flex: 1,
  },
  loginBtn: {
    width: "100%",
    backgroundColor: "#2E7D32",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#2E7D32",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  loginBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  signupBtn: {
    width: "100%",
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#2E7D32",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 20,
  },
  signupBtnText: {
    color: "#2E7D32",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  browseGuest: {
    paddingVertical: 12,
  },
  browseGuestText: {
    color: "#888",
    fontSize: 14,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
});

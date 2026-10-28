import { getInitials } from "@/utils/getInitials";
import { Ionicons } from "@expo/vector-icons";
import { showAlert } from "@/context/CustomAlertContext";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "../../context/AuthContext";
import { API } from "@/utils/api";
import { useCart } from "../../context/CartContext";
import { useOrders } from "../../context/OrderContext";
import { C, themed } from "@/constants/theme";

/* ── Avatar initials helper ── */


/* ── Avatar colour from name ── */
const getAvatarColors = () => [
  [C.ink, "#A5D6A7"],
  ["#1A237E", "#90CAF9"],
  ["#4A148C", "#CE93D8"],
  ["#B71C1C", "#EF9A9A"],
  ["#E65100", "#FFCC80"],
  ["#006064", "#80DEEA"],
];
function avatarColor(name?: string) {
  const AVATAR_COLORS = getAvatarColors();
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
      <Ionicons name={icon} size={20} color={C.primary} />
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
      <AppHeader title="Profile" />
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
              <Ionicons name="person-outline" size={64} color={C.primary} />
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
            color={accent ? "#E65100" : C.primary}
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
  const { logout, user, updateProfile } = useAuth();
  const { clearCart } = useCart();
  const { orders, fetchOrders } = useOrders();
  const [referralCode, setReferralCode] = useState("");

  const headerAnim = useRef(new Animated.Value(-30)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const avatarScale = useRef(new Animated.Value(0)).current;

  const [avatarFg, avatarBg] = avatarColor(user?.name || user?.phone);
  const initials = getInitials(user?.name);

  const totalOrders = orders.length;
  const deliveredOrders = orders.filter((o) => o.status === "delivered").length;
  const activeOrders = orders.filter(
    (o) => !["delivered", "cancelled"].includes(o.status),
  ).length;

  useEffect(() => {
    if (user) {
      fetchOrders();
      API.post(`/api/users/${user._id}/referral`)
        .then((res) => setReferralCode(res.data?.referralCode || ""))
        .catch(() => setReferralCode(""));
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
    showAlert("Log Out", "Are you sure you want to log out?", [
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
      showAlert("Login Required", "Please login to continue", [
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
      <AppHeader title="Profile" />
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
            <Ionicons name="call" size={12} color={C.primary} />
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
            color={C.primary}
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
            icon="wallet-outline"
            label="Wallet"
            subtitle="Add money and pay from your balance"
            onPress={() => requireAuth(() => router.push("/wallet"))}
            delay={220}
          />
          <View style={styles.rowDivider} />
          <MenuRow
            icon="person-outline"
            label="Edit profile"
            subtitle="Update your name"
            onPress={() => requireAuth(() => router.push("/edit-profile"))}
            delay={250}
          />
          <View style={styles.rowDivider} />
          <MenuRow
            icon="heart-outline"
            label="Wishlist"
            subtitle="Products you saved"
            onPress={() => requireAuth(() => router.push("/wishlist"))}
            delay={240}
          />
          <View style={styles.rowDivider} />
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
          <View style={styles.rowDivider} />
          <MenuRow
            icon="storefront-outline"
            label="Sell on VADI"
            subtitle="Create a shop and add products"
            onPress={() => requireAuth(() => router.push("/seller"))}
            delay={340}
          />
          <View style={styles.rowDivider} />
          <MenuRow
            icon="gift-outline"
            label="Invite friends"
            subtitle={referralCode ? `Your code ${referralCode} · ₹25 each after their first delivery` : "Share your code"}
            onPress={() =>
              showAlert(
                "Invite friends",
                referralCode
                  ? `Share ${referralCode}. You both get ₹25 in the wallet after their first delivered order.`
                  : "Your code will appear after you are online.",
              )
            }
            delay={330}
          />
          <View style={styles.rowDivider} />
          <MenuRow
            icon="language-outline"
            label="Order updates language"
            subtitle="English, Hindi or Gujarati push messages"
            onPress={() =>
              showAlert("Order updates", "Choose the language for status notifications", [
                { text: "English", onPress: () => updateProfile({ preferredLanguage: "en" }).catch(() => undefined) },
                { text: "Hindi", onPress: () => updateProfile({ preferredLanguage: "hi" }).catch(() => undefined) },
                { text: "Gujarati", onPress: () => updateProfile({ preferredLanguage: "gu" }).catch(() => undefined) },
                { text: "Cancel", style: "cancel" },
              ])
            }
            delay={335}
          />
          <View style={styles.rowDivider} />
          <MenuRow
            icon="car-outline"
            label="Delivery staff"
            subtitle="Driver login — confirm customer codes"
            onPress={() => router.push("/driver")}
            delay={340}
          />
        </Section>

        {/* ── SUPPORT SECTION ── */}
        <Section title="Support">
          <MenuRow
            icon="chatbubble-ellipses-outline"
            label="Help & Support"
            subtitle="FAQs, chat with us"
            onPress={() => router.push("/help-support")}
            delay={370}
          />
          <View style={styles.rowDivider} />
          <MenuRow
            icon="star-outline"
            label="Rate the App"
            subtitle="Tell us how we're doing"
            onPress={() => router.push("/rate-app")}
            delay={420}
          />
          <View style={styles.rowDivider} />
          <MenuRow
            icon="information-circle-outline"
            label="About VADI"
            subtitle="Our story, features & contact"
            onPress={() => router.push("/about")}
            delay={470}
          />
          <View style={styles.rowDivider} />
          <MenuRow
            icon="shield-checkmark-outline"
            label="Privacy Policy"
            subtitle="How we collect, use and protect your data"
            onPress={() => router.push("/privacy-policy")}
            delay={500}
          />
        </Section>

        {/* ── LOGOUT ── */}
        <Animated.View
          style={{
            opacity: headerFade,
            transform: [{ translateY: headerAnim }],
          }}
        >
          <Pressable
            style={({ pressed }) => [styles.logoutBtn, pressed && styles.logoutBtnPressed]}
            onPress={confirmLogout}
            accessibilityRole="button"
          >
            <Ionicons name="log-out-outline" size={20} color="#64748B" />
            <Text style={styles.logoutText}>Log Out</Text>
          </Pressable>
        </Animated.View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* ══════════════════════════════════════
   STYLES
══════════════════════════════════════ */
const styles = themed(() => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.page,
  },
  scroll: {
    paddingBottom: 20,
  },

  /* ── Hero ── */
  hero: {
    backgroundColor: C.card,
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
    backgroundColor: C.soft,
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
    borderColor: C.primary,
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
    backgroundColor: C.primary,
    borderWidth: 2,
    borderColor: "#fff",
  },
  heroName: {
    fontSize: 22,
    fontWeight: "800",
    color: C.ink,
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  heroPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.soft,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  heroPillText: {
    fontSize: 13,
    fontWeight: "600",
    color: C.primary,
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
    backgroundColor: C.card,
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
    color: C.muted,
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
    color: C.muted,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: C.card,
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
    backgroundColor: C.soft,
    alignItems: "center",
    justifyContent: "center",
  },
  menuTextWrap: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: C.ink,
    marginBottom: 1,
  },
  menuSub: {
    fontSize: 12,
    color: C.muted,
    fontWeight: "500",
  },
  menuChevronWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.soft,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    backgroundColor: C.badge,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    color: C.badgeText,
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
    alignSelf: "stretch",
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 14,
  },
  logoutBtnPressed: {
    backgroundColor: "#F8FAFC",
    borderColor: "#CBD5E1",
    transform: [{ scale: 0.99 }],
  },
  logoutText: {
    color: "#475569",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
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
    backgroundColor: C.soft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: C.primary,
  },
  guestTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: C.ink,
    marginBottom: 12,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  guestSubtitle: {
    fontSize: 15,
    color: C.muted,
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
    color: C.ink,
    fontWeight: "500",
    flex: 1,
  },
  loginBtn: {
    width: "100%",
    backgroundColor: C.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 12,
    shadowColor: C.primary,
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
    backgroundColor: C.card,
    borderWidth: 2,
    borderColor: C.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 20,
  },
  signupBtnText: {
    color: C.primary,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  browseGuest: {
    paddingVertical: 12,
  },
  browseGuestText: {
    color: C.muted,
    fontSize: 14,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
}));

import { startTransition , useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { showAlert } from "@/context/CustomAlertContext";
import { C, themed } from "@/constants/theme";

const SUPPORT_PHONE = "+91 99090 49699";
const SUPPORT_EMAIL = "vadi.support@gmail.com";
const SUPPORT_ADDRESS = "VADI Fresh, Ahmedabad, Gujarat, India";
const WHATSAPP_URL = `https://wa.me/${SUPPORT_PHONE.replace(/\D/g, "")}`;

const INTRO =
  "VADI Fresh connects your kitchen directly with the farmers who grow your food. We work with 200+ local growers across Gujarat so that vegetables, fruits, dairy and pantry staples reach you within 24 hours of harvest — no middlemen, no week-old produce, no compromises.";

const FEATURES: { icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { icon: "leaf-outline", label: "Farm-fresh produce harvested within 24 hours" },
  { icon: "grid-outline", label: "Shop by category — veggies, fruits, dairy, grains & more" },
  { icon: "flash-outline", label: "Deals of the Day with live countdown offers" },
  { icon: "mic-outline", label: "Voice & smart search" },
  { icon: "location-outline", label: "Live order tracking with rider location" },
  { icon: "time-outline", label: "Scheduled delivery slots" },
  { icon: "wallet-outline", label: "VADI Wallet, UPI, cards & cash on delivery" },
  { icon: "refresh-outline", label: "Easy refunds & replacements" },
  { icon: "notifications-outline", label: "Order updates & offer notifications" },
  { icon: "storefront-outline", label: "Sell on VADI — list your own farm or shop" },
];

const STATS = [
  { value: "200+", label: "Farm partners" },
  { value: "50K+", label: "Happy families" },
  { value: "24h", label: "Harvest to door" },
];

export default function AboutScreen() {
  const { user, deleteAccount } = useAuth();
  const { clearCart } = useCart();
  const version = Constants.expoConfig?.version || "1.0.0";

  const params = useLocalSearchParams<{ delete?: string | string[] }>();
  const wantsDelete =
    (Array.isArray(params.delete) ? params.delete[0] : params.delete) === "1";

  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Profile → "Delete account" deep-links here and opens the dialog straight away.
  useEffect(() => {
    if (wantsDelete && user) startTransition(() => { setAsk(true); });
  }, [wantsDelete, user]);

  const openUrl = (url: string) =>
    Linking.openURL(url).catch(() => showAlert("VADI", "Could not open the link"));

  const confirmDelete = () => {
    if (!user) {
      showAlert("Login Required", "Please login to delete an account", [
        { text: "Cancel", style: "cancel" },
        { text: "Login", onPress: () => router.push("/(auth)/login") },
      ]);
      return;
    }
    setError("");
    setAsk(true);
  };

  const closeAsk = () => {
    if (busy) return;
    setAsk(false);
    setError("");
  };

  const removeAccount = async () => {
    setBusy(true);
    setError("");
    try {
      await deleteAccount();
      setAsk(false);
      showAlert(
        "Account deleted",
        "Your account was deleted. Existing order, payment and accounting records may be retained as explained in the privacy policy.",
        [{ text: "OK", onPress: () => router.replace("/(auth)/login") }],
      );
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <AppHeader title="About VADI" showBack showCart={false} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand */}
        <View style={styles.brandCard}>
          <Image
            source={require("../assets/images/vadi-brand-logo.png")}
            style={styles.logo}
          />
          <Text style={styles.brandName}>
            VADI <Text style={{ color: C.primary }}>Fresh</Text>
          </Text>
          <Text style={styles.brandTagline}>Fresh farm products</Text>
          <Text style={styles.intro}>{INTRO}</Text>

          <View style={styles.statsRow}>
            {STATS.map((s) => (
              <View key={s.label} style={styles.stat}>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Mission */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Our story</Text>
          <Text style={styles.body}>
            VADI started with one mission — connect families directly with the farmers who feed
            them. Every crate you receive supports a local farmer, sustains organic practices and
            lands at your door within 24 hours of harvest. That&apos;s the VADI promise.
          </Text>
        </View>

        {/* Features */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>What you can do in the app</Text>
          {FEATURES.map((f, i) => (
            <View
              key={f.label}
              style={[styles.featureRow, i === FEATURES.length - 1 && { borderBottomWidth: 0 }]}
            >
              <View style={styles.featureIcon}>
                <Ionicons name={f.icon} size={18} color={C.primary} />
              </View>
              <Text style={styles.featureText}>{f.label}</Text>
            </View>
          ))}
        </View>

        {/* Contact */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Contact us</Text>
          <TouchableOpacity style={styles.contactRow} onPress={() => openUrl(WHATSAPP_URL)} activeOpacity={0.7}>
            <Ionicons name="logo-whatsapp" size={18} color={C.primary} />
            <Text style={styles.contactText}>Chat on WhatsApp</Text>
            <Ionicons name="chevron-forward" size={16} color={C.tabInactive} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.contactRow} onPress={() => openUrl(`tel:${SUPPORT_PHONE.replace(/\s/g, "")}`)} activeOpacity={0.7}>
            <Ionicons name="call-outline" size={18} color={C.primary} />
            <Text style={styles.contactText}>{SUPPORT_PHONE}</Text>
            <Ionicons name="chevron-forward" size={16} color={C.tabInactive} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.contactRow} onPress={() => openUrl(`mailto:${SUPPORT_EMAIL}`)} activeOpacity={0.7}>
            <Ionicons name="mail-outline" size={18} color={C.primary} />
            <Text style={styles.contactText}>{SUPPORT_EMAIL}</Text>
            <Ionicons name="chevron-forward" size={16} color={C.tabInactive} />
          </TouchableOpacity>
          <View style={[styles.contactRow, { borderBottomWidth: 0 }]}>
            <Ionicons name="location-outline" size={18} color={C.primary} />
            <Text style={styles.contactText}>{SUPPORT_ADDRESS}</Text>
          </View>
        </View>

        {/* Privacy */}
        <Pressable
          onPress={() => router.push("/privacy-policy")}
          style={({ pressed }) => [styles.card, styles.linkCard, pressed && { opacity: 0.75 }]}
        >
          <View style={styles.linkIcon}>
            <Ionicons name="shield-checkmark-outline" size={20} color={C.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.linkTitle}>Privacy Policy</Text>
            <Text style={styles.linkHint}>What we collect, why, and how to delete it</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={C.tabInactive} />
        </Pressable>

        <Text style={styles.version}>VADI app · Version {version}</Text>
        <Text style={styles.madeIn}>Made with ♥ in Gujarat</Text>

        {/* Delete account */}
        <View style={styles.dangerZone}>
          <Text style={styles.dangerHint}>
            Deleting your account permanently removes your profile, addresses, cart, wallet and
            reviews. Order records are kept for accounting as required by law.
          </Text>
          <TouchableOpacity
            disabled={busy}
            onPress={confirmDelete}
            activeOpacity={0.7}
            style={[styles.deleteBtn, busy && { opacity: 0.6 }]}
          >
            <Text style={styles.deleteText}>{busy ? "Deleting…" : "Delete account"}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Confirm modal */}
      <Modal visible={ask} transparent animationType="fade" statusBarTranslucent onRequestClose={closeAsk}>
        <Pressable onPress={closeAsk} style={styles.backdrop}>
          <Pressable onPress={() => undefined} style={styles.modalCard}>
            <View style={styles.modalIcon}>
              <Ionicons name="trash-outline" size={26} color="#C62828" />
            </View>
            <Text style={styles.modalTitle}>
              {error ? "Could not delete account" : "Delete your account?"}
            </Text>
            <Text style={styles.modalBody}>
              {error ||
                `This will permanently delete the account for ${user?.phone || "this number"} along with your addresses, cart, wallet balance and reviews. This cannot be undone.`}
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={closeAsk}
                disabled={busy}
                activeOpacity={0.8}
                style={[styles.modalCancel, busy && { opacity: 0.6 }]}
              >
                <Text style={styles.modalCancelText}>{error ? "Close" : "Cancel"}</Text>
              </TouchableOpacity>
              {!error && (
                <TouchableOpacity
                  onPress={removeAccount}
                  disabled={busy}
                  activeOpacity={0.85}
                  style={[styles.modalDelete, busy && { opacity: 0.7 }]}
                >
                  {busy ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.modalDeleteText}>Delete</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.page },
    content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 },

    brandCard: {
      backgroundColor: C.card,
      borderRadius: 20,
      padding: 20,
      alignItems: "center",
      borderWidth: 1,
      borderColor: C.line,
    },
    logo: { width: 84, height: 84, resizeMode: "contain" },
    brandName: { marginTop: 8, fontSize: 22, fontWeight: "900", color: C.ink, letterSpacing: 0.5 },
    brandTagline: {
      marginTop: 2,
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 2,
      textTransform: "uppercase",
      color: C.muted,
    },
    intro: {
      marginTop: 14,
      fontSize: 14,
      lineHeight: 22,
      color: C.muted,
      textAlign: "center",
      fontWeight: "500",
    },
    statsRow: { flexDirection: "row", gap: 10, marginTop: 18, alignSelf: "stretch" },
    stat: {
      flex: 1,
      backgroundColor: C.soft,
      borderRadius: 14,
      paddingVertical: 12,
      alignItems: "center",
    },
    statValue: { fontSize: 18, fontWeight: "900", color: C.primary },
    statLabel: { marginTop: 2, fontSize: 11, fontWeight: "600", color: C.muted },

    card: {
      backgroundColor: C.card,
      borderRadius: 18,
      padding: 18,
      marginTop: 14,
      borderWidth: 1,
      borderColor: C.line,
    },
    sectionTitle: { fontSize: 16, fontWeight: "800", color: C.ink, marginBottom: 10 },
    body: { fontSize: 14, lineHeight: 22, color: C.muted, fontWeight: "500" },

    featureRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: C.line,
    },
    featureIcon: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: C.soft,
      alignItems: "center",
      justifyContent: "center",
    },
    featureText: { flex: 1, fontSize: 14, lineHeight: 20, color: C.ink, fontWeight: "600" },

    contactRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: C.line,
    },
    contactText: { flex: 1, fontSize: 14, color: C.ink, fontWeight: "600" },

    linkCard: { flexDirection: "row", alignItems: "center", gap: 12 },
    linkIcon: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: C.soft,
      alignItems: "center",
      justifyContent: "center",
    },
    linkTitle: { fontSize: 15, fontWeight: "800", color: C.ink },
    linkHint: { marginTop: 2, fontSize: 12, lineHeight: 17, color: C.muted },

    version: { marginTop: 18, textAlign: "center", fontSize: 13, color: C.muted, fontWeight: "600" },
    madeIn: { marginTop: 2, textAlign: "center", fontSize: 12, color: C.tabInactive },

    dangerZone: {
      marginTop: 28,
      paddingTop: 20,
      borderTopWidth: 1,
      borderTopColor: "#E5E7EB",
      alignItems: "center",
    },
    dangerHint: {
      fontSize: 13,
      lineHeight: 19,
      color: "#9CA3AF",
      textAlign: "center",
      paddingHorizontal: 12,
      marginBottom: 10,
    },
    deleteBtn: {
      paddingVertical: 6,
      paddingHorizontal: 8,
    },
    deleteText: {
      fontSize: 13,
      fontWeight: "600",
      color: "#9CA3AF",
      textDecorationLine: "underline",
    },

    backdrop: {
      flex: 1,
      backgroundColor: "rgba(20, 30, 20, 0.5)",
      justifyContent: "center",
      paddingHorizontal: 28,
    },
    modalCard: { backgroundColor: C.card, borderRadius: 20, padding: 22 },
    modalIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: "#FDECEC",
      alignItems: "center",
      justifyContent: "center",
      alignSelf: "center",
    },
    modalTitle: { marginTop: 14, fontSize: 18, fontWeight: "800", color: C.ink, textAlign: "center" },
    modalBody: { marginTop: 8, fontSize: 14, lineHeight: 21, color: C.muted, textAlign: "center" },
    modalActions: { flexDirection: "row", gap: 10, marginTop: 20 },
    modalCancel: {
      flex: 1,
      height: 50,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: C.primary,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: C.card,
    },
    modalCancelText: { fontWeight: "700", color: C.primary, fontSize: 15 },
    modalDelete: {
      flex: 1,
      height: 50,
      borderRadius: 14,
      backgroundColor: "#C62828",
      alignItems: "center",
      justifyContent: "center",
    },
    modalDeleteText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  }),
);

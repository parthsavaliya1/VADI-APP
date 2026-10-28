import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "@/components/AppHeader";
import { showAlert } from "@/context/CustomAlertContext";
import { C, themed } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { API } from "@/utils/api";

const SUPPORT_PHONE = "+91 99090 49699";
const SUPPORT_EMAIL = "vadi.support@gmail.com";
const WHATSAPP_URL = `https://wa.me/${SUPPORT_PHONE.replace(/\D/g, "")}`;

const CONTACT_OPTIONS = [
  { title: "WhatsApp", hint: "Usually replies in minutes", icon: "logo-whatsapp", url: WHATSAPP_URL },
  { title: "Call", hint: SUPPORT_PHONE, icon: "call-outline", url: `tel:${SUPPORT_PHONE.replace(/\s/g, "")}` },
  { title: "Email", hint: SUPPORT_EMAIL, icon: "mail-outline", url: `mailto:${SUPPORT_EMAIL}` },
] as const;

const FAQ = [
  {
    q: "Where does VADI deliver?",
    a: "We currently deliver only in Rajkot, Gujarat, for PIN codes 360001–360007. Confirm your address pin on the map before saving.",
  },
  {
    q: "How fresh is the produce?",
    a: "Most fruits and vegetables are harvested within 24 hours of your order and packed the same day.",
  },
  {
    q: "Is there a delivery fee?",
    a: "Orders above ₹299 ship free. Below that, a ₹29 delivery fee applies.",
  },
  {
    q: "Which payments work?",
    a: "UPI, debit and credit cards, net banking, VADI wallet and cash on delivery.",
  },
  {
    q: "Something arrived damaged. What now?",
    a: "Open the order, report the item within 24 hours, and we refund or replace it.",
  },
  {
    q: "How do I track my order?",
    a: "Open My Orders and tap the order. You will see each step from placed to delivered, plus a handover code when it is out for delivery.",
  },
] as const;

export default function HelpSupportScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState<number | null>(0);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const openUrl = (url: string) =>
    Linking.openURL(url).catch(() => showAlert("Support", "Could not open that link"));

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <AppHeader title="Help & Support" showBack showCart={false} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="chatbubbles" size={26} color={C.primary} />
          </View>
          <Text style={styles.heroTitle}>We are here to help</Text>
          <Text style={styles.heroBody}>
            Questions about an order, a refund, or your account? Message us on WhatsApp or pick a topic below.
          </Text>
        </View>

        <Text style={styles.sectionLabel}>Talk to us</Text>
        <View style={styles.contactRow}>
          {CONTACT_OPTIONS.map((option) => (
            <Pressable key={option.title} style={styles.contactCard} onPress={() => openUrl(option.url)} accessibilityRole="link">
              <View style={styles.contactIcon}>
                <Ionicons name={option.icon} size={22} color={C.primary} />
              </View>
              <View style={styles.contactCopy}>
                <Text style={styles.contactTitle}>{option.title}</Text>
                <Text style={styles.contactHint}>{option.hint}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={C.muted} />
            </Pressable>
          ))}
        </View>

        {user ? (
          <View style={styles.messageCard}>
            <Text style={styles.messageTitle}>Message support</Text>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Ask about an order or a refund"
              placeholderTextColor="#9CA3AF"
              multiline
              textAlignVertical="top"
              style={styles.messageInput}
            />
            <Pressable
              style={[styles.sendButton, sending && { opacity: 0.6 }]}
              disabled={sending}
              onPress={() => {
                void (async () => {
                  setSending(true);
                  try {
                    await API.post("/support", { userId: user._id, body: draft });
                    setDraft("");
                    showAlert("Support", "Message sent. We will reply in the app.");
                  } catch (error: any) {
                    showAlert("Support", error?.response?.data?.message || "Could not send");
                  } finally {
                    setSending(false);
                  }
                })();
              }}
            >
              <Text style={styles.sendButtonText}>{sending ? "Sending..." : "Send message"}</Text>
            </Pressable>
          </View>
        ) : null}

        <Text style={styles.sectionLabel}>Common questions</Text>
        <View style={styles.faqCard}>
          {FAQ.map((item, index) => {
            const expanded = open === index;
            return (
              <Pressable
                key={item.q}
                onPress={() => setOpen(expanded ? null : index)}
                style={[styles.faqItem, index === FAQ.length - 1 && { borderBottomWidth: 0 }]}
              >
                <View style={styles.faqHead}>
                  <Text style={styles.faqQ}>{item.q}</Text>
                  <Ionicons
                    name={expanded ? "chevron-up" : "chevron-down"}
                    size={18}
                    color={C.primary}
                  />
                </View>
                {expanded ? <Text style={styles.faqA}>{item.a}</Text> : null}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.page },
    content: { paddingHorizontal: 16, paddingTop: 4 },
    hero: {
      backgroundColor: C.soft,
      borderRadius: 20,
      padding: 18,
      borderWidth: 1,
      borderColor: C.line,
      alignItems: "flex-start",
    },
    heroIcon: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: C.card,
      alignItems: "center",
      justifyContent: "center",
    },
    heroTitle: { marginTop: 12, fontSize: 20, lineHeight: 27, fontWeight: "800", color: C.ink },
    heroBody: { marginTop: 6, fontSize: 14, lineHeight: 21, color: C.muted },
    sectionLabel: {
      marginTop: 24,
      marginBottom: 12,
      fontSize: 13,
      fontWeight: "800",
      letterSpacing: 0.6,
      textTransform: "uppercase",
      color: C.muted,
    },
    contactRow: { gap: 10 },
    contactCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: C.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: C.line,
      padding: 16,
      minHeight: 80,
    },
    contactIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.soft, alignItems: "center", justifyContent: "center" },
    contactCopy: { flex: 1, minWidth: 0, gap: 3 },
    contactTitle: { fontSize: 14, lineHeight: 20, fontWeight: "800", color: C.ink },
    contactHint: { fontSize: 12, lineHeight: 18, color: C.muted },
    messageCard: { marginTop: 24, padding: 16, backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.line },
    messageTitle: { fontSize: 15, lineHeight: 22, fontWeight: "700", color: C.ink },
    messageInput: { minHeight: 112, marginTop: 12, paddingHorizontal: 12, paddingTop: 12, paddingBottom: 12, borderWidth: 1, borderColor: C.line, borderRadius: 12, color: C.ink, fontSize: 14, lineHeight: 21 },
    sendButton: { marginTop: 12, paddingHorizontal: 16, paddingVertical: 12, minHeight: 46, borderRadius: 12, backgroundColor: C.soft, alignItems: "center", justifyContent: "center" },
    sendButtonText: { color: C.primary, fontSize: 14, lineHeight: 20, fontWeight: "700" },
    faqCard: {
      backgroundColor: C.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: C.line,
      paddingHorizontal: 16,
    },
    faqItem: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: C.line },
    faqHead: { flexDirection: "row", alignItems: "center", gap: 12 },
    faqQ: { flex: 1, minWidth: 0, fontSize: 15, lineHeight: 22, fontWeight: "700", color: C.ink },
    faqA: { marginTop: 8, fontSize: 14, lineHeight: 21, color: C.muted },
  }),
);

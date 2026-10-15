import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader } from "@/components/AppHeader";
import { showAlert } from "@/context/CustomAlertContext";
import { C, themed } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { API } from "@/utils/api";

const SUPPORT_PHONE = "+91 99090 49699";
const SUPPORT_EMAIL = "vadi.support@gmail.com";
const WHATSAPP_URL = `https://wa.me/${SUPPORT_PHONE.replace(/\D/g, "")}`;

const FAQ = [
  {
    q: "Where does VADI deliver?",
    a: "We deliver across Ahmedabad, Rajkot, Surat and Vadodara. Enter your pincode at checkout to confirm your area.",
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
  const [open, setOpen] = useState<number | null>(0);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const openUrl = (url: string) =>
    Linking.openURL(url).catch(() => showAlert("Support", "Could not open that link"));

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <AppHeader title="Help & Support" showBack showCart={false} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
          <Pressable style={styles.contactCard} onPress={() => openUrl(WHATSAPP_URL)}>
            <Ionicons name="logo-whatsapp" size={22} color={C.primary} />
            <Text style={styles.contactTitle}>WhatsApp</Text>
            <Text style={styles.contactHint}>Usually replies in minutes</Text>
          </Pressable>
          <Pressable
            style={styles.contactCard}
            onPress={() => openUrl(`tel:${SUPPORT_PHONE.replace(/\s/g, "")}`)}
          >
            <Ionicons name="call-outline" size={22} color={C.primary} />
            <Text style={styles.contactTitle}>Call</Text>
            <Text style={styles.contactHint}>{SUPPORT_PHONE}</Text>
          </Pressable>
          <Pressable style={styles.contactCard} onPress={() => openUrl(`mailto:${SUPPORT_EMAIL}`)}>
            <Ionicons name="mail-outline" size={22} color={C.primary} />
            <Text style={styles.contactTitle}>Email</Text>
            <Text style={styles.contactHint}>vadi.support</Text>
          </Pressable>
        </View>

        {user ? (
          <View style={styles.faqCard}>
            <Text style={styles.faqQ}>Message support</Text>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Ask about an order or a refund"
              placeholderTextColor="#9CA3AF"
              style={{ borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, padding: 10, marginTop: 8, color: "#111" }}
            />
            <Pressable
              style={{ marginTop: 8 }}
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
              <Text style={{ color: C.primary, fontWeight: "700" }}>{sending ? "Sending..." : "Send message"}</Text>
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
    content: { padding: 16, paddingBottom: 36 },
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
    heroTitle: { marginTop: 12, fontSize: 20, fontWeight: "800", color: C.ink },
    heroBody: { marginTop: 6, fontSize: 14, lineHeight: 21, color: C.muted },
    sectionLabel: {
      marginTop: 22,
      marginBottom: 10,
      fontSize: 13,
      fontWeight: "800",
      letterSpacing: 0.6,
      textTransform: "uppercase",
      color: C.muted,
    },
    contactRow: { flexDirection: "row", gap: 10 },
    contactCard: {
      flex: 1,
      backgroundColor: C.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: C.line,
      padding: 12,
      minHeight: 108,
    },
    contactTitle: { marginTop: 10, fontSize: 13, fontWeight: "800", color: C.ink },
    contactHint: { marginTop: 2, fontSize: 11, color: C.muted },
    faqCard: {
      backgroundColor: C.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: C.line,
      paddingHorizontal: 14,
    },
    faqItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.line },
    faqHead: { flexDirection: "row", alignItems: "center", gap: 12 },
    faqQ: { flex: 1, fontSize: 15, fontWeight: "700", color: C.ink },
    faqA: { marginTop: 8, fontSize: 14, lineHeight: 21, color: C.muted },
  }),
);

import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader } from "@/components/AppHeader";
import { C, themed } from "@/constants/theme";

const UPDATED = "Last updated: 1 October 2026";

const INTRO =
  "VADI Fresh is a farm-to-home grocery service. This policy explains what information we collect when you use the VADI app, why we collect it, how we keep it safe and how you can delete it. The same policy is linked from the login and sign-up screens and from Profile → About VADI.";

const SECTIONS: { title: string; body: string }[] = [
  {
    title: "Who we are",
    body:
      "VADI Fresh (\"VADI\", \"we\", \"us\") operates the VADI mobile app and delivers fresh produce and groceries from local farms and sellers to customers in Gujarat, India.\n\nContact: vadi.support@gmail.com · +91 99090 49699 · VADI Fresh, Ahmedabad, Gujarat, India.",
  },
  {
    title: "What we collect",
    body:
      "Account details: your mobile number (verified by OTP), your name and an optional profile photo or date of birth if you add them.\n\nDelivery details: the addresses you save, the location you pick on the map and any delivery notes you type.\n\nOrders and payments: the products you order, order history, wallet balance and transactions, and payment status. Card and UPI details are handled by our payment partner (Razorpay) and are never stored on VADI servers.\n\nDevice information: a push-notification token and your platform (Android/iOS) so we can send order updates, plus basic diagnostic logs if the app crashes.",
  },
  {
    title: "How we use it",
    body:
      "• To create and secure your account and sign you in with OTP.\n• To accept, pack, deliver and track your orders, including sharing your name, phone and address with the rider and seller fulfilling that order.\n• To process payments, refunds and wallet credits.\n• To send order status notifications and, if you opt in, offers and announcements.\n• To provide customer support and resolve complaints.\n• To keep the service safe, prevent fraud and meet legal and tax obligations.",
  },
  {
    title: "Who we share it with",
    body:
      "We never sell your personal data. We share only what is needed with:\n\n• Delivery staff and sellers – name, phone and address for the orders they handle.\n• Payment partners (Razorpay) – to process your payment.\n• SMS / notification providers – to deliver OTPs and order updates.\n• Cloud hosting providers that store our database and uploaded images.\n• Authorities, when required by Indian law.",
  },
  {
    title: "How long we keep it",
    body:
      "Your account data is kept while your account is active. Order, invoice and payment records are retained for the period required by Indian accounting and tax law (currently up to 8 years) even after you delete your account, but they are no longer linked to a usable profile.",
  },
  {
    title: "Your choices",
    body:
      "• Edit your name and addresses any time from Profile.\n• Turn notifications off from your device settings.\n• Delete your account from Profile → About VADI → Delete account. This removes your profile, addresses, cart, wallet, reviews and seller profile immediately.\n• Email vadi.support@gmail.com to request a copy of your data or ask a question.",
  },
  {
    title: "Children",
    body:
      "VADI is intended for adults aged 18 and above. We do not knowingly collect data from children. If you believe a child has created an account, contact us and we will remove it.",
  },
  {
    title: "Security",
    body:
      "Data is transmitted over HTTPS and stored on access-controlled servers. OTP codes expire within minutes and are never shown to our staff. No system is perfectly secure, so please keep your phone locked and do not share OTPs with anyone — VADI staff will never ask for them.",
  },
  {
    title: "Changes to this policy",
    body:
      "If we make material changes we will update the date at the top of this page and notify you in the app. Continuing to use VADI after a change means you accept the updated policy.",
  },
  {
    title: "Contact us",
    body:
      "Questions or requests about your privacy:\n\nEmail: vadi.support@gmail.com\nPhone / WhatsApp: +91 99090 49699\nAddress: VADI Fresh, Ahmedabad, Gujarat, India",
  },
];

export default function PrivacyPolicyScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <AppHeader title="Privacy Policy" showBack showCart={false} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="shield-checkmark" size={26} color={C.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Your data, your control</Text>
            <Text style={styles.updated}>{UPDATED}</Text>
          </View>
        </View>

        <Text style={styles.intro}>{INTRO}</Text>

        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.card}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.body.split("\n\n").map((paragraph, i) => (
              <Text key={i} style={styles.body}>
                {paragraph}
              </Text>
            ))}
          </View>
        ))}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.page },
    content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 },

    heroCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      backgroundColor: C.soft,
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: C.line,
    },
    heroIcon: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: C.card,
      alignItems: "center",
      justifyContent: "center",
    },
    heroTitle: { fontSize: 17, fontWeight: "800", color: C.ink },
    updated: { marginTop: 3, fontSize: 12, fontWeight: "600", color: C.muted },

    intro: {
      marginTop: 16,
      fontSize: 14,
      lineHeight: 22,
      color: C.muted,
      fontWeight: "500",
    },

    card: {
      backgroundColor: C.card,
      borderRadius: 18,
      padding: 18,
      marginTop: 14,
      borderWidth: 1,
      borderColor: C.line,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "800",
      color: C.ink,
      marginBottom: 8,
    },
    body: {
      fontSize: 14,
      lineHeight: 22,
      color: C.muted,
      fontWeight: "500",
      marginBottom: 8,
    },
  }),
);

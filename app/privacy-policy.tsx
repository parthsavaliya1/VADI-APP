import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader } from "@/components/AppHeader";
import { C, themed } from "@/constants/theme";

import policy from "@/constants/privacyPolicy.json";
const UPDATED = "Last updated: " + policy.updated;
const INTRO = policy.intro;
const SECTIONS = policy.sections;

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

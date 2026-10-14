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
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader } from "@/components/AppHeader";
import { showAlert } from "@/context/CustomAlertContext";
import { C, themed } from "@/constants/theme";

const PLAY_STORE = "https://play.google.com/store/apps/details?id=com.vadi.app";
const SUPPORT_EMAIL = "vadi.support@gmail.com";

const TAGS = ["Fresh produce", "Fast delivery", "Easy to order", "App is slow", "Missing items"];

export default function RateAppScreen() {
  const [stars, setStars] = useState(0);
  const [tag, setTag] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);

  const openStore = () =>
    Linking.openURL(PLAY_STORE).catch(() =>
      showAlert("Rate VADI", "Could not open the Play Store"),
    );

  const submit = () => {
    if (stars === 0) {
      showAlert("Rate VADI", "Tap a star first");
      return;
    }
    const body = encodeURIComponent(
      `Rating: ${stars}/5\nTopic: ${tag || "—"}\n\n${note.trim() || "(no note)"}`,
    );
    Linking.openURL(
      `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("VADI app feedback")}&body=${body}`,
    ).catch(() => undefined);
    setSent(true);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <AppHeader title="Rate the App" showBack showCart={false} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="star" size={28} color={C.primary} />
          </View>
          <Text style={styles.title}>How is VADI treating you?</Text>
          <Text style={styles.body}>
            Your rating helps us keep produce fresher and delivery smoother.
          </Text>

          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable key={n} onPress={() => setStars(n)} hitSlop={6}>
                <Ionicons
                  name={n <= stars ? "star" : "star-outline"}
                  size={36}
                  color={n <= stars ? C.primary : C.tabInactive}
                />
              </Pressable>
            ))}
          </View>
          <Text style={styles.starHint}>
            {stars === 0 ? "Tap to rate" : `${stars} of 5`}
          </Text>
        </View>

        <Text style={styles.sectionLabel}>What stood out?</Text>
        <View style={styles.tags}>
          {TAGS.map((item) => {
            const on = tag === item;
            return (
              <Pressable
                key={item}
                onPress={() => setTag(on ? null : item)}
                style={[styles.tag, on && styles.tagOn]}
              >
                <Text style={[styles.tagText, on && styles.tagTextOn]}>{item}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>Anything else?</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Optional note for the VADI team"
          placeholderTextColor={C.tabInactive}
          multiline
          style={styles.input}
        />

        <Pressable style={styles.primary} onPress={submit}>
          <Text style={styles.primaryText}>{sent ? "Feedback noted" : "Send feedback"}</Text>
        </Pressable>
        <Pressable style={styles.secondary} onPress={openStore}>
          <Ionicons name="logo-google" size={18} color={C.primary} />
          <Text style={styles.secondaryText}>Rate on Google Play</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.page },
    content: { padding: 16, paddingBottom: 36 },
    card: {
      backgroundColor: C.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: C.line,
      padding: 20,
      alignItems: "center",
    },
    iconWrap: {
      width: 56,
      height: 56,
      borderRadius: 18,
      backgroundColor: C.soft,
      alignItems: "center",
      justifyContent: "center",
    },
    title: { marginTop: 14, fontSize: 20, fontWeight: "800", color: C.ink, textAlign: "center" },
    body: { marginTop: 6, fontSize: 14, lineHeight: 21, color: C.muted, textAlign: "center" },
    stars: { flexDirection: "row", gap: 8, marginTop: 18 },
    starHint: { marginTop: 8, fontSize: 13, fontWeight: "700", color: C.muted },
    sectionLabel: {
      marginTop: 22,
      marginBottom: 10,
      fontSize: 13,
      fontWeight: "800",
      letterSpacing: 0.6,
      textTransform: "uppercase",
      color: C.muted,
    },
    tags: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    tag: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: C.line,
      backgroundColor: C.card,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    tagOn: { backgroundColor: C.primary, borderColor: C.primary },
    tagText: { fontSize: 13, fontWeight: "700", color: C.ink },
    tagTextOn: { color: "#fff" },
    input: {
      minHeight: 96,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: C.line,
      backgroundColor: C.card,
      padding: 14,
      fontSize: 14,
      color: C.ink,
      textAlignVertical: "top",
    },
    primary: {
      marginTop: 18,
      height: 52,
      borderRadius: 14,
      backgroundColor: C.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    primaryText: { color: "#fff", fontSize: 16, fontWeight: "800" },
    secondary: {
      marginTop: 10,
      height: 52,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: C.primary,
      backgroundColor: C.card,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    secondaryText: { color: C.primary, fontSize: 15, fontWeight: "800" },
  }),
);

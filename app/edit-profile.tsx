import { AnimatedLoader } from "@/components/AnimatedLoader";
import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/context/AuthContext";
import { showAlert } from "@/context/CustomAlertContext";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { C, themed } from "@/constants/theme";

export default function EditProfileScreen() {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) {
      showAlert("Profile", "Please enter your name");
      return;
    }
    setSaving(true);
    try {
      await updateProfile({ name: name.trim() });
      showAlert("Profile", "Your profile was updated", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      showAlert("Profile", error?.message || "Could not update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <AppHeader title="Edit profile" showBack showCart={false} />
      <View style={styles.body}>
        <Text style={styles.label}>Name</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Your name" />
        <Text style={styles.label}>Phone</Text>
        <TextInput style={[styles.input, styles.locked]} value={user?.phone || ""} editable={false} />
        <TouchableOpacity style={styles.btn} onPress={save} disabled={saving}>
          {saving ? <AnimatedLoader color="#fff" /> : <Text style={styles.btnText}>Save</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = themed(() => StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.page },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: C.card,
  },
  title: { fontSize: 18, fontWeight: "800" },
  body: { padding: 16 },
  label: { fontWeight: "700", marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: C.card, borderRadius: 12, padding: 14, fontSize: 16 },
  locked: { color: C.muted },
  btn: {
    marginTop: 24,
    backgroundColor: C.primary,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
}));

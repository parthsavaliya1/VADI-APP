import { AnimatedLoader } from "@/components/AnimatedLoader";
import { startTransition , useCallback, useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/context/AuthContext";
import { showAlert } from "@/context/CustomAlertContext";
import { API } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { C, themed } from "@/constants/theme";

type Seller = {
  _id: string;
  name: string;
  status: "pending" | "approved" | "rejected";
  phone?: string;
  email?: string;
  location?: { city?: string; area?: string };
  hasPassword?: boolean;
};

const PERKS = [
  { icon: "leaf-outline" as const, label: "List farm-fresh products" },
  { icon: "people-outline" as const, label: "Reach local families" },
  { icon: "cash-outline" as const, label: "Get paid for every order" },
];

export default function SellerScreen() {
  const { user } = useAuth();
  const [seller, setSeller] = useState<Seller | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user?._id) return;
    try {
      const res = await API.get("/sellers/me", { params: { userId: user._id } });
      setSeller(res.data?.data || null);
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 400 || status === 404) {
        setSeller(null);
        return;
      }
      throw error;
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      router.replace("/(auth)/login");
      return;
    }
    startTransition(() => { load()
      .catch(() => showAlert("Seller", "Could not load seller profile"))
      .finally(() => setLoading(false)); });
  }, [user, load]);

  const register = async () => {
    const shopName = (seller?.name || name).trim();
    if (!shopName) {
      showAlert("Seller", "Enter your shop name");
      return;
    }
    if (password.trim().length < 6) {
      showAlert("Seller", "Choose a password of at least 6 characters");
      return;
    }
    setSaving(true);
    try {
      const res = await API.post("/sellers/register", {
        userId: user?._id,
        name: shopName,
        phone: user?.phone,
        email: email.trim(),
        city: city.trim(),
        area: area.trim(),
        password,
      });
      setSeller(res.data?.data);
      setPassword("");
      showAlert("Seller", res.data?.message || "Request sent");
    } catch (error: any) {
      showAlert("Seller", error.response?.data?.message || "Could not register");
    } finally {
      setSaving(false);
    }
  };

  const statusCopy =
    seller?.status === "approved"
      ? "Your shop is live. Sign in on the seller panel with this phone and password. Products go live after an admin approves them."
      : seller?.status === "rejected"
        ? "This request was rejected. Contact VADI support if you want it reviewed again."
        : "An admin is reviewing your shop. You can sign in to the seller panel only after it is approved.";

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <AppHeader title="Sell on VADI" showBack showCart={false} />
      {loading ? (
        <View style={styles.center}>
          <AnimatedLoader color={C.primary} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <Ionicons name="storefront" size={26} color={C.primary} />
            </View>
            <Text style={styles.heroTitle}>
              {seller ? seller.name : "Grow with VADI"}
            </Text>
            <Text style={styles.heroBody}>
              {seller
                ? "Your shop request is on file. Here is where it stands."
                : "Open a shop, list what you grow, and deliver through VADI after a quick admin approval."}
            </Text>
            {seller ? (
              <View
                style={[
                  styles.pill,
                  seller.status === "approved" && styles.pillOk,
                  seller.status === "rejected" && styles.pillBad,
                ]}
              >
                <Text
                  style={[
                    styles.pillText,
                    seller.status === "approved" && styles.pillTextOk,
                    seller.status === "rejected" && styles.pillTextBad,
                  ]}
                >
                  {seller.status}
                </Text>
              </View>
            ) : null}
          </View>

          {!seller ? (
            <View style={styles.perkRow}>
              {PERKS.map((perk) => (
                <View key={perk.label} style={styles.perk}>
                  <Ionicons name={perk.icon} size={18} color={C.primary} />
                  <Text style={styles.perkText}>{perk.label}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {seller ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Shop status</Text>
              <Text style={styles.hint}>{statusCopy}</Text>
              <View style={styles.meta}>
                <Ionicons name="call-outline" size={16} color={C.primary} />
                <Text style={styles.metaText}>{seller.phone || user?.phone || "—"}</Text>
              </View>
              {[seller.location?.area, seller.location?.city].filter(Boolean).length > 0 ? (
                <View style={styles.meta}>
                  <Ionicons name="location-outline" size={16} color={C.primary} />
                  <Text style={styles.metaText}>
                    {[seller.location?.area, seller.location?.city].filter(Boolean).join(", ")}
                  </Text>
                </View>
              ) : null}

              {!seller.hasPassword ? (
                <>
                  <Text style={styles.label}>Set a login password</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="At least 6 characters"
                    placeholderTextColor={C.tabInactive}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />
                  <TouchableOpacity style={styles.btnOutline} onPress={register} disabled={saving}>
                    <Text style={styles.btnOutlineText}>{saving ? "Saving…" : "Save password"}</Text>
                  </TouchableOpacity>
                </>
              ) : null}

              {seller.status === "approved" ? (
                <View style={styles.actions}>
                  <TouchableOpacity style={styles.btn} onPress={() => router.push("/seller-add-product")}>
                    <Ionicons name="add" size={18} color="#fff" />
                    <Text style={styles.btnText}>Add product</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btnOutline} onPress={() => router.push("/seller-products")}>
                    <Text style={styles.btnOutlineText}>My products</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Request a shop</Text>
              <Text style={styles.hint}>
                Use the phone on this account. You will sign in with the password below after approval.
              </Text>

              <Field label="Shop name" value={name} onChangeText={setName} placeholder="Farm or shop name" />
              <Field label="Email" value={email} onChangeText={setEmail} placeholder="Optional" keyboard="email-address" />
              <View style={styles.split}>
                <View style={{ flex: 1 }}>
                  <Field label="Area" value={area} onChangeText={setArea} placeholder="Optional" />
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="City" value={city} onChangeText={setCity} placeholder="Optional" />
                </View>
              </View>
              <Field
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="At least 6 characters"
                secure
              />

              <TouchableOpacity style={styles.btn} onPress={register} disabled={saving}>
                {saving ? (
                  <AnimatedLoader color="#fff" />
                ) : (
                  <Text style={styles.btnText}>Request approval</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secure,
  keyboard,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  secure?: boolean;
  keyboard?: "email-address";
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.tabInactive}
        secureTextEntry={secure}
        autoCapitalize={keyboard ? "none" : "sentences"}
        keyboardType={keyboard}
      />
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.page },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    content: { padding: 16, paddingBottom: 36 },
    hero: {
      backgroundColor: C.soft,
      borderRadius: 20,
      padding: 18,
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
    heroTitle: { marginTop: 12, fontSize: 22, fontWeight: "800", color: C.ink },
    heroBody: { marginTop: 6, fontSize: 14, lineHeight: 21, color: C.muted },
    pill: {
      alignSelf: "flex-start",
      marginTop: 12,
      backgroundColor: C.badge,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 5,
    },
    pillOk: { backgroundColor: C.primary },
    pillBad: { backgroundColor: "#FDECEC" },
    pillText: {
      fontSize: 12,
      fontWeight: "800",
      color: C.badgeText,
      textTransform: "capitalize",
    },
    pillTextOk: { color: "#fff" },
    pillTextBad: { color: "#C62828" },
    perkRow: { marginTop: 12, gap: 8 },
    perk: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: C.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: C.line,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    perkText: { fontSize: 14, fontWeight: "700", color: C.ink },
    card: {
      marginTop: 14,
      backgroundColor: C.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: C.line,
      padding: 16,
    },
    cardTitle: { fontSize: 16, fontWeight: "800", color: C.ink },
    hint: { marginTop: 6, marginBottom: 12, fontSize: 14, lineHeight: 21, color: C.muted },
    meta: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
    metaText: { fontSize: 14, fontWeight: "600", color: C.ink },
    field: { marginBottom: 10 },
    label: {
      marginBottom: 6,
      fontSize: 12,
      fontWeight: "800",
      letterSpacing: 0.4,
      textTransform: "uppercase",
      color: C.muted,
    },
    input: {
      backgroundColor: C.page,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: C.line,
      paddingHorizontal: 14,
      paddingVertical: 13,
      fontSize: 15,
      color: C.ink,
    },
    split: { flexDirection: "row", gap: 10 },
    actions: { marginTop: 8, gap: 8 },
    btn: {
      marginTop: 8,
      height: 50,
      borderRadius: 14,
      backgroundColor: C.primary,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    },
    btnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
    btnOutline: {
      marginTop: 8,
      height: 50,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: C.primary,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: C.card,
    },
    btnOutlineText: { color: C.primary, fontWeight: "800", fontSize: 15 },
  }),
);

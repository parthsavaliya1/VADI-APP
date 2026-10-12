import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/context/AuthContext";
import { showAlert } from "@/context/CustomAlertContext";
import { API } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Seller = {
  _id: string;
  name: string;
  status: "pending" | "approved" | "rejected";
  phone?: string;
  email?: string;
  location?: { city?: string; area?: string };
  hasPassword?: boolean;
};

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
    const res = await API.get("/sellers/me", { params: { userId: user._id } });
    setSeller(res.data?.data || null);
  }, [user?._id]);

  useEffect(() => {
    if (!user) {
      router.replace("/(auth)/login");
      return;
    }
    load()
      .catch(() => showAlert("Seller", "Could not load seller profile"))
      .finally(() => setLoading(false));
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
      showAlert("Seller", res.data?.message || "Request sent");
    } catch (error: any) {
      showAlert("Seller", error.response?.data?.message || "Could not register");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <AppHeader title="Seller" showBack showCart={false} />
      {loading ? (
        <ActivityIndicator color="#C2410C" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {seller ? (
            <View style={styles.card}>
              <Text style={styles.shop}>{seller.name}</Text>
              <Text style={styles.status}>Status: {seller.status}</Text>
              <Text style={styles.hint}>
                {seller.status === "approved"
                  ? "Your shop is approved. Sign in on the admin site with this phone and the password you set, then add products and categories. Each product goes live after an admin approves it."
                  : seller.status === "rejected"
                    ? "This seller request was rejected. Contact support if you want it reviewed again."
                    : "Waiting for an admin to approve your shop. You cannot sign in to the seller panel until then."}
              </Text>
              {!seller.hasPassword && (
                <>
                  <TextInput
                    style={styles.input}
                    placeholder="Set login password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />
                  <TouchableOpacity style={styles.btnOutline} onPress={register} disabled={saving}>
                    <Text style={styles.btnOutlineText}>{saving ? "Saving…" : "Save password"}</Text>
                  </TouchableOpacity>
                </>
              )}
              {seller.status === "approved" && (
                <>
                  <TouchableOpacity style={styles.btn} onPress={() => router.push("/seller-add-product")}>
                    <Text style={styles.btnText}>Add product</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btnOutline} onPress={() => router.push("/seller-products")}>
                    <Text style={styles.btnOutlineText}>My products</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.shop}>Become a seller</Text>
              <Text style={styles.hint}>Create a shop so you can list products. An admin approves the shop first.</Text>
              <TextInput style={styles.input} placeholder="Shop name" value={name} onChangeText={setName} />
              <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" />
              <TextInput style={styles.input} placeholder="City" value={city} onChangeText={setCity} />
              <TextInput style={styles.input} placeholder="Area" value={area} onChangeText={setArea} />
              <TextInput
                style={styles.input}
                placeholder="Password (min 6 characters)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
              <TouchableOpacity style={styles.btn} onPress={register} disabled={saving}>
                <Text style={styles.btnText}>{saving ? "Sending…" : "Request approval"}</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFF8F4" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#fff",
  },
  title: { fontSize: 18, fontWeight: "800" },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16 },
  shop: { fontSize: 20, fontWeight: "800" },
  status: { marginTop: 6, fontWeight: "700", color: "#C2410C", textTransform: "capitalize" },
  hint: { color: "#555", marginTop: 8, marginBottom: 12, lineHeight: 20 },
  input: { backgroundColor: "#F7F7F7", borderRadius: 12, padding: 14, marginBottom: 10 },
  btn: { backgroundColor: "#C2410C", borderRadius: 14, padding: 14, alignItems: "center", marginTop: 8 },
  btnText: { color: "#fff", fontWeight: "800" },
  btnOutline: { borderWidth: 1, borderColor: "#C2410C", borderRadius: 14, padding: 14, alignItems: "center", marginTop: 8 },
  btnOutlineText: { color: "#C2410C", fontWeight: "800" },
});

import { useAuth } from "@/context/AuthContext";
import { showAlert } from "@/context/CustomAlertContext";
import { API } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Product = {
  _id: string;
  name: string;
  approvalStatus?: string;
  isActive: boolean;
  variants?: { price: number; stock: number }[];
};

export default function SellerProductsScreen() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await API.get("/sellers/me/products", { params: { userId: user?._id } });
    setProducts(res.data?.data || []);
  }, [user?._id]);

  useEffect(() => {
    load()
      .catch(() => showAlert("Products", "Could not load your products"))
      .finally(() => setLoading(false));
  }, [load]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.title}>My products</Text>
        <TouchableOpacity onPress={() => router.push("/seller-add-product")}>
          <Ionicons name="add" size={26} color="#C2410C" />
        </TouchableOpacity>
      </View>
      {loading ? (
        <ActivityIndicator color="#C2410C" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={<Text style={styles.empty}>No products yet.</Text>}
          renderItem={({ item }) => {
            const variant = item.variants?.[0];
            return (
              <View style={styles.card}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>
                  ₹{variant?.price ?? "—"} · Stock {variant?.stock ?? 0}
                </Text>
                <Text style={styles.status}>
                  {item.approvalStatus === "approved" || item.isActive
                    ? "Live"
                    : item.approvalStatus === "rejected"
                      ? "Rejected"
                      : "Waiting for admin"}
                </Text>
              </View>
            );
          }}
        />
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
  empty: { color: "#777" },
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 10 },
  name: { fontWeight: "800", fontSize: 16 },
  meta: { color: "#555", marginTop: 4 },
  status: { marginTop: 6, color: "#C2410C", fontWeight: "700" },
});

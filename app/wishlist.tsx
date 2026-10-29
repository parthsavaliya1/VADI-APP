import { AnimatedLoader } from "@/components/AnimatedLoader";
import { Ionicons } from "@expo/vector-icons";
import { router , useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppHeader } from "@/components/AppHeader";
import { C } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { API } from "@/utils/api";

type Product = {
  _id: string;
  name: string;
  image?: string;
  variants?: { price: number; stock: number; isDefault?: boolean }[];
};

export default function WishlistScreen() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?._id) {
      setProducts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await API.get("/wishlist", { params: { userId: user._id } });
      setProducts(res.data?.data || []);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <AppHeader title="Wishlist" showBack />
      {loading ? (
        <AnimatedLoader fullScreen />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={<Text style={styles.empty}>Saved products will show up here.</Text>}
          renderItem={({ item }) => {
            const variant = item.variants?.find((row) => row.isDefault) || item.variants?.[0];
            return (
              <TouchableOpacity
                style={styles.row}
                onPress={() => router.push({ pathname: "/product-detail", params: { id: item._id } })}
              >
                {item.image ? <Image source={{ uri: item.image }} style={styles.image} /> : <View style={styles.image} />}
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.price}>{variant ? `₹${variant.price}` : ""}</Text>
                  <Text style={styles.stock}>{variant && variant.stock > 0 ? "In stock" : "Out of stock"}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={C.muted} />
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.page },
  row: { flexDirection: "row", gap: 12, alignItems: "center", backgroundColor: "#fff", borderRadius: 14, padding: 12, marginBottom: 10 },
  image: { width: 64, height: 64, borderRadius: 10, backgroundColor: C.soft },
  name: { fontWeight: "700", color: C.ink },
  price: { marginTop: 4, fontWeight: "800", color: C.ink },
  stock: { marginTop: 2, color: C.muted, fontSize: 12 },
  empty: { textAlign: "center", color: C.muted, marginTop: 40 },
});

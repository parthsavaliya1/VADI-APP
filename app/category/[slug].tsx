import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCart } from "../../context/CartContext";
import { API } from "../../utils/api";

type Product = {
  _id: string;
  name: string;
  price: number;
  unit: string;
};

export default function ProductListScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { addToCart } = useCart();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;

    API.get(`/products?category=${slug}`)
      .then((res) => setProducts(res.data))
      .catch((err) => console.log(err))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={{ padding: 20 }}>Loading products...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>{slug?.toUpperCase()}</Text>

        <FlatList
          data={products}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              {/* LEFT SIDE → PRODUCT INFO */}
              <TouchableOpacity
                style={styles.info}
                onPress={() => router.push(`/product/${item._id}`)}
              >
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.price}>
                  ₹{item.price} / {item.unit}
                </Text>
              </TouchableOpacity>

              {/* RIGHT SIDE → ADD BUTTON */}
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() =>
                  addToCart({
                    id: item._id,
                    name: item.name,
                    price: item.price,
                    qty: 1,
                  })
                }
              >
                <Text style={styles.addText}>ADD</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F6F7F2",
  },
  container: {
    padding: 15,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 15,
    color: "#1B5E20",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  info: {
    flex: 1,
    marginRight: 10,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
  },
  price: {
    color: "#2E7D32",
    marginTop: 5,
  },
  addBtn: {
    backgroundColor: "#2E7D32",
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addText: {
    color: "#fff",
    fontWeight: "700",
  },
});

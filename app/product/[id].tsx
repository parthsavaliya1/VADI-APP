import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCart } from "../../context/CartContext";
import { API } from "../../utils/api";

type Product = {
  _id: string;
  name: string;
  price: number;
  unit: string;
  image?: string;
  category: string;
};

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { addToCart } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    API.get(`/products/${id}`)
      .then((res) => setProduct(res.data))
      .catch((err) => console.log(err))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={{ padding: 20 }}>Loading product...</Text>
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={{ padding: 20 }}>Product not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* IMAGE */}
        <Image
          source={{
            uri: product.image || "https://via.placeholder.com/300",
          }}
          style={styles.image}
        />

        {/* INFO */}
        <Text style={styles.name}>{product.name}</Text>
        <Text style={styles.price}>
          ₹{product.price} / {product.unit}
        </Text>

        {/* ADD TO CART */}
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() =>
            addToCart({
              id: product._id,
              name: product.name,
              price: product.price,
              qty: 1,
            })
          }
        >
          <Text style={styles.addText}>ADD TO CART</Text>
        </TouchableOpacity>
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
    padding: 20,
  },
  image: {
    width: "100%",
    height: 220,
    resizeMode: "contain",
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 20,
  },
  name: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 10,
  },
  price: {
    fontSize: 18,
    color: "#2E7D32",
    marginBottom: 20,
  },
  addBtn: {
    backgroundColor: "#2E7D32",
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 20,
  },
  addText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "700",
    fontSize: 16,
  },
});

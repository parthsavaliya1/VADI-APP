import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCart } from "../context/CartContext";
import { API } from "../utils/api";

type Product = {
  _id: string;
  name: string;
  price: number;
  unit: string;
  image?: string;
  category?: string;
};

export default function CategoryScreen() {
  const params = useLocalSearchParams();
  const { category, title } = params;
  const { items, addToCart } = useCart();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadProducts();
  }, [category]);

  const loadProducts = async () => {
    try {
      const res = await API.get("/products");
      const filtered = res.data.filter(
        (p: Product) =>
          p.category?.toLowerCase() === category?.toString().toLowerCase(),
      );
      setProducts(filtered);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleAddToCart = (item: Product) => {
    addToCart({
      id: item._id,
      name: item.name,
      price: item.price,
      qty: 1,
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1B5E20" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <TouchableOpacity onPress={() => router.push("/cart")}>
          <View style={styles.cartIcon}>
            <Ionicons name="cart-outline" size={24} color="#1B5E20" />
            {items.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{items.length}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      {/* SEARCH */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color="#777" />
        <TextInput
          placeholder={`Search in ${title}`}
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* PRODUCTS */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2E7D32" />
        </View>
      ) : filteredProducts.length > 0 ? (
        <FlatList
          data={filteredProducts}
          numColumns={2}
          keyExtractor={(item) => item._id}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: "/product-detail",
                    params: { id: item._id },
                  })
                }
              >
                <Image
                  source={{
                    uri: item.image || "https://via.placeholder.com/150",
                  }}
                  style={styles.image}
                />
                <Text numberOfLines={2} style={styles.name}>
                  {item.name}
                </Text>
                <Text style={styles.unit}>{item.unit}</Text>
                <View style={styles.footer}>
                  <Text style={styles.price}>₹{item.price}</Text>
                  <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => handleAddToCart(item)}
                  >
                    <Text style={styles.addText}>ADD</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </View>
          )}
        />
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="basket-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No products found</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F5F7F2",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1B5E20",
  },
  cartIcon: {
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -6,
    right: -8,
    backgroundColor: "#2E7D32",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginHorizontal: 14,
    marginBottom: 16,
    elevation: 3,
  },
  searchInput: {
    marginLeft: 8,
    fontSize: 15,
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  list: {
    padding: 14,
  },
  row: {
    justifyContent: "space-between",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    width: "48%",
    marginBottom: 14,
    elevation: 3,
  },
  image: {
    width: "100%",
    height: 100,
    resizeMode: "contain",
    marginBottom: 8,
  },
  name: {
    fontSize: 14,
    fontWeight: "600",
    color: "#222",
    minHeight: 36,
  },
  unit: {
    fontSize: 12,
    color: "#777",
    marginVertical: 4,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  price: {
    fontSize: 16,
    fontWeight: "800",
    color: "#2E7D32",
  },
  addBtn: {
    borderWidth: 1.5,
    borderColor: "#2E7D32",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  addText: {
    color: "#2E7D32",
    fontWeight: "700",
    fontSize: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#666",
    marginTop: 16,
  },
});

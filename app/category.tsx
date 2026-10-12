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

type ProductVariant = {
  _id: string;
  packSize: number;
  packUnit: string;
  mrp: number;
  price: number;
  stock: number;
  lowStockThreshold: number;
  sku?: string;
  isDefault: boolean;
  isActive: boolean;
};

// Updated Product Type to match API response
type Product = {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  brand?: string;
  category: {
    _id: string;
    name: string;
    slug: string;
  };
  unit: string;
  seller: {
    sellerId: string;
    sellerName: string;
    contact?: {
      phone?: string;
      email?: string;
    };
    location?: {
      city?: string;
      area?: string;
    };
  };
  variants: ProductVariant[];
  image?: string;
  images?: string[];
  discount?: number;
  featured?: boolean;
  trending?: boolean;
  bestDeal?: boolean;
  rating: number;
  reviewsCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

const getDefaultVariant = (product: Product): ProductVariant => {
  return product.variants.find((v) => v.isDefault) || product.variants[0];
};

export default function CategoryScreen() {
  const params = useLocalSearchParams();
  const { categoryId, title } = params;
  const { items, addToCart } = useCart();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadProducts();
  }, [categoryId]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const res = await API.get("/products");

      const allProducts: Product[] = res.data.data || [];

      console.log("acte", categoryId);

      const filtered = allProducts.filter(
        (p) => p.category?._id === categoryId,
      );

      setProducts(filtered);
    } catch (err) {
      console.error("Failed to load category products", err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleAddToCart = (product: Product) => {
    if (!product.variants || product.variants.length === 0) return;

    const variant = getDefaultVariant(product);

    addToCart({
      id: `${product._id}_${variant._id}`, // ✅ UNIQUE PER VARIANT
      productId: product._id, // ✅ REQUIRED
      variantId: variant._id, // ✅ REQUIRED
      name: product.name,
      variantLabel: `${variant.packSize}${variant.packUnit}`,
      price: variant.price,
      qty: 1,
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#9A3412" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <TouchableOpacity onPress={() => router.push("/cart")}>
          <View style={styles.cartIcon}>
            <Ionicons name="cart-outline" size={24} color="#9A3412" />
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
        <Ionicons name="search" size={16} color="#777" style={{ marginLeft: 2, marginRight: 4 }} />
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
          <ActivityIndicator size="large" color="#B56A45" />
        </View>
      ) : filteredProducts.length > 0 ? (
        <FlatList
          data={filteredProducts}
          numColumns={2}
          keyExtractor={(item) => item._id}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const variant = getDefaultVariant(item);

            return (
              <View style={styles.card}>
                <TouchableOpacity
                  onPress={() =>
                    router.push({
                      pathname: "/product-detail",
                      params: { id: item._id },
                    })
                  }
                >
                  <View style={styles.imageWrap}>
                    <Image
                      source={{
                        uri: item.image || "https://via.placeholder.com/150",
                      }}
                      style={styles.image}
                    />
                  </View>
                  <View style={styles.cardBody}>
                    <Text numberOfLines={1} style={styles.name}>
                      {item.name}
                    </Text>
                    <Text style={styles.price}>₹{variant.price}</Text>
                    <Text style={styles.unit} numberOfLines={1}>
                      {variant.packSize}
                      {variant.packUnit}
                    </Text>
                    <TouchableOpacity
                      style={styles.addBtn}
                      onPress={() => handleAddToCart(item)}
                    >
                      <Text style={styles.addText}>ADD</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              </View>
            );
          }}
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
    backgroundColor: "#F7F3EC",
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
    fontWeight: "700",
    color: "#171717",
  },
  cartIcon: {
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -6,
    right: -8,
    backgroundColor: "#B56A45",
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
    borderRadius: 12,
    paddingLeft: 14,
    paddingRight: 10,
    height: 42,
    marginHorizontal: 20,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E4DDD5",
  },
  searchInput: {
    marginLeft: 8,
    fontSize: 14,
    flex: 1,
    paddingVertical: 0,
    height: 42,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },
  row: {
    justifyContent: "space-between",
    gap: 12,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    flex: 1,
    marginBottom: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E4DDD5",
    shadowColor: "#171717",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  imageWrap: {
    height: 120,
    width: "100%",
    backgroundColor: "#E7D9C8",
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  cardBody: {
    padding: 10,
  },
  name: {
    fontSize: 14,
    fontWeight: "600",
    color: "#171717",
  },
  price: {
    fontSize: 15,
    fontWeight: "800",
    color: "#B56A45",
    marginTop: 4,
  },
  unit: {
    fontSize: 12,
    color: "#6F6A64",
    marginTop: 4,
  },
  addBtn: {
    marginTop: 8,
    alignSelf: "flex-start",
    backgroundColor: "#B56A45",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  addText: {
    color: "#fff",
    fontWeight: "800",
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

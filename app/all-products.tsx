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
  discount?: number;
};

type SortOption = "default" | "price-low" | "price-high" | "name";

export default function AllProductsScreen() {
  const params = useLocalSearchParams();
  const { type, title } = params; // type can be "popular" or "deals"
  const { items, addToCart } = useCart();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("default");
  const [showSortModal, setShowSortModal] = useState(false);

  useEffect(() => {
    loadProducts();
  }, [type]);

  const loadProducts = async () => {
    try {
      const res = await API.get("/products");
      let filtered = res.data;

      if (type === "deals") {
        // Filter products with discounts or just show all for demo
        filtered = filtered.filter(
          (p: Product) => p.discount && p.discount > 0,
        );
        if (filtered.length === 0) filtered = res.data; // Fallback to all products
      }

      setProducts(filtered);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (item: Product) => {
    addToCart({
      id: item._id,
      name: item.name,
      price: item.price,
      qty: 1,
    });
  };

  // Filter and sort products
  const getFilteredAndSortedProducts = () => {
    let filtered = products.filter((p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    // Apply sorting
    switch (sortBy) {
      case "price-low":
        filtered.sort((a, b) => a.price - b.price);
        break;
      case "price-high":
        filtered.sort((a, b) => b.price - a.price);
        break;
      case "name":
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        // Keep default order
        break;
    }

    return filtered;
  };

  const displayProducts = getFilteredAndSortedProducts();

  const sortOptions = [
    { value: "default", label: "Relevance" },
    { value: "price-low", label: "Price: Low to High" },
    { value: "price-high", label: "Price: High to Low" },
    { value: "name", label: "Name: A to Z" },
  ];

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
          placeholder="Search products"
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* FILTER & SORT BAR */}
      <View style={styles.filterBar}>
        <Text style={styles.resultCount}>
          {displayProducts.length}{" "}
          {displayProducts.length === 1 ? "product" : "products"}
        </Text>
        <TouchableOpacity
          style={styles.sortBtn}
          onPress={() => setShowSortModal(!showSortModal)}
        >
          <Ionicons name="swap-vertical" size={18} color="#2E7D32" />
          <Text style={styles.sortText}>Sort</Text>
        </TouchableOpacity>
      </View>

      {/* SORT OPTIONS */}
      {showSortModal && (
        <View style={styles.sortModal}>
          {sortOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={styles.sortOption}
              onPress={() => {
                setSortBy(option.value as SortOption);
                setShowSortModal(false);
              }}
            >
              <Text
                style={[
                  styles.sortOptionText,
                  sortBy === option.value && styles.sortOptionActive,
                ]}
              >
                {option.label}
              </Text>
              {sortBy === option.value && (
                <Ionicons name="checkmark" size={20} color="#2E7D32" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* PRODUCTS */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2E7D32" />
        </View>
      ) : displayProducts.length > 0 ? (
        <FlatList
          data={displayProducts}
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
                {item.discount && item.discount > 0 && (
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>
                      {item.discount}% OFF
                    </Text>
                  </View>
                )}
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
                  <View>
                    <Text style={styles.price}>₹{item.price}</Text>
                    {item.discount && (
                      <Text style={styles.originalPrice}>
                        ₹{Math.round(item.price * 1.25)}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.addBtn,
                      items.some((i) => i.id === item._id) &&
                        styles.addBtnActive,
                    ]}
                    onPress={() => handleAddToCart(item)}
                  >
                    {items.some((i) => i.id === item._id) ? (
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    ) : (
                      <Text
                        style={[
                          styles.addText,
                          items.some((i) => i.id === item._id) &&
                            styles.addTextActive,
                        ]}
                      >
                        ADD
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </View>
          )}
        />
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No products found</Text>
          <Text style={styles.emptySubtext}>Try adjusting your search</Text>
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
    marginBottom: 12,
    elevation: 3,
  },
  searchInput: {
    marginLeft: 8,
    fontSize: 15,
    flex: 1,
  },
  filterBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#fff",
    marginHorizontal: 14,
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
  },
  resultCount: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  sortBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sortText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2E7D32",
  },
  sortModal: {
    backgroundColor: "#fff",
    marginHorizontal: 14,
    marginBottom: 12,
    borderRadius: 12,
    elevation: 4,
    overflow: "hidden",
  },
  sortOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  sortOptionText: {
    fontSize: 14,
    color: "#666",
  },
  sortOptionActive: {
    color: "#2E7D32",
    fontWeight: "600",
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
    position: "relative",
  },
  discountBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#F44336",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
    zIndex: 1,
  },
  discountText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
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
  originalPrice: {
    fontSize: 12,
    color: "#999",
    textDecorationLine: "line-through",
    marginTop: 2,
  },
  addBtn: {
    borderWidth: 1.5,
    borderColor: "#2E7D32",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    minWidth: 60,
    alignItems: "center",
  },
  addBtnActive: {
    backgroundColor: "#2E7D32",
  },
  addText: {
    color: "#2E7D32",
    fontWeight: "700",
    fontSize: 12,
  },
  addTextActive: {
    color: "#fff",
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
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
  },
});

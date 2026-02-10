import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
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
};

type SortOption = "default" | "price-low" | "price-high" | "name" | "rating";

// Helper function to get default variant
const getDefaultVariant = (product: Product): ProductVariant => {
  const defaultVariant = product.variants.find((v) => v.isDefault);
  return defaultVariant || product.variants[0];
};

export default function AllProductsScreen() {
  const params = useLocalSearchParams();
  const { type, title, categoryId } = params; // type: "popular", "deals", "trending", "featured"
  const { items, addToCart } = useCart();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("default");
  const [showSortModal, setShowSortModal] = useState(false);

  // Animation refs
  const searchFocusAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadProducts();
  }, [type, categoryId]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const res = await API.get("/products");
      const allProducts = res.data.data || res.data || [];
      let filtered = [...allProducts];

      // Filter based on type
      if (type === "deals" || type === "bestDeal") {
        // Products marked as best deals
        const markedDeals = filtered.filter((p) => p.bestDeal === true);
        if (markedDeals.length > 0) {
          filtered = markedDeals;
        } else {
          // Fallback to high discount products
          filtered = filtered.filter((p) => p.discount && p.discount >= 15);
        }
      } else if (type === "trending") {
        filtered = filtered.filter((p) => p.trending === true);
      } else if (type === "featured") {
        filtered = filtered.filter((p) => p.featured === true);
      } else if (categoryId) {
        // Filter by category
        filtered = filtered.filter((p) => p.category._id === categoryId);
      }

      // Fallback to all products if no results
      if (filtered.length === 0 && type !== "category") {
        filtered = allProducts;
      }

      setProducts(filtered);
    } catch (error) {
      console.error("Failed to load products:", error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

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

  // Filter and sort products
  const getFilteredAndSortedProducts = () => {
    let filtered = products.filter(
      (p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.brand?.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    // Apply sorting
    switch (sortBy) {
      case "price-low":
        filtered.sort((a, b) => {
          const priceA = getDefaultVariant(a).price;
          const priceB = getDefaultVariant(b).price;
          return priceA - priceB;
        });
        break;
      case "price-high":
        filtered.sort((a, b) => {
          const priceA = getDefaultVariant(a).price;
          const priceB = getDefaultVariant(b).price;
          return priceB - priceA;
        });
        break;
      case "name":
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "rating":
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      default:
        // Keep default order (can be by createdAt or featured status)
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
    { value: "rating", label: "Rating: High to Low" },
  ];

  const ProductCard = ({ item }: { item: Product }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const [isAdding, setIsAdding] = useState(false);

    const variant = getDefaultVariant(item);
    const price = variant.price;
    const mrp = variant.mrp;
    const discount = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
    const inCart = items.some(
      (i) => i.productId === item._id && i.variantId === variant._id,
    );

    const handlePress = () => {
      setIsAdding(true);

      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 3,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIsAdding(false);
      });

      console.log("Ite,", item);

      handleAddToCart(item);
    };

    return (
      <Animated.View
        style={[styles.card, { transform: [{ scale: scaleAnim }] }]}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() =>
            router.push({
              pathname: "/product-detail",
              params: { id: item._id },
            })
          }
        >
          {/* Badges */}
          {item.trending && (
            <View style={styles.trendingBadge}>
              <Ionicons name="trending-up" size={10} color="#fff" />
              <Text style={styles.trendingText}>HOT</Text>
            </View>
          )}

          {!item.trending && discount > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{discount}% OFF</Text>
            </View>
          )}

          {item.featured && (
            <View style={styles.featuredBadge}>
              <Ionicons name="star" size={10} color="#FFD700" />
            </View>
          )}

          {/* Image */}
          <Image
            source={{
              uri: item.image || "https://via.placeholder.com/150",
            }}
            style={styles.image}
          />

          {/* Brand */}
          {item.brand && (
            <Text style={styles.brand} numberOfLines={1}>
              {item.brand}
            </Text>
          )}

          {/* Product Name */}
          <Text numberOfLines={2} style={styles.name}>
            {item.name}
          </Text>

          {/* Variant Size */}
          <Text style={styles.unit}>
            {variant.packSize}
            {variant.packUnit}
          </Text>

          {/* Rating */}
          {item.rating > 0 && (
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={12} color="#FFB800" />
              <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
            </View>
          )}

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.priceColumn}>
              <Text style={styles.price}>₹{price.toFixed(2)}</Text>
              {discount > 0 && (
                <Text style={styles.originalPrice}>₹{mrp.toFixed(2)}</Text>
              )}
            </View>

            <TouchableOpacity
              style={[
                styles.addBtn,
                inCart && styles.addBtnActive,
                isAdding && styles.addBtnAdding,
              ]}
              onPress={(e) => {
                e.stopPropagation();

                if (inCart) return; // ✅ BLOCK re-adding

                handlePress();
              }}
              disabled={isAdding || variant.stock === 0}
            >
              {isAdding ? (
                <ActivityIndicator size="small" color="#2E7D32" />
              ) : inCart ? (
                <Ionicons name="checkmark" size={16} color="#fff" />
              ) : (
                <Text style={[styles.addText, inCart && styles.addTextActive]}>
                  {variant.stock === 0 ? "OUT" : "ADD"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1B5E20" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title || "Products"}
        </Text>
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
      <Animated.View
        style={[
          styles.searchBox,
          {
            transform: [
              {
                scale: searchFocusAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.01],
                }),
              },
            ],
          },
        ]}
      >
        <Ionicons name="search" size={18} color="#777" />
        <TextInput
          placeholder="Search products"
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onFocus={() => {
            Animated.spring(searchFocusAnim, {
              toValue: 1,
              useNativeDriver: true,
            }).start();
          }}
          onBlur={() => {
            Animated.spring(searchFocusAnim, {
              toValue: 0,
              useNativeDriver: true,
            }).start();
          }}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={18} color="#999" />
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* FILTER & SORT BAR */}
      <View style={styles.filterBar}>
        <View style={styles.resultCountContainer}>
          <Text style={styles.resultCount}>
            {displayProducts.length}{" "}
            {displayProducts.length === 1 ? "product" : "products"}
          </Text>
          {type && (
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>
                {type === "deals"
                  ? "🔥"
                  : type === "trending"
                    ? "📈"
                    : type === "featured"
                      ? "⭐"
                      : "🛒"}
              </Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={styles.sortBtn}
          onPress={() => setShowSortModal(!showSortModal)}
        >
          <Ionicons name="swap-vertical" size={18} color="#2E7D32" />
          <Text style={styles.sortText}>Sort</Text>
        </TouchableOpacity>
      </View>

      {/* SORT OPTIONS MODAL */}
      {showSortModal && (
        <Animated.View style={styles.sortModal}>
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
        </Animated.View>
      )}

      {/* PRODUCTS LIST */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2E7D32" />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      ) : displayProducts.length > 0 ? (
        <FlatList
          data={displayProducts}
          numColumns={2}
          keyExtractor={(item) => item._id}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <ProductCard item={item} />}
        />
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No products found</Text>
          <Text style={styles.emptySubtext}>
            {searchQuery
              ? "Try adjusting your search"
              : "No products available in this category"}
          </Text>
          {searchQuery && (
            <TouchableOpacity
              style={styles.clearSearchBtn}
              onPress={() => setSearchQuery("")}
            >
              <Text style={styles.clearSearchText}>Clear Search</Text>
            </TouchableOpacity>
          )}
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

  /* HEADER */
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },

  backBtn: {
    padding: 4,
  },

  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
    color: "#1B5E20",
    textAlign: "center",
    marginHorizontal: 12,
  },

  cartIcon: {
    position: "relative",
    padding: 4,
  },

  badge: {
    position: "absolute",
    top: 0,
    right: 0,
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

  /* SEARCH */
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginHorizontal: 14,
    marginTop: 12,
    marginBottom: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },

  searchInput: {
    marginLeft: 8,
    fontSize: 15,
    flex: 1,
  },

  /* FILTER BAR */
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },

  resultCountContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  resultCount: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },

  typeBadge: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },

  typeBadgeText: {
    fontSize: 14,
  },

  sortBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },

  sortText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2E7D32",
  },

  /* SORT MODAL */
  sortModal: {
    backgroundColor: "#fff",
    marginHorizontal: 14,
    marginBottom: 12,
    borderRadius: 12,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
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
    fontWeight: "700",
  },

  /* PRODUCTS */
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
  },

  list: {
    padding: 14,
    paddingBottom: 24,
  },

  row: {
    justifyContent: "space-between",
  },

  /* PRODUCT CARD */
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    width: "48%",
    marginBottom: 14,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    position: "relative",
    overflow: "hidden",
  },

  trendingBadge: {
    position: "absolute",
    top: 0,
    left: 0,
    backgroundColor: "#2196F3",
    borderTopLeftRadius: 16,
    borderBottomRightRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },

  trendingText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
  },

  discountBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: "#F44336",
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 10,
  },

  discountText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },

  featuredBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(255, 215, 0, 0.2)",
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9,
  },

  image: {
    width: "100%",
    height: 100,
    resizeMode: "contain",
    marginBottom: 8,
    marginTop: 0,
  },

  brand: {
    fontSize: 11,
    color: "#999",
    fontWeight: "500",
    marginBottom: 2,
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

  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginBottom: 6,
  },

  ratingText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#1B1B1B",
  },

  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },

  priceColumn: {
    flex: 1,
  },

  price: {
    fontSize: 16,
    fontWeight: "800",
    color: "#2E7D32",
  },

  originalPrice: {
    fontSize: 11,
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

  addBtnAdding: {
    opacity: 0.7,
  },

  addText: {
    color: "#2E7D32",
    fontWeight: "700",
    fontSize: 12,
  },

  addTextActive: {
    color: "#fff",
  },

  /* EMPTY STATE */
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
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
    textAlign: "center",
  },

  clearSearchBtn: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#2E7D32",
    borderRadius: 8,
  },

  clearSearchText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});

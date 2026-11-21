import { ProductCard } from "@/components/ProductCard";
import { AnimatedLoader } from "@/components/AnimatedLoader";
import { startTransition , useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import {
  Animated,
  useWindowDimensions,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppHeader } from "@/components/AppHeader";
import { useCart } from "../context/CartContext";
import { API } from "../utils/api";
import { C, themed } from "@/constants/theme";
import { getProductLayout } from "@/utils/productLayout";

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
  const { width, fontScale } = useWindowDimensions();
  const { columns } = getProductLayout(width, fontScale);
  const params = useLocalSearchParams();
  const { type, title, categoryId } = params;
  const { items, addToCart } = useCart();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("default");
  const [showSortModal, setShowSortModal] = useState(false);

  // Animation refs
  const [searchFocusAnim] = useState(() => new Animated.Value(0));
  const [headerAnim] = useState(() => new Animated.Value(0));

  async function loadProducts() {
    try {
      setLoading(true);
      const res = await API.get("/products");
      const allProducts = res.data.data || res.data || [];
      let filtered = [...allProducts];

      if (type === "deals" || type === "bestDeal") {
        const markedDeals = filtered.filter((p) => p.bestDeal === true);
        if (markedDeals.length > 0) {
          filtered = markedDeals;
        } else {
          filtered = filtered.filter((p) => p.discount && p.discount >= 15);
        }
      } else if (type === "trending") {
        filtered = filtered.filter((p) => p.trending === true);
      } else if (type === "featured") {
        filtered = filtered.filter((p) => p.featured === true);
      } else if (categoryId) {
        const category = String(Array.isArray(categoryId) ? categoryId[0] : categoryId).toLowerCase();
        filtered = filtered.filter((p) =>
          [p.category?._id, p.category?.slug, p.category?.name]
            .some((value) => String(value ?? "").toLowerCase() === category),
        );
      }

      if (filtered.length === 0 && type !== "category" && !categoryId) {
        filtered = allProducts;
      }

      setProducts(filtered);
    } catch (error) {
      console.error("Failed to load products:", error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Header entrance animation
    Animated.spring(headerAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();

    startTransition(() => { void loadProducts(); });
  }, [type, categoryId]);



  

  const handleAddToCart = (product: Product) => {
    if (!product.variants || product.variants.length === 0) return;

    const variant = getDefaultVariant(product);

    addToCart({
      id: `${product._id}_${variant._id}`,
      productId: product._id,
      variantId: variant._id,
      name: product.name,
      variantLabel: `${variant.packSize}${variant.packUnit}`,
      price: variant.price,
      qty: 1,
    });
  };

  const getFilteredAndSortedProducts = () => {
    let filtered = products.filter(
      (p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.brand?.toLowerCase().includes(searchQuery.toLowerCase()),
    );

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
        break;
    }

    return filtered;
  };

  const displayProducts = getFilteredAndSortedProducts();

  const sortOptions = [
    { value: "default", label: "Relevance", icon: "sparkles-outline" },
    { value: "price-low", label: "Price: Low to High", icon: "arrow-up" },
    { value: "price-high", label: "Price: High to Low", icon: "arrow-down" },
    { value: "name", label: "Name: A to Z", icon: "text-outline" },
    { value: "rating", label: "Rating: High to Low", icon: "star" },
  ];


  return (
    <SafeAreaView style={styles.safe}>
      {/* HEADER */}
      <AppHeader
        title={(Array.isArray(title) ? title[0] : title) || "Products"}
        subtitle={
          type === "deals"
            ? "Best Deals"
            : type === "trending"
              ? "Trending"
              : type === "featured"
                ? "Featured"
                : undefined
        }
        showBack
        showCart
      />

      {/* SEARCH */}
      <Animated.View
        style={[
          styles.searchBox,
          {
            transform: [
              {
                scale: searchFocusAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.02],
                }),
              },
            ],
          },
        ]}
      >
        <Ionicons name="search" size={16} color={C.primary} style={{ marginLeft: 2, marginRight: 4 }} />
        <TextInput
          placeholder="Search products, brands..."
          placeholderTextColor={C.muted}
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
            <Ionicons name="close-circle" size={20} color={C.muted} />
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* FILTER & SORT BAR */}
      <View style={styles.filterBar}>
        <View style={styles.resultCountContainer}>
          <Ionicons name="grid-outline" size={16} color={C.primary} />
          <Text style={styles.resultCount}>
            {displayProducts.length}{" "}
            {displayProducts.length === 1 ? "product" : "products"}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.sortBtn}
          onPress={() => setShowSortModal(!showSortModal)}
        >
          <Ionicons
            name={showSortModal ? "funnel" : "funnel-outline"}
            size={18}
            color={C.primary}
          />
          <Text style={styles.sortText}>
            {sortOptions.find((o) => o.value === sortBy)?.label || "Sort"}
          </Text>
          <Ionicons
            name={showSortModal ? "chevron-up" : "chevron-down"}
            size={16}
            color={C.primary}
          />
        </TouchableOpacity>
      </View>

      {/* SORT OPTIONS MODAL */}
      {showSortModal && (
        <Animated.View style={styles.sortModal}>
          <View style={styles.sortModalHeader}>
            <Text style={styles.sortModalTitle}>Sort By</Text>
            <TouchableOpacity onPress={() => setShowSortModal(false)}>
              <Ionicons name="close" size={24} color={C.muted} />
            </TouchableOpacity>
          </View>
          {sortOptions.map((option, index) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.sortOption,
                index === sortOptions.length - 1 && styles.sortOptionLast,
              ]}
              onPress={() => {
                setSortBy(option.value as SortOption);
                setShowSortModal(false);
              }}
            >
              <View style={styles.sortOptionLeft}>
                <Ionicons
                  name={option.icon as any}
                  size={20}
                  color={sortBy === option.value ? C.primary : "#999"}
                />
                <Text
                  style={[
                    styles.sortOptionText,
                    sortBy === option.value && styles.sortOptionActive,
                  ]}
                >
                  {option.label}
                </Text>
              </View>
              {sortBy === option.value && (
                <View style={styles.checkmarkContainer}>
                  <Ionicons name="checkmark-circle" size={22} color={C.primary} />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </Animated.View>
      )}

      {/* PRODUCTS LIST */}
      {loading ? (
        <AnimatedLoader fullScreen />
      ) : displayProducts.length > 0 ? (
        <FlatList
          data={displayProducts}
          key={columns}
          numColumns={columns}
          keyExtractor={(item) => item._id}
          columnWrapperStyle={columns > 1 ? styles.row : undefined}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          extraData={items}
          renderItem={({ item }) => {
            const variant = getDefaultVariant(item);
            if (!variant) return null;
            return <ProductCard
              item={item}
              showTrendingBadge={item.trending}
              inCart={items.some(line => line.productId === item._id && line.variantId === variant._id)}
              disabled={variant.stock <= 0}
              onAdd={() => handleAddToCart(item)}
              onPress={() => router.push({ pathname: "/product-detail", params: { id: item._id } })}
            />;
          }}
        />
      ) : (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="search-outline" size={80} color={C.line} />
          </View>
          <Text style={styles.emptyText}>No Products Found</Text>
          <Text style={styles.emptySubtext}>
            {searchQuery
              ? `No results for "${searchQuery}"`
              : "No products available in this category"}
          </Text>
          {searchQuery && (
            <TouchableOpacity
              style={styles.clearSearchBtn}
              onPress={() => setSearchQuery("")}
            >
              <Ionicons name="refresh" size={18} color="#fff" />
              <Text style={styles.clearSearchText}>Clear Search</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = themed(() => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.page,
  },

  /* HEADER */
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: "#FFF1E8",
    elevation: 4,
    shadowColor: C.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },

  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.soft,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },

  backBtn: {},

  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 12,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: C.ink,
    letterSpacing: 0.3,
  },

  headerTypeBadge: {
    marginTop: 2,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: C.badge,
    borderRadius: 10,
  },

  headerTypeBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: C.badgeText,
    textTransform: "uppercase",
  },

  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#F44336",
    borderRadius: 12,
    minWidth: 22,
    height: 22,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: "#fff",
  },

  badgeText: {
    color: C.badgeText,
    fontSize: 11,
    fontWeight: "800",
  },

  /* SEARCH */
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card,
    borderRadius: 12,
    paddingLeft: 14,
    paddingRight: 10,
    minHeight: 42,
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 12,
    elevation: 3,
    shadowColor: C.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: "#FFF1E8",
  },

  searchInput: {
    marginLeft: 8,
    fontSize: 14,
    flex: 1,
    color: C.ink,
    fontWeight: "500",
    paddingVertical: 0,
    minHeight: 42,
  },

  /* FILTER BAR */
  filterBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: C.card,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
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
    fontWeight: "700",
    color: C.primary,
  },

  sortBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.soft,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },

  sortText: {
    fontSize: 13,
    fontWeight: "700",
    color: C.primary,
  },

  /* SORT MODAL */
  sortModal: {
    backgroundColor: C.card,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    overflow: "hidden",
  },

  sortModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    backgroundColor: C.card,
  },

  sortModalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: C.ink,
  },

  sortOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },

  sortOptionLast: {
    borderBottomWidth: 0,
  },

  sortOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  sortOptionText: {
    fontSize: 15,
    color: C.muted,
    fontWeight: "500",
  },

  sortOptionActive: {
    color: C.primary,
    fontWeight: "700",
  },

  checkmarkContainer: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },

  /* PRODUCTS */
  list: {
    padding: 16,
    paddingBottom: 24,
  },

  row: {
    gap: 10,
    marginBottom: 12,
  },

  /* EMPTY STATE */
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  emptyIconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: C.soft,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },

  emptyText: {
    fontSize: 20,
    fontWeight: "800",
    color: C.muted,
    marginTop: 8,
  },

  emptySubtext: {
    fontSize: 15,
    color: C.muted,
    marginTop: 8,
    textAlign: "center",
    fontWeight: "500",
  },

  clearSearchBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 24,
    paddingHorizontal: 28,
    paddingVertical: 14,
    backgroundColor: C.primary,
    borderRadius: 12,
    elevation: 4,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },

  clearSearchText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
}));

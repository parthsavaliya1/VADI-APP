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
  const { type, title, categoryId } = params;
  const { items, addToCart } = useCart();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("default");
  const [showSortModal, setShowSortModal] = useState(false);

  // Animation refs
  const searchFocusAnim = useRef(new Animated.Value(0)).current;
  const headerAnim = useRef(new Animated.Value(0)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Header entrance animation
    Animated.spring(headerAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();

    loadProducts();
  }, [type, categoryId]);

  useEffect(() => {
    // Logo loading animation
    if (loading) {
      Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(logoRotate, {
              toValue: 1,
              duration: 2000,
              useNativeDriver: true,
            }),
            Animated.timing(logoRotate, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(logoScale, {
              toValue: 1.1,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(logoScale, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ).start();
    } else {
      logoRotate.setValue(0);
      logoScale.setValue(1);
    }
  }, [loading]);

  const loadProducts = async () => {
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
        filtered = filtered.filter((p) => p.category._id === categoryId);
      }

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

  const ProductCard = ({ item, index }: { item: Product; index: number }) => {
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          delay: index * 50,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          delay: index * 50,
          useNativeDriver: true,
        }),
      ]).start();
    }, []);

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
          toValue: 0.92,
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

      handleAddToCart(item);
    };

    return (
      <Animated.View
        style={[
          styles.card,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
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
          {/* Badges Container - Right Top */}
          <View style={styles.badgesContainer}>
            {discount > 0 && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>{discount}%</Text>
                <Text style={styles.discountSubtext}>OFF</Text>
              </View>
            )}
          </View>

          {/* Additional Badges - Left Side */}
          <View style={styles.leftBadgesContainer}>
            {item.trending && (
              <View style={styles.trendingBadge}>
                <Ionicons name="flame" size={12} color="#fff" />
                <Text style={styles.badgeLabel}>HOT</Text>
              </View>
            )}
            {item.featured && (
              <View style={styles.featuredBadge}>
                <Ionicons name="star" size={12} color="#FFD700" />
                <Text style={styles.badgeLabel}>FEATURED</Text>
              </View>
            )}
          </View>

          {/* Image Container */}
          <View style={styles.imageContainer}>
            <Image
              source={{
                uri: item.image || "https://via.placeholder.com/150",
              }}
              style={styles.image}
            />
          </View>

          {/* Content */}
          <View style={styles.cardContent}>
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
            <View style={styles.variantContainer}>
              <View style={styles.variantBadge}>
                <Text style={styles.variantText}>
                  {variant.packSize}
                  {variant.packUnit}
                </Text>
              </View>
            </View>

            {/* Rating */}
            {item.rating > 0 && (
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={14} color="#FFB800" />
                <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
                <Text style={styles.reviewsText}>
                  ({item.reviewsCount || 0})
                </Text>
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
                  variant.stock === 0 && styles.addBtnDisabled,
                ]}
                onPress={(e) => {
                  e.stopPropagation();
                  if (inCart || variant.stock === 0) return;
                  handlePress();
                }}
                disabled={isAdding || variant.stock === 0}
              >
                {isAdding ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : inCart ? (
                  <>
                    <Ionicons name="checkmark-circle" size={16} color="#fff" />
                    <Text style={styles.addTextActive}>ADDED</Text>
                  </>
                ) : (
                  <>
                    <Ionicons
                      name={variant.stock === 0 ? "close-circle" : "add-circle"}
                      size={16}
                      color={variant.stock === 0 ? "#999" : "#2E7D32"}
                    />
                    <Text
                      style={[
                        styles.addText,
                        variant.stock === 0 && styles.addTextDisabled,
                      ]}
                    >
                      {variant.stock === 0 ? "OUT" : "ADD"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Stock Indicator */}
            {variant.stock > 0 &&
              variant.stock <= variant.lowStockThreshold && (
                <View style={styles.stockWarning}>
                  <Text style={styles.stockWarningText}>
                    Only {variant.stock} left!
                  </Text>
                </View>
              )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* HEADER */}
      <Animated.View
        style={[
          styles.header,
          {
            opacity: headerAnim,
            transform: [
              {
                translateY: headerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-50, 0],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <View style={styles.iconButton}>
            <Ionicons name="arrow-back" size={24} color="#1B5E20" />
          </View>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title || "Products"}
          </Text>
          {type && (
            <View style={styles.headerTypeBadge}>
              <Text style={styles.headerTypeBadgeText}>
                {type === "deals"
                  ? "Best Deals"
                  : type === "trending"
                    ? "Trending"
                    : type === "featured"
                      ? "Featured"
                      : "All Products"}
              </Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={() => router.push("/cart")}>
          <View style={styles.iconButton}>
            <Ionicons name="cart-outline" size={24} color="#1B5E20" />
            {items.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{items.length}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>

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
        <Ionicons name="search" size={20} color="#2E7D32" />
        <TextInput
          placeholder="Search products, brands..."
          placeholderTextColor="#999"
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
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* FILTER & SORT BAR */}
      <View style={styles.filterBar}>
        <View style={styles.resultCountContainer}>
          <Ionicons name="grid-outline" size={16} color="#2E7D32" />
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
            color="#2E7D32"
          />
          <Text style={styles.sortText}>
            {sortOptions.find((o) => o.value === sortBy)?.label || "Sort"}
          </Text>
          <Ionicons
            name={showSortModal ? "chevron-up" : "chevron-down"}
            size={16}
            color="#2E7D32"
          />
        </TouchableOpacity>
      </View>

      {/* SORT OPTIONS MODAL */}
      {showSortModal && (
        <Animated.View style={styles.sortModal}>
          <View style={styles.sortModalHeader}>
            <Text style={styles.sortModalTitle}>Sort By</Text>
            <TouchableOpacity onPress={() => setShowSortModal(false)}>
              <Ionicons name="close" size={24} color="#666" />
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
                  color={sortBy === option.value ? "#2E7D32" : "#999"}
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
                  <Ionicons name="checkmark-circle" size={22} color="#2E7D32" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </Animated.View>
      )}

      {/* PRODUCTS LIST */}
      {loading ? (
        <View style={styles.loadingContainer}>
          {/* Replace with your logo image */}
          <Animated.View
            style={{
              transform: [
                {
                  rotate: logoRotate.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0deg", "360deg"],
                  }),
                },
                { scale: logoScale },
              ],
            }}
          >
            <Image
              source={require("../assets/images/VADI.png")} // Replace with your logo path
              style={styles.loadingLogo}
            />
          </Animated.View>
          <Text style={styles.loadingText}>Loading fresh products...</Text>
          <ActivityIndicator
            size="small"
            color="#2E7D32"
            style={{ marginTop: 8 }}
          />
        </View>
      ) : displayProducts.length > 0 ? (
        <FlatList
          data={displayProducts}
          numColumns={2}
          keyExtractor={(item) => item._id}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <ProductCard item={item} index={index} />
          )}
        />
      ) : (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="search-outline" size={80} color="#E0E0E0" />
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

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F8FAF5",
  },

  /* HEADER */
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E8F5E9",
    elevation: 4,
    shadowColor: "#1B5E20",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },

  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F1F8F4",
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
    color: "#1B5E20",
    letterSpacing: 0.3,
  },

  headerTypeBadge: {
    marginTop: 2,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: "#E8F5E9",
    borderRadius: 10,
  },

  headerTypeBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#2E7D32",
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
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
  },

  /* SEARCH */
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 12,
    elevation: 3,
    shadowColor: "#1B5E20",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: "#E8F5E9",
  },

  searchInput: {
    marginLeft: 10,
    fontSize: 15,
    flex: 1,
    color: "#333",
    fontWeight: "500",
  },

  /* FILTER BAR */
  filterBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
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
    color: "#2E7D32",
  },

  sortBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },

  sortText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2E7D32",
  },

  /* SORT MODAL */
  sortModal: {
    backgroundColor: "#fff",
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
    borderBottomColor: "#F0F0F0",
    backgroundColor: "#FAFAFA",
  },

  sortModalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
  },

  sortOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
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
    color: "#666",
    fontWeight: "500",
  },

  sortOptionActive: {
    color: "#2E7D32",
    fontWeight: "700",
  },

  checkmarkContainer: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },

  /* PRODUCTS */
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingLogo: {
    width: 100,
    height: 100,
    resizeMode: "contain",
  },

  loadingText: {
    marginTop: 20,
    fontSize: 16,
    fontWeight: "600",
    color: "#2E7D32",
  },

  list: {
    padding: 16,
    paddingBottom: 24,
  },

  row: {
    justifyContent: "space-between",
  },

  /* PRODUCT CARD */
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    width: "48%",
    marginBottom: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },

  badgesContainer: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 10,
    gap: 6,
  },

  leftBadgesContainer: {
    position: "absolute",
    top: 8,
    left: 8,
    zIndex: 10,
    gap: 6,
  },

  trendingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FF5722",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    elevation: 3,
    shadowColor: "#FF5722",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },

  featuredBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#1976D2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    elevation: 3,
    shadowColor: "#1976D2",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },

  badgeLabel: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  discountBadge: {
    backgroundColor: "#F44336",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    alignItems: "center",
    elevation: 4,
    shadowColor: "#F44336",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    minWidth: 52,
  },

  discountText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.3,
  },

  discountSubtext: {
    color: "#fff",
    fontSize: 8,
    fontWeight: "700",
    marginTop: -2,
  },

  imageContainer: {
    backgroundColor: "#FAFAFA",
    padding: 12,
    alignItems: "center",
  },

  image: {
    width: "100%",
    height: 110,
    resizeMode: "contain",
  },

  cardContent: {
    padding: 12,
  },

  brand: {
    fontSize: 11,
    color: "#999",
    fontWeight: "600",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  name: {
    fontSize: 14,
    fontWeight: "700",
    color: "#222",
    minHeight: 38,
    lineHeight: 19,
  },

  variantContainer: {
    marginVertical: 6,
  },

  variantBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },

  variantText: {
    fontSize: 12,
    color: "#2E7D32",
    fontWeight: "700",
  },

  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },

  ratingText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#333",
  },

  reviewsText: {
    fontSize: 11,
    color: "#999",
    fontWeight: "500",
  },

  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },

  priceColumn: {
    flex: 1,
  },

  price: {
    fontSize: 18,
    fontWeight: "900",
    color: "#2E7D32",
  },

  originalPrice: {
    fontSize: 12,
    color: "#999",
    textDecorationLine: "line-through",
    marginTop: 2,
    fontWeight: "500",
  },

  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 2,
    borderColor: "#2E7D32",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 50,
    justifyContent: "center",
  },

  addBtnActive: {
    backgroundColor: "#2E7D32",
    borderColor: "#2E7D32",
  },

  addBtnAdding: {
    opacity: 0.7,
  },

  addBtnDisabled: {
    borderColor: "#CCC",
    backgroundColor: "#F5F5F5",
  },

  addText: {
    color: "#2E7D32",
    fontWeight: "800",
    fontSize: 10,
    letterSpacing: 0.1,
  },

  addTextActive: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 11,
  },

  addTextDisabled: {
    color: "#999",
  },

  stockWarning: {
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: "#FFF3E0",
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: "#FF9800",
  },

  stockWarningText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#E65100",
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
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },

  emptyText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#666",
    marginTop: 8,
  },

  emptySubtext: {
    fontSize: 15,
    color: "#999",
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
    backgroundColor: "#2E7D32",
    borderRadius: 12,
    elevation: 4,
    shadowColor: "#2E7D32",
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
});

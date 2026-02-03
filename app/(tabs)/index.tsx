import { Ionicons } from "@expo/vector-icons";
import { Redirect, router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useCart } from "../../context/CartContext";
import { API } from "../../utils/api";

const { width } = Dimensions.get("window");

const banners = [
  {
    id: "1",
    image: "https://i.imgur.com/8Km9tLL.png",
  },
  {
    id: "2",
    image: "https://i.imgur.com/Lz7Xc0S.png",
  },
];

const quickActions = [
  {
    id: "1",
    title: "Vegetables",
    icon: "leaf",
    color: "#4CAF50",
    category: "vegetables",
  },
  {
    id: "2",
    title: "Fruits",
    icon: "nutrition",
    color: "#FF9800",
    category: "fruits",
  },
  {
    id: "3",
    title: "Dairy",
    icon: "ice-cream",
    color: "#2196F3",
    category: "dairy",
  },
  {
    id: "4",
    title: "Offers",
    icon: "pricetag",
    color: "#F44336",
    category: "offers",
  },
];

type Product = {
  _id: string;
  name: string;
  price: number;
  unit: string;
  image?: string;
  category?: string;
  discount?: number;
};

// Skeleton loader component
const ProductSkeleton = () => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View style={[styles.card, { opacity }]}>
      <View style={styles.skeletonImage} />
      <View style={styles.skeletonText} />
      <View style={[styles.skeletonText, { width: "60%" }]} />
    </Animated.View>
  );
};

export default function HomeScreen() {
  const { user, loading: authLoading } = useAuth();
  const { items, addToCart } = useCart();

  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const scrollY = useRef(new Animated.Value(0)).current;
  const cartFooterAnim = useRef(new Animated.Value(0)).current;
  const searchFocusAnim = useRef(new Animated.Value(0)).current;
  const bannerScrollRef = useRef<FlatList>(null);

  const total = items.reduce((s, i) => s + i.price * i.qty, 0);

  // Auto-scroll banners
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => {
        const nextIndex = (prev + 1) % banners.length;
        bannerScrollRef.current?.scrollToIndex({
          index: nextIndex,
          animated: true,
        });
        return nextIndex;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Animate cart footer when items change
  useEffect(() => {
    Animated.spring(cartFooterAnim, {
      toValue: items.length > 0 ? 1 : 0,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  }, [items.length]);

  const loadProducts = async () => {
    try {
      const res = await API.get("/products");
      const fetchedProducts = res.data;

      setAllProducts(fetchedProducts);
      setProducts(fetchedProducts.slice(0, 12));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadProducts();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    setSelectedCategory(null);
    setSearchQuery("");
    loadProducts();
  };

  const handleAddToCart = (item: Product) => {
    addToCart({
      id: item._id,
      name: item.name,
      price: item.price,
      qty: 1,
    });
  };

  // Handle category click
  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category);
    setSearchQuery("");

    // Navigate to category page with the category as a parameter
    router.push({
      pathname: "/category",
      params: {
        category: category,
        title: category.charAt(0).toUpperCase() + category.slice(1),
      },
    });
  };

  // Handle "See All" click for popular items
  const handleSeeAllProducts = () => {
    router.push({
      pathname: "/all-products",
      params: { type: "popular", title: "Popular Items" },
    });
  };

  // Handle "See All" click for deals
  const handleSeeAllDeals = () => {
    router.push({
      pathname: "/all-products",
      params: { type: "deals", title: "Best Deals Today" },
    });
  };

  // Filter products based on search and category
  const getFilteredProducts = () => {
    let filtered = allProducts;

    // Apply category filter
    if (selectedCategory) {
      filtered = filtered.filter(
        (p) => p.category?.toLowerCase() === selectedCategory.toLowerCase(),
      );
    }

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    return selectedCategory || searchQuery ? filtered : products;
  };

  const filteredProducts = getFilteredProducts();

  // Get deals (products with discount or first 6 for demo)
  const dealProducts = allProducts
    .filter((p) => p.discount && p.discount > 0)
    .slice(0, 6);

  const displayDeals =
    dealProducts.length > 0 ? dealProducts : allProducts.slice(0, 6);

  if (authLoading) return null;
  if (!user) return <Redirect href="/signup" />;

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.9],
    extrapolate: "clamp",
  });

  const cartFooterTranslateY = cartFooterAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [100, 0],
  });

  const searchScale = searchFocusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.02],
  });

  return (
    <SafeAreaView style={styles.safe}>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#2E7D32"]}
            tintColor="#2E7D32"
          />
        }
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        scrollEventThrottle={16}
      >
        {/* 🔝 HEADER */}
        <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
          <View>
            <Text style={styles.location}>Delivering to</Text>
            <TouchableOpacity
              style={styles.addressRow}
              onPress={() => {
                // Navigate to location selection
                // router.push("/(tabs)/location");
              }}
            >
              <Text style={styles.address}>Home • Maharashtra</Text>
              <Ionicons name="chevron-down" size={16} color="#1B5E20" />
            </TouchableOpacity>
          </View>

          <View style={styles.headerIcons}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => {
                // Navigate to notifications
                // router.push("/(tabs)/notifications");
              }}
            >
              <Ionicons
                name="notifications-outline"
                size={24}
                color="#1B5E20"
              />
              <View style={styles.notificationDot} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cartIcon}
              onPress={() => router.push("/cart")}
            >
              <Ionicons name="cart-outline" size={26} color="#1B5E20" />
              {items.length > 0 && (
                <Animated.View
                  style={[
                    styles.cartBadge,
                    {
                      transform: [
                        {
                          scale: cartFooterAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.8, 1],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <Text style={styles.cartBadgeText}>{items.length}</Text>
                </Animated.View>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* 🔍 SEARCH */}
        <Animated.View
          style={[styles.searchBox, { transform: [{ scale: searchScale }] }]}
        >
          <Ionicons name="search" size={18} color="#777" />
          <TextInput
            placeholder="Search for products"
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              setSelectedCategory(null); // Clear category when searching
            }}
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

        {/* Show selected category filter */}
        {selectedCategory && (
          <View style={styles.filterChip}>
            <Text style={styles.filterChipText}>
              {selectedCategory.charAt(0).toUpperCase() +
                selectedCategory.slice(1)}
            </Text>
            <TouchableOpacity onPress={() => setSelectedCategory(null)}>
              <Ionicons name="close" size={16} color="#2E7D32" />
            </TouchableOpacity>
          </View>
        )}

        {/* 📢 AD BANNER */}
        {!searchQuery && !selectedCategory && (
          <View style={styles.bannerContainer}>
            <FlatList
              ref={bannerScrollRef}
              data={banners}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              onMomentumScrollEnd={(event) => {
                const index = Math.round(
                  event.nativeEvent.contentOffset.x / (width - 28),
                );
                setCurrentBannerIndex(index);
              }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => {
                    // Navigate to banner offer page
                    // router.push("/(tabs)/offers");
                  }}
                >
                  <Image source={{ uri: item.image }} style={styles.banner} />
                </TouchableOpacity>
              )}
            />
            <View style={styles.bannerDots}>
              {banners.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    currentBannerIndex === index && styles.activeDot,
                  ]}
                />
              ))}
            </View>
          </View>
        )}

        {/* ⚡ QUICK ACTIONS */}
        {!searchQuery && !selectedCategory && (
          <View style={styles.quickRow}>
            {quickActions.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={styles.quickCard}
                activeOpacity={0.7}
                onPress={() => handleCategoryClick(item.category)}
              >
                <View
                  style={[
                    styles.iconCircle,
                    { backgroundColor: item.color + "20" },
                  ]}
                >
                  <Ionicons
                    name={item.icon as any}
                    size={24}
                    color={item.color}
                  />
                </View>
                <Text style={styles.quickText}>{item.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* 🛒 PRODUCTS */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {searchQuery
                ? `Results for "${searchQuery}"`
                : selectedCategory
                  ? selectedCategory.charAt(0).toUpperCase() +
                    selectedCategory.slice(1)
                  : "Popular items"}
            </Text>
            {!searchQuery && !selectedCategory && (
              <TouchableOpacity onPress={handleSeeAllProducts}>
                <Text style={styles.seeAll}>See all →</Text>
              </TouchableOpacity>
            )}
          </View>

          {loading ? (
            <View style={styles.productsGrid}>
              {[1, 2, 3, 4].map((i) => (
                <ProductSkeleton key={i} />
              ))}
            </View>
          ) : filteredProducts.length > 0 ? (
            <View style={styles.productsGrid}>
              {filteredProducts.map((item) => (
                <ProductCard
                  key={item._id}
                  item={item}
                  onAdd={() => handleAddToCart(item)}
                  inCart={items.some((i) => i.id === item._id)}
                  onPress={() => {
                    // Navigate to product detail page
                    router.push({
                      pathname: "/product-detail",
                      params: { id: item._id },
                    });
                  }}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No products found</Text>
              <Text style={styles.emptySubtext}>
                Try searching for something else
              </Text>
            </View>
          )}
        </View>

        {/* 🔥 BEST DEALS */}
        {!searchQuery && !selectedCategory && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Best deals today 🔥</Text>
              <TouchableOpacity onPress={handleSeeAllDeals}>
                <Text style={styles.seeAll}>See all →</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={displayDeals}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.dealCard}
                  activeOpacity={0.8}
                  onPress={() => {
                    // Navigate to product detail
                    router.push({
                      pathname: "/product-detail",
                      params: { id: item._id },
                    });
                  }}
                >
                  <View style={styles.dealBadge}>
                    <Text style={styles.dealBadgeText}>
                      {item.discount ? `${item.discount}% OFF` : "20% OFF"}
                    </Text>
                  </View>
                  <Image
                    source={{
                      uri: item.image || "https://via.placeholder.com/150",
                    }}
                    style={styles.dealImage}
                  />
                  <Text numberOfLines={1} style={styles.dealName}>
                    {item.name}
                  </Text>
                  <View style={styles.dealPriceRow}>
                    <Text style={styles.dealPrice}>₹{item.price}</Text>
                    <Text style={styles.dealOriginalPrice}>
                      ₹{Math.round(item.price * 1.25)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.quickAddBtn}
                    onPress={(e) => {
                      e.stopPropagation(); // Prevent navigation when adding to cart
                      handleAddToCart(item);
                    }}
                  >
                    <Ionicons name="add" size={18} color="#fff" />
                  </TouchableOpacity>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        <View style={{ height: 100 }} />
      </Animated.ScrollView>

      {/* 🧾 STICKY CART FOOTER */}
      <Animated.View
        style={[
          styles.cartFooter,
          {
            transform: [{ translateY: cartFooterTranslateY }],
          },
        ]}
        pointerEvents={items.length > 0 ? "auto" : "none"}
      >
        <TouchableOpacity
          style={styles.cartFooterContent}
          onPress={() => router.push("/cart")}
          activeOpacity={0.9}
        >
          <View style={styles.cartFooterLeft}>
            <View style={styles.cartIconCircle}>
              <Ionicons name="cart" size={20} color="#fff" />
            </View>
            <View>
              <Text style={styles.cartFooterItems}>
                {items.length} item{items.length > 1 ? "s" : ""}
              </Text>
              <Text style={styles.cartFooterTotal}>₹{total.toFixed(2)}</Text>
            </View>
          </View>

          <View style={styles.cartFooterRight}>
            <Text style={styles.cartFooterBtn}>View Cart</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </View>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

// Product Card Component with Animation
const ProductCard = ({
  item,
  onAdd,
  inCart,
  onPress,
}: {
  item: Product;
  onAdd: () => void;
  inCart: boolean;
  onPress: () => void;
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [isAdding, setIsAdding] = useState(false);

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

    onAdd();
  };

  return (
    <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
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

        <View style={styles.footerRow}>
          <Text style={styles.price}>₹{item.price}</Text>

          <TouchableOpacity
            style={[
              styles.addBtn,
              inCart && styles.addBtnActive,
              isAdding && styles.addBtnAdding,
            ]}
            onPress={(e) => {
              e.stopPropagation(); // Prevent card click when adding to cart
              handlePress();
            }}
            disabled={isAdding}
          >
            {isAdding ? (
              <ActivityIndicator size="small" color="#2E7D32" />
            ) : inCart ? (
              <Ionicons name="checkmark" size={16} color="#fff" />
            ) : (
              <Text style={[styles.addText, inCart && styles.addTextActive]}>
                ADD
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

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
  },

  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  location: {
    fontSize: 12,
    color: "#666",
  },

  address: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1B5E20",
  },

  headerIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  iconBtn: {
    position: "relative",
    padding: 4,
  },

  notificationDot: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#F44336",
  },

  cartIcon: {
    position: "relative",
    padding: 4,
  },

  cartBadge: {
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

  cartBadgeText: {
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
    marginBottom: 16,
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

  /* FILTER CHIP */
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#E8F5E9",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginHorizontal: 14,
    marginBottom: 16,
    gap: 8,
  },

  filterChipText: {
    color: "#2E7D32",
    fontSize: 13,
    fontWeight: "600",
  },

  /* BANNER */
  bannerContainer: {
    marginBottom: 20,
    position: "relative",
  },

  banner: {
    width: width - 28,
    height: 130,
    borderRadius: 16,
    marginHorizontal: 14,
    resizeMode: "cover",
  },

  bannerDots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
    gap: 6,
  },

  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#C8E6C9",
  },

  activeDot: {
    width: 20,
    backgroundColor: "#2E7D32",
  },

  /* QUICK ACTIONS */
  quickRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    marginBottom: 24,
  },

  quickCard: {
    backgroundColor: "#fff",
    width: "23%",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },

  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },

  quickText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#333",
  },

  /* SECTION */
  section: {
    marginBottom: 24,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1B5E20",
  },

  seeAll: {
    fontSize: 14,
    color: "#2E7D32",
    fontWeight: "600",
  },

  /* PRODUCTS */
  productsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 14,
  },

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

  footerRow: {
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

  /* DEALS */
  dealCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    width: 140,
    marginLeft: 14,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    marginVertical: 6, // 👈 IMPORTANT
    shadowRadius: 4,
    position: "relative",
  },

  dealBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#F44336",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
    zIndex: 1,
  },

  dealBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },

  dealImage: {
    width: "100%",
    height: 80,
    resizeMode: "contain",
    marginBottom: 8,
  },

  dealName: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 4,
  },

  dealPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  dealPrice: {
    fontSize: 14,
    fontWeight: "800",
    color: "#2E7D32",
  },

  dealOriginalPrice: {
    fontSize: 12,
    color: "#999",
    textDecorationLine: "line-through",
  },

  quickAddBtn: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: "#2E7D32",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
  },

  /* EMPTY STATE */
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
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

  /* SKELETON */
  skeletonImage: {
    width: "100%",
    height: 100,
    backgroundColor: "#E0E0E0",
    borderRadius: 8,
    marginBottom: 8,
  },

  skeletonText: {
    height: 12,
    backgroundColor: "#E0E0E0",
    borderRadius: 4,
    marginBottom: 6,
  },

  /* CART FOOTER */
  cartFooter: {
    position: "absolute",
    bottom: 10,
    left: 14,
    right: 14,
  },

  cartFooterContent: {
    backgroundColor: "#2E7D32",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },

  cartFooterLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  cartIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },

  cartFooterItems: {
    color: "#E8F5E9",
    fontSize: 12,
    fontWeight: "500",
  },

  cartFooterTotal: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },

  cartFooterRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  cartFooterBtn: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});

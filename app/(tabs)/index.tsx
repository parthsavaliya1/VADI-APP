import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAddress } from "@/context/AddressContext";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "../../context/CartContext";
import { API } from "../../utils/api";

const { width } = Dimensions.get("window");

const banners = [
  {
    id: "1",
    image: "https://i.ibb.co/dzHx6kp/8d6f94e6-8f2b-41ab-a8af-a7b0a6f876ef.png",
  },
  {
    id: "2",
    image: "https://i.ibb.co/dzHx6kp/8d6f94e6-8f2b-41ab-a8af-a7b0a6f876ef.png",
  },
];

const quickActions = [
  {
    id: "1",
    title: "Vegetables",
    icon: "leaf",
    color: "#4CAF50",
    categoryId: null, // Will be set dynamically
  },
  {
    id: "2",
    title: "Fruits",
    icon: "nutrition",
    color: "#FF9800",
    categoryId: null,
  },
  {
    id: "3",
    title: "Dairy",
    icon: "ice-cream",
    color: "#2196F3",
    categoryId: null,
  },
  {
    id: "4",
    title: "Dry Fruits",
    icon: "basket-outline",
    color: "#8D6E63",
    categoryId: null,
  },
];

// Product Variant Type
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

type Category = {
  _id: string;
  name: string;
  slug: string;
  image?: string;
  sortOrder: number;
  showOnHome: boolean;
  isActive: boolean;
};

// Helper function to get default variant
const getDefaultVariant = (product: Product): ProductVariant => {
  const defaultVariant = product.variants.find((v) => v.isDefault);
  return defaultVariant || product.variants[0];
};

// Helper function to get product display price
const getProductPrice = (product: Product): number => {
  const variant = getDefaultVariant(product);
  return variant.price;
};

// Helper function to get product MRP
const getProductMRP = (product: Product): number => {
  const variant = getDefaultVariant(product);
  return variant.mrp;
};

function GuestBanner() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(true);
  const slideAnim = useRef(new Animated.Value(-70)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!user && visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 380,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 55,
          friction: 9,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [user, visible]);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -70,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => setVisible(false));
  };

  if (user || !visible) return null;

  return (
    <Animated.View
      style={[
        styles.guestBanner,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <View style={styles.guestLeft}>
        <View style={styles.guestIconWrap}>
          <Ionicons name="person-outline" size={16} color="#2E7D32" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.guestTitle}>Browsing as guest</Text>
          <Text style={styles.guestSub}>Log in to add items & checkout</Text>
        </View>
      </View>
      <View style={styles.guestRight}>
        <TouchableOpacity
          style={styles.guestLoginBtn}
          onPress={() => router.push("/login")}
          activeOpacity={0.85}
        >
          <Text style={styles.guestLoginText}>Log In</Text>
        </TouchableOpacity>
        <Pressable onPress={dismiss} style={styles.guestDismiss} hitSlop={10}>
          <Ionicons name="close" size={15} color="#999" />
        </Pressable>
      </View>
    </Animated.View>
  );
}

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
  const { items, addToCart, getCartItemCount } = useCart();

  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  const [categories, setCategories] = useState<Category[]>([]);

  const scrollY = useRef(new Animated.Value(0)).current;
  const cartFooterAnim = useRef(new Animated.Value(0)).current;
  const searchFocusAnim = useRef(new Animated.Value(0)).current;
  const bannerScrollRef = useRef<FlatList>(null);
  const { defaultAddress } = useAddress();

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

  const loadCategories = async () => {
    try {
      const res = await API.get("/categories");
      setCategories(res.data.data || []);
    } catch (error) {
      console.error("Failed to load categories", error);
      setCategories([]);
    }
  };

  useEffect(() => {
    loadCategories();
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
      const fetchedProducts = res.data.data || res.data || [];

      setAllProducts(fetchedProducts);
      // Show more products by default (first 20 instead of 12)
      setProducts(fetchedProducts.slice(0, 20));
    } catch (error) {
      console.error("Failed to load products:", error);
      setAllProducts([]);
      setProducts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!authLoading) loadProducts();
  }, [authLoading]);

  if (authLoading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  const onRefresh = () => {
    setRefreshing(true);
    setSelectedCategoryId(null);
    setSearchQuery("");
    loadProducts();
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

  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setSearchQuery("");
  };

  const handleSeeAllProducts = () => {
    router.push({
      pathname: "/all-products",
      params: { type: "popular", title: "Popular Items" },
    });
  };

  const handleSeeAllDeals = () => {
    router.push({
      pathname: "/all-products",
      params: { type: "deals", title: "Best Deals Today" },
    });
  };

  const handleSeeAllTrending = () => {
    router.push({
      pathname: "/all-products",
      params: { type: "trending", title: "Trending Now" },
    });
  };

  const handleSeeAllFeatured = () => {
    router.push({
      pathname: "/all-products",
      params: { type: "featured", title: "Featured Products" },
    });
  };

  // Filter products based on search and category
  const getFilteredProducts = () => {
    let filtered = [...allProducts]; // Create copy to avoid mutations

    if (selectedCategoryId && filtered.length > 0) {
      filtered = filtered.filter((p) => p.category?._id === selectedCategoryId);
    }

    if (searchQuery && filtered.length > 0) {
      filtered = filtered.filter(
        (p) =>
          p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.brand?.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    return selectedCategoryId || searchQuery ? filtered : products;
  };

  const filteredProducts = getFilteredProducts();

  // Get category name for filter chip
  const getSelectedCategoryName = () => {
    if (!selectedCategoryId || allProducts.length === 0) return "";
    const product = allProducts.find(
      (p) => p.category?._id === selectedCategoryId,
    );
    return product?.category?.name || "";
  };

  // Get ONLY products marked as best deals
  const getBestDeals = () => {
    if (allProducts.length === 0) return [];

    const markedDeals = allProducts.filter((p) => p.bestDeal === true);

    if (markedDeals.length > 0) {
      return markedDeals.slice(0, 8);
    }

    const highDiscountProducts = allProducts.filter(
      (p) => p.discount && p.discount >= 20,
    );

    if (highDiscountProducts.length > 0) {
      return highDiscountProducts.slice(0, 8);
    }

    return [];
  };

  const dealProducts = getBestDeals();

  // Get trending products
  const getTrendingProducts = () => {
    if (allProducts.length === 0) return [];

    const trending = allProducts.filter((p) => p.trending === true);
    return trending.length > 0
      ? trending.slice(0, 8)
      : allProducts.slice(6, 14);
  };

  const trendingProducts = getTrendingProducts();

  // Get featured products
  const getFeaturedProducts = () => {
    if (allProducts.length === 0) return [];

    const featured = allProducts.filter((p) => p.featured === true);
    return featured.length > 0 ? featured.slice(0, 6) : allProducts.slice(0, 6);
  };

  const homeCategories = categories
    .filter((c) => c.showOnHome && c.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const quickCategories = homeCategories.slice(0, 4);

  const featuredProducts = getFeaturedProducts();

  // Get unique categories for quick actions

  // if (authLoading) return null;
  // if (!user) return <Redirect href="/signup" />;

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
            <TouchableOpacity style={styles.addressRow} onPress={() => {}}>
              <Text style={styles.address}>
                {defaultAddress
                  ? `${defaultAddress.name} • ${defaultAddress.city}, ${defaultAddress.state}`
                  : "Add delivery address"}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#1B5E20" />
            </TouchableOpacity>
          </View>

          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => {}}>
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
              {getCartItemCount() > 0 && (
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
                  <Text style={styles.cartBadgeText}>{getCartItemCount()}</Text>
                </Animated.View>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>

        <GuestBanner />

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
              setSelectedCategoryId(null);
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

        {selectedCategoryId && (
          <View style={styles.filterChip}>
            <Text style={styles.filterChipText}>
              {getSelectedCategoryName()}
            </Text>
            <TouchableOpacity onPress={() => setSelectedCategoryId(null)}>
              <Ionicons name="close" size={16} color="#2E7D32" />
            </TouchableOpacity>
          </View>
        )}

        {/* 📢 AD BANNER */}
        {!searchQuery && !selectedCategoryId && (
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
                <TouchableOpacity activeOpacity={0.9} onPress={() => {}}>
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

        {/* ⚡ QUICK ACTIONS - DYNAMIC CATEGORIES */}
        {!searchQuery && !selectedCategoryId && quickCategories.length > 0 && (
          <View style={styles.quickRow}>
            {quickCategories.map((category, index) => (
              <TouchableOpacity
                key={category._id}
                style={styles.quickCard}
                activeOpacity={0.7}
                onPress={() => handleCategoryClick(category._id)}
              >
                <View
                  style={[
                    styles.iconCircle,
                    {
                      backgroundColor:
                        quickActions[index]?.color + "20" || "#4CAF5020",
                    },
                  ]}
                >
                  <Ionicons
                    name={(quickActions[index]?.icon as any) || "apps"}
                    size={24}
                    color={quickActions[index]?.color || "#4CAF50"}
                  />
                </View>

                <Text style={styles.quickText} numberOfLines={1}>
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* 🔥 BEST DEALS */}
        {!searchQuery && !selectedCategoryId && dealProducts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Text style={styles.sectionTitle}>Best deals today</Text>
                <View style={styles.fireBadge}>
                  <Text style={styles.fireEmoji}>🔥</Text>
                </View>
              </View>
              <TouchableOpacity onPress={handleSeeAllDeals}>
                <Text style={styles.seeAll}>See all →</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={dealProducts}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.dealCard}
                  activeOpacity={0.8}
                  onPress={() => {
                    router.push({
                      pathname: "/product-detail",
                      params: { id: item._id },
                    });
                  }}
                >
                  <View style={styles.dealBadge}>
                    <Text style={styles.dealBadgeText}>
                      {item.discount ? `${item.discount}% OFF` : "SPECIAL"}
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
                    <Text style={styles.dealPrice}>
                      ₹{getProductPrice(item).toFixed(2)}
                    </Text>
                    {item.discount && item.discount > 0 && (
                      <Text style={styles.dealOriginalPrice}>
                        ₹{getProductMRP(item).toFixed(2)}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.quickAddBtn}
                    onPress={(e) => {
                      e.stopPropagation();
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

        {/* 📈 TRENDING NOW */}
        {!searchQuery && !selectedCategoryId && trendingProducts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Text style={styles.sectionTitle}>Trending Now</Text>
                <View style={styles.trendBadge}>
                  <Text style={styles.trendEmoji}>📈</Text>
                </View>
              </View>
              <TouchableOpacity onPress={handleSeeAllTrending}>
                <Text style={styles.seeAll}>See all →</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.productsGrid}>
              {trendingProducts.slice(0, 4).map((item) => {
                const defaultVariant = getDefaultVariant(item);

                const cartItem = items.find(
                  (i) =>
                    i.productId === item._id &&
                    i.variantId === defaultVariant._id,
                );

                return (
                  <ProductCard
                    key={item._id}
                    item={item}
                    onAdd={() => handleAddToCart(item)}
                    inCart={!!cartItem}
                    onPress={() => {
                      router.push({
                        pathname: "/product-detail",
                        params: { id: item._id },
                      });
                    }}
                    showTrendingBadge
                  />
                );
              })}
            </View>
          </View>
        )}

        {/* 🛒 POPULAR ITEMS / SEARCH RESULTS */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {searchQuery
                ? `Results for "${searchQuery}"`
                : selectedCategoryId
                  ? getSelectedCategoryName()
                  : "All Products"}
            </Text>
            {!searchQuery && !selectedCategoryId && (
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
              {filteredProducts.map((item) => {
                const defaultVariant = getDefaultVariant(item);

                const cartItem = items.find(
                  (i) =>
                    i.productId === item._id &&
                    i.variantId === defaultVariant._id,
                );
                return (
                  <ProductCard
                    key={item._id}
                    item={item}
                    onAdd={() => handleAddToCart(item)}
                    inCart={!!cartItem}
                    onPress={() => {
                      router.push({
                        pathname: "/product-detail",
                        params: { id: item._id },
                      });
                    }}
                  />
                );
              })}
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

        {/* ⭐ FEATURED PRODUCTS */}
        {!searchQuery && !selectedCategoryId && featuredProducts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Text style={styles.sectionTitle}>Featured Products</Text>
                <Ionicons name="star" size={18} color="#FFD700" />
              </View>
              <TouchableOpacity onPress={handleSeeAllFeatured}>
                <Text style={styles.seeAll}>See all →</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={featuredProducts}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => {
                const variant = getDefaultVariant(item);
                return (
                  <View style={styles.featuredCardContainer}>
                    <TouchableOpacity
                      style={styles.featuredCard}
                      activeOpacity={0.8}
                      onPress={() => {
                        router.push({
                          pathname: "/product-detail",
                          params: { id: item._id },
                        });
                      }}
                    >
                      <View style={styles.featuredBadge}>
                        <Ionicons name="star" size={14} color="#FFF" />
                      </View>
                      <Image
                        source={{
                          uri: item.image || "https://via.placeholder.com/150",
                        }}
                        style={styles.featuredImage}
                      />
                      <View style={styles.featuredContent}>
                        <Text numberOfLines={2} style={styles.featuredName}>
                          {item.name}
                        </Text>
                        <Text style={styles.featuredUnit}>
                          {variant.packSize}
                          {variant.packUnit}
                        </Text>
                        <View style={styles.featuredFooter}>
                          <Text style={styles.featuredPrice}>
                            ₹{variant.price}
                          </Text>
                          <TouchableOpacity
                            style={styles.featuredAddBtn}
                            onPress={(e) => {
                              e.stopPropagation();
                              handleAddToCart(item);
                            }}
                          >
                            <Ionicons name="add" size={16} color="#fff" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </TouchableOpacity>
                  </View>
                );
              }}
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
                {getCartItemCount()} item{getCartItemCount() > 1 ? "s" : ""}
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
  showTrendingBadge = false,
}: {
  item: Product;
  onAdd: () => void;
  inCart: boolean;
  onPress: () => void;
  showTrendingBadge?: boolean;
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [isAdding, setIsAdding] = useState(false);

  const variant = getDefaultVariant(item);
  const price = variant.price;
  const mrp = variant.mrp;

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
        {/* Only show ONE badge based on priority: Trending > Discount */}
        {showTrendingBadge && (
          <View style={[styles.badgeContainer, styles.badgeTrending]}>
            <Ionicons name="trending-up" size={10} color="#fff" />
            <Text style={styles.badgeText}>TRENDING</Text>
          </View>
        )}

        {!showTrendingBadge && item.discount && item.discount > 0 && (
          <View style={[styles.badgeContainer, styles.badgeDiscount]}>
            <Text style={styles.badgeText}>{item.discount}% OFF</Text>
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

        <Text style={styles.unit}>
          {variant.packSize}
          {variant.packUnit}
        </Text>

        <View style={styles.footerRow}>
          <View style={styles.priceColumn}>
            <Text style={styles.price}>₹{price.toFixed(2)}</Text>
            {item.discount && item.discount > 0 && (
              <Text style={styles.originalPriceSmall}>₹{mrp.toFixed(2)}</Text>
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

              if (inCart) return;

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
    textAlign: "center",
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

  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1B5E20",
  },

  fireBadge: {
    backgroundColor: "#FFE5E5",
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },

  fireEmoji: {
    fontSize: 14,
  },

  trendBadge: {
    backgroundColor: "#E3F2FD",
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },

  trendEmoji: {
    fontSize: 14,
  },

  seeAll: {
    fontSize: 14,
    color: "#2E7D32",
    fontWeight: "600",
  },

  /* PRODUCTS GRID */
  productsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 14,
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
  },

  /* COMMON BADGE */
  badgeContainer: {
    position: "absolute",
    top: 1,
    right: 4,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  badgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.4,
  },

  badgeTrending: {
    backgroundColor: "#2196F3",
  },

  badgeDiscount: {
    backgroundColor: "#F44336",
  },

  /* PRODUCT IMAGE */
  image: {
    width: "100%",
    height: 100,
    resizeMode: "contain",
    marginBottom: 8,
    marginTop: 4,
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

  priceColumn: {
    flex: 1,
  },

  price: {
    fontSize: 16,
    fontWeight: "800",
    color: "#2E7D32",
  },

  originalPriceSmall: {
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

  /* DEAL CARD */
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
    marginVertical: 6,
    shadowRadius: 4,
    position: "relative",
  },

  /* DEAL BADGE */
  dealBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#F44336",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },

  dealBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  /* DEAL IMAGE */
  dealImage: {
    width: "100%",
    height: 80,
    resizeMode: "contain",
    marginBottom: 8,
    marginTop: 4,
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

  /* FEATURED PRODUCTS */
  featuredCardContainer: {
    marginLeft: 14,
  },

  featuredCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: 160,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    position: "relative",
  },

  featuredBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#FFD700",
    borderRadius: 6,
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },

  featuredImage: {
    width: "100%",
    height: 120,
    resizeMode: "contain",
    backgroundColor: "#f9f9f9",
    marginTop: 4,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },

  featuredContent: {
    padding: 12,
  },

  featuredName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#222",
    minHeight: 34,
    marginBottom: 4,
  },

  featuredUnit: {
    fontSize: 11,
    color: "#777",
    marginBottom: 8,
  },

  featuredFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  featuredPrice: {
    fontSize: 16,
    fontWeight: "800",
    color: "#2E7D32",
  },

  featuredAddBtn: {
    backgroundColor: "#2E7D32",
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
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

  /* SKELETON LOADER */
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
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F7F2",
  },

  guestBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    marginHorizontal: 14,
    marginBottom: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#C8E6C9",
    shadowColor: "#2E7D32",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  guestLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  guestIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#E8F5E9",
    alignItems: "center",
    justifyContent: "center",
  },
  guestTitle: { fontSize: 13, fontWeight: "700", color: "#1A1A1A" },
  guestSub: { fontSize: 11, color: "#888", fontWeight: "500", marginTop: 1 },
  guestRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  guestLoginBtn: {
    backgroundColor: "#2E7D32",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  guestLoginText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  guestDismiss: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
  },
});

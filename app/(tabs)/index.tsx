import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  BackHandler,
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
  { id: "1", title: "Vegetables", icon: "leaf", color: "#22C55E" },
  { id: "2", title: "Fruits", icon: "nutrition", color: "#F97316" },
  { id: "3", title: "Dairy", icon: "ice-cream", color: "#3B82F6" },
  { id: "4", title: "Dry Fruits", icon: "basket-outline", color: "#A78BFA" },
];

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
  category: { _id: string; name: string; slug: string };
  unit: string;
  seller: {
    sellerId: string;
    sellerName: string;
    contact?: { phone?: string; email?: string };
    location?: { city?: string; area?: string };
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

const getDefaultVariant = (product: Product): ProductVariant => {
  return product.variants.find((v) => v.isDefault) || product.variants[0];
};
const getProductPrice = (product: Product) => getDefaultVariant(product).price;
const getProductMRP = (product: Product) => getDefaultVariant(product).mrp;

// ─── Guest Banner ─────────────────────────────────────────────────────────────
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

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const ProductSkeleton = () => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);
  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.75],
  });
  return (
    <Animated.View style={[styles.card, { opacity }]}>
      <View style={styles.skeletonImage} />
      <View style={styles.skeletonText} />
      <View style={[styles.skeletonText, { width: "60%" }]} />
      <View style={[styles.skeletonText, { width: "40%", marginTop: 8 }]} />
    </Animated.View>
  );
};

// ─── Empty Category State ─────────────────────────────────────────────────────
const EmptyCategoryState = ({
  categoryName,
  onClear,
}: {
  categoryName: string;
  onClear: () => void;
}) => (
  <View style={styles.emptyCategory}>
    <View style={styles.emptyCategoryIcon}>
      <Text style={{ fontSize: 48 }}>🛒</Text>
    </View>
    <Text style={styles.emptyCategoryTitle}>No products in {categoryName}</Text>
    <Text style={styles.emptyCategoryText}>
      We're restocking this category soon. Check back later!
    </Text>
    <TouchableOpacity style={styles.emptyCategoryBtn} onPress={onClear}>
      <Ionicons name="arrow-back" size={16} color="#fff" />
      <Text style={styles.emptyCategoryBtnText}>Browse all products</Text>
    </TouchableOpacity>
  </View>
);

// ─── Product Card ─────────────────────────────────────────────────────────────
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

  const handlePress = () => {
    setIsAdding(true);
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.94,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 120,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start(() => setIsAdding(false));
    onAdd();
  };

  const discountPct =
    variant.mrp > 0
      ? Math.round(((variant.mrp - variant.price) / variant.mrp) * 100)
      : item.discount || 0;

  return (
    <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
        {showTrendingBadge ? (
          <View style={[styles.badgeContainer, styles.badgeTrending]}>
            <Ionicons name="trending-up" size={9} color="#fff" />
            <Text style={styles.badgeText}>TRENDING</Text>
          </View>
        ) : discountPct > 0 ? (
          <View style={[styles.badgeContainer, styles.badgeDiscount]}>
            <Text style={styles.badgeText}>{discountPct}% OFF</Text>
          </View>
        ) : null}

        <View style={styles.imageWrapper}>
          <Image
            source={{ uri: item.image || "https://via.placeholder.com/150" }}
            style={styles.image}
          />
        </View>

        <Text numberOfLines={2} style={styles.name}>
          {item.name}
        </Text>
        <Text style={styles.unit}>
          {variant.packSize}
          {variant.packUnit}
        </Text>

        <View style={styles.footerRow}>
          <View style={styles.priceColumn}>
            <Text style={styles.price}>₹{variant.price.toFixed(2)}</Text>
            {discountPct > 0 && (
              <Text style={styles.originalPriceSmall}>
                ₹{variant.mrp.toFixed(2)}
              </Text>
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
              if (!inCart) handlePress();
            }}
            disabled={isAdding}
            activeOpacity={0.8}
          >
            {isAdding ? (
              <ActivityIndicator size="small" color="#2E7D32" />
            ) : inCart ? (
              <Ionicons name="checkmark" size={16} color="#fff" />
            ) : (
              <Text style={styles.addText}>ADD</Text>
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
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

  // ── Back handler ──────────────────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (selectedCategoryId || searchQuery) {
          setSelectedCategoryId(null);
          setSearchQuery("");
          return true;
        }
        return true;
      };
      const sub = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );
      return () => sub.remove();
    }, [selectedCategoryId, searchQuery]),
  );

  // ── Banner auto-scroll ────────────────────────────────────────────────────
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
    } catch {
      setCategories([]);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

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
      const fetched = res.data.data || res.data || [];
      setAllProducts(fetched);
      setProducts(fetched.slice(0, 20));
    } catch {
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
    if (!product.variants?.length) return;
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

  const getFilteredProducts = () => {
    let filtered = [...allProducts];
    if (selectedCategoryId)
      filtered = filtered.filter((p) => p.category?._id === selectedCategoryId);
    if (searchQuery) {
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

  const getSelectedCategoryName = () => {
    if (!selectedCategoryId) return "";
    const cat = categories.find((c) => c._id === selectedCategoryId);
    if (cat) return cat.name;
    const prod = allProducts.find(
      (p) => p.category?._id === selectedCategoryId,
    );
    return prod?.category?.name || "";
  };

  const getBestDeals = () => {
    const marked = allProducts.filter((p) => p.bestDeal === true);
    if (marked.length > 0) return marked.slice(0, 8);
    const highDiscount = allProducts.filter(
      (p) => p.discount && p.discount >= 20,
    );
    return highDiscount.slice(0, 8);
  };

  const getTrendingProducts = () => {
    const trending = allProducts.filter((p) => p.trending === true);
    return trending.length > 0
      ? trending.slice(0, 8)
      : allProducts.slice(6, 14);
  };

  const getFeaturedProducts = () => {
    const featured = allProducts.filter((p) => p.featured === true);
    return featured.length > 0 ? featured.slice(0, 6) : allProducts.slice(0, 6);
  };

  const homeCategories = categories
    .filter((c) => c.showOnHome && c.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const quickCategories = homeCategories.slice(0, 4);
  const dealProducts = getBestDeals();
  const trendingProducts = getTrendingProducts();
  const featuredProducts = getFeaturedProducts();

  const cartFooterTranslateY = cartFooterAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [100, 0],
  });
  const searchScale = searchFocusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.015],
  });
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [1, 0.95],
    extrapolate: "clamp",
  });
  const isFiltering = !!(searchQuery || selectedCategoryId);

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
        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.location}>📍 Delivering to</Text>
            <TouchableOpacity style={styles.addressRow}>
              <Text style={styles.address} numberOfLines={1}>
                {defaultAddress
                  ? `${defaultAddress.name} · ${defaultAddress.city}`
                  : "Add delivery address"}
              </Text>
              <Ionicons name="chevron-down" size={15} color="#1B5E20" />
            </TouchableOpacity>
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.iconBtn}>
              <Ionicons
                name="notifications-outline"
                size={22}
                color="#1B5E20"
              />
              <View style={styles.notificationDot} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cartIcon}
              onPress={() => router.push("/cart")}
            >
              <Ionicons name="cart-outline" size={24} color="#1B5E20" />
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

        {/* ── SEARCH ─────────────────────────────────────────────────────── */}
        <Animated.View
          style={[styles.searchBox, { transform: [{ scale: searchScale }] }]}
        >
          <Ionicons name="search" size={18} color="#9CA3AF" />
          <TextInput
            placeholder="Search vegetables, fruits, dairy…"
            placeholderTextColor="#9CA3AF"
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={(t) => {
              setSearchQuery(t);
              setSelectedCategoryId(null);
            }}
            onFocus={() =>
              Animated.spring(searchFocusAnim, {
                toValue: 1,
                useNativeDriver: true,
              }).start()
            }
            onBlur={() =>
              Animated.spring(searchFocusAnim, {
                toValue: 0,
                useNativeDriver: true,
              }).start()
            }
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* ── ACTIVE FILTER CHIP ──────────────────────────────────────────── */}
        {selectedCategoryId && (
          <View style={styles.filterChipRow}>
            <View style={styles.filterChip}>
              <Ionicons name="pricetag-outline" size={13} color="#2E7D32" />
              <Text style={styles.filterChipText}>
                {getSelectedCategoryName()}
              </Text>
              <TouchableOpacity
                onPress={() => setSelectedCategoryId(null)}
                hitSlop={8}
              >
                <Ionicons name="close-circle" size={16} color="#2E7D32" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── BANNER ─────────────────────────────────────────────────────── */}
        {!isFiltering && (
          <View style={styles.bannerContainer}>
            <FlatList
              ref={bannerScrollRef}
              data={banners}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              onMomentumScrollEnd={(e) => {
                setCurrentBannerIndex(
                  Math.round(e.nativeEvent.contentOffset.x / (width - 32)),
                );
              }}
              renderItem={({ item }) => (
                <TouchableOpacity activeOpacity={0.9}>
                  <Image source={{ uri: item.image }} style={styles.banner} />
                </TouchableOpacity>
              )}
            />
            <View style={styles.bannerDots}>
              {banners.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    currentBannerIndex === i && styles.activeDot,
                  ]}
                />
              ))}
            </View>
          </View>
        )}

        {/* ── QUICK CATEGORIES ────────────────────────────────────────────── */}
        {!isFiltering && quickCategories.length > 0 && (
          <View style={styles.section}>
            <Text
              style={[
                styles.sectionTitle,
                { paddingHorizontal: 16, marginBottom: 12 },
              ]}
            >
              Shop by Category
            </Text>
            <View style={styles.quickRow}>
              {quickCategories.map((cat, i) => {
                const action = quickActions[i] || quickActions[0];
                const isSelected = selectedCategoryId === cat._id;
                return (
                  <TouchableOpacity
                    key={cat._id}
                    style={[
                      styles.quickCard,
                      isSelected && styles.quickCardSelected,
                    ]}
                    activeOpacity={0.75}
                    onPress={() => handleCategoryClick(cat._id)}
                  >
                    <View
                      style={[
                        styles.iconCircle,
                        { backgroundColor: action.color + "20" },
                      ]}
                    >
                      <Ionicons
                        name={action.icon as any}
                        size={22}
                        color={action.color}
                      />
                    </View>
                    <Text
                      style={[
                        styles.quickText,
                        isSelected && { color: "#2E7D32" },
                      ]}
                      numberOfLines={1}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ── BEST DEALS ──────────────────────────────────────────────────── */}
        {!isFiltering && dealProducts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>Best Deals Today</Text>
                <View style={styles.fireBadge}>
                  <Text>🔥</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: "/all-products",
                    params: { type: "deals", title: "Best Deals Today" },
                  })
                }
              >
                <Text style={styles.seeAll}>See all →</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={dealProducts}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item._id}
              contentContainerStyle={{ paddingLeft: 16, paddingRight: 8 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.dealCard}
                  activeOpacity={0.85}
                  onPress={() =>
                    router.push({
                      pathname: "/product-detail",
                      params: { id: item._id },
                    })
                  }
                >
                  <View style={styles.dealBadge}>
                    <Text style={styles.dealBadgeText}>
                      {item.discount ? `${item.discount}% OFF` : "DEAL"}
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

        {/* ── TRENDING ────────────────────────────────────────────────────── */}
        {!isFiltering && trendingProducts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>Trending Now</Text>
                <View style={styles.trendBadge}>
                  <Text>📈</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: "/all-products",
                    params: { type: "trending", title: "Trending Now" },
                  })
                }
              >
                <Text style={styles.seeAll}>See all →</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.productsGrid}>
              {trendingProducts.slice(0, 4).map((item) => {
                const variant = getDefaultVariant(item);
                const cartItem = items.find(
                  (i) =>
                    i.productId === item._id && i.variantId === variant._id,
                );
                return (
                  <ProductCard
                    key={item._id}
                    item={item}
                    onAdd={() => handleAddToCart(item)}
                    inCart={!!cartItem}
                    onPress={() =>
                      router.push({
                        pathname: "/product-detail",
                        params: { id: item._id },
                      })
                    }
                    showTrendingBadge
                  />
                );
              })}
            </View>
          </View>
        )}

        {/* ── ALL PRODUCTS / SEARCH / CATEGORY ──────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {searchQuery
                ? `"${searchQuery}"`
                : selectedCategoryId
                  ? getSelectedCategoryName()
                  : "All Products"}
            </Text>
            {!isFiltering && (
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: "/all-products",
                    params: { type: "popular", title: "All Products" },
                  })
                }
              >
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
                const variant = getDefaultVariant(item);
                const cartItem = items.find(
                  (i) =>
                    i.productId === item._id && i.variantId === variant._id,
                );
                return (
                  <ProductCard
                    key={item._id}
                    item={item}
                    onAdd={() => handleAddToCart(item)}
                    inCart={!!cartItem}
                    onPress={() =>
                      router.push({
                        pathname: "/product-detail",
                        params: { id: item._id },
                      })
                    }
                  />
                );
              })}
            </View>
          ) : selectedCategoryId ? (
            <EmptyCategoryState
              categoryName={getSelectedCategoryName()}
              onClear={() => setSelectedCategoryId(null)}
            />
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={56} color="#D1D5DB" />
              <Text style={styles.emptyText}>No products found</Text>
              <Text style={styles.emptySubtext}>
                Try a different search term
              </Text>
            </View>
          )}
        </View>

        {/* ── FEATURED ────────────────────────────────────────────────────── */}
        {!isFiltering && featuredProducts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>Featured</Text>
                <Ionicons name="star" size={16} color="#FBBF24" />
              </View>
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: "/all-products",
                    params: { type: "featured", title: "Featured Products" },
                  })
                }
              >
                <Text style={styles.seeAll}>See all →</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={featuredProducts}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item._id}
              contentContainerStyle={{
                paddingLeft: 16,
                paddingRight: 8,
                paddingVertical: 8,
              }}
              style={{ overflow: "visible" }}
              renderItem={({ item }) => {
                const variant = getDefaultVariant(item);
                return (
                  <TouchableOpacity
                    style={styles.featuredCard}
                    activeOpacity={0.85}
                    onPress={() =>
                      router.push({
                        pathname: "/product-detail",
                        params: { id: item._id },
                      })
                    }
                  >
                    <View style={styles.featuredBadge}>
                      <Ionicons name="star" size={12} color="#fff" />
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
                );
              }}
            />
          </View>
        )}

        <View style={{ height: 110 }} />
      </Animated.ScrollView>

      {/* ── CART FOOTER ──────────────────────────────────────────────────── */}
      <Animated.View
        style={[
          styles.cartFooter,
          { transform: [{ translateY: cartFooterTranslateY }] },
        ]}
        pointerEvents={items.length > 0 ? "auto" : "none"}
      >
        <TouchableOpacity
          style={styles.cartFooterContent}
          onPress={() => router.push("/cart")}
          activeOpacity={0.92}
        >
          <View style={styles.cartFooterLeft}>
            <View style={styles.cartIconCircle}>
              <Ionicons name="cart" size={19} color="#fff" />
            </View>
            <View>
              <Text style={styles.cartFooterItems}>
                {getCartItemCount()} item{getCartItemCount() !== 1 ? "s" : ""}
              </Text>
              <Text style={styles.cartFooterTotal}>₹{total.toFixed(2)}</Text>
            </View>
          </View>
          <View style={styles.cartFooterRight}>
            <Text style={styles.cartFooterBtn}>View Cart</Text>
            <Ionicons name="arrow-forward" size={17} color="#fff" />
          </View>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );

  function handleCategoryClick(id: string) {
    setSelectedCategoryId(id);
    setSearchQuery("");
  }
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // ── original background preserved everywhere ───────────────────────────────
  safe: { flex: 1, backgroundColor: "#F5F7F2" },
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F7F2",
  },

  /* HEADER */
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  location: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "500",
    marginBottom: 2,
  },
  addressRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  address: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1B5E20",
    maxWidth: width * 0.5,
  },
  headerIcons: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconBtn: {
    position: "relative",
    padding: 6,
    backgroundColor: "#fff",
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  notificationDot: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },
  cartIcon: {
    position: "relative",
    padding: 6,
    backgroundColor: "#fff",
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  cartBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: "#2E7D32",
    borderRadius: 10,
    minWidth: 17,
    height: 17,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
  },
  cartBadgeText: { color: "#fff", fontSize: 9, fontWeight: "800" },

  /* SEARCH */
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginHorizontal: 16,
    marginBottom: 14,
    elevation: 3,
    shadowColor: "#2E7D32",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: "#C8E6C9",
  },
  searchInput: { marginLeft: 10, fontSize: 14, flex: 1, color: "#1F2937" },

  /* FILTER CHIP */
  filterChipRow: { paddingHorizontal: 16, marginBottom: 12 },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#E8F5E9",
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: "#C8E6C9",
  },
  filterChipText: { color: "#2E7D32", fontSize: 13, fontWeight: "700" },

  /* BANNER */
  bannerContainer: { marginBottom: 20 },
  banner: {
    width: width - 32,
    height: 130,
    borderRadius: 18,
    marginHorizontal: 16,
    resizeMode: "cover",
  },
  bannerDots: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 10,
    gap: 5,
  },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#C8E6C9" },
  activeDot: {
    width: 18,
    height: 5,
    backgroundColor: "#2E7D32",
    borderRadius: 3,
  },

  /* SECTION */
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: "#1B5E20" },
  fireBadge: {
    backgroundColor: "#FEF2F2",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  trendBadge: {
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  seeAll: { fontSize: 13, color: "#2E7D32", fontWeight: "700" },

  /* QUICK CATEGORIES */
  quickRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  quickCard: {
    backgroundColor: "#fff",
    width: "23%",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  quickCardSelected: { borderColor: "#2E7D32", backgroundColor: "#F5F7F2" },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  quickText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#374151",
    textAlign: "center",
  },

  /* PRODUCTS GRID */
  productsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },

  /* PRODUCT CARD */
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 12,
    width: "48%",
    marginBottom: 14,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  badgeContainer: {
    position: "absolute",
    top: 1,
    right: 4,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 4,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  badgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  badgeTrending: { backgroundColor: "#3B82F6" },
  badgeDiscount: { backgroundColor: "#EF4444" },
  imageWrapper: {
    backgroundColor: "#F5F7F2",
    borderRadius: 12,
    marginBottom: 8,
    marginTop: 4,
    overflow: "hidden",
  },
  image: { width: "100%", height: 100, resizeMode: "contain" },
  name: { fontSize: 13, fontWeight: "600", color: "#1F2937", minHeight: 34 },
  unit: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 2,
    marginBottom: 6,
    fontWeight: "500",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceColumn: { flex: 1 },
  price: { fontSize: 15, fontWeight: "800", color: "#2E7D32" },
  originalPriceSmall: {
    fontSize: 11,
    color: "#D1D5DB",
    textDecorationLine: "line-through",
    marginTop: 1,
  },
  addBtn: {
    borderWidth: 1.5,
    borderColor: "#2E7D32",
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 7,
    minWidth: 55,
    alignItems: "center",
  },
  addBtnActive: { backgroundColor: "#2E7D32" },
  addBtnAdding: { opacity: 0.6 },
  addText: { color: "#2E7D32", fontWeight: "800", fontSize: 11 },

  /* DEAL CARD */
  dealCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    width: 138,
    marginRight: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 5,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    position: "relative",
  },
  dealBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#EF4444",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    zIndex: 10,
  },
  dealBadgeText: {
    color: "#fff",
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  dealImage: {
    width: "100%",
    height: 80,
    resizeMode: "contain",
    marginTop: 16,
    marginBottom: 8,
  },
  dealName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  dealPriceRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  dealPrice: { fontSize: 13, fontWeight: "800", color: "#2E7D32" },
  dealOriginalPrice: {
    fontSize: 11,
    color: "#D1D5DB",
    textDecorationLine: "line-through",
  },
  quickAddBtn: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "#2E7D32",
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
  },

  /* FEATURED */
  featuredCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    width: 155,
    marginRight: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    position: "relative",
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  featuredBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#FBBF24",
    borderRadius: 6,
    width: 26,
    height: 26,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  featuredImage: {
    width: "100%",
    height: 110,
    resizeMode: "contain",
    backgroundColor: "#F5F7F2",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  featuredContent: { padding: 10 },
  featuredName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1F2937",
    minHeight: 32,
    marginBottom: 3,
  },
  featuredUnit: {
    fontSize: 10,
    color: "#9CA3AF",
    marginBottom: 8,
    fontWeight: "500",
  },
  featuredFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  featuredPrice: { fontSize: 14, fontWeight: "800", color: "#2E7D32" },
  featuredAddBtn: {
    backgroundColor: "#2E7D32",
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
  },

  /* EMPTY STATES */
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#6B7280",
    marginTop: 14,
  },
  emptySubtext: { fontSize: 13, color: "#9CA3AF", marginTop: 6 },
  emptyCategory: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyCategoryIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#F5F7F2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#C8E6C9",
  },
  emptyCategoryTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1B5E20",
    textAlign: "center",
    marginBottom: 8,
  },
  emptyCategoryText: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyCategoryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#2E7D32",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  emptyCategoryBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  /* SKELETON */
  skeletonImage: {
    width: "100%",
    height: 100,
    backgroundColor: "#E5E7EB",
    borderRadius: 10,
    marginBottom: 8,
  },
  skeletonText: {
    height: 11,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    marginBottom: 6,
  },

  /* CART FOOTER */
  cartFooter: { position: "absolute", bottom: 12, left: 16, right: 16 },
  cartFooterContent: {
    backgroundColor: "#2E7D32",
    borderRadius: 18,
    padding: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 10,
    shadowColor: "#2E7D32",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  cartFooterLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  cartIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  cartFooterItems: { color: "#C8E6C9", fontSize: 11, fontWeight: "600" },
  cartFooterTotal: { color: "#fff", fontSize: 17, fontWeight: "800" },
  cartFooterRight: { flexDirection: "row", alignItems: "center", gap: 5 },
  cartFooterBtn: { color: "#fff", fontSize: 14, fontWeight: "700" },

  /* GUEST BANNER */
  guestBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#C8E6C9",
    shadowColor: "#2E7D32",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
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
  guestSub: { fontSize: 11, color: "#9CA3AF", fontWeight: "500", marginTop: 1 },
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
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
});

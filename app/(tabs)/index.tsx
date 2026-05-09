import { Ionicons } from "@expo/vector-icons";
import { showAlert } from "@/context/CustomAlertContext";
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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { useAddress } from "@/context/AddressContext";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "../../context/CartContext";
import { API } from "../../utils/api";

type SpeechEventName = "start" | "end" | "result" | "error";

let ExpoSpeechRecognitionModule: any = null;
let useSpeechRecognitionEvent: (
  _eventName: SpeechEventName,
  _handler: (event: any) => void,
) => void = () => {};

try {
  const speechModule = require("expo-speech-recognition");
  ExpoSpeechRecognitionModule = speechModule.ExpoSpeechRecognitionModule;
  useSpeechRecognitionEvent = speechModule.useSpeechRecognitionEvent;
} catch {
  // Native speech module isn't available in this runtime.
}

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 16 * 2 - 10) / 2;
const HORIZONTAL_CARD_W = (width - 16 * 2 - 12) / 2;
const DEAL_CARD_W = width - 56;

// ─── Fallbacks ────────────────────────────────────────────────────────────────
const FALLBACK_BANNERS = [
  {
    id: "b1",
    title: "Farm Fresh\nDelivered",
    subtitle: "Handpicked produce from\ntrusted local farms.",
    ctaText: "Shop Now",
    ctaColor: "#2E7D32",
    bg: "#E8F5E9",
    badgeText: "100%\nNATURAL",
    image: "https://images.unsplash.com/photo-1543168256-418811576931?w=400&q=80",
  },
  {
    id: "b2",
    title: "Today's\nBest Deals",
    subtitle: "Up to 30% off on\nseasonal fruits & veggies.",
    ctaText: "Grab Deals",
    ctaColor: "#F59E0B",
    bg: "#FFF8E1",
    badgeText: "UP TO\n30% OFF",
    image: "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=400&q=80",
  },
  {
    id: "b3",
    title: "Dairy &\nOrganic",
    subtitle: "Fresh from local farms,\ndelivered daily.",
    ctaText: "Order Now",
    ctaColor: "#3F51B5",
    bg: "#E8EAF6",
    badgeText: "FRESH\nDAILY",
    image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&q=80",
  },
];

const FEATURES = [
  { icon: "leaf-outline", label: "100% Natural", sub: "Chemical free", color: "#22C55E", bg: "#DCFCE7" },
  { icon: "home-outline", label: "From Local\nFarms", sub: "Support local", color: "#22C55E", bg: "#DCFCE7" },
  { icon: "flash-outline", label: "Fast Delivery", sub: "At your door", color: "#22C55E", bg: "#DCFCE7" },
  { icon: "shield-checkmark-outline", label: "Secure\nPayment", sub: "Safe & easy", color: "#22C55E", bg: "#DCFCE7" },
];

const QUICK_ACTIONS = [
  { color: "#22C55E", bg: "#DCFCE7", icon: "leaf" },
  { color: "#F97316", bg: "#FFEDD5", icon: "nutrition" },
  { color: "#3B82F6", bg: "#DBEAFE", icon: "ice-cream" },
  { color: "#A78BFA", bg: "#EDE9FE", icon: "basket-outline" },
  { color: "#F59E0B", bg: "#FEF9C3", icon: "cafe-outline" },
];

const SEARCH_PLACEHOLDERS = [
  "Search vegetables, fruits, dairy...",
  "Try: tomato, onion, milk",
  "Try voice search using mic",
  "Search brands or categories",
];

// ─── Types ────────────────────────────────────────────────────────────────────
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
  seller: { sellerId: string; sellerName: string };
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

type Banner = { _id: string; image: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getDefaultVariant = (p: Product): ProductVariant =>
  p.variants.find((v) => v.isDefault) || p.variants[0];

// ─── Guest Banner ─────────────────────────────────────────────────────────────
function GuestBanner() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(true);
  const slide = useRef(new Animated.Value(-70)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!user && visible) {
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 380, useNativeDriver: true }),
        Animated.spring(slide, { toValue: 0, tension: 55, friction: 9, useNativeDriver: true }),
      ]).start();
    }
  }, [user, visible]);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(slide, { toValue: -70, duration: 200, useNativeDriver: true }),
    ]).start(() => setVisible(false));
  };

  if (user || !visible) return null;

  return (
    <Animated.View style={[s.guestBanner, { opacity: fade, transform: [{ translateY: slide }] }]}>
      <View style={s.guestLeft}>
        <View style={s.guestIconWrap}>
          <Ionicons name="person-outline" size={16} color="#2E7D32" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.guestTitle}>Browsing as guest</Text>
          <Text style={s.guestSub}>Log in to add items & checkout</Text>
        </View>
      </View>
      <View style={s.guestRight}>
        <TouchableOpacity style={s.guestLoginBtn} onPress={() => router.push("/login")} activeOpacity={0.85}>
          <Text style={s.guestLoginText}>Log In</Text>
        </TouchableOpacity>
        <Pressable onPress={dismiss} hitSlop={10} style={s.guestDismiss}>
          <Ionicons name="close" size={15} color="#999" />
        </Pressable>
      </View>
    </Animated.View>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function ProductSkeleton() {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.75] });
  return (
    <Animated.View style={[s.prodCard, { opacity, width: CARD_WIDTH }]}>
      <View style={[s.skelImg]} />
      <View style={s.skelLine} />
      <View style={[s.skelLine, { width: "60%" }]} />
      <View style={[s.skelLine, { width: "40%", marginTop: 8 }]} />
    </Animated.View>
  );
}

// ─── Hero Banner Slide ────────────────────────────────────────────────────────
function BannerSlide({ item }: { item: typeof FALLBACK_BANNERS[0] }) {
  return (
    <TouchableOpacity 
      style={[s.bannerSlide, { width: width - 32 }]}
      activeOpacity={0.85}
      onPress={() => router.push({ pathname: "/all-products", params: { type: "featured", title: "Featured Products" } })}
    >
      <Image source={{ uri: item.image }} style={s.bannerImg} />
    </TouchableOpacity>
  );
}

// ─── Deal Card ────────────────────────────────────────────────────────────────
function DealCard({ item, onAdd }: { item: Product; onAdd: () => void }) {
  const v = getDefaultVariant(item);
  const disc = v.mrp > 0 ? Math.round(((v.mrp - v.price) / v.mrp) * 100) : item.discount || 0;
  return (
    <TouchableOpacity
      style={[s.dealCard, { width: DEAL_CARD_W }]}
      activeOpacity={0.85}
      onPress={() => router.push({ pathname: "/product-detail", params: { id: item._id } })}
    >
      {disc > 0 && (
        <View style={s.dealBadge}>
          <Text style={s.badgeTxt}>{disc}% OFF</Text>
        </View>
      )}
      <View style={s.dealImgZone}>
        <Image source={{ uri: item.image || "https://via.placeholder.com/150" }} style={s.dealImg} />
      </View>
      <View style={s.dealInfo}>
        <Text numberOfLines={2} style={s.dealName}>{item.name}</Text>
        <Text style={s.dealUnit}>{v.packSize}{v.packUnit}</Text>
        <View style={s.dealFooter}>
          <View style={{ flex: 1, marginRight: 6 }}>
            <Text style={s.dealPrice}>₹{v.price.toFixed(2)}</Text>
            {disc > 0 && <Text style={s.strikePrice}>₹{v.mrp.toFixed(2)}</Text>}
          </View>
          <TouchableOpacity style={s.roundAddBtn} onPress={(e) => { e.stopPropagation(); onAdd(); }} activeOpacity={0.8} hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
            <Ionicons name="add" size={14} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Featured Card ────────────────────────────────────────────────────────────
function FeaturedCard({ item, onAdd }: { item: Product; onAdd: () => void }) {
  const v = getDefaultVariant(item);
  return (
    <TouchableOpacity
      style={[s.featCard, { width: HORIZONTAL_CARD_W }]}
      activeOpacity={0.85}
      onPress={() => router.push({ pathname: "/product-detail", params: { id: item._id } })}
    >
      <View style={s.featImgZone}>
        <View style={s.starBadge}>
          <Ionicons name="star" size={11} color="#fff" />
        </View>
        <Image source={{ uri: item.image || "https://via.placeholder.com/150" }} style={s.featImg} />
      </View>
      <View style={s.featContent}>
        <Text numberOfLines={2} style={s.featName}>{item.name}</Text>
        <Text style={s.featUnit}>{v.packSize}{v.packUnit}</Text>
        <View style={s.featFooter}>
          <Text style={s.featPrice}>₹{v.price}</Text>
          <TouchableOpacity style={s.featAddBtn} onPress={(e) => { e.stopPropagation(); onAdd(); }} activeOpacity={0.8} hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
            <Ionicons name="add" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Product Card ─────────────────────────────────────────────────────────────
function ProductCard({
  item, onAdd, inCart, onPress, showTrendingBadge = false,
}: {
  item: Product; onAdd: () => void; inCart: boolean; onPress: () => void; showTrendingBadge?: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const [isAdding, setIsAdding] = useState(false);
  const v = getDefaultVariant(item);
  const disc = v.mrp > 0 ? Math.round(((v.mrp - v.price) / v.mrp) * 100) : item.discount || 0;

  const handleAdd = () => {
    setIsAdding(true);
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.96, duration: 80, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, tension: 120, friction: 4, useNativeDriver: true }),
    ]).start(() => setIsAdding(false));
    onAdd();
  };

  return (
    <Animated.View style={[s.prodCard, { transform: [{ scale }], width: CARD_WIDTH }]}>
      <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={{ flex: 1 }}>
        <View style={s.prodImgZone}>
          <Image source={{ uri: item.image || "https://via.placeholder.com/150" }} style={s.prodImg} />
          {showTrendingBadge && (
            <View style={s.trendBadge}><Text style={s.prodBadgeTxt}>TRENDING</Text></View>
          )}
          {disc > 0 && (
            <View style={s.offBadge}><Text style={s.prodBadgeTxt}>{disc}% OFF</Text></View>
          )}
        </View>
        <Text numberOfLines={2} style={s.prodName}>{item.name}</Text>
        <Text style={s.prodUnit}>{v.packSize}{v.packUnit}</Text>
        <View style={s.prodFooter}>
          <View style={{ flex: 1, marginRight: 6 }}>
            <Text style={s.prodPrice}>₹{v.price.toFixed(2)}</Text>
            {disc > 0 && <Text style={s.strikePrice}>₹{v.mrp.toFixed(2)}</Text>}
          </View>
          <TouchableOpacity
            style={[s.addBtn, inCart && s.addBtnActive, isAdding && { opacity: 0.6 }]}
            onPress={(e) => { e.stopPropagation(); if (!inCart) handleAdd(); }}
            disabled={isAdding}
            activeOpacity={0.8}
          >
            {isAdding ? (
              <ActivityIndicator size="small" color="#2E7D32" />
            ) : inCart ? (
              <Ionicons name="checkmark" size={15} color="#fff" />
            ) : (
              <Text style={s.addBtnText}>ADD</Text>
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Empty Category ───────────────────────────────────────────────────────────
function EmptyCategoryState({ categoryName, onClear }: { categoryName: string; onClear: () => void }) {
  return (
    <View style={s.emptyCategory}>
      <View style={s.emptyCategoryIcon}><Text style={{ fontSize: 48 }}>🛒</Text></View>
      <Text style={s.emptyCategoryTitle}>No products in {categoryName}</Text>
      <Text style={s.emptyCategoryText}>{"We're restocking this category soon. Check back later!"}</Text>
      <TouchableOpacity style={s.emptyCategoryBtn} onPress={onClear}>
        <Ionicons name="arrow-back" size={16} color="#fff" />
        <Text style={s.emptyCategoryBtnText}>Browse all products</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ title, onSeeAll, right }: { title: React.ReactNode; onSeeAll?: () => void; right?: React.ReactNode }) {
  return (
    <View style={s.secHeader}>
      <View style={{ flex: 1 }}>{typeof title === "string" ? <Text style={s.secTitle}>{title}</Text> : title}</View>
      {right}
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll}>
          <Text style={s.seeAll}>See all →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { loading: authLoading } = useAuth();
  const { items, addToCart, getCartItemCount } = useCart();
  const { defaultAddress } = useAddress();

  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [bannerIdx, setBannerIdx] = useState(0);
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [homeBanners, setHomeBanners] = useState<Banner[]>([]);
  const [timeLeft, setTimeLeft] = useState({ h: 0, m: 0, s: 0 });
  const [dealEndTs, setDealEndTs] = useState<number | null>(null);

  const scrollY = useRef(new Animated.Value(0)).current;
  const cartAnim = useRef(new Animated.Value(0)).current;
  const searchAnim = useRef(new Animated.Value(0)).current;
  const bannerRef = useRef<FlatList>(null);

  const total = items.reduce((acc, i) => acc + i.price * i.qty, 0);

  useSpeechRecognitionEvent("start", () => setIsListening(true));
  useSpeechRecognitionEvent("end", () => setIsListening(false));
  useSpeechRecognitionEvent("result", (event) => {
    const transcript = event.results?.[0]?.transcript?.trim();
    if (!transcript) return;
    setSearchQuery(transcript);
    setSelectedCatId(null);
  });
  useSpeechRecognitionEvent("error", (event) => {
    setIsListening(false);
    if (event.error === "aborted" || event.error === "no-speech") return;
    showAlert("Voice search", event.message || "Voice recognition failed.");
  });

  // Back handler
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        if (selectedCatId || searchQuery) { setSelectedCatId(null); setSearchQuery(""); return true; }
        return true;
      });
      return () => sub.remove();
    }, [selectedCatId, searchQuery])
  );

  // Banner slides — use dynamic banners if available, else FALLBACK_BANNERS
  const bannerSlides = homeBanners.length > 0
    ? homeBanners.map((b, i) => ({ ...FALLBACK_BANNERS[i % FALLBACK_BANNERS.length], id: b._id, image: b.image }))
    : FALLBACK_BANNERS;

  // Auto-scroll banner
  useEffect(() => {
    if (!bannerSlides.length) return;
    const t = setInterval(() => {
      setBannerIdx((prev) => {
        const next = (prev + 1) % bannerSlides.length;
        bannerRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 3000);
    return () => clearInterval(t);
  }, [bannerSlides.length]);

  // Cart footer animation
  useEffect(() => {
    Animated.spring(cartAnim, { toValue: items.length > 0 ? 1 : 0, useNativeDriver: true, tension: 50, friction: 7 }).start();
  }, [items.length]);

  // Data loaders
  const loadAll = async () => {
    try {
      const [prodRes, catRes, bannerRes, dealRes] = await Promise.all([
        API.get("/products"),
        API.get("/categories"),
        API.get("/banners"),
        API.get("/deal-settings"),
      ]);
      const fetched = prodRes.data.data || prodRes.data || [];
      setAllProducts(fetched);
      setProducts(fetched.slice(0, 20));
      setCategories(catRes.data.data || []);
      setHomeBanners(bannerRes.data.data || []);
      const dealSettings = dealRes.data?.data;
      if (dealSettings?.isActive && dealSettings?.dealEndsAt) {
        const ts = new Date(dealSettings.dealEndsAt).getTime();
        setDealEndTs(Number.isFinite(ts) && ts > Date.now() ? ts : null);
      } else {
        setDealEndTs(null);
      }
    } catch {
      setAllProducts([]); setProducts([]); setCategories([]); setHomeBanners([]);
      setDealEndTs(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { if (!authLoading) loadAll(); }, [authLoading]);

  const onRefresh = () => { setRefreshing(true); setSelectedCatId(null); setSearchQuery(""); loadAll(); };

  const handleAddToCart = (product: Product) => {
    if (!product.variants?.length) return;
    const v = getDefaultVariant(product);
    addToCart({ id: `${product._id}_${v._id}`, productId: product._id, variantId: v._id, name: product.name, variantLabel: `${v.packSize}${v.packUnit}`, price: v.price, qty: 1 });
  };

  const isFiltering = !!(searchQuery || selectedCatId);

  const filteredProducts = (() => {
    let list = [...allProducts];
    if (selectedCatId) list = list.filter((p) => p.category?._id === selectedCatId);
    if (searchQuery) list = list.filter((p) => p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || p.description?.toLowerCase().includes(searchQuery.toLowerCase()));
    return isFiltering ? list : products;
  })();

  const selectedCatName = () => {
    if (!selectedCatId) return "";
    return categories.find((c) => c._id === selectedCatId)?.name || allProducts.find((p) => p.category?._id === selectedCatId)?.category?.name || "";
  };

  const dealProducts = (() => {
    const m = allProducts.filter((p) => p.bestDeal);
    return (m.length > 0 ? m : allProducts.filter((p) => p.discount && p.discount >= 10)).slice(0, 8);
  })();

  useEffect(() => {
    if (!dealEndTs) {
      setTimeLeft({ h: 0, m: 0, s: 0 });
      return;
    }

    const update = () => {
      const remainingMs = dealEndTs - Date.now();
      if (remainingMs <= 0) {
        setTimeLeft({ h: 0, m: 0, s: 0 });
        return;
      }

      const totalSec = Math.floor(remainingMs / 1000);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      setTimeLeft({ h, m, s });
    };

    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [dealEndTs]);

  useEffect(() => {
    const timer = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % SEARCH_PLACEHOLDERS.length);
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  if (authLoading) {
    return <View style={s.loadingScreen}><ActivityIndicator size="large" color="#2E7D32" /></View>;
  }

  const trendingProducts = (() => {
    const t = allProducts.filter((p) => p.trending);
    return (t.length > 0 ? t : allProducts.slice(6, 14)).slice(0, 4);
  })();

  const featuredProducts = (() => {
    const f = allProducts.filter((p) => p.featured);
    return (f.length > 0 ? f : allProducts.slice(0, 6));
  })();

  const homeCategories = categories.filter((c) => c.showOnHome && c.isActive).sort((a, b) => a.sortOrder - b.sortOrder);

  const cartTranslateY = cartAnim.interpolate({ inputRange: [0, 1], outputRange: [100, 0] });
  const headerOpacity = scrollY.interpolate({ inputRange: [0, 80], outputRange: [1, 0.95], extrapolate: "clamp" });
  const searchScale = searchAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.015] });

  const pad2 = (n: number) => String(n).padStart(2, "0");

  const handleVoiceSearch = async () => {
    if (!ExpoSpeechRecognitionModule) {
      showAlert(
        "Voice search unavailable",
        "Voice search is not available in this build. Please use search text.",
      );
      return;
    }

    if (isListening) {
      ExpoSpeechRecognitionModule.stop();
      return;
    }

    if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
      showAlert(
        "Voice search",
        "Speech recognition is not available on this device.",
      );
      return;
    }

    const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permission.granted) {
      showAlert(
        "Permission needed",
        "Please allow microphone permission for voice search.",
      );
      return;
    }

    ExpoSpeechRecognitionModule.start({
      lang: "en-IN",
      interimResults: true,
      continuous: false,
      maxAlternatives: 1,
      iosTaskHint: "search",
    });
  };

  return (
    <SafeAreaView style={s.safe} edges={["left", "right"]}>
      <Animated.View style={[s.headerFixed, { opacity: headerOpacity }]}>
        <View style={[s.headerWrap, { paddingTop: insets.top }]}>
          <View style={s.header}>
          <View style={{ flex: 1 }}>
            <View style={s.brandRow}>
              <Image source={require("../../assets/images/vadi-brand-logo.png")} style={s.headerLogo} />
              <View style={{ flex: 1 }}>
                <Text style={s.deliverLabel}>📍 Delivering to</Text>
                <TouchableOpacity style={s.addressRow}>
                  <Text style={s.addressText} numberOfLines={1}>
                    {defaultAddress ? `${defaultAddress.name} · ${defaultAddress.city}` : "Add delivery address"}
                  </Text>
                  <Ionicons name="chevron-down" size={15} color="#1B5E20" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
          <View style={s.headerIcons}>
            <TouchableOpacity style={s.iconBtn}>
              <Ionicons name="notifications-outline" size={22} color="#1B5E20" />
              <View style={s.notifDot} />
            </TouchableOpacity>
            <TouchableOpacity style={s.iconBtn} onPress={() => router.push("/cart")}>
              <Ionicons name="cart-outline" size={24} color="#1B5E20" />
              {getCartItemCount() > 0 && (
                <View style={s.cartBadge}><Text style={s.cartBadgeText}>{getCartItemCount()}</Text></View>
              )}
            </TouchableOpacity>
          </View>
          </View>
        </View>
      </Animated.View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#2E7D32"]} tintColor="#2E7D32" />}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
        contentContainerStyle={[s.scrollContent, { paddingTop: insets.top + 70 }]}
      >
        <GuestBanner />

        {/* ── SEARCH ─────────────────────────────────────────────────────── */}
        <Animated.View style={[s.searchBox, { transform: [{ scale: searchScale }] }]}>
          <Ionicons name="search" size={18} color="#9CA3AF" />
          <TextInput
            placeholder={SEARCH_PLACEHOLDERS[placeholderIndex]}
            placeholderTextColor="#9CA3AF"
            style={s.searchInput}
            value={searchQuery}
            onChangeText={(t) => { setSearchQuery(t); setSelectedCatId(null); }}
            onFocus={() => Animated.spring(searchAnim, { toValue: 1, useNativeDriver: true }).start()}
            onBlur={() => Animated.spring(searchAnim, { toValue: 0, useNativeDriver: true }).start()}
          />
          <TouchableOpacity
            style={[s.voicePill, isListening && s.voicePillActive]}
            onPress={handleVoiceSearch}
            activeOpacity={0.85}
          >
            <Ionicons
              name={isListening ? "mic" : "mic-outline"}
              size={16}
              color={isListening ? "#fff" : "#2E7D32"}
            />
          </TouchableOpacity>
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
          <View style={s.filterPill}>
            <Ionicons name="options-outline" size={16} color="#2E7D32" />
          </View>
        </Animated.View>

        {/* ── ACTIVE FILTER CHIP ──────────────────────────────────────────── */}
        {selectedCatId && (
          <View style={s.filterChipRow}>
            <View style={s.filterChip}>
              <Ionicons name="pricetag-outline" size={13} color="#2E7D32" />
              <Text style={s.filterChipText}>{selectedCatName()}</Text>
              <TouchableOpacity onPress={() => setSelectedCatId(null)} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color="#2E7D32" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── HERO BANNER ─────────────────────────────────────────────────── */}
        {!isFiltering && (
          <View style={s.bannerSection}>
            <FlatList
              ref={bannerRef}
              data={bannerSlides}
              keyExtractor={(item) => item.id}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              scrollEnabled={true}
              snapToInterval={width - 32}
              decelerationRate="fast"
              renderItem={({ item }) => <BannerSlide item={item} />}
              style={s.bannerList}
              contentContainerStyle={{ paddingHorizontal: 16 }}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / (width - 32));
                setBannerIdx(Math.min(idx, bannerSlides.length - 1));
              }}
            />
            {/* Dots */}
            <View style={s.bannerDots}>
              {bannerSlides.map((_, i) => (
                <TouchableOpacity key={i} onPress={() => { setBannerIdx(i); bannerRef.current?.scrollToIndex({ index: i, animated: true }); }}>
                  <View style={[s.dot, i === bannerIdx && s.dotActive]} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ── FEATURE BADGES ──────────────────────────────────────────────── */}
        {!isFiltering && (
          <View style={s.featBadgesRow}>
            {FEATURES.map((f, i) => (
              <View key={i} style={s.featBadge}>
                <View style={[s.featIconCircle, { backgroundColor: f.bg }]}>
                  <Ionicons name={f.icon as any} size={20} color={f.color} />
                </View>
                <Text style={s.featBadgeTitle}>{f.label}</Text>
                <Text style={s.featBadgeSub}>{f.sub}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── TODAY'S DEALS ────────────────────────────────────────────────── */}
        {!isFiltering && dealProducts.length > 0 && (
          <View style={s.dealSection}>
            <View style={s.secHeader}>
              <View style={{ flex: 1 }}>
                <View style={s.dealHeaderTopRow}>
                  <Text style={s.secTitle}>{"Today's Deal"}</Text>
                  <Text style={{ fontSize: 18 }}>🔥</Text>
                  <TouchableOpacity
                    style={s.dealViewAllBtn}
                    onPress={() =>
                      router.push({
                        pathname: "/all-products",
                        params: { type: "deals", title: "Best Deals Today" },
                      })
                    }
                  >
                    <Text style={s.seeAll}>View all →</Text>
                  </TouchableOpacity>
                </View>
                <View style={s.countdownRow}>
                  <Text style={s.countdownLabel}>Offer ends in</Text>
                  <View style={s.countdown}>
                    <Text style={s.countNum}>{pad2(timeLeft.h)}</Text>
                    <Text style={s.countSep}>:</Text>
                    <Text style={s.countNum}>{pad2(timeLeft.m)}</Text>
                    <Text style={s.countSep}>:</Text>
                    <Text style={s.countNum}>{pad2(timeLeft.s)}</Text>
                  </View>
                </View>
              </View>
            </View>
            <FlatList
              data={dealProducts}
              horizontal
              showsHorizontalScrollIndicator={false}
              pagingEnabled
              snapToInterval={DEAL_CARD_W}
              decelerationRate="fast"
              keyExtractor={(item) => item._id}
              contentContainerStyle={s.dealListContent}
              renderItem={({ item }) => <DealCard item={item} onAdd={() => handleAddToCart(item)} />}
            />
          </View>
        )}

        {/* ── SHOP BY CATEGORY ─────────────────────────────────────────────── */}
        {!isFiltering && homeCategories.length > 0 && (
          <View style={s.section}>
            <SectionHeader
              title="Shop by Category"
              onSeeAll={() => router.push("/categories")}
            />
            <FlatList
              horizontal
              data={homeCategories}
              keyExtractor={(c) => c._id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
              renderItem={({ item, index }) => {
                const qa = QUICK_ACTIONS[index % QUICK_ACTIONS.length];
                const selected = selectedCatId === item._id;
                return (
                  <TouchableOpacity
                    style={[s.catCard, selected && s.catCardSelected]}
                    activeOpacity={0.75}
                    onPress={() => { setSelectedCatId(item._id); setSearchQuery(""); }}
                  >
                    <View style={[s.catIconWrap, { backgroundColor: qa.bg }]}>
                      {item.image
                        ? <Image source={{ uri: item.image }} style={s.catImg} />
                        : <Ionicons name={qa.icon as any} size={22} color={qa.color} />
                      }
                    </View>
                    <Text style={[s.catName, selected && { color: "#2E7D32" }]} numberOfLines={2}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        )}

        {/* ── TRENDING NOW ─────────────────────────────────────────────────── */}
        {!isFiltering && trendingProducts.length > 0 && (
          <View style={s.section}>
            <SectionHeader
              title={<View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><Text style={s.secTitle}>Trending Now</Text><Text style={{ fontSize: 16 }}>📈</Text></View>}
              onSeeAll={() => router.push({ pathname: "/all-products", params: { type: "trending", title: "Trending Now" } })}
            />
            <View style={s.productsGrid}>
              {trendingProducts.map((item) => {
                const v = getDefaultVariant(item);
                const inCart = !!items.find((i) => i.productId === item._id && i.variantId === v._id);
                return (
                  <ProductCard
                    key={item._id}
                    item={item}
                    onAdd={() => handleAddToCart(item)}
                    inCart={inCart}
                    onPress={() => router.push({ pathname: "/product-detail", params: { id: item._id } })}
                    showTrendingBadge
                  />
                );
              })}
            </View>
          </View>
        )}

        {/* ── ALL PRODUCTS / SEARCH / CATEGORY ──────────────────────────── */}
        <View style={s.section}>
          <SectionHeader
            title={
              <Text style={s.secTitle}>
                {searchQuery ? `"${searchQuery}"` : selectedCatId ? selectedCatName() : "All Products"}
              </Text>
            }
            onSeeAll={!isFiltering ? () => router.push({ pathname: "/all-products", params: { type: "popular", title: "All Products" } }) : undefined}
          />
          {loading ? (
            <View style={s.productsGrid}>
              {[1, 2, 3, 4].map((i) => <ProductSkeleton key={i} />)}
            </View>
          ) : filteredProducts.length > 0 ? (
            <View style={s.productsGrid}>
              {filteredProducts.map((item) => {
                const v = getDefaultVariant(item);
                const inCart = !!items.find((i) => i.productId === item._id && i.variantId === v._id);
                return (
                  <ProductCard
                    key={item._id}
                    item={item}
                    onAdd={() => handleAddToCart(item)}
                    inCart={inCart}
                    onPress={() => router.push({ pathname: "/product-detail", params: { id: item._id } })}
                  />
                );
              })}
            </View>
          ) : selectedCatId ? (
            <EmptyCategoryState categoryName={selectedCatName()} onClear={() => setSelectedCatId(null)} />
          ) : (
            <View style={s.emptyState}>
              <Ionicons name="search-outline" size={56} color="#D1D5DB" />
              <Text style={s.emptyText}>No products found</Text>
              <Text style={s.emptySub}>Try a different search term</Text>
            </View>
          )}
        </View>

        {/* ── FEATURED ────────────────────────────────────────────────────── */}
        {!isFiltering && featuredProducts.length > 0 && (
          <View style={s.section}>
            <SectionHeader
              title={<View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><Text style={s.secTitle}>Featured</Text><Ionicons name="star" size={16} color="#FBBF24" /></View>}
              onSeeAll={() => router.push({ pathname: "/all-products", params: { type: "featured", title: "Featured Products" } })}
            />
            <FlatList
              data={featuredProducts}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item._id}
              contentContainerStyle={{ paddingLeft: 16, paddingRight: 8, gap: 12, paddingVertical: 8 }}
              style={{ overflow: "visible" }}
              renderItem={({ item }) => <FeaturedCard item={item} onAdd={() => handleAddToCart(item)} />}
            />
          </View>
        )}

        {/* ── FRESH PICKS STRIP ──────────────────────────────────────────── */}

        <View style={{ height: 110 }} />
      </Animated.ScrollView>

      {/* ── CART FOOTER ──────────────────────────────────────────────────── */}
      <Animated.View
        style={[s.cartFooter, { transform: [{ translateY: cartTranslateY }] }]}
        pointerEvents={items.length > 0 ? "auto" : "none"}
      >
        <TouchableOpacity style={s.cartFooterInner} onPress={() => router.push("/cart")} activeOpacity={0.92}>
          <View style={s.cartFooterLeft}>
            <View style={s.cartIconCircle}>
              <Ionicons name="cart" size={19} color="#fff" />
            </View>
            <View>
              <Text style={s.cartFooterItems}>{getCartItemCount()} item{getCartItemCount() !== 1 ? "s" : ""}</Text>
              <Text style={s.cartFooterTotal}>₹{total.toFixed(2)}</Text>
            </View>
          </View>
          <View style={s.cartFooterRight}>
            <Text style={s.cartFooterBtn}>View Cart</Text>
            <Ionicons name="arrow-forward" size={17} color="#fff" />
          </View>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8FAF5" },
  scrollContent: {},
  loadingScreen: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F8FAF5" },

  // HEADER
  headerFixed: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    backgroundColor: "#F8FAF5",
  },
  headerWrap: {
    backgroundColor: "#F8FAF5",
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 4, paddingBottom: 10 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 0 },
  headerLogo: { width: 40, height: 40, resizeMode: "contain" },
  brandTagline: { fontSize: 13, fontWeight: "800", color: "#14532D" },
  brandSubTagline: { fontSize: 11, color: "#6B7280", marginTop: 2 },
  deliverLabel: { fontSize: 11, color: "#6B7280", fontWeight: "500", marginBottom: 2 },
  addressRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  addressText: { fontSize: 15, fontWeight: "800", color: "#1B5E20", maxWidth: width * 0.5 },
  headerIcons: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconBtn: {
    position: "relative", padding: 7, backgroundColor: "#fff", borderRadius: 12,
    elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3,
  },
  notifDot: { position: "absolute", top: 5, right: 5, width: 7, height: 7, borderRadius: 4, backgroundColor: "#EF4444", borderWidth: 1.5, borderColor: "#fff" },
  cartBadge: { position: "absolute", top: 0, right: 0, backgroundColor: "#2E7D32", borderRadius: 10, minWidth: 17, height: 17, justifyContent: "center", alignItems: "center", paddingHorizontal: 3 },
  cartBadgeText: { color: "#fff", fontSize: 9, fontWeight: "800" },

  // SEARCH
  searchBox: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 13, marginHorizontal: 16, marginBottom: 14,
    elevation: 3, shadowColor: "#2E7D32", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6,
    borderWidth: 1.5, borderColor: "#C8E6C9", gap: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#1F2937" },
  filterPill: { backgroundColor: "#E8F5E9", borderRadius: 8, padding: 6 },
  voicePill: {
    backgroundColor: "#E8F5E9",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  voicePillActive: {
    backgroundColor: "#2E7D32",
  },

  // FILTER CHIP
  filterChipRow: { paddingHorizontal: 16, marginBottom: 12 },
  filterChip: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", backgroundColor: "#E8F5E9", borderRadius: 24, paddingHorizontal: 12, paddingVertical: 8, gap: 6, borderWidth: 1, borderColor: "#C8E6C9" },
  filterChipText: { color: "#2E7D32", fontSize: 13, fontWeight: "700" },

  // BANNER
  bannerSection: { marginBottom: 16, marginHorizontal: 0, paddingHorizontal: 0, marginTop: 0 },
  bannerList: { marginBottom: 10, paddingHorizontal: 0 },
  bannerSlide: { borderRadius: 20, overflow: "hidden", width: "100%", marginHorizontal: 16 },
  bannerImg: { width: "100%", height: 180, resizeMode: "cover", borderRadius: 20 },
  bannerDots: { flexDirection: "row", justifyContent: "center", gap: 5, marginTop: 8 },
  dot: { height: 5, width: 5, borderRadius: 3, backgroundColor: "#C8E6C9" },
  dotActive: { width: 18, backgroundColor: "#2E7D32" },

  // FEATURE BADGES
  featBadgesRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 12, marginBottom: 22, gap: 6 },
  featBadge: { flex: 1, backgroundColor: "#fff", borderRadius: 14, padding: 10, alignItems: "center", elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, borderWidth: 1, borderColor: "#F0FFF0" },
  featIconCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center", marginBottom: 6 },
  featBadgeTitle: { fontSize: 10, fontWeight: "800", color: "#1B5E20", textAlign: "center", lineHeight: 14 },
  featBadgeSub: { fontSize: 9, color: "#6B7280", textAlign: "center", marginTop: 1 },

  // SECTION
  section: { marginBottom: 24, marginHorizontal: 0, paddingHorizontal: 0 },
  dealSection: { marginBottom: 24, marginHorizontal: 16, backgroundColor: "#FEF3E2", paddingVertical: 14, paddingHorizontal: 12, borderRadius: 16 },
  secHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, marginBottom: 12 },
  secTitle: { fontSize: 17, fontWeight: "900", color: "#1B5E20" },
  seeAll: { fontSize: 13, color: "#2E7D32", fontWeight: "700" },
  dealHeaderTopRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dealViewAllBtn: { marginLeft: "auto" },

  // COUNTDOWN
  countdownRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  countdownLabel: { fontSize: 12, color: "#6B7280", fontWeight: "700" },
  countdown: { flexDirection: "row", alignItems: "center", gap: 0, backgroundColor: "#FFE0E0", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  countNum: { fontSize: 14, fontWeight: "900", color: "#DC2626", minWidth: 20, textAlign: "center" },
  countSep: { fontSize: 14, fontWeight: "900", color: "#DC2626", marginHorizontal: 2, textAlign: "center" },

  // DEAL CARD
  dealListContent: { paddingRight: 0 },
  dealCard: {
    backgroundColor: "#fff", borderRadius: 14, elevation: 3, flexDirection: "row",
    shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 6,
    borderWidth: 1, borderColor: "#F0F0F0", overflow: "hidden", minHeight: 112,
  },
  dealImgZone: { width: 96, minHeight: 112, backgroundColor: "#FAFAF8", alignItems: "center", justifyContent: "center", position: "relative" },
  dealBadge: { position: "absolute", top: 6, right: 6, backgroundColor: "#EF4444", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, zIndex: 10, elevation: 5 },
  badgeTxt: { color: "#fff", fontSize: 9, fontWeight: "800", letterSpacing: 0.3 },
  dealImg: { width: 78, height: 78, resizeMode: "contain", zIndex: 1 },
  dealInfo: { flex: 1, paddingHorizontal: 12, paddingVertical: 14, justifyContent: "center" },
  dealName: { fontSize: 12, fontWeight: "800", color: "#1F2937", marginBottom: 7, lineHeight: 16 },
  dealUnit: { fontSize: 11, color: "#6B7280", fontWeight: "600", marginBottom: 9 },
  dealFooter: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  dealPrice: { fontSize: 14, fontWeight: "900", color: "#1B5E20" },
  strikePrice: { fontSize: 10, color: "#D1D5DB", textDecorationLine: "line-through", marginTop: 2 },
  roundAddBtn: { backgroundColor: "#2E7D32", width: 28, height: 28, borderRadius: 8, justifyContent: "center", alignItems: "center", flexShrink: 0, elevation: 3 },

  // CATEGORY
  catCard: {
    backgroundColor: "#fff", width: 82, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 6,
    alignItems: "center", elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07, shadowRadius: 4, borderWidth: 1.5, borderColor: "transparent",
  },
  catCardSelected: { borderColor: "#2E7D32", backgroundColor: "#F5F7F2" },
  catIconWrap: { width: 48, height: 48, borderRadius: 24, justifyContent: "center", alignItems: "center", marginBottom: 8, overflow: "hidden" },
  catImg: { width: "100%", height: "100%", resizeMode: "cover" },
  catName: { fontSize: 11, fontWeight: "700", color: "#374151", textAlign: "center", lineHeight: 15 },

  // PRODUCTS GRID
  productsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", paddingHorizontal: 16, gap: 10 },

  // PRODUCT CARD
  prodCard: {
    backgroundColor: "#fff", borderRadius: 16, elevation: 2,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6,
    borderWidth: 1, borderColor: "#F3F4F6", overflow: "hidden",
  },
  prodImgZone: { backgroundColor: "#F5F7F2", height: 110, justifyContent: "center", alignItems: "center", position: "relative" },
  prodImg: { width: "75%", height: 80, resizeMode: "contain" },
  trendBadge: { position: "absolute", top: 8, left: 8, backgroundColor: "#3B82F6", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  offBadge: { position: "absolute", top: 8, right: 8, backgroundColor: "#EF4444", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  prodBadgeTxt: { color: "#fff", fontSize: 8, fontWeight: "800", letterSpacing: 0.3 },
  prodName: { fontSize: 13, fontWeight: "700", color: "#1F2937", minHeight: 34, paddingHorizontal: 10, paddingTop: 8, lineHeight: 18 },
  prodUnit: { fontSize: 11, color: "#9CA3AF", fontWeight: "600", marginTop: 2, marginBottom: 8, paddingHorizontal: 10 },
  prodFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 10, paddingBottom: 10 },
  prodPrice: { fontSize: 15, fontWeight: "800", color: "#2E7D32" },
  addBtn: { borderWidth: 1.5, borderColor: "#2E7D32", borderRadius: 10, width: 52, height: 32, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  addBtnActive: { backgroundColor: "#2E7D32", borderColor: "#2E7D32" },
  addBtnText: { color: "#2E7D32", fontWeight: "800", fontSize: 11 },

  // FEATURED CARD
  featCard: {
    backgroundColor: "#fff", borderRadius: 16, elevation: 2,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6,
    borderWidth: 1, borderColor: "#F3F4F6", overflow: "hidden",
  },
  featImgZone: { height: 110, backgroundColor: "#F8FBF5", alignItems: "center", justifyContent: "center", position: "relative" },
  starBadge: { position: "absolute", top: 8, right: 8, backgroundColor: "#FBBF24", borderRadius: 7, width: 26, height: 26, justifyContent: "center", alignItems: "center", zIndex: 10 },
  featImg: { width: 80, height: 80, resizeMode: "contain" },
  featContent: { padding: 10 },
  featName: { fontSize: 12, fontWeight: "700", color: "#1F2937", minHeight: 32, marginBottom: 3, lineHeight: 16 },
  featUnit: { fontSize: 10, color: "#9CA3AF", fontWeight: "600", marginBottom: 8 },
  featFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  featPrice: { fontSize: 14, fontWeight: "800", color: "#2E7D32", flex: 1 },
  featAddBtn: { backgroundColor: "#2E7D32", width: 28, height: 28, borderRadius: 8, flexShrink: 0, justifyContent: "center", alignItems: "center" },

  // FRESH STRIP
  // EMPTY STATES
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 48 },
  emptyText: { fontSize: 17, fontWeight: "700", color: "#6B7280", marginTop: 14 },
  emptySub: { fontSize: 13, color: "#9CA3AF", marginTop: 6 },
  emptyCategory: { alignItems: "center", paddingVertical: 40, paddingHorizontal: 24 },
  emptyCategoryIcon: { width: 100, height: 100, borderRadius: 50, backgroundColor: "#F5F7F2", justifyContent: "center", alignItems: "center", marginBottom: 16, borderWidth: 2, borderColor: "#C8E6C9" },
  emptyCategoryTitle: { fontSize: 18, fontWeight: "800", color: "#1B5E20", textAlign: "center", marginBottom: 8 },
  emptyCategoryText: { fontSize: 13, color: "#6B7280", textAlign: "center", lineHeight: 20, marginBottom: 24 },
  emptyCategoryBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#2E7D32", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14 },
  emptyCategoryBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  // SKELETON
  skelImg: { width: "100%", height: 100, backgroundColor: "#E5E7EB" },
  skelLine: { height: 11, backgroundColor: "#E5E7EB", borderRadius: 4, marginHorizontal: 10, marginBottom: 6 },

  // CART FOOTER
  cartFooter: { position: "absolute", bottom: 12, left: 16, right: 16 },
  cartFooterInner: { backgroundColor: "#2E7D32", borderRadius: 18, padding: 15, flexDirection: "row", justifyContent: "space-between", alignItems: "center", elevation: 10, shadowColor: "#2E7D32", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12 },
  cartFooterLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  cartIconCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  cartFooterItems: { color: "#C8E6C9", fontSize: 11, fontWeight: "600" },
  cartFooterTotal: { color: "#fff", fontSize: 17, fontWeight: "800" },
  cartFooterRight: { flexDirection: "row", alignItems: "center", gap: 5 },
  cartFooterBtn: { color: "#fff", fontSize: 14, fontWeight: "700" },

  // GUEST BANNER
  guestBanner: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#fff", marginHorizontal: 16, marginBottom: 10, paddingVertical: 11, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1.5, borderColor: "#C8E6C9", shadowColor: "#2E7D32", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  guestLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  guestIconWrap: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#E8F5E9", alignItems: "center", justifyContent: "center" },
  guestTitle: { fontSize: 13, fontWeight: "700", color: "#1A1A1A" },
  guestSub: { fontSize: 11, color: "#9CA3AF", fontWeight: "500", marginTop: 1 },
  guestRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  guestLoginBtn: { backgroundColor: "#2E7D32", paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  guestLoginText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  guestDismiss: { width: 26, height: 26, borderRadius: 13, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" },
});
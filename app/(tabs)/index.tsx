import { startTransition , useCallback, useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { showAlert } from "@/context/CustomAlertContext";
import { router, useFocusEffect } from "expo-router";
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
import {
  formatOfferCountdownShort,
  offerDeadlineToFutureMs,
  remainingMsToCountdownDHMS,
} from "../../utils/offerEnd";
import { C, themed } from "@/constants/theme";

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
const HORIZONTAL_CARD_W = Math.min((width - 44) / 2, 190);
const TRENDING_CARD_W = Math.min(width * 0.41, 180);
const DEAL_CARD_W = width - 56;

// ─── Fallbacks ────────────────────────────────────────────────────────────────
// Built lazily so they pick up the colour theme loaded at startup.
const getFallbackBanners = () => [
  {
    id: "b1",
    title: "Farm Fresh\nDelivered",
    subtitle: "Handpicked produce from\ntrusted local farms.",
    ctaText: "Shop Now",
    ctaColor: C.primary,
    bg: C.soft,
    badgeText: "100%\nNATURAL",
    image: "https://images.unsplash.com/photo-1543168256-418811576931?w=400&q=80",
  },
  {
    id: "b2",
    title: "Today's\nBest Deals",
    subtitle: "Up to 30% off on\nseasonal fruits & veggies.",
    ctaText: "Grab Deals",
    ctaColor: C.primary,
    bg: C.soft,
    badgeText: "UP TO\n30% OFF",
    image: "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=400&q=80",
  },
  {
    id: "b3",
    title: "Dairy &\nOrganic",
    subtitle: "Fresh from local farms,\ndelivered daily.",
    ctaText: "Order Now",
    ctaColor: C.primary,
    bg: C.soft,
    badgeText: "FRESH\nDAILY",
    image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&q=80",
  },
];

const getFeatures = () => [
  { icon: "leaf-outline", label: "100% Natural", sub: "Chemical free", color: C.primary, bg: C.soft },
  { icon: "home-outline", label: "From Local\nFarms", sub: "Support local", color: C.primary, bg: C.soft },
  { icon: "flash-outline", label: "Fast Delivery", sub: "At your door", color: C.primary, bg: C.soft },
  { icon: "shield-checkmark-outline", label: "Secure\nPayment", sub: "Safe & easy", color: C.primary, bg: C.soft },
];

const getQuickActions = () => [
  { color: C.primary, bg: C.soft, icon: "leaf" },
  { color: C.primary, bg: C.soft, icon: "nutrition" },
  { color: C.primary, bg: C.soft, icon: "ice-cream" },
  { color: C.primary, bg: C.soft, icon: "basket-outline" },
  { color: C.primary, bg: C.soft, icon: "cafe-outline" },
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
  /** ISO date string from API — per-product offer deadline */
  offerEndsAt?: string | null;
  rating: number;
  reviewsCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type HomeSectionLayout = {
  showHeroBanner: boolean;
  showFeatureBadgesRow: boolean;
  showBestDealsSection: boolean;
  showShopByCategorySection: boolean;
  showTrendingSection: boolean;
  showFeaturedSection: boolean;
};

function resolveProductOwnOfferEndMs(product: Product): number | null {
  return offerDeadlineToFutureMs(product.offerEndsAt);
}

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
  const [slide] = useState(() => new Animated.Value(-70));
  const [fade] = useState(() => new Animated.Value(0));

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
          <Ionicons name="person-outline" size={16} color={C.ink} />
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
          <Ionicons name="close" size={15} color={C.muted} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function ProductSkeleton() {
  const [anim] = useState(() => new Animated.Value(0));
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
function BannerSlide({ item }: { item: ReturnType<typeof getFallbackBanners>[0] }) {
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

function OfferEndsCountdown({ endMs }: { endMs: number }) {
  const [line, setLine] = useState("");
  const [visible, setVisible] = useState(
    () => Number.isFinite(endMs) && endMs > Date.now(),
  );

  useEffect(() => {
    startTransition(() => { setVisible(Number.isFinite(endMs) && endMs > Date.now()); });
  }, [endMs]);

  useEffect(() => {
    if (!visible) return;
    const tick = () => {
      const remainingMs = endMs - Date.now();
      if (remainingMs <= 0) {
        setVisible(false);
        setLine("");
        return;
      }
      setLine(formatOfferCountdownShort(remainingMs));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endMs, visible]);

  if (!visible) return null;

  return (
    <Text style={s.dealCardTimer}>
      Ends in {line}
    </Text>
  );
}

// ─── Deal Card ────────────────────────────────────────────────────────────────
function DealCard({
  item,
  onAdd,
  inCart,
  offerEndMs,
}: {
  item: Product;
  onAdd: () => void;
  inCart: boolean;
  offerEndMs: number | null;
}) {
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
        {offerEndMs != null && <OfferEndsCountdown endMs={offerEndMs} />}
        <View style={s.dealFooter}>
          <View style={{ flex: 1, marginRight: 6 }}>
            <Text style={s.dealPrice}>₹{v.price.toFixed(2)}</Text>
            {disc > 0 && <Text style={s.strikePrice}>₹{v.mrp.toFixed(2)}</Text>}
          </View>
          <TouchableOpacity style={[s.addBtn, inCart && s.addBtnActive]} hitSlop={{ top: 6, bottom: 6, left: 0, right: 0 }} accessibilityLabel={inCart ? `${item.name} added to cart` : `Add ${item.name} to cart`} onPress={(e) => { e.stopPropagation(); if (!inCart) onAdd(); }} activeOpacity={0.8}>
            {inCart ? <Ionicons name="checkmark" size={16} color="#fff" /> : <Text style={s.addBtnText}>ADD</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Featured Card ────────────────────────────────────────────────────────────
function FeaturedCard({ item, onAdd, inCart }: { item: Product; onAdd: () => void; inCart: boolean }) {
  const v = getDefaultVariant(item);
  return (
    <TouchableOpacity
      style={[s.featCard, { width: HORIZONTAL_CARD_W }]}
      activeOpacity={0.85}
      onPress={() => router.push({ pathname: "/product-detail", params: { id: item._id } })}
    >
      <View style={s.featImgZone}>
        <Image source={{ uri: item.image || "https://via.placeholder.com/150" }} style={s.featImg} />
      </View>
      <View style={s.featContent}>
        <Text numberOfLines={2} style={s.featName}>{item.name}</Text>
        <Text style={s.featUnit}>{v.packSize}{v.packUnit}</Text>
        <View style={s.featFooter}>
          <Text style={s.featPrice}>₹{v.price.toFixed(2)}</Text>
          <TouchableOpacity style={[s.addBtn, inCart && s.addBtnActive]} hitSlop={{ top: 6, bottom: 6, left: 0, right: 0 }} accessibilityLabel={inCart ? `${item.name} added to cart` : `Add ${item.name} to cart`} onPress={(e) => { e.stopPropagation(); if (!inCart) onAdd(); }} activeOpacity={0.8}>
            {inCart ? <Ionicons name="checkmark" size={16} color="#fff" /> : <Text style={s.addBtnText}>ADD</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Product Card ─────────────────────────────────────────────────────────────
function ProductCard({
  item, onAdd, inCart, onPress, showTrendingBadge = false, compact = false,
}: {
  item: Product; onAdd: () => void; inCart: boolean; onPress: () => void; showTrendingBadge?: boolean; compact?: boolean;
}) {
  const [scale] = useState(() => new Animated.Value(1));
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
    <Animated.View style={[s.prodCard, compact && s.trendingCard, { transform: [{ scale }], width: compact ? TRENDING_CARD_W : CARD_WIDTH }]}>
      <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={{ flex: 1 }}>
        <View style={[s.prodImgZone, compact && s.trendingImgZone]}>
          <Image source={{ uri: item.image || "https://via.placeholder.com/150" }} style={s.prodImg} />
          {showTrendingBadge && (
            <View style={s.trendBadge}><Ionicons name="trending-up" size={14} color={C.badgeText} /></View>
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
            hitSlop={{ top: 6, bottom: 6, left: 0, right: 0 }} accessibilityLabel={inCart ? `${item.name} added to cart` : `Add ${item.name} to cart`}
            style={[s.addBtn, inCart && s.addBtnActive, isAdding && { opacity: 0.6 }]}
            onPress={(e) => { e.stopPropagation(); if (!inCart) handleAdd(); }}
            disabled={isAdding}
            activeOpacity={0.8}
          >
            {isAdding ? (
              <ActivityIndicator size="small" color={C.primary} />
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
  const { loading: authLoading, user } = useAuth();
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
  const [campaignEndTs, setCampaignEndTs] = useState<number | null>(null);
  const [campaignTimeLeft, setCampaignTimeLeft] = useState({
    d: 0,
    h: 0,
    m: 0,
    s: 0,
  });
  const [homeLayout, setHomeLayout] = useState<HomeSectionLayout>({
    showHeroBanner: true,
    showFeatureBadgesRow: true,
    showBestDealsSection: true,
    showShopByCategorySection: true,
    showTrendingSection: true,
    showFeaturedSection: true,
  });

  const [notifUnread, setNotifUnread] = useState(0);

  const [scrollY] = useState(() => new Animated.Value(0));
  const [cartAnim] = useState(() => new Animated.Value(0));
  const [searchAnim] = useState(() => new Animated.Value(0));
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

  useFocusEffect(
    useCallback(() => {
      if (!user?._id) {
        setNotifUnread(0);
        return;
      }
      let cancelled = false;
      (async () => {
        try {
          const { data } = await API.get("/notifications", {
            params: { userId: user._id, limit: 100 },
          });
          if (!cancelled) setNotifUnread(Number(data.unreadCount) || 0);
        } catch {
          if (!cancelled) setNotifUnread(0);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [user]),
  );

  // Banner slides — use dynamic banners if available, else fallback banners
  const FALLBACK_BANNERS = getFallbackBanners();
  const QUICK_ACTIONS = getQuickActions();
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
      const [prodRes, catRes, bannerRes, dealRes, homeRes] = await Promise.all([
        API.get("/products"),
        API.get("/categories"),
        API.get("/banners"),
        API.get("/deal-settings"),
        API.get("/home-section-settings").catch(() => ({ data: { data: null } })),
      ]);
      const fetched = prodRes.data.data || prodRes.data || [];
      setAllProducts(fetched);
      setProducts(fetched.slice(0, 20));
      setCategories(catRes.data.data || []);
      setHomeBanners(bannerRes.data.data || []);
      const ds = dealRes.data?.data;
      if (ds?.isActive && ds?.dealEndsAt) {
        const ts = new Date(ds.dealEndsAt).getTime();
        setCampaignEndTs(Number.isFinite(ts) && ts > Date.now() ? ts : null);
      } else {
        setCampaignEndTs(null);
      }
      const hs = homeRes.data?.data;
      if (hs) {
        setHomeLayout({
          showHeroBanner: hs.showHeroBanner !== false,
          showFeatureBadgesRow: hs.showFeatureBadgesRow !== false,
          showBestDealsSection: hs.showBestDealsSection !== false,
          showShopByCategorySection: hs.showShopByCategorySection !== false,
          showTrendingSection: hs.showTrendingSection !== false,
          showFeaturedSection: hs.showFeaturedSection !== false,
        });
      }
    } catch {
      setAllProducts([]); setProducts([]); setCategories([]); setHomeBanners([]);
      setCampaignEndTs(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { if (!authLoading) startTransition(() => { loadAll(); }); }, [authLoading]);

  const onRefresh = () => { if (refreshing) return; setRefreshing(true); void loadAll(); };

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
    if (!campaignEndTs) {
      startTransition(() => { setCampaignTimeLeft({ d: 0, h: 0, m: 0, s: 0 }); });
      return;
    }
    const tick = () => {
      const remainingMs = campaignEndTs - Date.now();
      if (remainingMs <= 0) {
        setCampaignTimeLeft({ d: 0, h: 0, m: 0, s: 0 });
        setCampaignEndTs(null);
        return;
      }
      setCampaignTimeLeft(remainingMsToCountdownDHMS(remainingMs));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [campaignEndTs]);

  useEffect(() => {
    const timer = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % SEARCH_PLACEHOLDERS.length);
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  if (authLoading) {
    return <View style={s.loadingScreen}><ActivityIndicator size="large" color={C.primary} /></View>;
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

  const cartTranslateY = cartAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0], extrapolate: "clamp" });
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

    try {
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
    } catch {
      setIsListening(false);
      showAlert("Voice search", "Could not start voice search. Please type your search instead.");
    }
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
                <TouchableOpacity
                  style={s.addressRow}
                  onPress={() => router.push("/my-addresses")}
                  activeOpacity={0.85}
                >
                  <Text style={s.addressText} numberOfLines={1}>
                    {defaultAddress ? `${defaultAddress.name} · ${defaultAddress.city}` : "Add delivery address"}
                  </Text>
                  <Ionicons name="chevron-down" size={15} color={C.ink} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
          <View style={s.headerIcons}>
            <TouchableOpacity
              style={s.iconBtn}
              onPress={() => router.push("/notifications")}
              activeOpacity={0.85}
            >
              <Ionicons name="notifications-outline" size={22} color={C.ink} />
              {notifUnread > 0 && <View style={s.notifDot} />}
            </TouchableOpacity>
            <TouchableOpacity style={s.iconBtn} onPress={() => router.push("/cart")}>
              <Ionicons name="cart-outline" size={24} color={C.ink} />
              {getCartItemCount() > 0 && (
                <View style={s.cartBadge}><Text style={s.cartBadgeText}>{getCartItemCount()}</Text></View>
              )}
            </TouchableOpacity>
          </View>
          </View>
        </View>
      </Animated.View>

      <Animated.ScrollView
        alwaysBounceVertical
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl progressViewOffset={insets.top + 70} refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} tintColor={C.primary} />}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
        contentContainerStyle={[s.scrollContent, { paddingTop: insets.top + 60 }]}
      >
        <GuestBanner />

        {/* ── SEARCH ─────────────────────────────────────────────────────── */}
        <Animated.View style={[s.searchBox, { transform: [{ scale: searchScale }] }]}>
          <Ionicons name="search" size={16} color={C.muted} style={{ marginLeft: 2, marginRight: 8 }} />
          <TextInput
            placeholder={SEARCH_PLACEHOLDERS[placeholderIndex]}
            placeholderTextColor={C.muted}
            style={s.searchInput}
            value={searchQuery}
            onChangeText={(t) => { setSearchQuery(t); setSelectedCatId(null); }}
            onFocus={() => Animated.spring(searchAnim, { toValue: 1, useNativeDriver: true }).start()}
            onBlur={() => Animated.spring(searchAnim, { toValue: 0, useNativeDriver: true }).start()}
            returnKeyType="search"
            onSubmitEditing={() =>
              router.push({ pathname: "/search", params: { q: searchQuery.trim() } })
            }
          />
          <TouchableOpacity
            style={[s.voicePill, isListening && s.voicePillActive]}
            onPress={handleVoiceSearch}
            activeOpacity={0.85}
          >
            <Ionicons
              name={isListening ? "mic" : "mic-outline"}
              size={16}
              color={isListening ? "#fff" : C.ink}
            />
          </TouchableOpacity>
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color={C.muted} />
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* ── ACTIVE FILTER CHIP ──────────────────────────────────────────── */}
        {selectedCatId && (
          <View style={s.filterChipRow}>
            <View style={s.filterChip}>
              <Ionicons name="pricetag-outline" size={13} color={C.ink} />
              <Text style={s.filterChipText}>{selectedCatName()}</Text>
              <TouchableOpacity onPress={() => setSelectedCatId(null)} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color={C.ink} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── HERO BANNER ─────────────────────────────────────────────────── */}
        {!isFiltering && homeLayout.showHeroBanner && (
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
        {!isFiltering && homeLayout.showFeatureBadgesRow && (
          <View style={s.featBadgesRow}>
            {getFeatures().map((f, i) => (
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

        {/* ── SHOP BY CATEGORY ─────────────────────────────────────────────── */}
        {!isFiltering && homeLayout.showShopByCategorySection && homeCategories.length > 0 && (
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
              contentContainerStyle={{ paddingHorizontal: 16, gap: 10, paddingVertical: 8 }}
              renderItem={({ item, index }) => {
                const qa = QUICK_ACTIONS[index % QUICK_ACTIONS.length];
                const selected = selectedCatId === item._id;
                return (
                  <TouchableOpacity
                    style={[s.catCard, selected && s.catCardSelected]}
                    activeOpacity={0.75}
                    onPress={() => { setSelectedCatId(item._id); setSearchQuery(""); }}
                  >
                    <View style={[s.catIconWrap, { backgroundColor: item.image ? C.card : qa.bg }]}>
                      {item.image
                        ? <Image source={{ uri: item.image }} style={s.catImg} />
                        : <Ionicons name={qa.icon as any} size={22} color={qa.color} />
                      }
                    </View>
                    <Text style={[s.catName, selected && { color: C.primary }]} numberOfLines={2}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        )}

        {/* ── TODAY'S DEALS ────────────────────────────────────────────────── */}
        {!isFiltering && homeLayout.showBestDealsSection && dealProducts.length > 0 && (
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
                {campaignEndTs != null && (
                  <View style={s.countdownRow}>
                    <Text style={s.countdownLabel}>Sale ends in</Text>
                    <View style={s.countdown}>
                      {campaignTimeLeft.d > 0 && (
                        <>
                          <Text style={s.countNum}>{campaignTimeLeft.d}d</Text>
                          <Text style={s.countSep}> </Text>
                        </>
                      )}
                      <Text style={s.countNum}>{pad2(campaignTimeLeft.h)}</Text>
                      <Text style={s.countSep}>:</Text>
                      <Text style={s.countNum}>{pad2(campaignTimeLeft.m)}</Text>
                      <Text style={s.countSep}>:</Text>
                      <Text style={s.countNum}>{pad2(campaignTimeLeft.s)}</Text>
                    </View>
                  </View>
                )}
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
              renderItem={({ item }) => (
                <DealCard
                  item={item}
                  onAdd={() => handleAddToCart(item)}
                  inCart={items.some((i) => i.productId === item._id && i.variantId === getDefaultVariant(item)._id)}
                  offerEndMs={resolveProductOwnOfferEndMs(item)}
                />
              )}
            />
          </View>
        )}

        {/* ── TRENDING NOW ─────────────────────────────────────────────────── */}
        {!isFiltering && homeLayout.showTrendingSection && trendingProducts.length > 0 && (
          <View style={s.section}>
            <SectionHeader
              title={<View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><Text style={s.secTitle}>Trending Now</Text><Text style={{ fontSize: 16 }}>📈</Text></View>}
              onSeeAll={() => router.push({ pathname: "/all-products", params: { type: "trending", title: "Trending Now" } })}
            />
            <FlatList
              horizontal
              data={trendingProducts}
              keyExtractor={(item) => item._id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.carouselContent}
              renderItem={({ item }) => {
                const v = getDefaultVariant(item);
                const inCart = !!items.find((i) => i.productId === item._id && i.variantId === v._id);
                return (
                  <ProductCard
                    key={item._id}
                    item={item}
                    onAdd={() => handleAddToCart(item)}
                    inCart={inCart}
                    onPress={() => router.push({ pathname: "/product-detail", params: { id: item._id } })}
                    compact
                    showTrendingBadge
                  />
                );
              }}
            />
          </View>
        )}

        {/* ── FEATURED ────────────────────────────────────────────────────── */}
        {!isFiltering && homeLayout.showFeaturedSection && featuredProducts.length > 0 && (
          <View style={s.section}>
            <SectionHeader
              title="Featured Products"
              onSeeAll={() => router.push({ pathname: "/all-products", params: { type: "featured", title: "Featured Products" } })}
            />
            <FlatList
              data={featuredProducts.slice(0, 4)}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item._id}
              contentContainerStyle={{ paddingLeft: 16, paddingRight: 8, gap: 12, paddingVertical: 8 }}
              style={{ overflow: "visible" }}
              renderItem={({ item }) => <FeaturedCard item={item} inCart={items.some((i) => i.productId === item._id && i.variantId === getDefaultVariant(item)._id)} onAdd={() => handleAddToCart(item)} />}
            />
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
              {(isFiltering ? filteredProducts : filteredProducts.slice(0, 12)).map((item) => {
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

        {/* ── FRESH PICKS STRIP ──────────────────────────────────────────── */}

        <View style={{ height: 110 }} />
      </Animated.ScrollView>

      {/* ── CART FOOTER ──────────────────────────────────────────────────── */}
      {items.length > 0 && (
      <Animated.View
        style={[s.cartFooter, { bottom: Math.max(insets.bottom, 12) + 84, opacity: cartAnim, transform: [{ translateY: cartTranslateY }] }]}
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
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = themed(() => StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.page },
  scrollContent: {},
  loadingScreen: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.page },

  // HEADER
  headerFixed: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    backgroundColor: C.page,
  },
  headerWrap: {
    backgroundColor: C.page,
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 4, paddingBottom: 10 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 0 },
  headerLogo: { width: 40, height: 40, resizeMode: "contain" },
  brandTagline: { fontSize: 13, fontWeight: "800", color: C.ink },
  brandSubTagline: { fontSize: 11, color: C.muted, marginTop: 2 },
  deliverLabel: { fontSize: 11, color: C.muted, fontWeight: "500", marginBottom: 2 },
  addressRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  addressText: { fontSize: 15, fontWeight: "800", color: C.ink, maxWidth: width * 0.5 },
  headerIcons: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconBtn: {
    position: "relative", padding: 7, backgroundColor: C.card, borderRadius: 12,
    elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3,
  },
  notifDot: { position: "absolute", top: 5, right: 5, width: 7, height: 7, borderRadius: 4, backgroundColor: "#EF4444", borderWidth: 1.5, borderColor: "#fff" },
  cartBadge: { position: "absolute", top: 0, right: 0, backgroundColor: C.primary, borderRadius: 10, minWidth: 17, height: 17, justifyContent: "center", alignItems: "center", paddingHorizontal: 3 },
  cartBadgeText: { color: "#fff", fontSize: 9, fontWeight: "800" },

  // SEARCH
  searchBox: {
    flexDirection: "row", alignItems: "center", backgroundColor: C.card, borderRadius: 12,
    paddingLeft: 14, paddingRight: 8, height: 42, marginHorizontal: 16, marginBottom: 14,
    elevation: 2, shadowColor: C.primaryDark, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4,
    borderWidth: 1, borderColor: C.line, gap: 8,
  },
  searchInput: { flex: 1, fontSize: 13, color: C.ink, paddingVertical: 0, height: 42 },
  voicePill: {
    backgroundColor: C.soft,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  voicePillActive: {
    backgroundColor: C.primary,
  },

  // FILTER CHIP
  filterChipRow: { paddingHorizontal: 16, marginBottom: 12 },
  filterChip: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", backgroundColor: C.soft, borderRadius: 24, paddingHorizontal: 12, paddingVertical: 8, gap: 6, borderWidth: 1, borderColor: C.line },
  filterChipText: { color: C.ink, fontSize: 13, fontWeight: "700" },

  // BANNER
  bannerSection: { marginBottom: 16, marginHorizontal: 0, paddingHorizontal: 0, marginTop: 0 },
  bannerList: { marginBottom: 10, paddingHorizontal: 0 },
  bannerSlide: { borderRadius: 16, overflow: "hidden", width: "100%", marginHorizontal: 16 },
  bannerImg: { width: "100%", aspectRatio: 1080 / 352, resizeMode: "cover", borderRadius: 16 },
  bannerDots: { flexDirection: "row", justifyContent: "center", gap: 5, marginTop: 8 },
  dot: { height: 5, width: 5, borderRadius: 3, backgroundColor: C.line },
  dotActive: { width: 18, backgroundColor: C.primary },

  // FEATURE BADGES
  featBadgesRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 12, marginBottom: 22, gap: 6 },
  featBadge: { flex: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 4, alignItems: "center" },
  featIconCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center", marginBottom: 6 },
  featBadgeTitle: { fontSize: 11, fontWeight: "800", color: C.ink, textAlign: "center", lineHeight: 14 },
  featBadgeSub: { fontSize: 11, color: C.muted, textAlign: "center", marginTop: 1 },

  // SECTION
  section: { marginBottom: 24, marginHorizontal: 0, paddingHorizontal: 0 },
  dealSection: { marginBottom: 24, marginHorizontal: 16, backgroundColor: C.badge, paddingVertical: 14, paddingHorizontal: 12, borderRadius: 16 },
  secHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, marginBottom: 12 },
  secTitle: { fontSize: 17, fontWeight: "900", color: C.ink },
  seeAll: { fontSize: 13, color: C.primary, fontWeight: "700" },
  dealHeaderTopRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dealViewAllBtn: { marginLeft: "auto" },

  // COUNTDOWN
  countdownRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  countdownLabel: { fontSize: 12, color: C.muted, fontWeight: "700" },
  countdown: { flexDirection: "row", alignItems: "center", gap: 0, backgroundColor: "#FFE0E0", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  countNum: { fontSize: 14, fontWeight: "900", color: "#DC2626", minWidth: 20, textAlign: "center" },
  countSep: { fontSize: 14, fontWeight: "900", color: "#DC2626", marginHorizontal: 2, textAlign: "center" },

  // DEAL CARD
  dealListContent: { paddingRight: 0 },
  dealCard: {
    backgroundColor: C.card, borderRadius: 14, elevation: 3, flexDirection: "row",
    shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 6,
    borderWidth: 1, borderColor: "#F0F0F0", overflow: "hidden", minHeight: 112,
  },
  dealImgZone: { width: 96, minHeight: 112, backgroundColor: C.card, alignItems: "center", justifyContent: "center", position: "relative", alignSelf: "stretch" },
  dealBadge: { position: "absolute", top: 6, right: 6, backgroundColor: C.badge, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, zIndex: 10, elevation: 5 },
  badgeTxt: { color: C.badgeText, fontSize: 9, fontWeight: "800", letterSpacing: 0.3 },
  dealImg: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%", resizeMode: "contain" },
  dealInfo: { flex: 1, paddingHorizontal: 12, paddingVertical: 14, justifyContent: "center" },
  dealName: { fontSize: 12, fontWeight: "800", color: C.ink, marginBottom: 7, lineHeight: 16 },
  dealUnit: { fontSize: 11, color: C.muted, fontWeight: "600", marginBottom: 4 },
  dealCardTimer: { fontSize: 10, fontWeight: "800", color: "#DC2626", marginBottom: 6 },
  dealFooter: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  dealPrice: { fontSize: 14, fontWeight: "900", color: C.ink },
  strikePrice: { fontSize: 12, color: C.muted, textDecorationLine: "line-through", marginTop: 2 },
  roundAddBtn: { backgroundColor: C.primary, width: 28, height: 28, borderRadius: 8, justifyContent: "center", alignItems: "center", flexShrink: 0, elevation: 3 },

  // CATEGORY
  catCard: {
    backgroundColor: C.card, width: 82, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 6,
    alignItems: "center", elevation: 3, shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 5, borderWidth: 1.5, borderColor: "transparent",
  },
  catCardSelected: { borderColor: C.primary, backgroundColor: C.page },
  catIconWrap: { width: 48, height: 48, borderRadius: 24, justifyContent: "center", alignItems: "center", marginBottom: 8, overflow: "hidden" },
  catImg: { width: "100%", height: "100%", resizeMode: "contain" },
  catName: { fontSize: 12, fontWeight: "700", color: C.ink, textAlign: "center", lineHeight: 15 },

  // PRODUCTS GRID
  productsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", paddingHorizontal: 16, gap: 10 },

  // PRODUCT CARD
  prodCard: {
    backgroundColor: C.card, borderRadius: 20, elevation: 2,
    shadowColor: C.ink, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8,
    borderWidth: 1, borderColor: C.line, overflow: "hidden",
  },
  prodImgZone: { backgroundColor: C.card, height: 120, justifyContent: "center", alignItems: "center", position: "relative" },
  prodImg: { width: "100%", height: "100%", resizeMode: "contain" },
  trendBadge: { position: "absolute", top: 8, left: 8, backgroundColor: C.badge, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  offBadge: { position: "absolute", top: 8, right: 8, backgroundColor: C.badge, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  prodBadgeTxt: { color: C.badgeText, fontSize: 8, fontWeight: "800", letterSpacing: 0.3 },
  prodName: { fontSize: 13, fontWeight: "700", color: C.ink, minHeight: 34, paddingHorizontal: 10, paddingTop: 8, lineHeight: 18 },
  prodUnit: { fontSize: 11, color: C.muted, fontWeight: "600", marginTop: 2, marginBottom: 8, paddingHorizontal: 10 },
  prodFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 10, paddingBottom: 10 },
  prodPrice: { fontSize: 15, fontWeight: "800", color: C.primary },
  addBtn: { borderWidth: 1.5, borderColor: C.primary, borderRadius: 8, width: 44, height: 32, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  addBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  addBtnText: { color: C.primary, fontWeight: "800", fontSize: 11 },

  // FEATURED CARD
  featCard: {
    backgroundColor: C.card, borderRadius: 20, elevation: 2,
    shadowColor: C.ink, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8,
    borderWidth: 1, borderColor: C.line, overflow: "hidden",
  },
  featImgZone: { height: 112, backgroundColor: C.card, alignItems: "center", justifyContent: "center", position: "relative" },
  carouselContent: { paddingHorizontal: 16, paddingVertical: 4, gap: 12 },
  trendingCard: { borderRadius: 16, elevation: 0, shadowOpacity: 0 },
  trendingImgZone: { height: 104 },
  featImg: { width: "100%", height: "100%", resizeMode: "contain" },
  featContent: { padding: 10 },
  featName: { fontSize: 13, fontWeight: "700", color: C.ink, minHeight: 36, marginBottom: 4, lineHeight: 18 },
  featUnit: { fontSize: 12, color: C.muted, fontWeight: "600", marginBottom: 8 },
  featFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  featPrice: { fontSize: 15, fontWeight: "800", color: C.primary, flex: 1 },
  featAddBtn: { backgroundColor: C.primary, width: 28, height: 28, borderRadius: 8, flexShrink: 0, justifyContent: "center", alignItems: "center" },

  // FRESH STRIP
  // EMPTY STATES
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 48 },
  emptyText: { fontSize: 17, fontWeight: "700", color: C.muted, marginTop: 14 },
  emptySub: { fontSize: 13, color: C.muted, marginTop: 6 },
  emptyCategory: { alignItems: "center", paddingVertical: 40, paddingHorizontal: 24 },
  emptyCategoryIcon: { width: 100, height: 100, borderRadius: 50, backgroundColor: C.page, justifyContent: "center", alignItems: "center", marginBottom: 16, borderWidth: 2, borderColor: C.line },
  emptyCategoryTitle: { fontSize: 18, fontWeight: "800", color: C.ink, textAlign: "center", marginBottom: 8 },
  emptyCategoryText: { fontSize: 13, color: C.muted, textAlign: "center", lineHeight: 20, marginBottom: 24 },
  emptyCategoryBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14 },
  emptyCategoryBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  // SKELETON
  skelImg: { width: "100%", height: 100, backgroundColor: C.line },
  skelLine: { height: 11, backgroundColor: C.line, borderRadius: 4, marginHorizontal: 10, marginBottom: 6 },

  // CART FOOTER
  cartFooter: { position: "absolute", bottom: 12, left: 16, right: 16 },
  cartFooterInner: { backgroundColor: C.primary, borderRadius: 18, padding: 15, flexDirection: "row", justifyContent: "space-between", alignItems: "center", elevation: 10, shadowColor: C.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12 },
  cartFooterLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  cartIconCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  cartFooterItems: { color: "#fff", fontSize: 11, fontWeight: "600" },
  cartFooterTotal: { color: "#fff", fontSize: 17, fontWeight: "800" },
  cartFooterRight: { flexDirection: "row", alignItems: "center", gap: 5 },
  cartFooterBtn: { color: "#fff", fontSize: 14, fontWeight: "700" },

  // GUEST BANNER
  guestBanner: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: C.card, marginHorizontal: 16, marginBottom: 10, paddingVertical: 11, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1.5, borderColor: C.line, shadowColor: C.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  guestLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  guestIconWrap: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.soft, alignItems: "center", justifyContent: "center" },
  guestTitle: { fontSize: 13, fontWeight: "700", color: C.ink },
  guestSub: { fontSize: 11, color: C.muted, fontWeight: "500", marginTop: 1 },
  guestRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  guestLoginBtn: { backgroundColor: C.primary, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  guestLoginText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  guestDismiss: { width: 26, height: 26, borderRadius: 13, backgroundColor: C.soft, alignItems: "center", justifyContent: "center" },
}));
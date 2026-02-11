import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { API } from "@/utils/api";

const { width } = Dimensions.get("window");

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
  shelfLife?: { value: number; unit: string };
  storageInstructions?: string;
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
  tags?: string[];
};

type Review = {
  _id: string;
  user: { _id: string; name: string; avatar?: string };
  rating: number;
  title?: string;
  comment: string;
  images?: string[];
  helpful: number;
  verified: boolean;
  createdAt: string;
};

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams();
  const { items, addToCart, updateQty, getCartItemCount } = useCart();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const HEADER_HEIGHT = insets.top + 60;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    null,
  );
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [similarLoading, setSimilarLoading] = useState(false);
  const [existingReview, setExistingReview] = useState<Review | null>(null);
  const [isEditingReview, setIsEditingReview] = useState(false);

  // Similar product cart quantities keyed by productId_variantId
  const [similarCartMap, setSimilarCartMap] = useState<Record<string, number>>(
    {},
  );

  // Reviews
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [ratingDistribution, setRatingDistribution] = useState<
    Record<number, number>
  >({});
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  // Animations
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const addButtonScale = useRef(new Animated.Value(1)).current;
  const variantAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadProduct();
    loadReviews();
  }, [id]);

  useEffect(() => {
    if (product && product.variants.length > 0 && !selectedVariant) {
      const defaultVar =
        product.variants.find((v) => v.isDefault) || product.variants[0];
      setSelectedVariant(defaultVar);
    }
  }, [product]);

  useEffect(() => {
    const listener = scrollY.addListener(({ value }) => {
      headerOpacity.setValue(value > 100 ? 1 : value / 100);
    });
    return () => scrollY.removeListener(listener);
  }, []);

  const loadSimilarProducts = async () => {
    try {
      setSimilarLoading(true);
      const res = await API.get(`/products/${id}/similar`);
      setSimilarProducts(res.data.data || []);
    } catch (error) {
      console.error("Failed to load similar products", error);
    } finally {
      setSimilarLoading(false);
    }
  };

  useEffect(() => {
    if (id) loadSimilarProducts();
  }, [id]);

  const loadProduct = async () => {
    try {
      const res = await API.get(`/products/${id}`);
      setProduct(res.data.data || res.data);
    } catch (error) {
      console.error("Failed to load product:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadReviews = async () => {
    try {
      setReviewsLoading(true);
      const res = await API.get(`/reviews/product/${id}`);
      if (res.data.success) {
        const reviewList = res.data.data;
        setReviews(reviewList);
        setRatingDistribution(res.data.distribution || {});
        if (user) {
          const myReview = reviewList.find(
            (r: Review) => r.user?._id === user._id,
          );
          setExistingReview(myReview || null);
        }
      }
    } catch (error) {
      console.error("Failed to load reviews:", error);
    } finally {
      setReviewsLoading(false);
    }
  };

  const handleVariantSelect = (variant: ProductVariant) => {
    setSelectedVariant(variant);
    Animated.sequence([
      Animated.timing(variantAnimation, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(variantAnimation, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleAddToCart = () => {
    if (!product || !selectedVariant) return;
    Animated.sequence([
      Animated.spring(addButtonScale, { toValue: 0.9, useNativeDriver: true }),
      Animated.spring(addButtonScale, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }),
    ]).start();
    addToCart({
      id: `${product._id}_${selectedVariant._id}`,
      productId: product._id,
      variantId: selectedVariant._id,
      name: product.name,
      variantLabel: `${selectedVariant.packSize}${selectedVariant.packUnit}`,
      price: selectedVariant.price,
      qty: 1,
    });
  };

  const getCartItem = () => {
    if (!product || !selectedVariant) return null;
    return items.find(
      (i) => i.productId === product._id && i.variantId === selectedVariant._id,
    );
  };

  const cartItem = getCartItem();

  const handleIncrement = () => {
    if (!cartItem || !product || !selectedVariant) return;
    if (cartItem.qty >= selectedVariant.stock) {
      Alert.alert(
        "Stock Limit",
        `Only ${selectedVariant.stock} items available`,
      );
      return;
    }
    updateQty(product._id, selectedVariant._id, cartItem.qty + 1);
  };

  const handleDecrement = () => {
    if (!cartItem || !product || !selectedVariant) return;
    updateQty(product._id, selectedVariant._id, cartItem.qty - 1);
  };

  const handleWriteReview = () => {
    if (!user) {
      Alert.alert("Login Required", "Please log in to write a review", [
        { text: "Cancel", style: "cancel" },
        { text: "Log In", onPress: () => router.push("/(auth)/login") },
      ]);
      return;
    }
    if (existingReview) {
      setIsEditingReview(true);
      setUserRating(existingReview.rating);
      setReviewTitle(existingReview.title || "");
      setReviewComment(existingReview.comment);
    } else {
      setIsEditingReview(false);
      setUserRating(0);
      setReviewTitle("");
      setReviewComment("");
    }
    setShowReviewModal(true);
  };

  const handleSubmitReview = async () => {
    if (!user) return;
    if (userRating === 0) {
      Alert.alert("Rating Required", "Please select a rating");
      return;
    }
    if (!reviewComment.trim()) {
      Alert.alert("Comment Required", "Please write a comment");
      return;
    }
    try {
      setSubmittingReview(true);
      if (isEditingReview && existingReview) {
        await API.put(`/reviews/${existingReview._id}`, {
          userId: user._id,
          rating: userRating,
          comment: reviewComment.trim(),
        });
        Alert.alert("Success", "Review updated successfully!");
      } else {
        await API.post("/reviews", {
          userId: user._id,
          productId: product?._id,
          rating: userRating,
          comment: reviewComment.trim(),
        });
        Alert.alert("Success", "Review submitted successfully!");
      }
      setShowReviewModal(false);
      setUserRating(0);
      setReviewTitle("");
      setReviewComment("");
      setIsEditingReview(false);
      loadReviews();
      loadProduct();
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.response?.data?.message || "Failed to submit review",
      );
    } finally {
      setSubmittingReview(false);
    }
  };

  const renderStarRating = (
    rating: number,
    size: number = 16,
    interactive: boolean = false,
    onPress?: (r: number) => void,
  ) => (
    <View style={styles.starContainer}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          disabled={!interactive}
          onPress={() => onPress?.(star)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={star <= rating ? "star" : "star-outline"}
            size={size}
            color={star <= rating ? "#FFB800" : "#D9D9D9"}
          />
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderRatingDistribution = () => {
    const total = Object.values(ratingDistribution).reduce((s, c) => s + c, 0);
    return (
      <View style={styles.distributionContainer}>
        {[5, 4, 3, 2, 1].map((r) => {
          const count = ratingDistribution[r] || 0;
          const pct = total > 0 ? (count / total) * 100 : 0;
          return (
            <View key={r} style={styles.distributionRow}>
              <Text style={styles.distributionLabel}>{r}★</Text>
              <View style={styles.distributionBar}>
                <View style={[styles.distributionFill, { width: `${pct}%` }]} />
              </View>
              <Text style={styles.distributionCount}>{count}</Text>
            </View>
          );
        })}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0C831F" />
          <Text style={styles.loadingText}>Loading product...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!product || !selectedVariant) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#999" />
          <Text style={styles.errorText}>Product not found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const allImages = [product.image, ...(product.images || [])].filter(Boolean);
  const displayImages =
    allImages.length > 0 ? allImages : ["https://via.placeholder.com/400"];
  const discount =
    selectedVariant.mrp > selectedVariant.price
      ? Math.round(
          ((selectedVariant.mrp - selectedVariant.price) /
            selectedVariant.mrp) *
            100,
        )
      : 0;
  const savings = selectedVariant.mrp - selectedVariant.price;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Animated Header */}
      <Animated.View
        style={[
          styles.header,
          {
            height: HEADER_HEIGHT,
            paddingTop: insets.top,
            backgroundColor: headerOpacity.interpolate({
              inputRange: [0, 1],
              outputRange: ["rgba(255,255,255,0)", "rgba(255,255,255,1)"],
            }),
          },
        ]}
      >
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={22} color="#1B5E20" />
        </TouchableOpacity>
        <Animated.Text
          style={[styles.headerTitle, { opacity: headerOpacity }]}
          numberOfLines={1}
        >
          {product.name}
        </Animated.Text>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="share-outline" size={22} color="#1B5E20" />
        </TouchableOpacity>
      </Animated.View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false },
        )}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingTop: insets.top }}
      >
        {/* ─── Image Carousel ─── */}
        <View style={styles.imageContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) =>
              setSelectedImageIndex(
                Math.round(e.nativeEvent.contentOffset.x / width),
              )
            }
          >
            {displayImages.map((img, index) => (
              <View key={index} style={styles.imageWrapper}>
                <Image
                  source={{ uri: img }}
                  style={styles.productImage}
                  resizeMode="contain"
                />
              </View>
            ))}
          </ScrollView>

          {displayImages.length > 1 && (
            <View style={styles.imageIndicators}>
              {displayImages.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.indicator,
                    selectedImageIndex === i && styles.activeIndicator,
                  ]}
                />
              ))}
            </View>
          )}

          {discount > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{discount}% OFF</Text>
            </View>
          )}
          {product.trending && (
            <View style={styles.trendingBadge}>
              <Ionicons name="trending-up" size={12} color="#fff" />
              <Text style={styles.trendingText}>TRENDING</Text>
            </View>
          )}
        </View>

        {/* ─── Content ─── */}
        <View style={styles.contentContainer}>
          {/* ── Meta Row (IMPROVED) ── */}
          <View style={styles.metaRow}>
            {product.brand && (
              <View style={styles.brandBadge}>
                <Text style={styles.brandText}>{product.brand}</Text>
              </View>
            )}
            <View style={styles.categoryBadge}>
              <Ionicons name="grid-outline" size={11} color="#777" />
              <Text style={styles.categoryText}>{product.category.name}</Text>
            </View>
          </View>

          {/* ── Product Name (EXACT styles as specified) ── */}
          <Text style={styles.productName}>{product.name}</Text>

          {/* ── Rating Row ── */}
          <TouchableOpacity style={styles.ratingRow} activeOpacity={0.7}>
            {product.reviewsCount > 0 ? (
              <>
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={13} color="#FFB800" />
                  <Text style={styles.ratingText}>
                    {product.rating.toFixed(1)}
                  </Text>
                </View>
                <Text style={styles.reviewsText}>
                  {product.reviewsCount}{" "}
                  {product.reviewsCount === 1 ? "review" : "reviews"}
                </Text>
                <Ionicons name="chevron-forward" size={13} color="#bbb" />
              </>
            ) : (
              <View style={styles.noReviewsBadge}>
                <Ionicons name="chatbubble-outline" size={13} color="#999" />
                <Text style={styles.noReviewsText}>
                  No reviews yet · Be the first!
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* ── Variant Selector ── */}
          <View style={styles.variantSection}>
            <Text style={styles.sectionTitle}>Select Size</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.variantScrollContent}
            >
              {product.variants
                .filter((v) => v.isActive)
                .map((variant) => {
                  const isSelected = selectedVariant._id === variant._id;
                  const vDiscount =
                    variant.mrp > variant.price
                      ? Math.round(
                          ((variant.mrp - variant.price) / variant.mrp) * 100,
                        )
                      : 0;
                  return (
                    <TouchableOpacity
                      key={variant._id}
                      style={[
                        styles.variantCard,
                        isSelected && styles.variantCardSelected,
                        variant.stock === 0 && styles.variantCardDisabled,
                      ]}
                      onPress={() => handleVariantSelect(variant)}
                      activeOpacity={0.7}
                      disabled={variant.stock === 0}
                    >
                      <View style={styles.variantInfo}>
                        <Text
                          style={[
                            styles.variantSize,
                            isSelected && styles.variantSizeSelected,
                          ]}
                        >
                          {variant.packSize}
                          {variant.packUnit}
                        </Text>
                        <Text
                          style={[
                            styles.variantPrice,
                            isSelected && styles.variantPriceSelected,
                          ]}
                        >
                          ₹{variant.price}
                        </Text>
                        {vDiscount > 0 && (
                          <Text style={styles.variantMRP}>₹{variant.mrp}</Text>
                        )}
                      </View>
                      {isSelected && variant.stock > 0 && (
                        <View style={styles.selectedCheck}>
                          <Ionicons name="checkmark" size={10} color="#fff" />
                        </View>
                      )}
                      {variant.stock === 0 && (
                        <View style={styles.outOfStockOverlay}>
                          <Text style={styles.outOfStockOverlayText}>Out</Text>
                        </View>
                      )}
                      {variant.stock > 0 &&
                        variant.stock < variant.lowStockThreshold && (
                          <View style={styles.lowStockBadge}>
                            <Text style={styles.lowStockText}>
                              {variant.stock} left
                            </Text>
                          </View>
                        )}
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>
          </View>

          {/* ── Price Section ── */}
          <Animated.View
            style={[
              styles.priceSection,
              {
                transform: [
                  {
                    scale: variantAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.02],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.priceRow}>
              <View style={styles.priceLeft}>
                <Text style={styles.currentPrice}>
                  ₹{selectedVariant.price.toFixed(2)}
                </Text>
                {discount > 0 && (
                  <Text style={styles.originalPrice}>
                    ₹{selectedVariant.mrp.toFixed(2)}
                  </Text>
                )}
              </View>
              {discount > 0 && (
                <View style={styles.savingsBadge}>
                  <Text style={styles.savingsText}>
                    Save ₹{savings.toFixed(0)}
                  </Text>
                </View>
              )}
            </View>
            {selectedVariant.stock > 0 ? (
              <View style={styles.stockIndicator}>
                <View style={styles.stockDot} />
                <Text style={styles.stockText}>
                  {selectedVariant.stock < selectedVariant.lowStockThreshold
                    ? `Only ${selectedVariant.stock} left in stock`
                    : "In Stock"}
                </Text>
              </View>
            ) : (
              <View style={styles.outOfStockIndicator}>
                <Ionicons name="close-circle" size={15} color="#F44336" />
                <Text style={styles.outOfStockText}>Out of Stock</Text>
              </View>
            )}
          </Animated.View>

          {/* ── Description ── */}
          {product.description && (
            <View style={styles.descriptionSection}>
              <Text style={styles.sectionTitle}>About this product</Text>
              <Text
                style={styles.description}
                numberOfLines={showFullDescription ? undefined : 3}
              >
                {product.description}
              </Text>
              {product.description.length > 100 && (
                <TouchableOpacity
                  onPress={() => setShowFullDescription(!showFullDescription)}
                  style={styles.readMoreBtn}
                >
                  <Text style={styles.readMore}>
                    {showFullDescription ? "Show less" : "Read more"}
                  </Text>
                  <Ionicons
                    name={showFullDescription ? "chevron-up" : "chevron-down"}
                    size={14}
                    color="#0C831F"
                  />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* ── Product Details ── */}
          <View style={styles.detailsSection}>
            <Text style={styles.sectionTitle}>Product Details</Text>
            {product.shelfLife && (
              <View style={styles.detailRow}>
                <View style={styles.detailIconWrap}>
                  <Ionicons name="time-outline" size={17} color="#0C831F" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Shelf Life</Text>
                  <Text style={styles.detailValue}>
                    {product.shelfLife.value} {product.shelfLife.unit}
                  </Text>
                </View>
              </View>
            )}
            {product.storageInstructions && (
              <View style={styles.detailRow}>
                <View style={styles.detailIconWrap}>
                  <Ionicons name="snow-outline" size={17} color="#0C831F" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Storage</Text>
                  <Text style={styles.detailValue}>
                    {product.storageInstructions}
                  </Text>
                </View>
              </View>
            )}
            <View style={styles.detailRow}>
              <View style={styles.detailIconWrap}>
                <Ionicons name="business-outline" size={17} color="#0C831F" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Seller</Text>
                <Text style={styles.detailValue}>
                  {product.seller.sellerName}
                </Text>
              </View>
            </View>
            {product.seller.location && (
              <View style={[styles.detailRow, { marginBottom: 0 }]}>
                <View style={styles.detailIconWrap}>
                  <Ionicons name="location-outline" size={17} color="#0C831F" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Location</Text>
                  <Text style={styles.detailValue}>
                    {product.seller.location.city}
                    {product.seller.location.area &&
                      `, ${product.seller.location.area}`}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* ── Tags ── */}
          {product.tags && product.tags.length > 0 && (
            <View style={styles.tagsSection}>
              <Text style={styles.sectionTitle}>Tags</Text>
              <View style={styles.tagsContainer}>
                {product.tags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>#{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ════════════════════════════════════════
              SIMILAR PRODUCTS — IMPROVED
              • Light bg image area
              • Discount badge
              • Rating row
              • Weight pill
              • ADD / qty control per card
              ════════════════════════════════════════ */}
          {similarProducts.length > 0 && (
            <View style={styles.similarSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>You may also like</Text>
                <TouchableOpacity>
                  <Text style={styles.seeAll}>See all</Text>
                </TouchableOpacity>
              </View>

              {similarLoading ? (
                <ActivityIndicator color="#0C831F" />
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.similarScrollContent}
                >
                  {similarProducts.map((item) => {
                    const variant =
                      item.variants.find((v) => v.isDefault) ||
                      item.variants[0];
                    const itemDiscount =
                      variant.mrp > variant.price
                        ? Math.round(
                            ((variant.mrp - variant.price) / variant.mrp) * 100,
                          )
                        : 0;
                    const simKey = `${item._id}_${variant._id}`;
                    const simQty = similarCartMap[simKey] || 0;

                    return (
                      <TouchableOpacity
                        key={item._id}
                        style={styles.similarCard}
                        activeOpacity={0.9}
                        onPress={() =>
                          router.push({
                            pathname: "/product-detail",
                            params: { id: item._id },
                          })
                        }
                      >
                        {/* Discount badge */}
                        {itemDiscount > 0 && (
                          <View style={styles.similarDiscountBadge}>
                            <Text style={styles.similarDiscountText}>
                              {itemDiscount}% OFF
                            </Text>
                          </View>
                        )}

                        {/* Image with light background */}
                        <View style={styles.similarImageWrap}>
                          <Image
                            source={{
                              uri:
                                item.image || "https://via.placeholder.com/150",
                            }}
                            style={styles.similarImage}
                            resizeMode="contain"
                          />
                        </View>

                        {/* Name */}
                        <Text numberOfLines={2} style={styles.similarName}>
                          {item.name}
                        </Text>

                        {/* Weight pill */}
                        <View style={styles.similarUnitPill}>
                          <Text style={styles.similarUnit}>
                            {variant.packSize}
                            {variant.packUnit}
                          </Text>
                        </View>

                        {/* Rating */}
                        {item.reviewsCount > 0 && (
                          <View style={styles.similarRatingRow}>
                            <Ionicons name="star" size={10} color="#FFB800" />
                            <Text style={styles.similarRatingText}>
                              {item.rating.toFixed(1)}
                            </Text>
                            <Text style={styles.similarReviewCount}>
                              ({item.reviewsCount})
                            </Text>
                          </View>
                        )}

                        {/* Price + ADD/qty */}
                        <View style={styles.similarBottom}>
                          <View>
                            <Text style={styles.similarPrice}>
                              ₹{variant.price}
                            </Text>
                            {variant.mrp > variant.price && (
                              <Text style={styles.similarMRP}>
                                ₹{variant.mrp}
                              </Text>
                            )}
                          </View>

                          {simQty === 0 ? (
                            <TouchableOpacity
                              style={styles.simAddBtn}
                              activeOpacity={0.8}
                              onPress={(e) => {
                                e.stopPropagation();
                                setSimilarCartMap((prev) => ({
                                  ...prev,
                                  [simKey]: 1,
                                }));
                                addToCart({
                                  id: simKey,
                                  productId: item._id,
                                  variantId: variant._id,
                                  name: item.name,
                                  variantLabel: `${variant.packSize}${variant.packUnit}`,
                                  price: variant.price,
                                  qty: 1,
                                });
                              }}
                            >
                              <Text style={styles.simAddBtnText}>ADD</Text>
                            </TouchableOpacity>
                          ) : (
                            <View style={styles.simQtyRow}>
                              <TouchableOpacity
                                style={styles.simQtyBtn}
                                onPress={(e) => {
                                  e.stopPropagation();
                                  const next = simQty - 1;
                                  setSimilarCartMap((prev) => ({
                                    ...prev,
                                    [simKey]: next,
                                  }));
                                  updateQty(item._id, variant._id, next);
                                }}
                              >
                                <Ionicons
                                  name={
                                    simQty === 1 ? "trash-outline" : "remove"
                                  }
                                  size={13}
                                  color="#fff"
                                />
                              </TouchableOpacity>
                              <Text style={styles.simQtyText}>{simQty}</Text>
                              <TouchableOpacity
                                style={styles.simQtyBtn}
                                onPress={(e) => {
                                  e.stopPropagation();
                                  const next = simQty + 1;
                                  setSimilarCartMap((prev) => ({
                                    ...prev,
                                    [simKey]: next,
                                  }));
                                  updateQty(item._id, variant._id, next);
                                }}
                              >
                                <Ionicons name="add" size={13} color="#fff" />
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          )}

          {/* ════════════════════════════════════════
              REVIEWS — with ✏️ Edit icon on own review
              ════════════════════════════════════════ */}
          <View style={styles.reviewsSection}>
            <View style={styles.reviewsHeader}>
              <Text style={styles.sectionTitle}>
                Ratings & Reviews
                {product.reviewsCount > 0 ? ` (${product.reviewsCount})` : ""}
              </Text>
              <TouchableOpacity
                style={styles.writeReviewBtn}
                onPress={handleWriteReview}
              >
                <Ionicons
                  name={existingReview ? "create" : "create-outline"}
                  size={15}
                  color="#fff"
                />
                <Text style={styles.writeReviewText}>
                  {existingReview ? "Edit" : "Write"}
                </Text>
              </TouchableOpacity>
            </View>

            {product.reviewsCount > 0 && (
              <>
                <View style={styles.ratingSummary}>
                  <View style={styles.ratingScore}>
                    <Text style={styles.ratingNumber}>
                      {product.rating.toFixed(1)}
                    </Text>
                    {renderStarRating(Math.round(product.rating), 20)}
                    <Text style={styles.ratingTotal}>
                      Based on {product.reviewsCount}{" "}
                      {product.reviewsCount === 1 ? "review" : "reviews"}
                    </Text>
                  </View>
                  {renderRatingDistribution()}
                </View>

                {reviewsLoading ? (
                  <ActivityIndicator
                    color="#0C831F"
                    style={{ marginTop: 20 }}
                  />
                ) : (
                  <View style={styles.reviewsList}>
                    {reviews.slice(0, 3).map((review) => {
                      const isOwnReview = !!(
                        user && review.user?._id === user._id
                      );
                      return (
                        <View key={review._id} style={styles.reviewCard}>
                          <View style={styles.reviewHeader}>
                            <View style={styles.reviewUser}>
                              <View
                                style={[
                                  styles.userAvatar,
                                  isOwnReview && styles.userAvatarOwn,
                                ]}
                              >
                                <Text style={styles.userAvatarText}>
                                  {review.user.name.charAt(0).toUpperCase()}
                                </Text>
                              </View>
                              <View style={styles.reviewUserInfo}>
                                <View style={styles.reviewUserRow}>
                                  <Text style={styles.reviewUserName}>
                                    {review.user.name}
                                  </Text>
                                  {isOwnReview && (
                                    <View style={styles.youBadge}>
                                      <Text style={styles.youBadgeText}>
                                        You
                                      </Text>
                                    </View>
                                  )}
                                  {review.verified && !isOwnReview && (
                                    <View style={styles.verifiedBadge}>
                                      <Ionicons
                                        name="checkmark-circle"
                                        size={12}
                                        color="#4CAF50"
                                      />
                                    </View>
                                  )}
                                </View>
                                <Text style={styles.reviewDate}>
                                  {new Date(
                                    review.createdAt,
                                  ).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })}
                                </Text>
                              </View>
                            </View>

                            {/* Stars + Edit icon stacked on the right */}
                            <View style={styles.reviewRightCol}>
                              {renderStarRating(review.rating, 13)}
                              {/* ✏️ Edit icon — only for own review */}
                              {isOwnReview && (
                                <TouchableOpacity
                                  style={styles.editReviewBtn}
                                  onPress={handleWriteReview}
                                  activeOpacity={0.7}
                                >
                                  <Ionicons
                                    name="create-outline"
                                    size={13}
                                    color="#0C831F"
                                  />
                                  <Text style={styles.editReviewText}>
                                    Edit
                                  </Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>

                          {review.title && (
                            <Text style={styles.reviewTitle}>
                              {review.title}
                            </Text>
                          )}
                          <Text style={styles.reviewComment}>
                            {review.comment}
                          </Text>

                          {review.helpful > 0 && (
                            <View style={styles.reviewFooter}>
                              <TouchableOpacity style={styles.helpfulBtn}>
                                <Ionicons
                                  name="thumbs-up-outline"
                                  size={13}
                                  color="#666"
                                />
                                <Text style={styles.helpfulText}>
                                  Helpful ({review.helpful})
                                </Text>
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      );
                    })}

                    {reviews.length > 3 && (
                      <TouchableOpacity style={styles.viewAllReviewsBtn}>
                        <Text style={styles.viewAllReviewsText}>
                          View All {product.reviewsCount} Reviews
                        </Text>
                        <Ionicons
                          name="chevron-forward"
                          size={17}
                          color="#0C831F"
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </>
            )}

            {product.reviewsCount === 0 && (
              <View style={styles.noReviewsContainer}>
                <View style={styles.noReviewsIcon}>
                  <Ionicons
                    name="chatbubble-outline"
                    size={44}
                    color="#0C831F"
                  />
                </View>
                <Text style={styles.noReviewsTitle}>No reviews yet</Text>
                <Text style={styles.noReviewsSubtext}>
                  Be the first to review this product
                </Text>
              </View>
            )}
          </View>

          <View style={{ height: 120 }} />
        </View>
      </Animated.ScrollView>

      {/* ─── Sticky Footer ─── */}
      <View style={styles.footer}>
        {!cartItem ? (
          <Animated.View
            style={[
              styles.addButtonContainer,
              { transform: [{ scale: addButtonScale }] },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.addButton,
                selectedVariant.stock === 0 && styles.addButtonDisabled,
              ]}
              onPress={handleAddToCart}
              disabled={selectedVariant.stock === 0}
              activeOpacity={0.8}
            >
              <Ionicons name="cart-outline" size={22} color="#fff" />
              <Text style={styles.addButtonText}>
                {selectedVariant.stock === 0 ? "Out of Stock" : "Add to Cart"}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <View style={styles.quantityControls}>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={handleDecrement}
              activeOpacity={0.7}
            >
              <Ionicons
                name={cartItem.qty === 1 ? "trash-outline" : "remove"}
                size={20}
                color={cartItem.qty === 1 ? "#F44336" : "#0C831F"}
              />
            </TouchableOpacity>
            <View style={styles.quantityDisplay}>
              <Text style={styles.quantityText}>{cartItem.qty}</Text>
              <Text style={styles.quantityUnit}>
                {selectedVariant.packSize}
                {selectedVariant.packUnit}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.quantityButton,
                cartItem.qty >= selectedVariant.stock &&
                  styles.quantityButtonDisabled,
              ]}
              onPress={handleIncrement}
              disabled={cartItem.qty >= selectedVariant.stock}
              activeOpacity={0.7}
            >
              <Ionicons
                name="add"
                size={20}
                color={
                  cartItem.qty >= selectedVariant.stock ? "#BDBDBD" : "#0C831F"
                }
              />
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={styles.cartButton}
          onPress={() => router.push("/cart")}
        >
          <Ionicons name="cart" size={24} color="#0C831F" />
          {items.length > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{getCartItemCount()}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ─── Review Modal ─── */}
      <Modal
        visible={showReviewModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowReviewModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isEditingReview ? "Update Your Review" : "Write a Review"}
              </Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setShowReviewModal(false)}
              >
                <Ionicons name="close" size={20} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalProductPreview}>
                <Image
                  source={{
                    uri: product.image || "https://via.placeholder.com/60",
                  }}
                  style={styles.modalProductImage}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalProductName} numberOfLines={2}>
                    {product.name}
                  </Text>
                  <Text style={styles.modalProductVariant}>
                    {selectedVariant.packSize}
                    {selectedVariant.packUnit}
                  </Text>
                </View>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>Your Rating *</Text>
                {renderStarRating(userRating, 36, true, setUserRating)}
                {userRating > 0 && (
                  <Text style={styles.ratingHint}>
                    {
                      ["", "Poor", "Fair", "Good", "Very Good", "Excellent"][
                        userRating
                      ]
                    }
                  </Text>
                )}
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>Review Title (Optional)</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Summarize your experience"
                  placeholderTextColor="#bbb"
                  value={reviewTitle}
                  onChangeText={setReviewTitle}
                  maxLength={100}
                />
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>Your Review *</Text>
                <TextInput
                  style={[styles.modalInput, styles.modalTextArea]}
                  placeholder="Share your thoughts about this product"
                  placeholderTextColor="#bbb"
                  value={reviewComment}
                  onChangeText={setReviewComment}
                  multiline
                  numberOfLines={5}
                  maxLength={500}
                  textAlignVertical="top"
                />
                <Text style={styles.charCount}>{reviewComment.length}/500</Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.submitReviewBtn,
                  (userRating === 0 ||
                    !reviewComment.trim() ||
                    submittingReview) &&
                    styles.submitReviewBtnDisabled,
                ]}
                onPress={handleSubmitReview}
                disabled={
                  userRating === 0 || !reviewComment.trim() || submittingReview
                }
              >
                {submittingReview ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.submitReviewText}>
                      {isEditingReview ? "Update Review" : "Submit Review"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F4F4F4" },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: { fontSize: 14, color: "#666", fontWeight: "500" },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: { fontSize: 18, fontWeight: "600", color: "#666", marginTop: 16 },
  backButton: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: "#0C831F",
    borderRadius: 12,
  },
  backButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  // ── Header ──
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 20,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },

  headerButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.92)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: "#1B5E20",
    marginHorizontal: 12,
  },

  // ── Image ──
  imageContainer: { width, height: width, backgroundColor: "#fff" },
  imageWrapper: {
    width,
    height: width,
    justifyContent: "center",
    alignItems: "center",
  },
  productImage: { width: width * 0.82, height: width * 0.82 },
  imageIndicators: {
    position: "absolute",
    bottom: 14,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 5,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#D9D9D9",
  },
  activeIndicator: { width: 18, backgroundColor: "#0C831F" },
  discountBadge: {
    position: "absolute",
    top: 14,
    right: 14,
    backgroundColor: "#F44336",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  discountText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  trendingBadge: {
    position: "absolute",
    top: 14,
    left: 14,
    backgroundColor: "#2196F3",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  trendingText: { color: "#fff", fontSize: 11, fontWeight: "700" },

  // ── Content wrapper ──
  contentContainer: {
    backgroundColor: "#F4F4F4",
    paddingTop: 12,
    paddingHorizontal: 14,
  },

  // ── metaRow — IMPROVED (gap: 8, marginBottom: 6 as specified) ──
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  brandBadge: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#C8E6C9",
  },
  brandText: { fontSize: 12, fontWeight: "700", color: "#0C831F" },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F0F0F0",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  categoryText: { fontSize: 12, color: "#666", fontWeight: "600" },

  // ── productName — EXACT as specified ──
  productName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111",
    lineHeight: 28,
    marginBottom: 8,
  },

  // ── Rating ──
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 16,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ratingText: { fontSize: 13, fontWeight: "800", color: "#0C831F" },
  reviewsText: { fontSize: 13, color: "#888", fontWeight: "500" },
  noReviewsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  noReviewsText: { fontSize: 12, color: "#888", fontWeight: "500" },

  // ── Variants ──
  variantSection: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  variantScrollContent: { paddingRight: 8 },
  variantCard: {
    minWidth: 88,
    backgroundColor: "#F7F7F7",
    borderRadius: 12,
    padding: 12,
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: "transparent",
    position: "relative",
  },
  variantCardSelected: { backgroundColor: "#E8F5E9", borderColor: "#0C831F" },
  variantCardDisabled: { opacity: 0.45 },
  variantInfo: { alignItems: "center" },
  variantSize: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
    marginBottom: 3,
  },
  variantSizeSelected: { color: "#0C831F" },
  variantPrice: { fontSize: 15, fontWeight: "800", color: "#111" },
  variantPriceSelected: { color: "#0C831F" },
  variantMRP: {
    fontSize: 11,
    color: "#bbb",
    textDecorationLine: "line-through",
    marginTop: 2,
  },
  selectedCheck: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: "#0C831F",
    justifyContent: "center",
    alignItems: "center",
  },
  outOfStockOverlay: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#F44336",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  outOfStockOverlayText: { fontSize: 9, color: "#fff", fontWeight: "700" },
  lowStockBadge: {
    position: "absolute",
    bottom: 4,
    left: 4,
    right: 4,
    backgroundColor: "#FFF3E0",
    borderRadius: 5,
    paddingVertical: 2,
  },
  lowStockText: {
    fontSize: 9,
    color: "#F57C00",
    fontWeight: "700",
    textAlign: "center",
  },

  // ── Price ──
  priceSection: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  priceLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  currentPrice: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0C831F",
    letterSpacing: -0.5,
  },
  originalPrice: {
    fontSize: 15,
    color: "#bbb",
    textDecorationLine: "line-through",
  },
  savingsBadge: {
    backgroundColor: "#FFF3E0",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  savingsText: { fontSize: 12, fontWeight: "700", color: "#E65100" },
  stockIndicator: { flexDirection: "row", alignItems: "center", gap: 6 },
  stockDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#4CAF50",
  },
  stockText: { fontSize: 13, color: "#4CAF50", fontWeight: "600" },
  outOfStockIndicator: { flexDirection: "row", alignItems: "center", gap: 6 },
  outOfStockText: { fontSize: 13, color: "#F44336", fontWeight: "600" },

  // ── Description ──
  descriptionSection: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  description: { fontSize: 14, lineHeight: 22, color: "#555" },
  readMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 8,
  },
  readMore: { fontSize: 13, fontWeight: "700", color: "#0C831F" },

  // ── Details ──
  detailsSection: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
    gap: 12,
  },
  detailIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
  },
  detailContent: { flex: 1 },
  detailLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#aaa",
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  detailValue: { fontSize: 14, color: "#222", fontWeight: "500" },

  // ── Tags ──
  tagsSection: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  tagsContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
  },
  tagText: { fontSize: 12, color: "#0C831F", fontWeight: "600" },

  // ── Similar Products (IMPROVED) ──
  similarSection: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  seeAll: { fontSize: 13, fontWeight: "700", color: "#0C831F" },
  similarScrollContent: { paddingRight: 8, paddingBottom: 4 },

  similarCard: {
    width: 148,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 10,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#EBEBEB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    position: "relative",
  },
  similarDiscountBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    zIndex: 1,
    backgroundColor: "#0C831F",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  similarDiscountText: { fontSize: 9, fontWeight: "800", color: "#fff" },
  similarImageWrap: {
    backgroundColor: "#F6F6F6",
    borderRadius: 10,
    height: 96,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    overflow: "hidden",
  },
  similarImage: { width: "85%", height: "85%" },
  similarName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111",
    marginBottom: 5,
    lineHeight: 17,
  },
  similarUnitPill: {
    backgroundColor: "#F0F0F0",
    alignSelf: "flex-start",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    marginBottom: 5,
  },
  similarUnit: { fontSize: 11, color: "#666", fontWeight: "600" },
  similarRatingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginBottom: 8,
  },
  similarRatingText: { fontSize: 11, fontWeight: "800", color: "#333" },
  similarReviewCount: { fontSize: 10, color: "#aaa", fontWeight: "500" },
  similarBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 2,
  },
  similarPrice: { fontSize: 15, fontWeight: "900", color: "#111" },
  similarMRP: {
    fontSize: 11,
    color: "#bbb",
    textDecorationLine: "line-through",
  },
  simAddBtn: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#0C831F",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  simAddBtnText: { fontSize: 12, fontWeight: "800", color: "#0C831F" },
  simQtyRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0C831F",
    borderRadius: 8,
    overflow: "hidden",
  },
  simQtyBtn: {
    paddingHorizontal: 7,
    paddingVertical: 5,
    justifyContent: "center",
    alignItems: "center",
  },
  simQtyText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 13,
    paddingHorizontal: 3,
    minWidth: 18,
    textAlign: "center",
  },

  // ── Reviews ──
  reviewsSection: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  reviewsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  writeReviewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#0C831F",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 9,
  },
  writeReviewText: { fontSize: 13, fontWeight: "700", color: "#fff" },

  ratingSummary: {
    backgroundColor: "#F9F9F9",
    padding: 16,
    borderRadius: 12,
    marginBottom: 14,
  },
  ratingScore: { alignItems: "center", marginBottom: 14 },
  ratingNumber: {
    fontSize: 46,
    fontWeight: "800",
    color: "#111",
    marginBottom: 6,
    letterSpacing: -1,
  },
  ratingTotal: { fontSize: 12, color: "#999", marginTop: 6 },
  starContainer: { flexDirection: "row", gap: 3 },

  distributionContainer: { gap: 8 },
  distributionRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  distributionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    width: 26,
  },
  distributionBar: {
    flex: 1,
    height: 7,
    backgroundColor: "#E8E8E8",
    borderRadius: 4,
    overflow: "hidden",
  },
  distributionFill: {
    height: "100%",
    backgroundColor: "#FFB800",
    borderRadius: 4,
  },
  distributionCount: {
    fontSize: 12,
    color: "#999",
    fontWeight: "600",
    width: 28,
    textAlign: "right",
  },

  reviewsList: { gap: 10 },
  reviewCard: { backgroundColor: "#F9F9F9", padding: 14, borderRadius: 12 },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  reviewUser: { flexDirection: "row", gap: 10, flex: 1 },
  userAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#A5D6A7",
    justifyContent: "center",
    alignItems: "center",
  },
  userAvatarOwn: { backgroundColor: "#0C831F" },
  userAvatarText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  reviewUserInfo: { flex: 1 },
  reviewUserRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  reviewUserName: { fontSize: 14, fontWeight: "700", color: "#111" },
  youBadge: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#C8E6C9",
  },
  youBadgeText: { fontSize: 10, fontWeight: "700", color: "#0C831F" },
  verifiedBadge: { flexDirection: "row", alignItems: "center" },
  reviewDate: { fontSize: 11, color: "#bbb", marginTop: 2 },

  // Stars + edit icon stacked on the right
  reviewRightCol: { alignItems: "flex-end", gap: 6 },

  // ✏️ Edit button shown only on own review
  editReviewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "#C8E6C9",
  },
  editReviewText: { fontSize: 11, fontWeight: "700", color: "#0C831F" },

  reviewTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111",
    marginBottom: 5,
  },
  reviewComment: { fontSize: 13, lineHeight: 19, color: "#555" },
  reviewFooter: {
    flexDirection: "row",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#EBEBEB",
  },
  helpfulBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  helpfulText: { fontSize: 12, color: "#888" },

  viewAllReviewsBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E8F5E9",
    paddingVertical: 13,
    borderRadius: 12,
    marginTop: 6,
  },
  viewAllReviewsText: { fontSize: 14, fontWeight: "700", color: "#0C831F" },

  noReviewsContainer: { alignItems: "center", paddingVertical: 36 },
  noReviewsIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  noReviewsTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#666",
    marginBottom: 5,
  },
  noReviewsSubtext: { fontSize: 13, color: "#aaa" },

  // ── Footer ──
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    flexDirection: "row",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  addButtonContainer: { flex: 1 },
  addButton: {
    backgroundColor: "#0C831F",
    paddingVertical: 16,
    borderRadius: 13,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    shadowColor: "#0C831F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonDisabled: {
    backgroundColor: "#C8C8C8",
    shadowOpacity: 0,
    elevation: 0,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  quantityControls: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    borderRadius: 13,
    padding: 6,
    gap: 6,
  },
  quantityButton: {
    width: 44,
    height: 44,
    borderRadius: 11,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  quantityButtonDisabled: { opacity: 0.4 },
  quantityDisplay: { flex: 1, alignItems: "center" },
  quantityText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0C831F",
    letterSpacing: -0.5,
  },
  quantityUnit: {
    fontSize: 10,
    color: "#666",
    fontWeight: "600",
    marginTop: 2,
  },
  cartButton: {
    width: 56,
    height: 56,
    borderRadius: 13,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cartBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#F44336",
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
  },
  cartBadgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },

  // ── Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: "92%",
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: "#DDD",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111",
    letterSpacing: -0.3,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
  },
  modalProductPreview: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#F7F7F7",
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  modalProductImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  modalProductName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111",
    marginBottom: 3,
  },
  modalProductVariant: { fontSize: 12, color: "#888" },
  modalSection: { marginBottom: 22 },
  modalLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111",
    marginBottom: 10,
  },
  ratingHint: {
    fontSize: 13,
    color: "#0C831F",
    fontWeight: "600",
    marginTop: 8,
  },
  modalInput: {
    backgroundColor: "#F7F7F7",
    padding: 13,
    borderRadius: 11,
    fontSize: 14,
    color: "#333",
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  modalTextArea: { minHeight: 110, textAlignVertical: "top" },
  charCount: { fontSize: 11, color: "#bbb", textAlign: "right", marginTop: 5 },
  submitReviewBtn: {
    backgroundColor: "#0C831F",
    paddingVertical: 15,
    borderRadius: 13,
    alignItems: "center",
    marginTop: 6,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#0C831F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 4,
  },
  submitReviewBtnDisabled: {
    backgroundColor: "#C8C8C8",
    shadowOpacity: 0,
    elevation: 0,
  },
  submitReviewText: { color: "#fff", fontSize: 15, fontWeight: "800" },
});

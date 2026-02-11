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
import { SafeAreaView } from "react-native-safe-area-context";

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
  shelfLife?: {
    value: number;
    unit: string;
  };
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
  user: {
    _id: string; // ✅ THIS IS WHAT MONGO RETURNS
    name: string;
    avatar?: string;
  };
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
      const opacity = value > 100 ? 1 : value / 100;
      headerOpacity.setValue(opacity);
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
    if (id) {
      loadSimilarProducts();
    }
  }, [id]);

  const loadProduct = async () => {
    try {
      const res = await API.get(`/products/${id}`);
      const productData = res.data.data || res.data;
      setProduct(productData);
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
            (r: Review) => r.user?._id === user._id || r.user?._id === user._id,
          );

          if (myReview) {
            setExistingReview(myReview);
          } else {
            setExistingReview(null);
          }
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
      Animated.spring(addButtonScale, {
        toValue: 0.9,
        useNativeDriver: true,
      }),
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

  // ✅ FIXED: Increment handler
  const handleIncrement = () => {
    if (!cartItem || !product || !selectedVariant) return;

    // Check stock limit
    if (cartItem.qty >= selectedVariant.stock) {
      Alert.alert(
        "Stock Limit",
        `Only ${selectedVariant.stock} items available in stock`,
      );
      return;
    }

    updateQty(product._id, selectedVariant._id, cartItem.qty + 1);
  };

  // ✅ FIXED: Decrement handler
  const handleDecrement = () => {
    if (!cartItem || !product || !selectedVariant) return;
    updateQty(product._id, selectedVariant._id, cartItem.qty - 1);
  };

  // ✅ FIXED: Login-gated review submission
  const handleWriteReview = () => {
    if (!user) {
      Alert.alert("Login Required", "Please log in to write a review", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log In",
          onPress: () => router.push("/(auth)/login"),
        },
      ]);
      return;
    }

    if (existingReview) {
      // EDIT MODE
      setIsEditingReview(true);
      setUserRating(existingReview.rating);
      setReviewComment(existingReview.comment);
    } else {
      // CREATE MODE
      setIsEditingReview(false);
      setUserRating(0);
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
        // ✅ UPDATE REVIEW
        await API.put(`/reviews/${existingReview._id}`, {
          userId: user._id,
          rating: userRating,
          comment: reviewComment.trim(),
        });

        Alert.alert("Success", "Review updated successfully!");
      } else {
        // ✅ CREATE REVIEW
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
      setReviewComment("");
      setIsEditingReview(false);

      loadReviews();
      loadProduct();
    } catch (error: any) {
      const message =
        error?.response?.data?.message || "Failed to submit review";
      Alert.alert("Error", message);
    } finally {
      setSubmittingReview(false);
    }
  };

  const renderStarRating = (
    rating: number,
    size: number = 16,
    interactive: boolean = false,
    onPress?: (rating: number) => void,
  ) => {
    return (
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
  };

  const renderRatingDistribution = () => {
    const total = Object.values(ratingDistribution).reduce(
      (sum, count) => sum + count,
      0,
    );

    return (
      <View style={styles.distributionContainer}>
        {[5, 4, 3, 2, 1].map((rating) => {
          const count = ratingDistribution[rating] || 0;
          const percentage = total > 0 ? (count / total) * 100 : 0;

          return (
            <View key={rating} style={styles.distributionRow}>
              <Text style={styles.distributionLabel}>{rating}★</Text>
              <View style={styles.distributionBar}>
                <View
                  style={[styles.distributionFill, { width: `${percentage}%` }]}
                />
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
          <ActivityIndicator size="large" color="#2E7D32" />
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
            backgroundColor: headerOpacity.interpolate({
              inputRange: [0, 1],
              outputRange: ["rgba(255,255,255,0)", "rgba(255,255,255,1)"],
            }),
            borderBottomWidth: headerOpacity,
            borderBottomColor: "#eee",
          },
        ]}
      >
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1B5E20" />
        </TouchableOpacity>

        <Animated.Text
          style={[
            styles.headerTitle,
            {
              opacity: headerOpacity,
            },
          ]}
          numberOfLines={1}
        >
          {product.name}
        </Animated.Text>

        <TouchableOpacity style={styles.headerButton} onPress={() => {}}>
          <Ionicons name="share-outline" size={24} color="#1B5E20" />
        </TouchableOpacity>
      </Animated.View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false },
        )}
        scrollEventThrottle={16}
      >
        {/* Product Images Carousel */}
        <View style={styles.imageContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / width);
              setSelectedImageIndex(index);
            }}
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
              {displayImages.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.indicator,
                    selectedImageIndex === index && styles.activeIndicator,
                  ]}
                />
              ))}
            </View>
          )}

          {discount > 0 && (
            <View style={styles.discountBadge}>
              <Ionicons name="pricetag" size={14} color="#fff" />
              <Text style={styles.discountText}>{discount}% OFF</Text>
            </View>
          )}

          {product.trending && (
            <View style={styles.trendingBadge}>
              <Ionicons name="trending-up" size={14} color="#fff" />
              <Text style={styles.trendingText}>TRENDING</Text>
            </View>
          )}
        </View>

        {/* Product Info */}
        <View style={styles.contentContainer}>
          {/* Brand & Category */}
          <View style={styles.metaRow}>
            {product.brand && (
              <View style={styles.brandBadge}>
                <Ionicons name="ribbon" size={12} color="#2E7D32" />
                <Text style={styles.brandText}>{product.brand}</Text>
              </View>
            )}
            <View style={styles.categoryBadge}>
              <Ionicons name="grid" size={12} color="#666" />
              <Text style={styles.categoryText}>{product.category.name}</Text>
            </View>
          </View>

          {/* Product Name */}
          <Text style={styles.productName}>{product.name}</Text>

          {/* Rating & Reviews */}
          <TouchableOpacity
            style={styles.ratingRow}
            onPress={() => {
              // Scroll to reviews section
            }}
            activeOpacity={0.7}
          >
            {product.reviewsCount > 0 ? (
              <>
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={16} color="#FFB800" />
                  <Text style={styles.ratingText}>
                    {product.rating.toFixed(1)}
                  </Text>
                </View>
                <Text style={styles.reviewsText}>
                  ({product.reviewsCount}{" "}
                  {product.reviewsCount === 1 ? "review" : "reviews"})
                </Text>
                <Ionicons name="chevron-forward" size={14} color="#999" />
              </>
            ) : (
              <View style={styles.noReviewsBadge}>
                <Ionicons name="chatbubble-outline" size={14} color="#999" />
                <Text style={styles.noReviewsText}>
                  No reviews yet - Be the first!
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Variant Selector */}
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
                  const variantDiscount =
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
                            variant.stock === 0 && styles.variantDisabledText,
                          ]}
                        >
                          {variant.packSize}
                          {variant.packUnit}
                        </Text>
                        <Text
                          style={[
                            styles.variantPrice,
                            isSelected && styles.variantPriceSelected,
                            variant.stock === 0 && styles.variantDisabledText,
                          ]}
                        >
                          ₹{variant.price}
                        </Text>
                        {variantDiscount > 0 && (
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

          {/* Price Section */}
          <Animated.View
            style={[
              styles.priceSection,
              {
                transform: [
                  {
                    scale: variantAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.03],
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
                  <Ionicons name="arrow-down" size={12} color="#C62828" />
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
                <Ionicons name="close-circle" size={16} color="#F44336" />
                <Text style={styles.outOfStockText}>Out of Stock</Text>
              </View>
            )}
          </Animated.View>

          {/* Description */}
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
                    color="#2E7D32"
                  />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Product Details */}
          <View style={styles.detailsSection}>
            <Text style={styles.sectionTitle}>Product Details</Text>

            {product.shelfLife && (
              <View style={styles.detailRow}>
                <View style={styles.detailIconWrap}>
                  <Ionicons name="time-outline" size={18} color="#2E7D32" />
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
                  <Ionicons name="snow-outline" size={18} color="#2E7D32" />
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
                <Ionicons name="business-outline" size={18} color="#2E7D32" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Seller</Text>
                <Text style={styles.detailValue}>
                  {product.seller.sellerName}
                </Text>
              </View>
            </View>

            {product.seller.location && (
              <View style={styles.detailRow}>
                <View style={styles.detailIconWrap}>
                  <Ionicons name="location-outline" size={18} color="#2E7D32" />
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

          {/* Tags */}
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

          {/* Similar Products */}
          {similarProducts.length > 0 && (
            <View style={styles.similarSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>You may also like</Text>
                <TouchableOpacity>
                  <Text style={styles.seeAll}>See all</Text>
                </TouchableOpacity>
              </View>

              {similarLoading ? (
                <ActivityIndicator color="#2E7D32" />
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

                    return (
                      <TouchableOpacity
                        key={item._id}
                        style={styles.similarCard}
                        activeOpacity={0.8}
                        onPress={() =>
                          router.push({
                            pathname: "/product-detail",
                            params: { id: item._id },
                          })
                        }
                      >
                        <Image
                          source={{
                            uri:
                              item.image || "https://via.placeholder.com/150",
                          }}
                          style={styles.similarImage}
                        />

                        <Text numberOfLines={2} style={styles.similarName}>
                          {item.name}
                        </Text>

                        <Text style={styles.similarUnit}>
                          {variant.packSize}
                          {variant.packUnit}
                        </Text>

                        <View style={styles.similarPriceRow}>
                          <Text style={styles.similarPrice}>
                            ₹{variant.price}
                          </Text>
                          {variant.mrp > variant.price && (
                            <Text style={styles.similarMRP}>
                              ₹{variant.mrp}
                            </Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          )}

          {/* Reviews Section */}
          <View style={styles.reviewsSection}>
            <View style={styles.reviewsHeader}>
              <Text style={styles.sectionTitle}>
                Ratings & Reviews{" "}
                {product.reviewsCount > 0 && `(${product.reviewsCount})`}
              </Text>
              <TouchableOpacity
                style={styles.writeReviewBtn}
                onPress={handleWriteReview}
              >
                <Ionicons name="create-outline" size={18} color="#fff" />
                <Text style={styles.writeReviewText}>Write</Text>
              </TouchableOpacity>
            </View>

            {product.reviewsCount > 0 && (
              <>
                {/* Rating Summary */}
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

                {/* Reviews List */}
                {reviewsLoading ? (
                  <ActivityIndicator
                    color="#2E7D32"
                    style={{ marginTop: 20 }}
                  />
                ) : (
                  <View style={styles.reviewsList}>
                    {reviews.slice(0, 3).map((review) => (
                      <View key={review._id} style={styles.reviewCard}>
                        <View style={styles.reviewHeader}>
                          <View style={styles.reviewUser}>
                            <View style={styles.userAvatar}>
                              <Text style={styles.userAvatarText}>
                                {review.user.name.charAt(0).toUpperCase()}
                              </Text>
                            </View>
                            <View style={styles.reviewUserInfo}>
                              <View style={styles.reviewUserRow}>
                                <Text style={styles.reviewUserName}>
                                  {review.user.name}
                                </Text>
                                {review.verified && (
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
                                {new Date(review.createdAt).toLocaleDateString(
                                  "en-US",
                                  {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  },
                                )}
                              </Text>
                            </View>
                          </View>
                          {renderStarRating(review.rating, 14)}
                        </View>

                        {review.title && (
                          <Text style={styles.reviewTitle}>{review.title}</Text>
                        )}
                        <Text style={styles.reviewComment}>
                          {review.comment}
                        </Text>

                        {review.helpful > 0 && (
                          <View style={styles.reviewFooter}>
                            <TouchableOpacity style={styles.helpfulBtn}>
                              <Ionicons
                                name="thumbs-up-outline"
                                size={14}
                                color="#666"
                              />
                              <Text style={styles.helpfulText}>
                                Helpful ({review.helpful})
                              </Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    ))}

                    {reviews.length > 3 && (
                      <TouchableOpacity style={styles.viewAllReviewsBtn}>
                        <Text style={styles.viewAllReviewsText}>
                          View All {product.reviewsCount} Reviews
                        </Text>
                        <Ionicons
                          name="chevron-forward"
                          size={18}
                          color="#2E7D32"
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
                    size={48}
                    color="#2E7D32"
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

      {/* Sticky Add to Cart Button */}
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
              <Ionicons name="cart-outline" size={24} color="#fff" />
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
                color={cartItem.qty === 1 ? "#F44336" : "#2E7D32"}
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
                  cartItem.qty >= selectedVariant.stock ? "#BDBDBD" : "#2E7D32"
                }
              />
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={styles.cartButton}
          onPress={() => router.push("/cart")}
        >
          <Ionicons name="cart" size={24} color="#2E7D32" />
          {items.length > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{getCartItemCount()}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Review Modal */}
      <Modal
        visible={showReviewModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowReviewModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.submitReviewText}>
                {isEditingReview ? "Update Review" : "Submit Review"}
              </Text>
              <TouchableOpacity onPress={() => setShowReviewModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Product Preview */}
              <View style={styles.modalProductPreview}>
                <Image
                  source={{
                    uri: product.image || "https://via.placeholder.com/60",
                  }}
                  style={styles.modalProductImage}
                />
                <View>
                  <Text style={styles.modalProductName} numberOfLines={2}>
                    {product.name}
                  </Text>
                  <Text style={styles.modalProductVariant}>
                    {selectedVariant.packSize}
                    {selectedVariant.packUnit}
                  </Text>
                </View>
              </View>

              {/* Rating Selection */}
              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>Your Rating *</Text>
                {renderStarRating(userRating, 36, true, setUserRating)}
                {userRating > 0 && (
                  <Text style={styles.ratingHint}>
                    {userRating === 1 && "Poor"}
                    {userRating === 2 && "Fair"}
                    {userRating === 3 && "Good"}
                    {userRating === 4 && "Very Good"}
                    {userRating === 5 && "Excellent"}
                  </Text>
                )}
              </View>

              {/* Title Input */}
              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>Review Title (Optional)</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Summarize your experience"
                  placeholderTextColor="#999"
                  value={reviewTitle}
                  onChangeText={setReviewTitle}
                  maxLength={100}
                />
              </View>

              {/* Comment Input */}
              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>Your Review *</Text>
                <TextInput
                  style={[styles.modalInput, styles.modalTextArea]}
                  placeholder="Share your thoughts about this product"
                  placeholderTextColor="#999"
                  value={reviewComment}
                  onChangeText={setReviewComment}
                  multiline
                  numberOfLines={5}
                  maxLength={500}
                  textAlignVertical="top"
                />
                <Text style={styles.charCount}>{reviewComment.length}/500</Text>
              </View>

              {/* Submit Button */}
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
                    <Text style={styles.submitReviewText}>Submit Review</Text>
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
  safe: {
    flex: 1,
    backgroundColor: "#fff",
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },

  loadingText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },

  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  errorText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginTop: 16,
  },

  backButton: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: "#2E7D32",
    borderRadius: 12,
  },

  backButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  /* Header */
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },

  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    color: "#1B5E20",
    marginHorizontal: 12,
  },

  /* Image Section */
  imageContainer: {
    width: width,
    height: width,
    backgroundColor: "#F9F9F9",
    position: "relative",
  },

  imageWrapper: {
    width: width,
    height: width,
    justifyContent: "center",
    alignItems: "center",
  },

  productImage: {
    width: width * 0.85,
    height: width * 0.85,
  },

  imageIndicators: {
    position: "absolute",
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },

  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#D9D9D9",
  },

  activeIndicator: {
    width: 20,
    backgroundColor: "#2E7D32",
  },

  discountBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    backgroundColor: "#F44336",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    shadowColor: "#F44336",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },

  discountText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },

  trendingBadge: {
    position: "absolute",
    top: 16,
    left: 16,
    backgroundColor: "#2196F3",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    shadowColor: "#2196F3",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },

  trendingText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },

  /* Content */
  contentContainer: {
    padding: 16,
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },

  brandBadge: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  brandText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2E7D32",
  },

  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },

  categoryText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },

  productName: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1B1B1B",
    marginBottom: 12,
    lineHeight: 32,
    letterSpacing: -0.5,
  },

  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },

  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF9E6",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },

  ratingText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1B1B1B",
  },

  reviewsText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
    marginRight: 4,
  },

  noReviewsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },

  noReviewsText: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
  },

  /* Variant Section */
  variantSection: {
    marginBottom: 20,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1B1B1B",
    marginBottom: 12,
    letterSpacing: -0.3,
  },

  variantScrollContent: {
    paddingRight: 16,
  },

  variantCard: {
    minWidth: 100,
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
    padding: 14,
    marginRight: 10,
    borderWidth: 2,
    borderColor: "transparent",
    position: "relative",
  },

  variantCardSelected: {
    backgroundColor: "#E8F5E9",
    borderColor: "#2E7D32",
  },

  variantCardDisabled: {
    opacity: 0.5,
  },

  variantInfo: {
    alignItems: "center",
  },

  variantSize: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1B1B1B",
    marginBottom: 4,
  },

  variantSizeSelected: {
    color: "#2E7D32",
  },

  variantDisabledText: {
    color: "#999",
  },

  variantPrice: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1B1B1B",
  },

  variantPriceSelected: {
    color: "#2E7D32",
  },

  variantMRP: {
    fontSize: 11,
    color: "#999",
    textDecorationLine: "line-through",
    marginTop: 2,
  },

  selectedCheck: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#2E7D32",
    justifyContent: "center",
    alignItems: "center",
  },

  outOfStockOverlay: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#F44336",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },

  outOfStockOverlayText: {
    fontSize: 9,
    color: "#fff",
    fontWeight: "700",
  },

  lowStockBadge: {
    position: "absolute",
    bottom: 4,
    left: 4,
    right: 4,
    backgroundColor: "#FFF3E0",
    borderRadius: 6,
    paddingVertical: 3,
  },

  lowStockText: {
    fontSize: 9,
    color: "#F57C00",
    fontWeight: "600",
    textAlign: "center",
  },

  /* Price Section */
  priceSection: {
    backgroundColor: "#F9F9F9",
    padding: 16,
    borderRadius: 14,
    marginBottom: 20,
  },

  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  priceLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  currentPrice: {
    fontSize: 28,
    fontWeight: "800",
    color: "#2E7D32",
    letterSpacing: -0.5,
  },

  originalPrice: {
    fontSize: 16,
    color: "#999",
    textDecorationLine: "line-through",
  },

  savingsBadge: {
    backgroundColor: "#FFEBEE",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  savingsText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#C62828",
  },

  stockIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  stockDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4CAF50",
  },

  stockText: {
    fontSize: 13,
    color: "#4CAF50",
    fontWeight: "600",
  },

  outOfStockIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  outOfStockText: {
    fontSize: 13,
    color: "#F44336",
    fontWeight: "600",
  },

  /* Description */
  descriptionSection: {
    marginBottom: 20,
  },

  description: {
    fontSize: 14,
    lineHeight: 22,
    color: "#666",
  },

  readMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },

  readMore: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2E7D32",
  },

  /* Details */
  detailsSection: {
    backgroundColor: "#F9F9F9",
    padding: 16,
    borderRadius: 14,
    marginBottom: 20,
  },

  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
    gap: 12,
  },

  detailIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
  },

  detailContent: {
    flex: 1,
  },

  detailLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#999",
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  detailValue: {
    fontSize: 14,
    color: "#1B1B1B",
    fontWeight: "500",
  },

  /* Tags */
  tagsSection: {
    marginBottom: 20,
  },

  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  tag: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },

  tagText: {
    fontSize: 12,
    color: "#2E7D32",
    fontWeight: "600",
  },

  /* Similar Products */
  similarSection: {
    marginBottom: 20,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  seeAll: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2E7D32",
  },

  similarScrollContent: {
    paddingRight: 16,
  },

  similarCard: {
    width: 150,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    marginRight: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: "#F5F5F5",
  },

  similarImage: {
    width: "100%",
    height: 100,
    resizeMode: "contain",
    marginBottom: 10,
  },

  similarName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#222",
    marginBottom: 4,
  },

  similarUnit: {
    fontSize: 11,
    color: "#999",
    marginBottom: 6,
  },

  similarPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  similarPrice: {
    fontSize: 15,
    fontWeight: "800",
    color: "#2E7D32",
  },

  similarMRP: {
    fontSize: 11,
    color: "#999",
    textDecorationLine: "line-through",
  },

  /* Reviews Section */
  reviewsSection: {
    marginBottom: 20,
  },

  reviewsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  writeReviewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#2E7D32",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    shadowColor: "#2E7D32",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },

  writeReviewText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
  },

  ratingSummary: {
    backgroundColor: "#F9F9F9",
    padding: 18,
    borderRadius: 14,
    marginBottom: 16,
  },

  ratingScore: {
    alignItems: "center",
    marginBottom: 16,
  },

  ratingNumber: {
    fontSize: 48,
    fontWeight: "800",
    color: "#1B1B1B",
    marginBottom: 8,
    letterSpacing: -1,
  },

  ratingTotal: {
    fontSize: 12,
    color: "#666",
    marginTop: 8,
  },

  starContainer: {
    flexDirection: "row",
    gap: 4,
  },

  distributionContainer: {
    gap: 10,
  },

  distributionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  distributionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    width: 28,
  },

  distributionBar: {
    flex: 1,
    height: 8,
    backgroundColor: "#E0E0E0",
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
    color: "#666",
    fontWeight: "600",
    width: 32,
    textAlign: "right",
  },

  reviewsList: {
    gap: 12,
  },

  reviewCard: {
    backgroundColor: "#F9F9F9",
    padding: 16,
    borderRadius: 14,
  },

  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },

  reviewUser: {
    flexDirection: "row",
    gap: 12,
    flex: 1,
  },

  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#2E7D32",
    justifyContent: "center",
    alignItems: "center",
  },

  userAvatarText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  reviewUserInfo: {
    flex: 1,
  },

  reviewUserRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  reviewUserName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1B1B1B",
  },

  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },

  reviewDate: {
    fontSize: 11,
    color: "#999",
    marginTop: 2,
  },

  reviewTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1B1B1B",
    marginBottom: 6,
  },

  reviewComment: {
    fontSize: 14,
    lineHeight: 20,
    color: "#666",
  },

  reviewFooter: {
    flexDirection: "row",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },

  helpfulBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  helpfulText: {
    fontSize: 12,
    color: "#666",
  },

  viewAllReviewsBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#E8F5E9",
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },

  viewAllReviewsText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2E7D32",
  },

  noReviewsContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },

  noReviewsIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },

  noReviewsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#666",
    marginBottom: 6,
  },

  noReviewsSubtext: {
    fontSize: 14,
    color: "#999",
  },

  /* Footer */
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
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },

  addButtonContainer: {
    flex: 1,
  },

  addButton: {
    backgroundColor: "#2E7D32",
    paddingVertical: 16,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    shadowColor: "#2E7D32",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  addButtonDisabled: {
    backgroundColor: "#BDBDBD",
    shadowOpacity: 0,
    elevation: 0,
  },

  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },

  quantityControls: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    borderRadius: 14,
    padding: 6,
    gap: 8,
  },

  quantityButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },

  quantityButtonDisabled: {
    opacity: 0.5,
  },

  quantityDisplay: {
    flex: 1,
    alignItems: "center",
  },

  quantityText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#2E7D32",
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
    borderRadius: 14,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  cartBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#F44336",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },

  cartBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },

  /* Review Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },

  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: "90%",
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },

  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1B1B1B",
    letterSpacing: -0.5,
  },

  modalProductPreview: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#F9F9F9",
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },

  modalProductImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: "#fff",
  },

  modalProductName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1B1B1B",
    marginBottom: 4,
    flex: 1,
  },

  modalProductVariant: {
    fontSize: 12,
    color: "#666",
  },

  modalSection: {
    marginBottom: 24,
  },

  modalLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1B1B1B",
    marginBottom: 10,
  },

  ratingHint: {
    fontSize: 13,
    color: "#2E7D32",
    fontWeight: "600",
    marginTop: 8,
  },

  modalInput: {
    backgroundColor: "#F9F9F9",
    padding: 14,
    borderRadius: 12,
    fontSize: 15,
    color: "#333",
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },

  modalTextArea: {
    minHeight: 120,
    textAlignVertical: "top",
  },

  charCount: {
    fontSize: 11,
    color: "#999",
    textAlign: "right",
    marginTop: 6,
  },

  submitReviewBtn: {
    backgroundColor: "#2E7D32",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#2E7D32",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  submitReviewBtnDisabled: {
    backgroundColor: "#BDBDBD",
    shadowOpacity: 0,
    elevation: 0,
  },

  submitReviewText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
});

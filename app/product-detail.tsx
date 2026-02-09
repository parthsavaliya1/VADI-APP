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
    userId: string;
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
  const { items, addToCart, updateQuantity, getCartItemCount } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    null,
  );
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [similarLoading, setSimilarLoading] = useState(false);

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
        setReviews(res.data.data);
        setRatingDistribution(res.data.distribution);
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
    if (!product) return null;
    return items.find(
      (i) =>
        i.productId === product._id && i.variantId === selectedVariant?._id,
    );
  };

  const cartItem = getCartItem();

  const handleIncrement = () => {
    if (!cartItem) return;
    updateQuantity(cartItem.id, cartItem.qty + 1);
  };

  const handleDecrement = () => {
    if (!cartItem) return;
    updateQuantity(cartItem.id, cartItem.qty - 1);
  };

  const handleSubmitReview = async () => {
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

      // Replace with actual user data from auth context
      const userId = "6789abcd1234567890abcdef"; // Get from auth
      const userName = "User Name"; // Get from auth

      await API.post("/reviews", {
        product: product?._id,
        user: {
          userId,
          name: userName,
        },
        rating: userRating,
        title: reviewTitle.trim() || undefined,
        comment: reviewComment.trim(),
        verified: false, // Set based on purchase history
      });

      Alert.alert("Success", "Review submitted successfully!");
      setShowReviewModal(false);
      setUserRating(0);
      setReviewTitle("");
      setReviewComment("");

      // Reload reviews and product
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
      {/* Animated Header with fixed padding */}
      <Animated.View
        style={[
          styles.header,
          {
            backgroundColor: headerOpacity.interpolate({
              inputRange: [0, 1],
              outputRange: ["transparent", "#fff"],
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
                <Text style={styles.brandText}>{product.brand}</Text>
              </View>
            )}
            <View style={styles.categoryBadge}>
              <Ionicons name="pricetag" size={12} color="#666" />
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
                  ({product.reviewsCount} reviews)
                </Text>
              </>
            ) : (
              <Text style={styles.noReviewsText}>
                No reviews yet - Be the first!
              </Text>
            )}
          </TouchableOpacity>

          {/* Variant Selector */}
          <View style={styles.variantSection}>
            <Text style={styles.sectionTitle}>Select Size</Text>
            <View style={styles.variantGrid}>
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
                      ]}
                      onPress={() => handleVariantSelect(variant)}
                      activeOpacity={0.7}
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
                        {variantDiscount > 0 && (
                          <Text style={styles.variantMRP}>₹{variant.mrp}</Text>
                        )}
                      </View>
                      {isSelected && (
                        <View style={styles.selectedCheck}>
                          <Ionicons name="checkmark" size={8} color="#fff" />
                        </View>
                      )}
                      {variant.stock < variant.lowStockThreshold && (
                        <View style={styles.lowStockBadge}>
                          <Text style={styles.lowStockText}>
                            Only {variant.stock} left
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
            </View>
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
                      outputRange: [1, 1.05],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.priceRow}>
              <Text style={styles.currentPrice}>
                ₹{selectedVariant.price.toFixed(2)}
              </Text>
              {discount > 0 && (
                <>
                  <Text style={styles.originalPrice}>
                    ₹{selectedVariant.mrp.toFixed(2)}
                  </Text>
                  <View style={styles.savingsBadge}>
                    <Text style={styles.savingsText}>
                      Save ₹{savings.toFixed(0)}
                    </Text>
                  </View>
                </>
              )}
            </View>
            {selectedVariant.stock > 0 ? (
              <View style={styles.stockIndicator}>
                <View style={styles.stockDot} />
                <Text style={styles.stockText}>In Stock</Text>
              </View>
            ) : (
              <View style={styles.outOfStockIndicator}>
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
                >
                  <Text style={styles.readMore}>
                    {showFullDescription ? "Read less" : "Read more"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Product Details */}
          <View style={styles.detailsSection}>
            <Text style={styles.sectionTitle}>Product Details</Text>

            {product.shelfLife && (
              <View style={styles.detailRow}>
                <Ionicons name="time-outline" size={18} color="#666" />
                <Text style={styles.detailLabel}>Shelf Life:</Text>
                <Text style={styles.detailValue}>
                  {product.shelfLife.value} {product.shelfLife.unit}
                </Text>
              </View>
            )}

            {product.storageInstructions && (
              <View style={styles.detailRow}>
                <Ionicons name="snow-outline" size={18} color="#666" />
                <Text style={styles.detailLabel}>Storage:</Text>
                <Text style={styles.detailValue} numberOfLines={2}>
                  {product.storageInstructions}
                </Text>
              </View>
            )}

            <View style={styles.detailRow}>
              <Ionicons name="business-outline" size={18} color="#666" />
              <Text style={styles.detailLabel}>Seller:</Text>
              <Text style={styles.detailValue}>
                {product.seller.sellerName}
              </Text>
            </View>

            {product.seller.location && (
              <View style={styles.detailRow}>
                <Ionicons name="location-outline" size={18} color="#666" />
                <Text style={styles.detailLabel}>Location:</Text>
                <Text style={styles.detailValue}>
                  {product.seller.location.city}
                  {product.seller.location.area &&
                    `, ${product.seller.location.area}`}
                </Text>
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
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {similarProducts.length > 0 && (
            <View style={styles.similarSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Similar Products</Text>
                <TouchableOpacity>
                  <Text style={styles.seeAll}>See all</Text>
                </TouchableOpacity>
              </View>

              {similarLoading ? (
                <ActivityIndicator color="#2E7D32" />
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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

                        <Text style={styles.similarPrice}>
                          ₹{variant.price}
                        </Text>
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
                Ratings & Reviews ({product.reviewsCount})
              </Text>
              <TouchableOpacity
                style={styles.writeReviewBtn}
                onPress={() => setShowReviewModal(true)}
              >
                <Ionicons name="create-outline" size={18} color="#2E7D32" />
                <Text style={styles.writeReviewText}>Write Review</Text>
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
                      Based on {product.reviewsCount} reviews
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
                            <View>
                              <View style={styles.reviewUserRow}>
                                <Text style={styles.reviewUserName}>
                                  {review.user.name}
                                </Text>
                                {review.verified && (
                                  <View style={styles.verifiedBadge}>
                                    <Ionicons
                                      name="checkmark-circle"
                                      size={14}
                                      color="#4CAF50"
                                    />
                                    <Text style={styles.verifiedText}>
                                      Verified
                                    </Text>
                                  </View>
                                )}
                              </View>
                              <Text style={styles.reviewDate}>
                                {new Date(
                                  review.createdAt,
                                ).toLocaleDateString()}
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
                <Ionicons name="chatbubble-outline" size={48} color="#ccc" />
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
            >
              <Ionicons
                name={cartItem.qty === 1 ? "trash-outline" : "remove"}
                size={20}
                color="#2E7D32"
              />
            </TouchableOpacity>
            <View style={styles.quantityDisplay}>
              <Text style={styles.quantityText}>{cartItem.qty}</Text>
            </View>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={handleIncrement}
              disabled={cartItem.qty >= selectedVariant.stock}
            >
              <Ionicons name="add" size={20} color="#2E7D32" />
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
              <Text style={styles.modalTitle}>Write a Review</Text>
              <TouchableOpacity onPress={() => setShowReviewModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Rating Selection */}
              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>Your Rating *</Text>
                {renderStarRating(userRating, 32, true, setUserRating)}
              </View>

              {/* Title Input */}
              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>Review Title (Optional)</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Summarize your experience"
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
                  <Text style={styles.submitReviewText}>Submit Review</Text>
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
    borderRadius: 8,
  },

  backButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  /* Header - Fixed with proper padding */
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
    fontSize: 18,
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
    marginBottom: 8,
  },

  brandBadge: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
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
    paddingVertical: 4,
    borderRadius: 6,
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
    marginBottom: 8,
    lineHeight: 32,
  },

  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },

  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF9E6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
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
  },

  noReviewsText: {
    fontSize: 14,
    color: "#999",
    fontStyle: "italic",
  },

  /* Variant Section */
  variantSection: {
    marginTop: 20,
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1B1B1B",
    marginBottom: 12,
  },

  variantGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  variantCard: {
    width: (width - 52) / 3,
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: "transparent",
    position: "relative",
  },

  variantCardSelected: {
    backgroundColor: "#E8F5E9",
    borderColor: "#2E7D32",
  },

  variantInfo: {
    alignItems: "center",
  },

  variantSize: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1B1B1B",
    marginBottom: 4,
  },

  variantSizeSelected: {
    color: "#2E7D32",
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
    top: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 10,
    backgroundColor: "#2E7D32",
    justifyContent: "center",
    alignItems: "center",
  },

  lowStockBadge: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFF3E0",
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
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
    borderRadius: 12,
    marginBottom: 20,
  },

  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },

  currentPrice: {
    fontSize: 28,
    fontWeight: "800",
    color: "#2E7D32",
  },

  originalPrice: {
    fontSize: 18,
    color: "#999",
    textDecorationLine: "line-through",
    marginLeft: 12,
  },

  savingsBadge: {
    backgroundColor: "#FFEBEE",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
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

  readMore: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2E7D32",
    marginTop: 8,
  },

  /* Details */
  detailsSection: {
    backgroundColor: "#F9F9F9",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },

  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 8,
  },

  detailLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    width: 80,
  },

  detailValue: {
    flex: 1,
    fontSize: 14,
    color: "#1B1B1B",
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
    fontWeight: "500",
  },

  /* Reviews Section */
  reviewsSection: {
    marginTop: 20,
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
    gap: 4,
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },

  writeReviewText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2E7D32",
  },

  ratingSummary: {
    backgroundColor: "#F9F9F9",
    padding: 16,
    borderRadius: 12,
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
    gap: 8,
  },

  distributionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  distributionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    width: 28,
  },

  distributionBar: {
    flex: 1,
    height: 6,
    backgroundColor: "#E0E0E0",
    borderRadius: 3,
    overflow: "hidden",
  },

  distributionFill: {
    height: "100%",
    backgroundColor: "#FFB800",
  },

  distributionCount: {
    fontSize: 12,
    color: "#666",
    width: 32,
    textAlign: "right",
  },

  reviewsList: {
    gap: 12,
  },

  reviewCard: {
    backgroundColor: "#F9F9F9",
    padding: 16,
    borderRadius: 12,
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

  reviewUserRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },

  verifiedText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#4CAF50",
  },

  reviewDate: {
    fontSize: 12,
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
    paddingVertical: 12,
    borderRadius: 8,
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

  noReviewsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#666",
    marginTop: 16,
  },

  noReviewsSubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
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
    shadowRadius: 4,
    elevation: 8,
  },

  addButtonContainer: {
    flex: 1,
  },

  addButton: {
    backgroundColor: "#2E7D32",
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },

  addButtonDisabled: {
    backgroundColor: "#BDBDBD",
  },

  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  quantityControls: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    borderRadius: 12,
    padding: 4,
  },

  quantityButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },

  quantityDisplay: {
    flex: 1,
    alignItems: "center",
  },

  quantityText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#2E7D32",
  },

  cartButton: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
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
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },

  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: "90%",
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1B1B1B",
  },

  modalSection: {
    marginBottom: 20,
  },

  modalLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1B1B1B",
    marginBottom: 8,
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
    fontSize: 12,
    color: "#999",
    textAlign: "right",
    marginTop: 4,
  },

  submitReviewBtn: {
    backgroundColor: "#2E7D32",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },

  submitReviewBtnDisabled: {
    backgroundColor: "#BDBDBD",
  },

  submitReviewText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  similarSection: {
    marginTop: 24,
  },

  seeAll: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2E7D32",
  },

  similarCard: {
    width: 140,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    marginLeft: 14,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
  },

  similarImage: {
    width: "100%",
    height: 80,
    resizeMode: "contain",
    marginBottom: 8,
  },

  similarName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#222",
  },

  similarUnit: {
    fontSize: 11,
    color: "#777",
    marginVertical: 4,
  },

  similarPrice: {
    fontSize: 14,
    fontWeight: "800",
    color: "#2E7D32",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
});

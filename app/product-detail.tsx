import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCart } from "../context/CartContext";
import { API } from "../utils/api";

type Product = {
  _id: string;
  name: string;
  price: number;
  unit: string;
  image?: string;
  category?: string;
  description?: string;
  discount?: number;
  inStock?: boolean;
};

export default function ProductDetailScreen() {
  const params = useLocalSearchParams();
  const { id } = params;
  const { items, addToCart, updateQuantity, removeFromCart } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    loadProduct();
  }, [id]);

  const loadProduct = async () => {
    try {
      const res = await API.get(`/products/${id}`);
      setProduct(res.data);

      // Check if product is already in cart
      const cartItem = items.find((i) => i.id === id);
      if (cartItem) {
        setQuantity(cartItem.qty);
      }
    } catch (error) {
      console.error("Error loading product:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!product) return;

    const cartItem = items.find((i) => i.id === product._id);

    if (cartItem) {
      updateQuantity(product._id, quantity);
    } else {
      addToCart({
        id: product._id,
        name: product.name,
        price: product.price,
        qty: quantity,
      });
    }

    router.back();
  };

  const increaseQuantity = () => {
    setQuantity((prev) => prev + 1);
  };

  const decreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity((prev) => prev - 1);
    }
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

  if (!product) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#ccc" />
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

  const cartItem = items.find((i) => i.id === product._id);
  const isInCart = !!cartItem;

  return (
    <SafeAreaView style={styles.safe}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1B5E20" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Product Details</Text>
        <TouchableOpacity onPress={() => router.push("/cart")}>
          <View style={styles.cartIcon}>
            <Ionicons name="cart-outline" size={24} color="#1B5E20" />
            {items.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{items.length}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* PRODUCT IMAGE */}
        <View style={styles.imageContainer}>
          {product.discount && product.discount > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{product.discount}% OFF</Text>
            </View>
          )}
          <Image
            source={{ uri: product.image || "https://via.placeholder.com/300" }}
            style={styles.image}
          />
        </View>

        {/* PRODUCT INFO */}
        <View style={styles.infoContainer}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>
              {product.category || "General"}
            </Text>
          </View>

          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.unit}>{product.unit}</Text>

          <View style={styles.priceRow}>
            <View>
              <Text style={styles.price}>₹{product.price}</Text>
              {product.discount && (
                <Text style={styles.originalPrice}>
                  ₹{Math.round(product.price * 1.25)}
                </Text>
              )}
            </View>

            <View
              style={[
                styles.stockBadge,
                product.inStock !== false ? styles.inStock : styles.outOfStock,
              ]}
            >
              <Ionicons
                name={
                  product.inStock !== false
                    ? "checkmark-circle"
                    : "close-circle"
                }
                size={16}
                color={product.inStock !== false ? "#4CAF50" : "#F44336"}
              />
              <Text
                style={[
                  styles.stockText,
                  product.inStock !== false
                    ? styles.inStockText
                    : styles.outOfStockText,
                ]}
              >
                {product.inStock !== false ? "In Stock" : "Out of Stock"}
              </Text>
            </View>
          </View>

          {/* DESCRIPTION */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>
              {product.description ||
                `Fresh ${product.name} delivered right to your doorstep. High quality produce sourced from trusted farmers.`}
            </Text>
          </View>

          {/* FEATURES */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Features</Text>
            <View style={styles.featureList}>
              <View style={styles.featureItem}>
                <Ionicons name="leaf-outline" size={20} color="#4CAF50" />
                <Text style={styles.featureText}>100% Fresh</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={20}
                  color="#2196F3"
                />
                <Text style={styles.featureText}>Quality Assured</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="flash-outline" size={20} color="#FF9800" />
                <Text style={styles.featureText}>Fast Delivery</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="sync-outline" size={20} color="#9C27B0" />
                <Text style={styles.featureText}>Easy Returns</Text>
              </View>
            </View>
          </View>

          <View style={{ height: 120 }} />
        </View>
      </ScrollView>

      {/* BOTTOM ACTION BAR */}
      <View style={styles.bottomBar}>
        <View style={styles.quantityContainer}>
          <TouchableOpacity
            style={styles.quantityBtn}
            onPress={decreaseQuantity}
            disabled={quantity <= 1}
          >
            <Ionicons
              name="remove"
              size={20}
              color={quantity <= 1 ? "#ccc" : "#2E7D32"}
            />
          </TouchableOpacity>
          <Text style={styles.quantityText}>{quantity}</Text>
          <TouchableOpacity
            style={styles.quantityBtn}
            onPress={increaseQuantity}
          >
            <Ionicons name="add" size={20} color="#2E7D32" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[
            styles.addToCartBtn,
            product.inStock === false && styles.disabledBtn,
          ]}
          onPress={handleAddToCart}
          disabled={product.inStock === false}
        >
          <Ionicons name="cart" size={20} color="#fff" />
          <Text style={styles.addToCartText}>
            {isInCart ? "Update Cart" : "Add to Cart"}
          </Text>
          <Text style={styles.totalPrice}>
            ₹{(product.price * quantity).toFixed(2)}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F5F7F2",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    backgroundColor: "#F5F7F2",
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1B5E20",
  },
  cartIcon: {
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -6,
    right: -8,
    backgroundColor: "#2E7D32",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  imageContainer: {
    backgroundColor: "#fff",
    padding: 20,
    alignItems: "center",
    position: "relative",
  },
  discountBadge: {
    position: "absolute",
    top: 20,
    right: 20,
    backgroundColor: "#F44336",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    zIndex: 1,
  },
  discountText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  image: {
    width: 280,
    height: 280,
    resizeMode: "contain",
  },
  infoContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
    padding: 20,
  },
  categoryBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#E8F5E9",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 12,
  },
  categoryText: {
    color: "#2E7D32",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  productName: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1B5E20",
    marginBottom: 8,
  },
  unit: {
    fontSize: 14,
    color: "#777",
    marginBottom: 16,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  price: {
    fontSize: 28,
    fontWeight: "800",
    color: "#2E7D32",
  },
  originalPrice: {
    fontSize: 16,
    color: "#999",
    textDecorationLine: "line-through",
    marginTop: 4,
  },
  stockBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  inStock: {
    backgroundColor: "#E8F5E9",
  },
  outOfStock: {
    backgroundColor: "#FFEBEE",
  },
  stockText: {
    fontSize: 13,
    fontWeight: "600",
  },
  inStockText: {
    color: "#4CAF50",
  },
  outOfStockText: {
    color: "#F44336",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1B5E20",
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: "#666",
    lineHeight: 22,
  },
  featureList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F5F7F2",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    width: "48%",
  },
  featureText: {
    fontSize: 13,
    color: "#666",
    fontWeight: "600",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    padding: 16,
    flexDirection: "row",
    gap: 12,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F7F2",
    borderRadius: 12,
    paddingHorizontal: 8,
  },
  quantityBtn: {
    padding: 8,
  },
  quantityText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1B5E20",
    marginHorizontal: 16,
    minWidth: 30,
    textAlign: "center",
  },
  addToCartBtn: {
    flex: 1,
    backgroundColor: "#2E7D32",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    elevation: 4,
  },
  disabledBtn: {
    backgroundColor: "#ccc",
  },
  addToCartText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  totalPrice: {
    color: "#E8F5E9",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
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
    fontWeight: "700",
    color: "#666",
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: "#2E7D32",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

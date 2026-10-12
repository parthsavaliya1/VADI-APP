import { AppHeader } from "@/components/AppHeader";
import { useCart } from "@/context/CartContext";
import { API } from "@/utils/api";
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

type Product = {
  _id: string;
  name: string;
  price: number;
  unit: string;
  image?: string;
  category?: string;
  discount?: number;
};

export default function CategoryDetailScreen() {
  const params = useLocalSearchParams();
  const { category, title } = params;
  const { items, addToCart } = useCart();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadProducts();
  }, [category]);

  const loadProducts = async () => {
    try {
      const res = await API.get("/products");
      const filtered = res.data.filter(
        (p: Product) =>
          p.category?.toLowerCase() === category?.toString().toLowerCase(),
      );
      setProducts(filtered);
    } catch (error) {
      console.error("Failed to load products:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleAddToCart = (item: Product) => {
    addToCart({
      id: item._id,
      name: item.name,
      price: item.price,
      qty: 1,
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* HEADER */}
      <AppHeader title={String(title || "Category")} showBack showCart />

      {/* SEARCH */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={16} color="#777" style={{ marginLeft: 2, marginRight: 4 }} />
        <TextInput
          placeholder={`Search in ${title}`}
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={18} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* PRODUCTS COUNT */}
      {!loading && (
        <View style={styles.countContainer}>
          <Text style={styles.countText}>
            {filteredProducts.length} product
            {filteredProducts.length !== 1 ? "s" : ""} found
          </Text>
        </View>
      )}

      {/* PRODUCTS */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#B56A45" />
        </View>
      ) : filteredProducts.length > 0 ? (
        <FlatList
          data={filteredProducts}
          numColumns={2}
          keyExtractor={(item) => item._id}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <ProductCard
              item={item}
              onAdd={() => handleAddToCart(item)}
              inCart={items.some((i) => i.id === item._id)}
              onPress={() =>
                router.push({
                  pathname: "/product-detail",
                  params: { id: item._id },
                })
              }
            />
          )}
        />
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="basket-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No products found</Text>
          <Text style={styles.emptySubtext}>
            {searchQuery
              ? "Try a different search term"
              : "This category is currently empty"}
          </Text>
        </View>
      )}
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
        <View style={styles.imageWrap}>
          <Image
            source={{
              uri: item.image || "https://via.placeholder.com/150",
            }}
            style={styles.image}
          />
          {item.discount && item.discount > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{item.discount}% OFF</Text>
            </View>
          )}
        </View>

        <View style={styles.cardBody}>
        <Text numberOfLines={1} style={styles.name}>
          {item.name}
        </Text>
        <Text style={styles.price}>₹{item.price}</Text>
        <Text style={styles.unit} numberOfLines={1}>{item.unit}</Text>
        {item.discount && item.discount > 0 && (
          <Text style={styles.originalPrice}>
            ₹{Math.round(item.price * (1 + item.discount / 100))}
          </Text>
        )}

        <View style={styles.footerRow}>
          <TouchableOpacity
            style={[
              styles.addBtn,
              inCart && styles.addBtnActive,
              isAdding && styles.addBtnAdding,
            ]}
            onPress={(e) => {
              e.stopPropagation();
              handlePress();
            }}
            disabled={isAdding}
          >
            {isAdding ? (
              <ActivityIndicator size="small" color="#B56A45" />
            ) : inCart ? (
              <Ionicons name="checkmark" size={16} color="#fff" />
            ) : (
              <Text style={[styles.addText, inCart && styles.addTextActive]}>
                ADD
              </Text>
            )}
          </TouchableOpacity>
        </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F7F3EC",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#171717",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 8,
  },
  cartIcon: {
    position: "relative",
    padding: 4,
  },
  badge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: "#B56A45",
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
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingLeft: 14,
    paddingRight: 10,
    height: 42,
    marginHorizontal: 14,
    marginBottom: 8,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchInput: {
    marginLeft: 8,
    fontSize: 14,
    flex: 1,
    paddingVertical: 0,
    height: 42,
  },
  countContainer: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  countText: {
    fontSize: 13,
    color: "#666",
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  list: {
    padding: 14,
  },
  row: {
    justifyContent: "space-between",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    flex: 1,
    marginBottom: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E4DDD5",
    shadowColor: "#171717",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  imageWrap: {
    height: 120,
    width: "100%",
    backgroundColor: "#E7D9C8",
  },
  cardBody: {
    padding: 10,
  },
  discountBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#F3E4DB",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    zIndex: 1,
  },
  discountText: {
    color: "#8F4F32",
    fontSize: 11,
    fontWeight: "700",
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  name: {
    fontSize: 14,
    fontWeight: "600",
    color: "#171717",
  },
  unit: {
    fontSize: 12,
    color: "#6F6A64",
    marginTop: 4,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 8,
  },
  price: {
    fontSize: 15,
    fontWeight: "800",
    color: "#B56A45",
    marginTop: 4,
  },
  originalPrice: {
    fontSize: 11,
    color: "#999",
    textDecorationLine: "line-through",
    marginTop: 2,
  },
  addBtn: {
    backgroundColor: "#B56A45",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
    minWidth: 60,
    alignItems: "center",
  },
  addBtnActive: {
    backgroundColor: "#8F4F32",
  },
  addBtnAdding: {
    opacity: 0.7,
  },
  addText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 12,
  },
  addTextActive: {
    color: "#fff",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
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
    textAlign: "center",
  },
});

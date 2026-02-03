import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useCart } from "@/context/CartContext";
import { API } from "@/utils/api";

type CategoryData = {
  name: string;
  icon: string;
  color: string;
  count: number;
};

const categoryIcons: { [key: string]: { icon: string; color: string } } = {
  vegetables: { icon: "leaf", color: "#4CAF50" },
  fruits: { icon: "nutrition", color: "#FF9800" },
  dairy: { icon: "ice-cream", color: "#2196F3" },
  bakery: { icon: "pizza", color: "#FF6F00" },
  beverages: { icon: "beer", color: "#00BCD4" },
  snacks: { icon: "fast-food", color: "#E91E63" },
  meat: { icon: "restaurant", color: "#795548" },
  seafood: { icon: "fish", color: "#009688" },
  "personal care": { icon: "sparkles", color: "#9C27B0" },
  household: { icon: "home", color: "#607D8B" },
  "baby care": { icon: "heart", color: "#F06292" },
  "pet care": { icon: "paw", color: "#8D6E63" },
};

export default function CategoriesScreen() {
  const { items } = useCart();
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const res = await API.get("/products");
      const products = res.data;

      // Group products by category and count them
      const categoryMap: { [key: string]: number } = {};

      products.forEach((product: any) => {
        const category = product.category?.toLowerCase() || "other";
        categoryMap[category] = (categoryMap[category] || 0) + 1;
      });

      // Convert to array and add icons/colors
      const categoriesArray: CategoryData[] = Object.entries(categoryMap).map(
        ([name, count]) => ({
          name,
          icon: categoryIcons[name]?.icon || "apps",
          color: categoryIcons[name]?.color || "#666",
          count,
        }),
      );

      // Sort by count (descending)
      categoriesArray.sort((a, b) => b.count - a.count);

      setCategories(categoriesArray);
    } catch (error) {
      console.error("Failed to load categories:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleCategoryPress = (category: CategoryData) => {
    router.push({
      pathname: "/category",
      params: {
        category: category.name,
        title: category.name.charAt(0).toUpperCase() + category.name.slice(1),
      },
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Categories</Text>
        <TouchableOpacity onPress={() => router.push("/cart")}>
          <View style={styles.cartIcon}>
            <Ionicons name="cart-outline" size={26} color="#1B5E20" />
            {items.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{items.length}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      {/* SEARCH */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color="#777" />
        <TextInput
          placeholder="Search categories"
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

      {/* CATEGORIES GRID */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2E7D32" />
        </View>
      ) : filteredCategories.length > 0 ? (
        <FlatList
          data={filteredCategories}
          numColumns={2}
          keyExtractor={(item) => item.name}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.categoryCard}
              activeOpacity={0.7}
              onPress={() => handleCategoryPress(item)}
            >
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: item.color + "20" },
                ]}
              >
                <Ionicons
                  name={item.icon as any}
                  size={32}
                  color={item.color}
                />
              </View>
              <Text style={styles.categoryName}>
                {item.name.charAt(0).toUpperCase() + item.name.slice(1)}
              </Text>
              <Text style={styles.productCount}>
                {item.count} product{item.count !== 1 ? "s" : ""}
              </Text>
            </TouchableOpacity>
          )}
        />
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No categories found</Text>
          <Text style={styles.emptySubtext}>Try a different search term</Text>
        </View>
      )}
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
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1B5E20",
  },
  cartIcon: {
    position: "relative",
    padding: 4,
  },
  badge: {
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
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
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
  categoryCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    width: "48%",
    marginBottom: 14,
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#222",
    textAlign: "center",
    marginBottom: 4,
  },
  productCount: {
    fontSize: 12,
    color: "#777",
    textAlign: "center",
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

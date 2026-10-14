import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader } from "@/components/AppHeader";
import { API } from "@/utils/api";
import { C, themed } from "@/constants/theme";

type Category = {
  _id: string;
  name: string;
  slug: string;
  image?: string;
  sortOrder: number;
  showOnHome: boolean;
  isActive: boolean;
};

type CategoryUI = {
  _id: string;
  name: string;
  slug: string;
  image?: string;
  icon: string;
  color: string;
  count: number;
};

const categoryIcons: Record<string, { icon: string; color: string }> = themed(() => ({
  vegetables: { icon: "leaf", color: C.primary },
  fruits: { icon: "nutrition", color: "#C88A3D" },
  "dairy-bakery": { icon: "ice-cream", color: C.primaryDark },
  beverages: { icon: "beer", color: C.muted },
}));

export default function CategoriesScreen() {
  const [categories, setCategories] = useState<CategoryUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);

      const [catRes, prodRes] = await Promise.all([
        API.get("/categories"),
        API.get("/products"),
      ]);

      const categories: Category[] = catRes.data.data;
      const products = prodRes.data.data;

      // Count products per categoryId
      const countMap: Record<string, number> = {};

      products.forEach((p: any) => {
        const catId = p.category?._id;
        if (!catId) return;
        countMap[catId] = (countMap[catId] || 0) + 1;
      });

      // Build UI categories
      const uiCategories: CategoryUI[] = categories
        .filter((c) => c.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((c) => ({
          _id: c._id,
          name: c.name,
          slug: c.slug,
          image: c.image,
          icon: categoryIcons[c.slug]?.icon || "apps",
          color: categoryIcons[c.slug]?.color || "#607D8B",
          count: countMap[c._id] || 0,
        }));

      setCategories(uiCategories);
    } catch (err) {
      console.error("Failed to load categories", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleCategoryPress = (category: CategoryUI) => {
    router.push({
      pathname: "/category",
      params: {
        categoryId: category._id,
        categorySlug: category?.slug,
        title: category.name,
      },
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* HEADER */}
      <AppHeader title="Categories" showCart />

      {/* SEARCH */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={16} color={C.muted} style={{ marginLeft: 2, marginRight: 4 }} />
        <TextInput
          placeholder="Search categories"
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={18} color={C.muted} />
          </TouchableOpacity>
        )}
      </View>

      {/* CATEGORIES GRID */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : filteredCategories.length > 0 ? (
        <FlatList
          data={filteredCategories}
          numColumns={2}
          keyExtractor={(item) => item._id}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.categoryCard}
              activeOpacity={0.85}
              onPress={() => handleCategoryPress(item)}
            >
              <View style={styles.imageWrap}>
                {item.image ? (
                  <Image source={{ uri: item.image }} style={styles.categoryImage} />
                ) : (
                  <Ionicons
                    name={item.icon as any}
                    size={36}
                    color={C.primary}
                  />
                )}
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.categoryName} numberOfLines={1}>
                  {item.name.charAt(0).toUpperCase() + item.name.slice(1)}
                </Text>
                <Text style={styles.productCount}>
                  {item.count} product{item.count !== 1 ? "s" : ""}
                </Text>
              </View>
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

const styles = themed(() => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.page,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerLogo: {
    width: 30,
    height: 30,
    resizeMode: "contain",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: C.ink,
  },
  iconBtn: {
    position: "relative",
    padding: 6,
    backgroundColor: C.card,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  badge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: C.badge,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: C.badgeText,
    fontSize: 10,
    fontWeight: "700",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card,
    borderRadius: 12,
    paddingLeft: 14,
    paddingRight: 10,
    height: 42,
    marginHorizontal: 20,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: C.line,
  },
  searchInput: {
    marginLeft: 8,
    fontSize: 14,
    flex: 1,
    paddingVertical: 0,
    height: 42,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },
  row: {
    justifyContent: "space-between",
    gap: 12,
  },
  categoryCard: {
    backgroundColor: C.card,
    borderRadius: 20,
    flex: 1,
    marginBottom: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.line,
    shadowColor: C.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  imageWrap: {
    height: 120,
    width: "100%",
    backgroundColor: C.soft,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  cardBody: {
    padding: 10,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: "600",
    color: C.ink,
  },
  productCount: {
    fontSize: 12,
    color: C.muted,
    marginTop: 4,
    fontWeight: "700",
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
    color: C.muted,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: C.muted,
    marginTop: 8,
    textAlign: "center",
  },
}));

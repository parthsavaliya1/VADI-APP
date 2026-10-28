import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
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
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    void loadCategories();
  }, []);

  async function loadCategories(refresh = false) {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError(false);

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
      setError(true);
      console.error("Failed to load categories", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
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
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <AppHeader title="Categories" showCart />
      {loading ? (
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color={C.primary} /></View>
      ) : (
        <FlatList
          data={filteredCategories}
          numColumns={3}
          keyExtractor={(item) => item._id}
          style={styles.grid}
          contentContainerStyle={styles.list}
          columnWrapperStyle={styles.row}
          alwaysBounceVertical
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadCategories(true)} colors={[C.primary]} tintColor={C.primary} />}
          ListHeaderComponent={<>
            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={20} color={C.muted} />
              <TextInput accessibilityLabel="Search categories" placeholder="What are you looking for?" placeholderTextColor={C.muted} style={styles.searchInput} value={searchQuery} onChangeText={setSearchQuery} />
              {!!searchQuery && <TouchableOpacity accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={10} onPress={() => setSearchQuery("")}><Ionicons name="close-circle" size={18} color={C.muted} /></TouchableOpacity>}
            </View>
            <View style={styles.sectionHeading}>
              <Text style={styles.sectionTitle}>{searchQuery ? "Search results" : "All categories"}</Text>
              <Text style={styles.sectionCount}>{filteredCategories.length}</Text>
            </View>
            {error && categories.length > 0 && <Text style={styles.errorNote}>Could not update. Pull down to try again.</Text>}
          </>}
          ListEmptyComponent={<View style={styles.emptyState}>
            <Ionicons name={error ? "cloud-offline-outline" : "search-outline"} size={40} color={C.muted} />
            <Text style={styles.emptyText}>{error ? "Could not load categories" : "No categories found"}</Text>
            <Text style={styles.emptySubtext}>{error ? "Pull down to try again." : searchQuery ? "Try a different search." : "New categories will appear here."}</Text>
          </View>}
          renderItem={({ item, index }) => (
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${item.name}, ${item.count} products`} activeOpacity={0.7} onPress={() => handleCategoryPress(item)} style={styles.categoryTile}>
              <View style={[styles.imageWrap, { backgroundColor: tileColors[index % tileColors.length] }]}>
                <CategoryImage item={item} />
              </View>
              <Text style={styles.categoryName} numberOfLines={2}>{item.name.charAt(0).toUpperCase() + item.name.slice(1)}</Text>
              <Text style={styles.productCount}>{item.count} item{item.count !== 1 ? "s" : ""}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

function CategoryImage({ item }: { item: CategoryUI }) {
  const [failed, setFailed] = useState(false);
  return item.image && !failed
    ? <Image source={{ uri: item.image }} style={styles.categoryImage} onError={() => setFailed(true)} />
    : <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={38} color={item.color} />;
}

const tileColors = ["#EAF1E3", "#FFF0D9", "#F5E9E5", "#E7EFF5", "#F1EAF5", "#F5EEDC"];

const styles = themed(() => StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.page },
  grid: { flex: 1 },
  list: { paddingHorizontal: 18, paddingBottom: 32, flexGrow: 1 },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 16, paddingHorizontal: 14, minHeight: 48, marginTop: 4 },
  searchInput: { flex: 1, color: C.ink, fontSize: 13, paddingVertical: 12 },
  sectionHeading: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 26, marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: C.ink },
  sectionCount: { fontSize: 12, fontWeight: "600", color: C.muted, backgroundColor: C.soft, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, overflow: "hidden" },
  row: { gap: 12 },
  categoryTile: { flex: 1, maxWidth: "31%", alignItems: "center", marginBottom: 24 },
  imageWrap: { width: "100%", aspectRatio: 1, borderRadius: 24, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  categoryImage: { width: "86%", height: "86%", resizeMode: "contain" },
  categoryName: { color: C.ink, fontSize: 13, lineHeight: 18, fontWeight: "700", textAlign: "center", marginTop: 10, minHeight: 36 },
  productCount: { color: C.muted, fontSize: 11, marginTop: 3 },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorNote: { color: C.muted, fontSize: 12, marginBottom: 16 },
  emptyState: { alignItems: "center", paddingVertical: 70, paddingHorizontal: 20 },
  emptyText: { color: C.ink, fontWeight: "700", fontSize: 17, marginTop: 16 },
  emptySubtext: { color: C.muted, fontSize: 13, marginTop: 8, textAlign: "center" },
}));

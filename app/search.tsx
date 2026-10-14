import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { C } from "@/constants/theme";
import { API } from "@/utils/api";

type Variant = {
  price: number;
  mrp?: number;
  stock: number;
  packSize: number;
  packUnit: string;
  isDefault?: boolean;
};

type Product = {
  _id: string;
  name: string;
  image?: string;
  rating?: number;
  isOrganic?: boolean;
  discount?: number;
  variants?: Variant[];
};

type Category = { _id: string; name: string };

const SORTS = [
  { id: "createdAt:desc", label: "Newest" },
  { id: "price:asc", label: "Price ↑" },
  { id: "price:desc", label: "Price ↓" },
  { id: "rating:desc", label: "Rating" },
  { id: "name:asc", label: "Name" },
];

function displayVariant(product: Product) {
  const variants = product.variants || [];
  return variants.find((item) => item.isDefault) || variants[0];
}

export default function SearchScreen() {
  const params = useLocalSearchParams<{ q?: string }>();
  const [query, setQuery] = useState(String(params.q || ""));
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("createdAt:desc");
  const [inStock, setInStock] = useState(false);
  const [organic, setOrganic] = useState(false);
  const [onSale, setOnSale] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    API.get("/categories", { params: { isActive: true, limit: 50 } })
      .then((res) => setCategories(res.data?.data || []))
      .catch(() => setCategories([]));
  }, []);

  const search = useCallback(async () => {
    setLoading(true);
    try {
      const [sortBy, sortOrder] = sort.split(":");
      const res = await API.get("/products", {
        params: {
          search: query.trim() || undefined,
          category: category || undefined,
          sortBy,
          sortOrder,
          inStock: inStock ? "true" : undefined,
          isOrganic: organic ? "true" : undefined,
          onSale: onSale ? "true" : undefined,
          limit: 40,
        },
      });
      setProducts(res.data?.data || []);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [query, category, sort, inStock, organic, onSale]);

  useEffect(() => {
    const timer = setTimeout(search, 250);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.ink} />
        </TouchableOpacity>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={C.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search products, brands..."
            placeholderTextColor={C.muted}
            style={styles.input}
            returnKeyType="search"
            onSubmitEditing={search}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={C.muted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScroll}
        contentContainerStyle={styles.chips}
      >
        <Chip label="All" active={!category} onPress={() => setCategory("")} />
        {categories.map((item) => (
          <Chip
            key={item._id}
            label={item.name}
            active={category === item._id}
            onPress={() => setCategory(item._id)}
          />
        ))}
        <View style={styles.chipDivider} />
        {SORTS.map((item) => (
          <Chip
            key={item.id}
            label={item.label}
            active={sort === item.id}
            tone="sort"
            onPress={() => setSort(item.id)}
          />
        ))}
        <View style={styles.chipDivider} />
        <Chip label="In stock" active={inStock} tone="filter" onPress={() => setInStock((v) => !v)} />
        <Chip label="Organic" active={organic} tone="filter" onPress={() => setOrganic((v) => !v)} />
        <Chip label="On sale" active={onSale} tone="filter" onPress={() => setOnSale((v) => !v)} />
      </ScrollView>

      {loading ? (
        <ActivityIndicator color={C.primary} style={{ marginTop: 32 }} />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item._id}
          numColumns={2}
          contentContainerStyle={styles.list}
          columnWrapperStyle={styles.row}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="search-outline" size={48} color={C.line} />
              <Text style={styles.empty}>No products match these filters</Text>
            </View>
          }
          renderItem={({ item }) => {
            const variant = displayVariant(item);
            const out = !variant || variant.stock <= 0;
            const discount =
              variant?.mrp && variant.mrp > variant.price
                ? Math.round(((variant.mrp - variant.price) / variant.mrp) * 100)
                : item.discount || 0;
            return (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => router.push({ pathname: "/product-detail", params: { id: item._id } })}
              >
                <View style={styles.imageWrap}>
                  {discount > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{discount}% OFF</Text>
                    </View>
                  )}
                  {item.image ? (
                    <Image source={{ uri: item.image }} style={styles.image} />
                  ) : (
                    <View style={styles.image} />
                  )}
                </View>
                <Text numberOfLines={2} style={styles.name}>{item.name}</Text>
                <Text style={styles.unit}>
                  {variant ? `${variant.packSize}${variant.packUnit}` : ""}
                </Text>
                <View style={styles.footer}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.price}>{variant ? `₹${variant.price}` : "—"}</Text>
                    {discount > 0 && variant?.mrp ? (
                      <Text style={styles.mrp}>₹{variant.mrp}</Text>
                    ) : null}
                  </View>
                  <Text style={[styles.stock, out && styles.out]} numberOfLines={1}>
                    {out ? "Out" : variant.stock <= 5 ? `${variant.stock} left` : ""}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

function Chip({
  label,
  active,
  onPress,
  tone = "category",
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  tone?: "category" | "sort" | "filter";
}) {
  const on = active && (tone === "category" ? styles.chipOn : tone === "sort" ? styles.chipSort : styles.chipFilter);
  const textOn = active && (tone === "category" ? styles.chipTextOn : styles.chipTextAlt);
  return (
    <TouchableOpacity onPress={onPress} style={[styles.chip, on]} activeOpacity={0.8}>
      <Text style={[styles.chipText, textOn]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.page },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 8,
    gap: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    height: 42,
    backgroundColor: C.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: C.line,
    gap: 8,
  },
  input: {
    flex: 1,
    height: 42,
    paddingVertical: 0,
    fontSize: 13,
    color: C.ink,
  },
  chipScroll: {
    height: 36,
    flexGrow: 0,
    flexShrink: 0,
    marginBottom: 8,
  },
  chips: {
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    alignItems: "center",
    justifyContent: "center",
  },
  chipOn: { backgroundColor: C.primary, borderColor: C.primary },
  chipSort: { backgroundColor: C.soft, borderColor: C.primary },
  chipFilter: { backgroundColor: C.badge, borderColor: C.badge },
  chipDivider: { width: 1, height: 16, backgroundColor: C.line, marginHorizontal: 2 },
  chipText: { color: C.ink, fontSize: 12, fontWeight: "700" },
  chipTextOn: { color: "#fff" },
  chipTextAlt: { color: C.primary },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  row: { gap: 10 },
  card: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.line,
    overflow: "hidden",
  },
  imageWrap: { height: 120, backgroundColor: C.soft },
  image: { width: "100%", height: "100%" },
  badge: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 1,
    backgroundColor: C.badge,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  badgeText: { color: C.badgeText, fontSize: 8, fontWeight: "800" },
  name: {
    fontSize: 13,
    fontWeight: "700",
    color: C.ink,
    minHeight: 34,
    paddingHorizontal: 10,
    paddingTop: 8,
    lineHeight: 18,
  },
  unit: {
    fontSize: 11,
    color: C.muted,
    fontWeight: "600",
    paddingHorizontal: 10,
    marginTop: 2,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingBottom: 10,
    paddingTop: 6,
  },
  price: { fontSize: 15, fontWeight: "800", color: C.primary },
  mrp: { fontSize: 11, color: C.muted, textDecorationLine: "line-through" },
  stock: { fontSize: 11, fontWeight: "700", color: C.primary },
  out: { color: "#B91C1C" },
  emptyWrap: { alignItems: "center", paddingTop: 48 },
  empty: { textAlign: "center", color: C.muted, marginTop: 10, fontWeight: "700" },
});

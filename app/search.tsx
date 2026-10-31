import { ProductCard } from "@/components/ProductCard";
import { useCart } from "@/context/CartContext";
import { AnimatedLoader } from "@/components/AnimatedLoader";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { C } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useSearchHistory } from "@/utils/useSearchHistory";
import { API } from "@/utils/api";

type Variant = {
  _id: string;
  price: number;
  mrp: number;
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
  variants: Variant[];
};

type Category = { _id: string; name: string };

const SORTS = [
  { id: "createdAt:desc", label: "Newest" },
  { id: "price:asc", label: "Price ↑" },
  { id: "price:desc", label: "Price ↓" },
  { id: "rating:desc", label: "Rating" },
  { id: "name:asc", label: "Name" },
];

const DEFAULT_FILTERS = { category: "", sort: "createdAt:desc", inStock: false, organic: false, onSale: false };

function displayVariant(product: Product) {
  const variants = product.variants || [];
  return variants.find((item) => item.isDefault) || variants[0];
}

export default function SearchScreen() {
  const params = useLocalSearchParams<{ q?: string }>();
  const term = String(params.q || "");
  return <SearchContent key={term} initialQuery={term} />;
}

function SearchContent({ initialQuery }: { initialQuery: string }) {
  const { user } = useAuth();
  const { items, addToCart } = useCart();
  const recent = useSearchHistory(user?._id);
  const latestRequest = useRef(0);
  const savedTerm = useRef("");
  const { save } = recent;
  const [query, setQuery] = useState(initialQuery);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [searchWidth, setSearchWidth] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [draftFilters, setDraftFilters] = useState(DEFAULT_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { category, sort, inStock, organic, onSale } = filters;
  const activeFilterCount = Number(!!category) + Number(sort !== DEFAULT_FILTERS.sort)
    + Number(inStock) + Number(organic) + Number(onSale);
  const openFilters = () => {
    Keyboard.dismiss();
    setHistoryOpen(false);
    setDraftFilters({ ...filters });
    setFiltersOpen(true);
  };
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const saveSearch = (term = query) => {
    const clean = term.trim().replace(/\s+/g, " ").slice(0, 100);
    if (clean && savedTerm.current !== clean.toLowerCase()) {
      savedTerm.current = clean.toLowerCase();
      void save(clean).then((saved) => { if (!saved && savedTerm.current === clean.toLowerCase()) savedTerm.current = ""; });
    }
  };
  useEffect(() => {
    if (initialQuery.trim()) void save(initialQuery);
  }, [initialQuery, save]);

  useEffect(() => {
    API.get("/categories", { params: { isActive: true, limit: 50 } })
      .then((res) => setCategories(res.data?.data || []))
      .catch(() => setCategories([]));
  }, []);

  const search = useCallback(async () => {
    const request = ++latestRequest.current;
    setLoading(true);
    setSearchError("");
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
      if (request === latestRequest.current) setProducts(res.data?.data || []);
    } catch {
      if (request === latestRequest.current) { setProducts([]); setSearchError("Could not load products. Please try again."); }
    } finally {
      if (request === latestRequest.current) setLoading(false);
    }
  }, [query, category, sort, inStock, organic, onSale]);

  useEffect(() => {
    const timer = setTimeout(search, 250);
    return () => { clearTimeout(timer); latestRequest.current += 1; };
  }, [search]);

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.ink} />
        </TouchableOpacity>
        <View style={styles.searchAnchor} onLayout={({ nativeEvent }) => setSearchWidth(nativeEvent.layout.width)}>
        <View style={styles.searchControls}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={C.muted} />
          <TextInput
            autoFocus
            onFocus={() => setHistoryOpen(true)}
            onPressIn={() => setHistoryOpen(true)}
            maxLength={100}
            value={query}
            onChangeText={(text) => { savedTerm.current = ""; setHistoryOpen(false); setQuery(text); }}
            placeholder="Search products, brands..."
            placeholderTextColor={C.muted}
            style={styles.input}
            returnKeyType="search"
            onSubmitEditing={() => { setHistoryOpen(false); saveSearch(); void search(); }}
            onEndEditing={() => saveSearch()}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={C.muted} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.filterButton, activeFilterCount > 0 && styles.filterButtonActive]}
          onPress={openFilters}
          accessibilityRole="button"
          accessibilityLabel={`Search filters${activeFilterCount ? `, ${activeFilterCount} active` : ""}`}
          accessibilityState={{ expanded: filtersOpen }}
        >
          <Ionicons name="options-outline" size={22} color={activeFilterCount ? "#fff" : C.ink} />
          {activeFilterCount > 0 && <View style={styles.filterCount}><Text style={styles.filterCountText}>{activeFilterCount}</Text></View>}
        </TouchableOpacity>
        </View>
      {historyOpen && searchWidth > 0 && !query.trim() && recent.history.length > 0 && <View style={[styles.history, { width: searchWidth }]}>
        <View style={styles.historyHeader}>
          <TouchableOpacity style={[styles.historyClear, recent.busy && styles.historyDisabled]} disabled={recent.busy} onPress={() => { savedTerm.current = ""; setHistoryOpen(false); void recent.remove(); }} accessibilityRole="button" accessibilityLabel="Clear all search history" activeOpacity={0.7}>
            <Ionicons name="trash-outline" size={14} color="#B42318" />
            <Text style={styles.historyAction}>Clear all</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.historyClose} onPress={() => setHistoryOpen(false)} accessibilityRole="button" accessibilityLabel="Close search history"><Ionicons name="close" size={18} color={C.muted} /></TouchableOpacity>
        </View>
        <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {recent.history.map((term, index) => <View key={term.toLowerCase()} style={[styles.historyRow, index > 0 && styles.historyRowDivider]}>
            <TouchableOpacity style={styles.historyTerm} onPress={() => { setHistoryOpen(false); setQuery(term); saveSearch(term); }} accessibilityRole="button" accessibilityLabel={`Search again for ${term}`}>
              <View style={styles.historyIcon}><Ionicons name="time-outline" size={16} color={C.muted} /></View>
              <Text style={styles.historyText} numberOfLines={1}>{term}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.historyRemove} disabled={recent.busy} onPress={() => { savedTerm.current = ""; void recent.remove(term); }} accessibilityRole="button" accessibilityLabel={`Remove ${term} from history`}><Ionicons name="close" size={18} color={C.muted} /></TouchableOpacity>
          </View>)}
        </ScrollView>
      </View>}
        </View>
      </View>

      {!!recent.error && <TouchableOpacity onPress={() => { void recent.reload(); }}><Text style={styles.errorText}>{recent.error}</Text></TouchableOpacity>}
      {!!searchError && <TouchableOpacity onPress={() => { void search(); }}><Text style={styles.errorText}>{searchError} Tap to retry.</Text></TouchableOpacity>}

      {loading ? (
        <AnimatedLoader fullScreen />
      ) : (
        <FlatList
          data={products}
          onTouchStart={() => setHistoryOpen(false)}
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
          extraData={items}
          renderItem={({ item }) => {
            const variant = displayVariant(item);
            if (!variant) return null;
            const inCart = items.some(line => line.productId === item._id && line.variantId === variant._id);
            return <ProductCard
              item={item}
              inCart={inCart}
              disabled={variant.stock <= 0}
              onAdd={() => {
                saveSearch();
                void addToCart({
                  id: `${item._id}_${variant._id}`, productId: item._id, variantId: variant._id,
                  name: item.name, variantLabel: `${variant.packSize}${variant.packUnit}`,
                  price: variant.price, qty: 1, image: item.image,
                });
              }}
              onPress={() => { saveSearch(); router.push({ pathname: "/product-detail", params: { id: item._id } }); }}
            />;
          }}
        />
      )}
      <Modal visible={filtersOpen} transparent animationType="slide" onRequestClose={() => setFiltersOpen(false)} statusBarTranslucent>
        <View style={styles.drawerOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setFiltersOpen(false)} accessibilityRole="button" accessibilityLabel="Close search filters" />
          <SafeAreaView style={styles.drawer} edges={["bottom"]} accessibilityViewIsModal>
            <View style={styles.drawerHandle} />
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>Search options</Text>
              <TouchableOpacity style={styles.drawerClose} onPress={() => setFiltersOpen(false)} accessibilityRole="button" accessibilityLabel="Close search filters">
                <Ionicons name="close" size={24} color={C.ink} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.drawerScroll} contentContainerStyle={styles.drawerContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.sectionTitle}>Category</Text>
              <View style={styles.optionGroup}>
                <Chip label="All" active={!draftFilters.category} onPress={() => setDraftFilters(current => ({ ...current, category: "" }))} />
                {categories.map(item => <Chip key={item._id} label={item.name} active={draftFilters.category === item._id} onPress={() => setDraftFilters(current => ({ ...current, category: item._id }))} />)}
              </View>
              <Text style={styles.sectionTitle}>Sort by</Text>
              <View style={styles.optionGroup}>
                {SORTS.map(item => <Chip key={item.id} label={item.label} active={draftFilters.sort === item.id} tone="sort" onPress={() => setDraftFilters(current => ({ ...current, sort: item.id }))} />)}
              </View>
              <Text style={styles.sectionTitle}>Filters</Text>
              <View style={styles.optionGroup}>
                <Chip label="In stock" active={draftFilters.inStock} tone="filter" onPress={() => setDraftFilters(current => ({ ...current, inStock: !current.inStock }))} />
                <Chip label="Organic" active={draftFilters.organic} tone="filter" onPress={() => setDraftFilters(current => ({ ...current, organic: !current.organic }))} />
                <Chip label="On sale" active={draftFilters.onSale} tone="filter" onPress={() => setDraftFilters(current => ({ ...current, onSale: !current.onSale }))} />
              </View>
            </ScrollView>
            <View style={styles.drawerFooter}>
              <TouchableOpacity style={styles.resetButton} onPress={() => setDraftFilters({ ...DEFAULT_FILTERS })} accessibilityRole="button"><Text style={styles.resetText}>Reset</Text></TouchableOpacity>
              <TouchableOpacity style={styles.applyButton} onPress={() => { setFilters({ ...draftFilters }); setFiltersOpen(false); }} accessibilityRole="button"><Text style={styles.applyText}>Apply filters</Text></TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
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
    <TouchableOpacity onPress={onPress} style={[styles.chip, on]} activeOpacity={0.8} accessibilityRole="button" accessibilityState={{ selected: active }}>
      <Text style={[styles.chipText, textOn]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  searchControls: { flexDirection: "row", alignItems: "center", gap: 8 },
  searchAnchor: { flex: 1, minWidth: 0, position: "relative", zIndex: 20 },
  history: {
    position: "absolute", top: "100%", left: 0, marginTop: 6, overflow: "hidden",
    backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 16,
    elevation: 10, shadowColor: "#172B1D", shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08, shadowRadius: 8, paddingBottom: 4,
  },
  historyHeader: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  historyClear: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#FFF1F0", borderRadius: 8, paddingHorizontal: 10, minHeight: 32 },
  historyAction: { color: "#B42318", fontSize: 12, fontWeight: "700" },
  historyDisabled: { opacity: 0.5 },
  historyClose: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  historyRow: { flexDirection: "row", alignItems: "center", paddingLeft: 12, paddingRight: 4 },
  historyRowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
  historyTerm: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, minHeight: 52, paddingVertical: 8 },
  historyIcon: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: C.page },
  historyText: { flex: 1, minWidth: 0, color: C.ink, fontSize: 13, fontWeight: "500" },
  historyRemove: { width: 40, minHeight: 48, alignItems: "center", justifyContent: "center" },
  errorText: { color: "#B91C1C", fontSize: 12, padding: 12 },
  screen: { flex: 1, backgroundColor: C.page },
  topBar: {
    zIndex: 20,
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
    minWidth: 0,
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
    minWidth: 0,
    height: 42,
    paddingVertical: 0,
    fontSize: 13,
    color: C.ink,
  },
  filterButton: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: C.line, backgroundColor: C.card, alignItems: "center", justifyContent: "center" },
  filterButtonActive: { backgroundColor: C.primary, borderColor: C.primary },
  filterCount: { position: "absolute", right: -3, top: -4, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: C.ink, alignItems: "center", justifyContent: "center" },
  filterCountText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  drawerOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  drawer: { backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "85%", overflow: "hidden" },
  drawerHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.line, alignSelf: "center", marginTop: 10 },
  drawerHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingLeft: 20, paddingRight: 12, paddingVertical: 8 },
  drawerTitle: { color: C.ink, fontSize: 18, fontWeight: "800" },
  drawerClose: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  drawerScroll: { flexGrow: 0, flexShrink: 1 },
  drawerContent: { paddingHorizontal: 20, paddingBottom: 24 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: C.ink, marginTop: 12, marginBottom: 12 },
  optionGroup: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  drawerFooter: { flexDirection: "row", gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: C.line },
  resetButton: { paddingHorizontal: 24, minHeight: 46, borderRadius: 12, borderWidth: 1, borderColor: C.line, alignItems: "center", justifyContent: "center" },
  resetText: { fontSize: 14, fontWeight: "700", color: C.ink },
  applyButton: { flex: 1, minHeight: 46, borderRadius: 12, backgroundColor: C.primary, alignItems: "center", justifyContent: "center" },
  applyText: { fontSize: 14, fontWeight: "700", color: "#fff" },
  chip: {
    minHeight: 40,
    paddingVertical: 8,
    paddingHorizontal: 14,
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
  chipText: { color: C.ink, fontSize: 12, fontWeight: "700" },
  chipTextOn: { color: "#fff" },
  chipTextAlt: { color: C.primary },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  row: { gap: 10, marginBottom: 12 },
  emptyWrap: { alignItems: "center", paddingTop: 48 },
  empty: { textAlign: "center", color: C.muted, marginTop: 10, fontWeight: "700" },
});

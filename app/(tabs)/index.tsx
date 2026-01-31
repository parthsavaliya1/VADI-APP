import { Ionicons } from "@expo/vector-icons";
import { Redirect, router } from "expo-router";
import { useEffect, useState } from "react";
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useCart } from "../../context/CartContext";
import { API } from "../../utils/api";

const banners = [
  {
    id: "1",
    image: "https://i.imgur.com/8Km9tLL.png", // grocery banner
  },
  {
    id: "2",
    image: "https://i.imgur.com/Lz7Xc0S.png",
  },
];

const quickActions = [
  { id: "1", title: "Vegetables", icon: "leaf" },
  { id: "2", title: "Fruits", icon: "nutrition" },
  { id: "3", title: "Dairy", icon: "ice-cream" },
  { id: "4", title: "Offers", icon: "pricetag" },
];

type Product = {
  _id: string;
  name: string;
  price: number;
  unit: string;
  image?: string;
};

export default function HomeScreen() {
  const { user, loading: authLoading } = useAuth();
  const { items, addToCart } = useCart();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const total = items.reduce((s, i) => s + i.price * i.qty, 0);

  useEffect(() => {
    if (!user) return;

    API.get("/products")
      .then((res) => setProducts(res.data.slice(0, 12)))
      .finally(() => setLoading(false));
  }, [user]);

  if (authLoading) return null;
  if (!user) return <Redirect href="/signup" />;

  return (
    <SafeAreaView style={styles.safe}>
      {/* 🔝 HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.location}>Delivering to</Text>
          <Text style={styles.address}>Home • Maharashtra</Text>
        </View>

        <TouchableOpacity
          style={styles.cartIcon}
          onPress={() => router.push("/(tabs)/cart")}
        >
          <Ionicons name="cart-outline" size={26} color="#1B5E20" />
          {items.length > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{items.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* 🔍 SEARCH */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color="#777" />
        <TextInput
          placeholder="Search for products"
          style={styles.searchInput}
        />
      </View>

      {/* 📢 AD BANNER */}
      <FlatList
        data={banners}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        style={{ marginBottom: 16 }}
        renderItem={({ item }) => (
          <Image source={{ uri: item.image }} style={styles.banner} />
        )}
      />

      {/* ⚡ QUICK ACTIONS */}
      <View style={styles.quickRow}>
        {quickActions.map((item) => (
          <TouchableOpacity key={item.id} style={styles.quickCard}>
            <Ionicons name={item.icon as any} size={26} color="#2E7D32" />
            <Text style={styles.quickText}>{item.title}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Popular items</Text>

      {/* 🛒 PRODUCTS */}
      <FlatList
        data={products}
        numColumns={2}
        keyExtractor={(item) => item._id}
        columnWrapperStyle={{ justifyContent: "space-between" }}
        contentContainerStyle={{ paddingBottom: 120 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Image
              source={{
                uri: item.image || "https://via.placeholder.com/150",
              }}
              style={styles.image}
            />

            <Text numberOfLines={2} style={styles.name}>
              {item.name}
            </Text>

            <Text style={styles.unit}>{item.unit}</Text>

            <View style={styles.footerRow}>
              <Text style={styles.price}>₹{item.price}</Text>

              <TouchableOpacity
                style={styles.addBtn}
                onPress={() =>
                  addToCart({
                    id: item._id,
                    name: item.name,
                    price: item.price,
                    qty: 1,
                  })
                }
              >
                <Text style={styles.addText}>ADD</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <Text style={styles.sectionTitle}>Best deals today 🔥</Text>

      <FlatList
        data={products.slice(0, 6)}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item._id}
        style={{ marginBottom: 20 }}
        renderItem={({ item }) => (
          <View style={styles.dealCard}>
            <Image
              source={{ uri: item.image || "https://via.placeholder.com/150" }}
              style={styles.dealImage}
            />
            <Text numberOfLines={1} style={styles.dealName}>
              {item.name}
            </Text>
            <Text style={styles.dealPrice}>₹{item.price}</Text>
          </View>
        )}
      />

      {/* 🧾 STICKY CART FOOTER */}
      {items.length > 0 && (
        <TouchableOpacity
          style={styles.cartFooter}
          onPress={() => router.push("/(tabs)/cart")}
        >
          <View>
            <Text style={styles.cartFooterItems}>
              {items.length} item{items.length > 1 ? "s" : ""}
            </Text>
            <Text style={styles.cartFooterTotal}>₹{total}</Text>
          </View>

          <Text style={styles.cartFooterBtn}>View Cart →</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
<<<<<<< HEAD
  safe: {
    flex: 1,
    backgroundColor: "#F5F7F2",
    paddingHorizontal: 14,
  },

  /* HEADER */
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },

  dealCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 10,
    width: 130,
    marginRight: 12,
    elevation: 4,
  },

  dealImage: {
    width: "100%",
    height: 70,
    resizeMode: "contain",
    marginBottom: 6,
  },

  dealName: {
    fontSize: 12,
    fontWeight: "600",
  },

  dealPrice: {
    fontSize: 13,
    fontWeight: "800",
    color: "#2E7D32",
  },

  location: {
    fontSize: 12,
    color: "#666",
  },

  quickRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  quickCard: {
    backgroundColor: "#fff",
    width: "22%",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    elevation: 4,
  },

  quickText: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 6,
    color: "#1B5E20",
  },

  banner: {
    width: 280,
    height: 130,
    borderRadius: 16,
    marginRight: 14,
    resizeMode: "cover",
  },

  address: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1B5E20",
  },

  cartIcon: {
    position: "relative",
  },

  cartBadge: {
    position: "absolute",
    top: -6,
    right: -8,
    backgroundColor: "#2E7D32",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },

  cartBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },

  /* SEARCH */
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginVertical: 14,
    elevation: 3,
  },

  searchInput: {
    marginLeft: 8,
    fontSize: 15,
    flex: 1,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1B5E20",
    marginBottom: 10,
  },

  /* PRODUCT */
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    width: "48%",
    marginBottom: 14,
    elevation: 4,
  },

  image: {
    width: "100%",
    height: 100,
    resizeMode: "contain",
    marginBottom: 8,
  },

  name: {
    fontSize: 14,
    fontWeight: "600",
    color: "#222",
  },

  unit: {
    fontSize: 12,
    color: "#777",
    marginVertical: 2,
  },

  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },

  price: {
    fontSize: 15,
    fontWeight: "800",
    color: "#2E7D32",
  },

  addBtn: {
    borderWidth: 1,
    borderColor: "#2E7D32",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },

  addText: {
    color: "#2E7D32",
    fontWeight: "700",
    fontSize: 12,
  },

  /* CART FOOTER */
  cartFooter: {
    position: "absolute",
    bottom: 10,
    left: 14,
    right: 14,
    backgroundColor: "#2E7D32",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 10,
  },

  cartFooterItems: {
    color: "#E8F5E9",
    fontSize: 12,
  },

  cartFooterTotal: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },

  cartFooterBtn: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
=======
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
>>>>>>> 36492db (Initial commit)
  },
});

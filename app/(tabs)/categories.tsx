import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { API } from "../../utils/api";

type Category = {
  _id: string;
  name: string;
  slug: string;
};

export default function CategoriesScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get("/categories")
      .then((res) => setCategories(res.data))
      .catch((err) => console.log(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={{ padding: 20 }}>Loading categories...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Shop by Category</Text>

        <FlatList
          data={categories}
          numColumns={2}
          keyExtractor={(item) => item._id}
          columnWrapperStyle={{ justifyContent: "space-between" }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/category/${item.slug}`)}
            >
              {/* Emoji fallback based on name */}
              <Text style={styles.icon}>{getCategoryEmoji(item.slug)}</Text>
              <Text style={styles.name}>{item.name}</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

/* 🔹 Emoji helper (optional, keeps your UI same) */
function getCategoryEmoji(slug: string) {
  switch (slug) {
    case "vegetables":
      return "🥦";
    case "fruits":
      return "🍎";
    case "grains":
      return "🌾";
    case "dairy":
      return "🥛";
    case "spices":
      return "🌶️";
    default:
      return "🌱";
  }
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F6F7F2",
  },
  container: {
    padding: 15,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 15,
    color: "#1B5E20",
  },
  card: {
    backgroundColor: "#fff",
    width: "48%",
    borderRadius: 12,
    paddingVertical: 25,
    alignItems: "center",
    marginBottom: 15,
  },
  icon: {
    fontSize: 40,
    marginBottom: 10,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
  },
});

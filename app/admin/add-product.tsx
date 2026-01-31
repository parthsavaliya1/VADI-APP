import { Picker } from "@react-native-picker/picker";
import { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { API } from "../../utils/api";

type Category = {
  _id: string;
  name: string;
  slug?: string;
};

export default function AddProductScreen() {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("");
  const [category, setCategory] = useState("");
  const [image, setImage] = useState("");

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // 🔹 Load categories
  useEffect(() => {
    API.get("/categories")
      .then((res) => setCategories(res.data))
      .catch(() => Alert.alert("Error", "Failed to load categories"))
      .finally(() => setLoadingCategories(false));
  }, []);

  const submit = async () => {
    if (!name || !price || !unit || !category) {
      Alert.alert("Error", "Please fill all required fields");
      return;
    }

    try {
      setLoading(true);

      await API.post("/products", {
        name,
        price: Number(price),
        unit,
        category, // category id or slug
        image,
      });

      Alert.alert("Success", "Product added successfully ✅");

      // Reset form
      setName("");
      setPrice("");
      setUnit("");
      setCategory("");
      setImage("");
    } catch (err: any) {
      Alert.alert(
        "Error",
        err?.response?.data?.error || "Something went wrong",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Add Product (Admin)</Text>

        <TextInput
          placeholder="Product Name"
          value={name}
          onChangeText={setName}
          style={styles.input}
        />

        <TextInput
          placeholder="Price (number)"
          value={price}
          onChangeText={setPrice}
          keyboardType="numeric"
          style={styles.input}
        />

        <TextInput
          placeholder="Unit (kg / pcs)"
          value={unit}
          onChangeText={setUnit}
          style={styles.input}
        />

        {/* 🔽 CATEGORY DROPDOWN */}
        <View style={styles.pickerWrapper}>
          {loadingCategories ? (
            <Text style={styles.loadingText}>Loading categories...</Text>
          ) : (
            <Picker
              selectedValue={category}
              onValueChange={(value) => setCategory(value)}
            >
              <Picker.Item label="Select Category" value="" />
              {categories.map((cat) => (
                <Picker.Item
                  key={cat._id}
                  label={cat.name}
                  value={cat.slug || cat.name}
                />
              ))}
            </Picker>
          )}
        </View>

        <TextInput
          placeholder="Image URL (optional)"
          value={image}
          onChangeText={setImage}
          style={styles.input}
        />

        <TouchableOpacity
          style={[styles.btn, loading && { opacity: 0.6 }]}
          onPress={submit}
          disabled={loading}
        >
          <Text style={styles.btnText}>
            {loading ? "Saving..." : "SAVE PRODUCT"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F6F7F2",
  },
  container: {
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 20,
    color: "#1B5E20",
  },
  input: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  pickerWrapper: {
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 12,
    overflow: "hidden",
  },
  loadingText: {
    padding: 12,
    color: "#777",
  },
  btn: {
    backgroundColor: "#2E7D32",
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 20,
  },
  btnText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "700",
    fontSize: 16,
  },
});

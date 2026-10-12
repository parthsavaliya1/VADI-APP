import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/context/AuthContext";
import { showAlert } from "@/context/CustomAlertContext";
import { API } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Category = { _id: string; name: string };

const PACK_UNITS = ["kg", "g", "litre", "ml", "pcs"];

export default function SellerAddProductScreen() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [unit, setUnit] = useState("kg");
  const [packSize, setPackSize] = useState("1");
  const [price, setPrice] = useState("");
  const [mrp, setMrp] = useState("");
  const [stock, setStock] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    API.get("/categories")
      .then((res) => {
        const list = res.data?.data || res.data || [];
        setCategories(Array.isArray(list) ? list : []);
        if (list[0]?._id) setCategory(list[0]._id);
      })
      .catch(() => showAlert("Categories", "Could not load categories"));
  }, []);

  const submit = async () => {
    if (!name.trim() || !category || !price || !stock) {
      showAlert("Product", "Name, category, price, and stock are required");
      return;
    }
    setSaving(true);
    try {
      const res = await API.post("/products/mine", {
        userId: user?._id,
        name: name.trim(),
        description: description.trim(),
        category,
        unit,
        packUnit: unit,
        packSize: Number(packSize) || 1,
        price: Number(price),
        mrp: Number(mrp || price),
        stock: Number(stock),
      });
      showAlert("Product", res.data?.message || "Submitted", [
        { text: "OK", onPress: () => router.replace("/seller-products") },
      ]);
    } catch (error: any) {
      showAlert("Product", error.response?.data?.message || "Could not create product");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <AppHeader title="Add product" showBack showCart={false} />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <TextInput style={styles.input} placeholder="Product name" value={name} onChangeText={setName} />
        <TextInput
          style={[styles.input, { height: 80 }]}
          placeholder="Description"
          value={description}
          onChangeText={setDescription}
          multiline
        />
        <Text style={styles.label}>Category</Text>
        <View style={styles.pickerWrap}>
          <Picker selectedValue={category} onValueChange={setCategory}>
            {categories.map((item) => (
              <Picker.Item key={item._id} label={item.name} value={item._id} />
            ))}
          </Picker>
        </View>
        <Text style={styles.label}>Pack unit</Text>
        <View style={styles.pickerWrap}>
          <Picker selectedValue={unit} onValueChange={setUnit}>
            {PACK_UNITS.map((item) => (
              <Picker.Item key={item} label={item} value={item} />
            ))}
          </Picker>
        </View>
        <TextInput style={styles.input} placeholder="Pack size" keyboardType="decimal-pad" value={packSize} onChangeText={setPackSize} />
        <TextInput style={styles.input} placeholder="Selling price" keyboardType="decimal-pad" value={price} onChangeText={setPrice} />
        <TextInput style={styles.input} placeholder="MRP" keyboardType="decimal-pad" value={mrp} onChangeText={setMrp} />
        <TextInput style={styles.input} placeholder="Stock" keyboardType="number-pad" value={stock} onChangeText={setStock} />
        <TouchableOpacity style={styles.btn} onPress={submit} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Submit for approval</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFF8F4" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#fff",
  },
  title: { fontSize: 18, fontWeight: "800" },
  input: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 10 },
  label: { fontWeight: "700", marginBottom: 6, marginTop: 4 },
  pickerWrap: { backgroundColor: "#fff", borderRadius: 12, marginBottom: 10 },
  btn: { backgroundColor: "#C2410C", borderRadius: 14, padding: 16, alignItems: "center", marginTop: 8 },
  btnText: { color: "#fff", fontWeight: "800" },
});

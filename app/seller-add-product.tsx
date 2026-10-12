import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/context/AuthContext";
import { showAlert } from "@/context/CustomAlertContext";
import { API } from "@/utils/api";
import { uploadProductImage } from "@/utils/uploadImage";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Category = { _id: string; name: string };

type VariantDraft = {
  packSize: string;
  packUnit: string;
  price: string;
  mrp: string;
  stock: string;
  imageUri: string;
};

const PACK_UNITS = ["kg", "g", "litre", "ml", "pcs"];

const emptyVariant = (): VariantDraft => ({
  packSize: "1",
  packUnit: "g",
  price: "",
  mrp: "",
  stock: "",
  imageUri: "",
});

export default function SellerAddProductScreen() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [variants, setVariants] = useState<VariantDraft[]>([emptyVariant()]);
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

  const updateVariant = (
    index: number,
    field: keyof VariantDraft,
    value: string,
  ) => {
    setVariants((current) =>
      current.map((variant, i) =>
        i === index ? { ...variant, [field]: value } : variant,
      ),
    );
  };

  const pickImage = async (index: number) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showAlert("Photos", "Allow photo access to add a variant image");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      updateVariant(index, "imageUri", result.assets[0].uri);
    }
  };

  const submit = async () => {
    if (!name.trim() || !category) {
      showAlert("Product", "Name and category are required");
      return;
    }
    if (
      variants.some(
        (variant) => !variant.price.trim() || !variant.stock.trim() || !variant.packSize.trim(),
      )
    ) {
      showAlert("Product", "Each size needs a pack size, price, and stock");
      return;
    }

    setSaving(true);
    try {
      const uploaded = [];
      for (const variant of variants) {
        const image = variant.imageUri
          ? await uploadProductImage(variant.imageUri)
          : "";
        uploaded.push({
          packSize: Number(variant.packSize) || 1,
          packUnit: variant.packUnit,
          price: Number(variant.price),
          mrp: Number(variant.mrp || variant.price),
          stock: Number(variant.stock),
          image,
          isDefault: uploaded.length === 0,
        });
      }

      const res = await API.post("/products/mine", {
        userId: user?._id,
        name: name.trim(),
        description: description.trim(),
        category,
        unit: uploaded[0].packUnit,
        variants: uploaded,
        image: uploaded.find((variant) => variant.image)?.image || "",
      });
      showAlert("Product", res.data?.message || "Submitted", [
        { text: "OK", onPress: () => router.replace("/seller-products") },
      ]);
    } catch (error: any) {
      showAlert(
        "Product",
        error.response?.data?.message || error.message || "Could not create product",
      );
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

        <Text style={styles.label}>Sizes</Text>
        <Text style={styles.hint}>
          Add one image for each size, for example 500g, 300g, and 200g. The app shows that image when the customer selects the size.
        </Text>

        {variants.map((variant, index) => (
          <View key={index} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Size {index + 1}</Text>
              {variants.length > 1 && (
                <TouchableOpacity
                  onPress={() =>
                    setVariants((current) => current.filter((_, i) => i !== index))
                  }
                >
                  <Ionicons name="trash-outline" size={18} color="#C2410C" />
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.label}>Pack unit</Text>
            <View style={styles.pickerWrap}>
              <Picker
                selectedValue={variant.packUnit}
                onValueChange={(value) => updateVariant(index, "packUnit", value)}
              >
                {PACK_UNITS.map((item) => (
                  <Picker.Item key={item} label={item} value={item} />
                ))}
              </Picker>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Pack size"
              keyboardType="decimal-pad"
              value={variant.packSize}
              onChangeText={(value) => updateVariant(index, "packSize", value)}
            />
            <TextInput
              style={styles.input}
              placeholder="Selling price"
              keyboardType="decimal-pad"
              value={variant.price}
              onChangeText={(value) => updateVariant(index, "price", value)}
            />
            <TextInput
              style={styles.input}
              placeholder="MRP"
              keyboardType="decimal-pad"
              value={variant.mrp}
              onChangeText={(value) => updateVariant(index, "mrp", value)}
            />
            <TextInput
              style={styles.input}
              placeholder="Stock"
              keyboardType="number-pad"
              value={variant.stock}
              onChangeText={(value) => updateVariant(index, "stock", value)}
            />
            <TouchableOpacity style={styles.imageBtn} onPress={() => pickImage(index)}>
              {variant.imageUri ? (
                <Image source={{ uri: variant.imageUri }} style={styles.preview} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="image-outline" size={22} color="#C2410C" />
                  <Text style={styles.imageBtnText}>Add image for this size</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => setVariants((current) => [...current, emptyVariant()])}
        >
          <Text style={styles.secondaryBtnText}>Add another size</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btn} onPress={submit} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Submit product</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFF8F4" },
  input: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 10 },
  label: { fontWeight: "700", marginBottom: 6, marginTop: 4 },
  hint: { color: "#6B7280", marginBottom: 10, lineHeight: 18 },
  pickerWrap: { backgroundColor: "#fff", borderRadius: 12, marginBottom: 10 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F3E8E2",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardTitle: { fontWeight: "800" },
  imageBtn: { marginTop: 4 },
  imagePlaceholder: {
    height: 90,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F3E8E2",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  imageBtnText: { color: "#C2410C", fontWeight: "700" },
  preview: { width: "100%", height: 140, borderRadius: 12 },
  secondaryBtn: {
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#C2410C",
    marginBottom: 10,
  },
  secondaryBtnText: { color: "#C2410C", fontWeight: "800" },
  btn: { backgroundColor: "#C2410C", borderRadius: 14, padding: 16, alignItems: "center", marginTop: 8 },
  btnText: { color: "#fff", fontWeight: "800" },
});

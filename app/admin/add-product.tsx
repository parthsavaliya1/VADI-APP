import { API } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Category = {
  _id: string;
  name: string;
  slug?: string;
};

export default function AddProductScreen() {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("");
  const [stock, setStock] = useState("");
  const [category, setCategory] = useState("");
  const [discount, setDiscount] = useState("");
  const [image, setImage] = useState<string | null>(null);

  // New toggle states
  const [featured, setFeatured] = useState(false);
  const [trending, setTrending] = useState(false);
  const [bestDeal, setBestDeal] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Animation
  const [scaleAnim] = useState(new Animated.Value(1));

  /* ======================
     LOAD CATEGORIES
  ====================== */
  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      console.log("📂 Loading categories...");
      const res = await API.get("/categories");
      setCategories(res.data);
      console.log(res.data);
    } catch (error: any) {
      console.error("❌ Categories error:", error);
      Alert.alert(
        "Error",
        "Failed to load categories. Please check your internet connection.",
      );
    } finally {
      setLoadingCategories(false);
    }
  };

  /* ======================
     IMAGE PICKER
  ====================== */
  const pickImage = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permission Required",
          "Please allow gallery access to upload product images",
          [{ text: "OK" }],
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        allowsEditing: true,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets[0]) {
        setImage(result.assets[0].uri);
        console.log("📸 Image selected:", result.assets[0].uri);

        // Success animation
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.05,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
        ]).start();
      }
    } catch (error) {
      console.error("❌ Image picker error:", error);
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  };

  const removeImage = () => {
    Alert.alert("Remove Image", "Are you sure you want to remove this image?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          setImage(null);
          console.log("🗑️ Image removed");
        },
      },
    ]);
  };

  /* ======================
     VALIDATION
  ====================== */
  const validateForm = () => {
    if (!name.trim()) {
      Alert.alert("Validation Error", "Please enter product name");
      return false;
    }

    if (!price || isNaN(Number(price)) || Number(price) <= 0) {
      Alert.alert(
        "Validation Error",
        "Please enter a valid price greater than 0",
      );
      return false;
    }

    if (!unit.trim()) {
      Alert.alert(
        "Validation Error",
        "Please enter unit (e.g., kg, pcs, liter)",
      );
      return false;
    }

    if (!stock || isNaN(Number(stock)) || Number(stock) < 0) {
      Alert.alert(
        "Validation Error",
        "Please enter a valid stock quantity (0 or more)",
      );
      return false;
    }

    if (!category) {
      Alert.alert("Validation Error", "Please select a category from dropdown");
      return false;
    }

    // Validate discount
    if (
      discount &&
      (isNaN(Number(discount)) ||
        Number(discount) < 0 ||
        Number(discount) > 100)
    ) {
      Alert.alert("Validation Error", "Discount must be between 0 and 100");
      return false;
    }

    return true;
  };

  /* ======================
     SUBMIT PRODUCT
  ====================== */
  const submit = async () => {
    console.log("🚀 Submit button pressed");

    if (!validateForm()) {
      console.log("❌ Validation failed");
      return;
    }

    try {
      setLoading(true);
      setUploadProgress(10);

      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("price", price.trim());
      formData.append("unit", unit.trim());
      formData.append("stock", stock.trim());
      formData.append("category", category);

      // Add new fields
      formData.append("discount", discount || "0");
      formData.append("featured", featured.toString());
      formData.append("trending", trending.toString());
      formData.append("bestDeal", bestDeal.toString());

      console.log("📦 Form data prepared:", {
        name: name.trim(),
        price: price.trim(),
        unit: unit.trim(),
        stock: stock.trim(),
        category: category,
        discount: discount || "0",
        featured,
        trending,
        bestDeal,
        hasImage: !!image,
      });

      // Handle image properly for React Native
      if (image) {
        const filename = image.split("/").pop() || "product.jpg";
        const match = /\.(\w+)$/.exec(filename);
        const ext = match?.[1]?.toLowerCase();

        const type =
          ext === "jpg" || ext === "jpeg"
            ? "image/jpeg"
            : ext === "png"
              ? "image/png"
              : "image/jpeg";

        const imageFile = {
          uri: Platform.OS === "ios" ? image.replace("file://", "") : image,
          name: filename,
          type: type,
        };

        formData.append("image", {
          uri: Platform.OS === "ios" ? image.replace("file://", "") : image,
          name: filename,
          type,
        } as any);
        console.log("📸 Image attached:", imageFile);
      }

      setUploadProgress(30);

      console.log("📤 Sending request to /products...");

      const response = await API.post("/products", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setUploadProgress(100);

      console.log("✅ Product created successfully:", response.data);

      // Success animation
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      Alert.alert("Success! 🎉", "Product added successfully", [
        {
          text: "Add Another",
          onPress: resetForm,
        },
        {
          text: "Done",
          style: "cancel",
        },
      ]);

      resetForm();
    } catch (err: any) {
      console.error("❌ Upload error:", err);
      console.error("❌ Error response:", err?.response?.data);
      console.error("❌ Error message:", err?.message);

      let errorMessage = "Failed to add product. Please try again.";

      if (err?.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err?.response?.status === 400) {
        errorMessage = "Invalid data. Please check all fields.";
      } else if (err?.response?.status === 500) {
        errorMessage = "Server error. Please try again later.";
      } else if (err?.message === "Network Error") {
        errorMessage =
          "Cannot connect to server.\n\n" +
          "Please check:\n" +
          "• Backend is running\n" +
          "• IP address is correct\n" +
          "• Same WiFi network";
      } else if (err?.message) {
        errorMessage = err.message;
      }

      Alert.alert("Upload Failed", errorMessage);
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const resetForm = () => {
    setName("");
    setPrice("");
    setUnit("");
    setStock("");
    setCategory("");
    setDiscount("");
    setImage(null);
    setFeatured(false);
    setTrending(false);
    setBestDeal(false);
    console.log("🔄 Form reset");
  };

  /* ======================
     UI
  ====================== */
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Ionicons name="add-circle" size={32} color="#2E7D32" />
            </View>
            <Text style={styles.title}>Add New Product</Text>
            <Text style={styles.subtitle}>Fill in the details below</Text>
          </View>

          {/* Main Card */}
          <Animated.View
            style={[styles.card, { transform: [{ scale: scaleAnim }] }]}
          >
            {/* Product Name */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Ionicons name="cube-outline" size={16} color="#2E7D32" />
                <Text style={styles.label}>Product Name *</Text>
              </View>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g., Fresh Organic Apples"
                placeholderTextColor="#999"
                style={styles.input}
              />
            </View>

            {/* Price & Unit Row */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <View style={styles.labelRow}>
                  <Ionicons name="cash-outline" size={16} color="#2E7D32" />
                  <Text style={styles.label}>Price *</Text>
                </View>
                <View style={styles.priceInput}>
                  <Text style={styles.currencySymbol}>₹</Text>
                  <TextInput
                    value={price}
                    onChangeText={setPrice}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor="#999"
                    style={[styles.input, { flex: 1, paddingLeft: 8 }]}
                  />
                </View>
              </View>

              <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                <View style={styles.labelRow}>
                  <Ionicons name="scale-outline" size={16} color="#2E7D32" />
                  <Text style={styles.label}>Unit *</Text>
                </View>
                <TextInput
                  value={unit}
                  onChangeText={setUnit}
                  placeholder="kg / pcs"
                  placeholderTextColor="#999"
                  style={styles.input}
                />
              </View>
            </View>

            {/* Stock & Discount Row */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <View style={styles.labelRow}>
                  <Ionicons name="layers-outline" size={16} color="#2E7D32" />
                  <Text style={styles.label}>Stock *</Text>
                </View>
                <TextInput
                  value={stock}
                  onChangeText={setStock}
                  keyboardType="number-pad"
                  placeholder="Quantity"
                  placeholderTextColor="#999"
                  style={styles.input}
                />
                {stock && Number(stock) < 10 && Number(stock) >= 0 && (
                  <Text style={styles.warningText}>⚠️ Low stock</Text>
                )}
              </View>

              <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                <View style={styles.labelRow}>
                  <Ionicons name="pricetag-outline" size={16} color="#2E7D32" />
                  <Text style={styles.label}>Discount %</Text>
                </View>
                <TextInput
                  value={discount}
                  onChangeText={setDiscount}
                  keyboardType="number-pad"
                  placeholder="0-100"
                  placeholderTextColor="#999"
                  style={styles.input}
                />
              </View>
            </View>

            {/* Category Dropdown */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Ionicons name="grid-outline" size={16} color="#2E7D32" />
                <Text style={styles.label}>Category *</Text>
              </View>
              <View style={styles.pickerWrapper}>
                {loadingCategories ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator color="#2E7D32" size="small" />
                    <Text style={styles.loadingText}>
                      Loading categories...
                    </Text>
                  </View>
                ) : categories.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No categories found</Text>
                    <TouchableOpacity onPress={loadCategories}>
                      <Text style={styles.retryText}>Tap to retry</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Picker
                    selectedValue={category}
                    onValueChange={(value) => {
                      setCategory(value);
                      console.log("📂 Category selected:", value);
                    }}
                    itemStyle={{ color: "#000" }}
                    dropdownIconColor="#333"
                  >
                    <Picker.Item
                      label="-- Select a category --"
                      value=""
                      color="#999"
                    />
                    {categories.map((cat) => (
                      <Picker.Item
                        key={cat._id}
                        label={cat.name}
                        value={cat.slug || cat._id}
                        color="#333"
                      />
                    ))}
                  </Picker>
                )}
              </View>
              {category && (
                <View style={styles.selectedBadge}>
                  <Ionicons name="checkmark-circle" size={16} color="#2E7D32" />
                  <Text style={styles.selectedText}>
                    {
                      categories.find((c) => (c.slug || c._id) === category)
                        ?.name
                    }{" "}
                    selected
                  </Text>
                </View>
              )}
            </View>

            {/* Feature Toggles Section */}
            <View style={styles.divider} />

            <View style={styles.sectionHeader}>
              <Ionicons name="star-outline" size={18} color="#2E7D32" />
              <Text style={styles.sectionTitle}>Feature Options</Text>
            </View>

            {/* Best Deal Toggle */}
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <View style={styles.toggleLabelRow}>
                  <Text style={styles.toggleEmoji}>🔥</Text>
                  <Text style={styles.toggleLabel}>Best Deal</Text>
                </View>
                <Text style={styles.toggleDesc}>
                  Show in "Best Deals Today" section
                </Text>
              </View>
              <Switch
                value={bestDeal}
                onValueChange={setBestDeal}
                trackColor={{ false: "#D0D0D0", true: "#A5D6A7" }}
                thumbColor={bestDeal ? "#2E7D32" : "#f4f3f4"}
              />
            </View>

            {/* Trending Toggle */}
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <View style={styles.toggleLabelRow}>
                  <Text style={styles.toggleEmoji}>📈</Text>
                  <Text style={styles.toggleLabel}>Trending</Text>
                </View>
                <Text style={styles.toggleDesc}>
                  Show in "Trending Now" section
                </Text>
              </View>
              <Switch
                value={trending}
                onValueChange={setTrending}
                trackColor={{ false: "#D0D0D0", true: "#A5D6A7" }}
                thumbColor={trending ? "#2E7D32" : "#f4f3f4"}
              />
            </View>

            {/* Featured Toggle */}
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <View style={styles.toggleLabelRow}>
                  <Text style={styles.toggleEmoji}>⭐</Text>
                  <Text style={styles.toggleLabel}>Featured</Text>
                </View>
                <Text style={styles.toggleDesc}>
                  Show in "Featured Products" section
                </Text>
              </View>
              <Switch
                value={featured}
                onValueChange={setFeatured}
                trackColor={{ false: "#D0D0D0", true: "#A5D6A7" }}
                thumbColor={featured ? "#2E7D32" : "#f4f3f4"}
              />
            </View>

            <View style={styles.divider} />

            {/* Image Upload */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Ionicons name="image-outline" size={16} color="#2E7D32" />
                <Text style={styles.label}>Product Image</Text>
                <Text style={styles.optional}>(Optional)</Text>
              </View>

              {!image ? (
                <TouchableOpacity
                  style={styles.imageBtn}
                  onPress={pickImage}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="cloud-upload-outline"
                    size={40}
                    color="#2E7D32"
                  />
                  <Text style={styles.imageBtnText}>Tap to Upload Image</Text>
                  <Text style={styles.imageBtnSubtext}>JPG, PNG up to 5MB</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: image }} style={styles.imagePreview} />
                  <TouchableOpacity
                    style={styles.removeImageBtn}
                    onPress={removeImage}
                  >
                    <Ionicons name="close-circle" size={32} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.changeImageBtn}
                    onPress={pickImage}
                  >
                    <Ionicons name="refresh" size={16} color="#2E7D32" />
                    <Text style={styles.changeImageText}>Change</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </Animated.View>

          {/* Active Features Summary */}
          {(bestDeal || trending || featured) && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Active Features:</Text>
              <View style={styles.summaryRow}>
                {bestDeal && (
                  <View style={styles.summaryBadge}>
                    <Text style={styles.summaryBadgeText}>🔥 Best Deal</Text>
                  </View>
                )}
                {trending && (
                  <View style={styles.summaryBadge}>
                    <Text style={styles.summaryBadgeText}>📈 Trending</Text>
                  </View>
                )}
                {featured && (
                  <View style={styles.summaryBadge}>
                    <Text style={styles.summaryBadgeText}>⭐ Featured</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Progress Bar */}
          {loading && uploadProgress > 0 && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[styles.progressFill, { width: `${uploadProgress}%` }]}
                />
              </View>
              <Text style={styles.progressText}>
                Uploading... {uploadProgress}%
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
              onPress={submit}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.saveBtnText}>ADDING...</Text>
                </View>
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.saveBtnText}>ADD PRODUCT</Text>
                </>
              )}
            </TouchableOpacity>

            {(name ||
              price ||
              unit ||
              stock ||
              category ||
              image ||
              discount ||
              bestDeal ||
              trending ||
              featured) &&
              !loading && (
                <TouchableOpacity
                  style={styles.resetBtn}
                  onPress={() => {
                    Alert.alert(
                      "Clear Form",
                      "Are you sure you want to clear all fields?",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Clear",
                          style: "destructive",
                          onPress: resetForm,
                        },
                      ],
                    );
                  }}
                >
                  <Ionicons name="refresh-outline" size={18} color="#666" />
                  <Text style={styles.resetBtnText}>Clear Form</Text>
                </TouchableOpacity>
              )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ======================
   STYLES
====================== */
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F3F6F4",
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  headerIcon: {
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1B5E20",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  inputGroup: {
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
    marginLeft: 6,
  },
  optional: {
    fontSize: 12,
    color: "#999",
    fontWeight: "400",
    marginLeft: 4,
  },
  input: {
    backgroundColor: "#F8F9FA",
    padding: 14,
    borderRadius: 12,
    fontSize: 15,
    color: "#333",
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  priceInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    paddingLeft: 14,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2E7D32",
  },
  row: {
    flexDirection: "row",
  },
  warningText: {
    fontSize: 12,
    color: "#F57C00",
    marginTop: 6,
    fontWeight: "500",
  },
  pickerWrapper: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E8E8E8",
    minHeight: 50,
    justifyContent: "center",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
  loadingText: {
    marginLeft: 8,
    color: "#666",
    fontSize: 14,
  },
  emptyState: {
    padding: 16,
    alignItems: "center",
  },
  emptyText: {
    color: "#666",
    fontSize: 14,
  },
  retryText: {
    color: "#2E7D32",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 8,
  },
  selectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  selectedText: {
    color: "#2E7D32",
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 6,
  },
  divider: {
    height: 1,
    backgroundColor: "#E8E8E8",
    marginVertical: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginLeft: 8,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    marginBottom: 12,
  },
  toggleInfo: {
    flex: 1,
    marginRight: 12,
  },
  toggleLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  toggleEmoji: {
    fontSize: 16,
    marginRight: 8,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#333",
  },
  toggleDesc: {
    fontSize: 12,
    color: "#666",
  },
  summaryCard: {
    backgroundColor: "#E8F5E9",
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2E7D32",
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  summaryBadge: {
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  summaryBadgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2E7D32",
  },
  imageBtn: {
    backgroundColor: "#F1F8F4",
    padding: 32,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#C8E6C9",
    borderStyle: "dashed",
  },
  imageBtnText: {
    marginTop: 12,
    fontWeight: "700",
    color: "#2E7D32",
    fontSize: 16,
  },
  imageBtnSubtext: {
    color: "#666",
    fontSize: 12,
    marginTop: 4,
  },
  imagePreviewContainer: {
    position: "relative",
  },
  imagePreview: {
    width: "100%",
    height: 240,
    borderRadius: 16,
    backgroundColor: "#F0F0F0",
  },
  removeImageBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 20,
  },
  changeImageBtn: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  changeImageText: {
    color: "#2E7D32",
    fontWeight: "700",
    marginLeft: 4,
    fontSize: 14,
  },
  progressContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: "#E8E8E8",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#2E7D32",
  },
  progressText: {
    textAlign: "center",
    color: "#666",
    fontSize: 12,
    marginTop: 6,
    fontWeight: "600",
  },
  buttonContainer: {
    marginTop: 20,
  },
  saveBtn: {
    backgroundColor: "#2E7D32",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    shadowColor: "#2E7D32",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  saveBtnDisabled: {
    opacity: 0.6,
    shadowOpacity: 0,
    elevation: 0,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 1,
    marginLeft: 8,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  resetBtn: {
    backgroundColor: "#F5F5F5",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  resetBtnText: {
    color: "#666",
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 6,
  },
});

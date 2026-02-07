import { useAuth } from "@/context/AuthContext";
import { API } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type AddressPayload = {
  user?: string;
  type: "home" | "work" | "other";
  phone: string;
  addressLine1: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
  name?: string;
  addressLine2?: string;
  landmark?: string;
};

export default function AddAddressScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const isEditing = !!params.id;

  const [type, setType] = useState<"home" | "work" | "other">("home");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [landmark, setLandmark] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isEditing || !params.id) return;

    const loadAddress = async () => {
      try {
        const res = await API.get(`/addresses/single/${params.id}`);
        const addr = res.data;

        setType(addr.type);
        setName(addr.name || "");
        setPhone(addr.phone || "");
        setAddressLine1(addr.addressLine1 || "");
        setAddressLine2(addr.addressLine2 || "");
        setLandmark(addr.landmark || "");
        setCity(addr.city || "");
        setState(addr.state || "");
        setPincode(addr.pincode || "");
        setIsDefault(!!addr.isDefault);
      } catch (err) {
        Alert.alert("Error", "Failed to load address");
        router.back();
      }
    };

    loadAddress();
  }, [isEditing, params.id]);

  const ADDRESS_TYPES = ["home", "work", "other"] as const;

  const validateForm = () => {
    if (!phone.trim()) {
      Alert.alert("Error", "Please enter phone number");
      return false;
    }
    if (phone.length !== 10) {
      Alert.alert("Error", "Please enter valid 10-digit phone number");
      return false;
    }
    if (!addressLine1.trim()) {
      Alert.alert("Error", "Please enter address line 1");
      return false;
    }
    if (!city.trim()) {
      Alert.alert("Error", "Please enter city");
      return false;
    }
    if (!state.trim()) {
      Alert.alert("Error", "Please enter state");
      return false;
    }
    if (!pincode.trim() || pincode.length !== 6) {
      Alert.alert("Error", "Please enter valid 6-digit pincode");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      const cleanPhone = phone.replace(/\D/g, "").trim();

      const addressData: AddressPayload = {
        user: user?._id,
        type,
        phone: cleanPhone,
        addressLine1,
        city,
        state,
        pincode,
        isDefault,
      };

      // Only add optional fields if they have values
      if (name.trim()) {
        addressData.name = name.trim();
      }

      if (addressLine2.trim()) {
        addressData.addressLine2 = addressLine2.trim();
      }

      if (landmark.trim()) {
        addressData.landmark = landmark.trim();
      }

      // Note: If you want to add location coordinates (for geo features),
      // you can use expo-location to get current coordinates:
      // import * as Location from 'expo-location';
      // const location = await Location.getCurrentPositionAsync({});
      // addressData.location = {
      //   type: "Point",
      //   coordinates: [location.coords.longitude, location.coords.latitude]
      // };

      if (isEditing) {
        await API.put(`/addresses/${params.id}`, addressData);
        Alert.alert("Success", "Address updated successfully");
      } else {
        await API.post("/addresses", addressData);
        Alert.alert("Success", "Address added successfully");
      }

      router.back();
    } catch (error: any) {
      console.error("Address save error:", error);
      Alert.alert(
        "Error",
        error.response?.data?.error || "Failed to save address",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#1B5E20" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEditing ? "Edit Address" : "Add New Address"}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* ADDRESS TYPE */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Address Type</Text>
            <View style={styles.typeRow}>
              {ADDRESS_TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.typeButton,
                    type === t && styles.typeButtonActive,
                  ]}
                  onPress={() => setType(t)}
                >
                  <Ionicons
                    name={
                      t === "home"
                        ? "home"
                        : t === "work"
                          ? "briefcase"
                          : "location"
                    }
                    size={18}
                    color={type === t ? "#fff" : "#2E7D32"}
                  />
                  <Text
                    style={[
                      styles.typeText,
                      type === t && styles.typeTextActive,
                    ]}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* NAME (Optional) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Display Name (Optional)</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="pricetag-outline" size={20} color="#666" />
              <TextInput
                style={styles.input}
                placeholder="e.g., My Home, Office, etc."
                value={name}
                onChangeText={setName}
                maxLength={50}
              />
            </View>
          </View>

          {/* PHONE */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Phone Number <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.inputContainer}>
              <Ionicons name="call-outline" size={20} color="#666" />
              <TextInput
                editable={!isEditing}
                style={styles.input}
                placeholder="10-digit phone number"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>
          </View>

          {/* ADDRESS LINE 1 */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Address Line 1 <Text style={styles.required}>*</Text>
            </Text>
            <View style={[styles.inputContainer, styles.textAreaContainer]}>
              <Ionicons
                name="home-outline"
                size={20}
                color="#666"
                style={styles.textAreaIcon}
              />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="House No., Building Name, Street"
                value={addressLine1}
                onChangeText={setAddressLine1}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* ADDRESS LINE 2 (Optional) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Address Line 2 (Optional)</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="location-outline" size={20} color="#666" />
              <TextInput
                style={styles.input}
                placeholder="Area, Colony, Sector"
                value={addressLine2}
                onChangeText={setAddressLine2}
              />
            </View>
          </View>

          {/* LANDMARK (Optional) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Landmark (Optional)</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="navigate-outline" size={20} color="#666" />
              <TextInput
                style={styles.input}
                placeholder="Nearby landmark"
                value={landmark}
                onChangeText={setLandmark}
              />
            </View>
          </View>

          {/* CITY */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              City <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.inputContainer}>
              <Ionicons name="business-outline" size={20} color="#666" />
              <TextInput
                style={styles.input}
                placeholder="Enter city"
                value={city}
                onChangeText={setCity}
              />
            </View>
          </View>

          {/* STATE & PINCODE ROW */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>
                State <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.inputContainer}>
                <Ionicons name="map-outline" size={20} color="#666" />
                <TextInput
                  style={styles.input}
                  placeholder="State"
                  value={state}
                  onChangeText={setState}
                />
              </View>
            </View>

            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>
                Pincode <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.inputContainer}>
                <Ionicons name="pin-outline" size={20} color="#666" />
                <TextInput
                  style={styles.input}
                  placeholder="6-digit"
                  value={pincode}
                  onChangeText={setPincode}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>
            </View>
          </View>

          {/* DEFAULT ADDRESS TOGGLE */}
          <TouchableOpacity
            style={styles.defaultToggle}
            onPress={() => setIsDefault(!isDefault)}
          >
            <View style={styles.defaultToggleLeft}>
              <Ionicons
                name={
                  isDefault ? "checkmark-circle" : "checkmark-circle-outline"
                }
                size={24}
                color={isDefault ? "#2E7D32" : "#999"}
              />
              <View style={styles.defaultToggleText}>
                <Text style={styles.defaultToggleTitle}>
                  Set as default address
                </Text>
                <Text style={styles.defaultToggleSubtitle}>
                  Use this address for all orders by default
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          <View style={{ height: 20 }} />
        </ScrollView>

        {/* SAVE BUTTON */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.saveButtonText}>
              {loading
                ? "Saving..."
                : isEditing
                  ? "Update Address"
                  : "Save Address"}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F5F7F2",
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1B5E20",
  },
  content: {
    flex: 1,
    paddingHorizontal: 14,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  required: {
    color: "#D32F2F",
  },
  typeRow: {
    flexDirection: "row",
    gap: 10,
  },
  typeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#2E7D32",
    borderRadius: 12,
    paddingVertical: 12,
    elevation: 2,
  },
  typeButtonActive: {
    backgroundColor: "#2E7D32",
    borderColor: "#2E7D32",
  },
  typeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2E7D32",
  },
  typeTextActive: {
    color: "#fff",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  textAreaContainer: {
    alignItems: "flex-start",
    paddingVertical: 12,
  },
  textAreaIcon: {
    marginTop: 2,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#222",
    marginLeft: 10,
  },
  textArea: {
    height: 60,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  defaultToggle: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  defaultToggleLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  defaultToggleText: {
    marginLeft: 12,
    flex: 1,
  },
  defaultToggleTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#222",
    marginBottom: 2,
  },
  defaultToggleSubtitle: {
    fontSize: 12,
    color: "#777",
  },
  footer: {
    padding: 14,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  saveButton: {
    backgroundColor: "#2E7D32",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});

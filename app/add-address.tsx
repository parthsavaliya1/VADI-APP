import { useAuth } from "@/context/AuthContext";
import { API } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
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

export default function AddAddressScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const isEditing = !!params.id;

  const [name, setName] = useState(params.name?.toString() || "");
  const [addressLine, setAddressLine] = useState(
    params.addressLine?.toString() || "",
  );
  const [city, setCity] = useState(params.city?.toString() || "");
  const [state, setState] = useState(params.state?.toString() || "");
  const [pincode, setPincode] = useState(params.pincode?.toString() || "");
  const [isDefault, setIsDefault] = useState(
    params.isDefault?.toString() === "true",
  );
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    if (!name.trim()) {
      Alert.alert("Error", "Please enter address name (e.g., Home, Office)");
      return false;
    }
    if (!addressLine.trim()) {
      Alert.alert("Error", "Please enter address line");
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

      const addressData = {
        user: user?._id,
        name,
        addressLine,
        city,
        state,
        pincode,
        isDefault,
      };

      if (isEditing) {
        await API.put(`/addresses/${params.id}`, addressData);
        Alert.alert("Success", "Address updated successfully");
      } else {
        await API.post("/addresses", addressData);
        Alert.alert("Success", "Address added successfully");
      }

      router.back();
    } catch (error: any) {
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
          {/* ADDRESS NAME */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Address Name <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.inputContainer}>
              <Ionicons name="pricetag-outline" size={20} color="#666" />
              <TextInput
                style={styles.input}
                placeholder="e.g., Home, Office, Other"
                value={name}
                onChangeText={setName}
                maxLength={20}
              />
            </View>
          </View>

          {/* ADDRESS LINE */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Address Line <Text style={styles.required}>*</Text>
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
                placeholder="House No., Building Name, Street, Area"
                value={addressLine}
                onChangeText={setAddressLine}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
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
                <Ionicons name="location-outline" size={20} color="#666" />
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
    height: 80,
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

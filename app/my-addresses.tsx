import { useAuth } from "@/context/AuthContext";
import { API } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Address = {
  _id: string;
  name: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
};

export default function MyAddressesScreen() {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (user?._id) {
      loadAddresses();
    }
  }, [user]);

  const loadAddresses = async () => {
    try {
      const res = await API.get(`/addresses/${user?._id}`);
      setAddresses(res.data);
    } catch (error) {
      console.error("Failed to load addresses:", error);
      Alert.alert("Error", "Failed to load addresses");
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (addressId: string) => {
    try {
      await API.put(`/addresses/${addressId}/default`);
      loadAddresses(); // Reload to get updated data
    } catch (error) {
      Alert.alert("Error", "Failed to set default address");
    }
  };

  const handleDelete = async (addressId: string) => {
    Alert.alert(
      "Delete Address",
      "Are you sure you want to delete this address?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setDeleting(addressId);
              await API.delete(`/addresses/${addressId}`);
              loadAddresses();
            } catch (error) {
              Alert.alert("Error", "Failed to delete address");
            } finally {
              setDeleting(null);
            }
          },
        },
      ],
    );
  };

  const handleAddAddress = () => {
    if (addresses.length >= 3) {
      Alert.alert(
        "Limit Reached",
        "You can only add up to 3 addresses. Please delete an existing address to add a new one.",
      );
      return;
    }
    router.push("/add-address");
  };

  const handleEditAddress = (address: Address) => {
    router.push({
      pathname: "/add-address",
      params: {
        id: address._id,
        name: address.name,
        addressLine: address.addressLine,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        isDefault: address.isDefault.toString(),
      },
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#1B5E20" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Addresses</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2E7D32" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1B5E20" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Addresses</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* ADD ADDRESS BUTTON */}
        <TouchableOpacity
          style={[
            styles.addButton,
            addresses.length >= 3 && styles.addButtonDisabled,
          ]}
          onPress={handleAddAddress}
        >
          <Ionicons
            name="add-circle-outline"
            size={24}
            color={addresses.length >= 3 ? "#999" : "#2E7D32"}
          />
          <Text
            style={[
              styles.addButtonText,
              addresses.length >= 3 && styles.addButtonTextDisabled,
            ]}
          >
            Add New Address {addresses.length >= 3 && "(Max 3 reached)"}
          </Text>
        </TouchableOpacity>

        {/* ADDRESSES LIST */}
        {addresses.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="location-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No addresses saved</Text>
            <Text style={styles.emptySubtext}>
              Add your first delivery address
            </Text>
          </View>
        ) : (
          addresses.map((address) => (
            <View key={address._id} style={styles.addressCard}>
              {/* DEFAULT BADGE */}
              {address.isDefault && (
                <View style={styles.defaultBadge}>
                  <Text style={styles.defaultBadgeText}>DEFAULT</Text>
                </View>
              )}

              {/* ADDRESS INFO */}
              <View style={styles.addressHeader}>
                <View style={styles.addressIconContainer}>
                  <Ionicons name="location" size={20} color="#2E7D32" />
                </View>
                <View style={styles.addressInfo}>
                  <Text style={styles.addressName}>{address.name}</Text>
                  <Text style={styles.addressLine}>{address.addressLine}</Text>
                  <Text style={styles.addressDetails}>
                    {address.city}, {address.state} - {address.pincode}
                  </Text>
                </View>
              </View>

              {/* ACTIONS */}
              <View style={styles.actions}>
                {!address.isDefault && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleSetDefault(address._id)}
                  >
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={18}
                      color="#2E7D32"
                    />
                    <Text style={styles.actionText}>Set as Default</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleEditAddress(address)}
                >
                  <Ionicons name="create-outline" size={18} color="#1976D2" />
                  <Text style={[styles.actionText, { color: "#1976D2" }]}>
                    Edit
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDelete(address._id)}
                  disabled={deleting === address._id}
                >
                  {deleting === address._id ? (
                    <ActivityIndicator size="small" color="#D32F2F" />
                  ) : (
                    <>
                      <Ionicons
                        name="trash-outline"
                        size={18}
                        color="#D32F2F"
                      />
                      <Text style={[styles.actionText, { color: "#D32F2F" }]}>
                        Delete
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F5F7F2",
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
    paddingHorizontal: 14,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#2E7D32",
    borderStyle: "dashed",
  },
  addButtonDisabled: {
    borderColor: "#ddd",
    backgroundColor: "#f9f9f9",
  },
  addButtonText: {
    marginLeft: 12,
    fontSize: 15,
    fontWeight: "600",
    color: "#2E7D32",
  },
  addButtonTextDisabled: {
    color: "#999",
  },
  addressCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    position: "relative",
  },
  defaultBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#2E7D32",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  defaultBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  addressHeader: {
    flexDirection: "row",
    marginBottom: 12,
  },
  addressIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  addressInfo: {
    flex: 1,
    paddingRight: 60, // Space for default badge
  },
  addressName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#222",
    marginBottom: 4,
  },
  addressLine: {
    fontSize: 14,
    color: "#555",
    marginBottom: 4,
  },
  addressDetails: {
    fontSize: 13,
    color: "#777",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-start",
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  actionText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2E7D32",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#666",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
  },
});

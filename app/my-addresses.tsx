import { AppHeader } from "@/components/AppHeader";
import { useAddress, type Address } from "@/context/AddressContext";
import { useAuth } from "@/context/AuthContext";
import { showAlert } from "@/context/CustomAlertContext";
import { API } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { C, themed } from "@/constants/theme";

export default function MyAddressesScreen() {
  const { user } = useAuth();
  const { selectedAddress, setSelectedAddress, refreshAddresses, deleteAddress, setDefaultAddress } = useAddress();
  const params = useLocalSearchParams();
  const fromCheckout = params.fromCheckout === "true";

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    let active = true;
    if (!user?._id) {
      setAddresses([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const refresh = async () => {
      try {
        const res = await API.get<Address[]>(`/addresses/${user._id}`);
        if (active) setAddresses(res.data);
      } catch (error) {
        if (active) {
          console.error("Failed to load addresses:", error);
          showAlert("Error", "Failed to load addresses");
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void refresh();
    return () => { active = false; };
  }, [user]));

  const loadAddresses = async () => {
    try {
      const res = await API.get(`/addresses/${user?._id}`);
      setAddresses(res.data);
      await refreshAddresses();
    } catch (error) {
      console.error("Failed to load addresses:", error);
      showAlert("Error", "Failed to load addresses");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAddress = (address: Address) => {
    if (fromCheckout) {
      setSelectedAddress(address);
      router.back();
    }
  };

  const handleSetDefault = async (addressId: string) => {
    try {
      await setDefaultAddress(addressId);
      loadAddresses();
    } catch (error) {
      showAlert("Error", "Failed to set default address");
    }
  };

  const handleDelete = async (addressId: string) => {
    showAlert(
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
              await deleteAddress(addressId);
              loadAddresses();
            } catch (error) {
              showAlert("Error", "Failed to delete address");
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
      showAlert(
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
        addressLine1: address.addressLine1,
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
        <AppHeader
          title={fromCheckout ? "Select Address" : "My Addresses"}
          showBack
          showCart={false}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <AppHeader
        title={fromCheckout ? "Select Address" : "My Addresses"}
        showBack
        showCart={false}
      />

      {fromCheckout && (
        <View style={styles.selectHint}>
          <Ionicons name="information-circle" size={18} color={C.primary} />
          <Text style={styles.selectHintText}>
            Tap on any address to select for delivery
          </Text>
        </View>
      )}

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
            color={addresses.length >= 3 ? "#999" : C.primary}
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
            <TouchableOpacity
              key={address._id}
              style={[
                styles.addressCard,
                fromCheckout &&
                  selectedAddress?._id === address._id &&
                  styles.selectedCard,
              ]}
              onPress={() => handleSelectAddress(address)}
              activeOpacity={fromCheckout ? 0.7 : 1}
            >
              {/* SELECTED INDICATOR */}
              {fromCheckout && selectedAddress?._id === address._id && (
                <View style={styles.selectedIndicator}>
                  <Ionicons name="checkmark-circle" size={24} color={C.primary} />
                </View>
              )}

              {/* DEFAULT BADGE */}
              {address.isDefault && (
                <View style={styles.defaultBadge}>
                  <Text style={styles.defaultBadgeText}>DEFAULT</Text>
                </View>
              )}

              {/* ADDRESS INFO */}
              <View style={styles.addressHeader}>
                <View style={styles.addressIconContainer}>
                  <Ionicons name="location" size={20} color={C.primary} />
                </View>
                <View style={styles.addressInfo}>
                  <Text style={styles.addressName}>{address.name}</Text>
                  <Text style={styles.addressLine}>{[address.addressLine1, address.addressLine2].filter(Boolean).join(", ")}</Text>
                  <Text style={styles.addressDetails}>
                    {address.city}, {address.state} - {address.pincode}
                  </Text>
                </View>
              </View>

              {/* ACTIONS - Only show when NOT from checkout */}
              {!fromCheckout && (
                <View style={styles.actions}>
                  {!address.isDefault && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleSetDefault(address._id)}
                    >
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={18}
                        color={C.primary}
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
              )}
            </TouchableOpacity>
          ))
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = themed(() => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.page,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: C.ink,
  },
  selectHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.soft,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 14,
    marginTop: 12,
    borderRadius: 8,
  },
  selectHintText: {
    fontSize: 13,
    color: C.primary,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: C.primary,
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
    color: C.primary,
  },
  addButtonTextDisabled: {
    color: C.muted,
  },
  addressCard: {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    position: "relative",
    borderWidth: 2,
    borderColor: "transparent",
  },
  selectedCard: {
    borderColor: C.primary,
    backgroundColor: "#F1F8F4",
  },
  selectedIndicator: {
    position: "absolute",
    top: 12,
    left: 12,
  },
  defaultBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: C.badge,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  defaultBadgeText: {
    color: C.badgeText,
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
    backgroundColor: C.soft,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  addressInfo: {
    flex: 1,
    paddingRight: 60,
  },
  addressName: {
    fontSize: 16,
    fontWeight: "700",
    color: C.ink,
    marginBottom: 4,
  },
  addressLine: {
    fontSize: 14,
    color: C.muted,
    marginBottom: 4,
  },
  addressDetails: {
    fontSize: 13,
    color: C.muted,
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
    color: C.primary,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "700",
    color: C.muted,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: C.muted,
    marginTop: 8,
  },
}));

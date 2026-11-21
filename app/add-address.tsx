import { startTransition, useCallback, useEffect, useState } from "react";
import { LocationPicker } from "@/components/LocationPicker";
import type { Coordinates } from "@/utils/locationMap";
import { AppHeader } from "@/components/AppHeader";
import { useAddress } from "@/context/AddressContext";
import { useAuth } from "@/context/AuthContext";
import { showAlert } from "@/context/CustomAlertContext";
import { API } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import {
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { C, themed } from "@/constants/theme";

import { DELIVERY_CITY, DELIVERY_STATE, DELIVERY_PIN_HELP_MESSAGE, RAJKOT_CENTER, isInRajkotBounds, isDeliveryAllowedPin, isGujaratState, normalizeCity } from "@/utils/deliveryZone";

import { searchRajkotAddresses } from "@/utils/addressLocation";

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
  location?: { type: "Point"; coordinates: [number, number] };
};

function applyGeocodeToForm(
  g: Location.LocationGeocodedAddress,
  setAddressLine1: (v: string) => void,
  setAddressLine2: (v: string) => void,
  setPincode: (v: string) => void,
) {
  const num = g.streetNumber?.trim();
  const street = g.street?.trim();
  const namePart = g.name?.trim();
  let line1 = [num, street].filter(Boolean).join(" ").trim();
  if (!line1 && namePart && namePart !== street) {
    line1 = namePart;
  }
  if (!line1 && g.formattedAddress) {
    line1 = g.formattedAddress.split(",")[0]?.trim() || "";
  }
  if (line1) {
    setAddressLine1(line1);
  }

  const area =
    g.district?.trim() ||
    g.subregion?.trim() ||
    (namePart && namePart !== line1 ? namePart : "") ||
    "";
  if (area) {
    setAddressLine2(area);
  }

  if (g.postalCode?.trim()) {
    setPincode(g.postalCode.trim().slice(0, 6));
  }
}

export default function AddAddressScreen() {
  const { user } = useAuth();
  const { refreshAddresses } = useAddress();
  const params = useLocalSearchParams();
  const isEditing = !!params.id;
  const [addressLoading, setAddressLoading] = useState(isEditing);

  const mapsSupported = Platform.OS === "android" || Platform.OS === "ios" || Platform.OS === "web";
  const locationSupported = mapsSupported;
  const [type, setType] = useState<"home" | "work" | "other">("home");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [landmark, setLandmark] = useState("");
  const city = DELIVERY_CITY;
  const state = DELIVERY_STATE;
  const [pincode, setPincode] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  /** Saved coords from map picker (or loaded address) — sent to API as GeoJSON Point */
  const [mapCoords, setMapCoords] = useState<{ latitude: number; longitude: number } | null>(
    null,
  );

  const [mapModalVisible, setMapModalVisible] = useState(false);
  const mapBusy = mapModalVisible;
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isEditing || !params.id) return;
    let active = true;
    startTransition(() => setAddressLoading(true));

    const loadAddress = async () => {
      try {
        const res = await API.get(`/addresses/single/${params.id}`);
        if (!active) return;
        const addr = res.data;

        setType(addr.type);
        setName(addr.name || "");
        setPhone(addr.phone || "");
        setAddressLine1(addr.addressLine1 || "");
        setAddressLine2(addr.addressLine2 || "");
        setLandmark(addr.landmark || "");
        setPincode(addr.pincode || "");
        setIsDefault(!!addr.isDefault);

        const coords = addr.location?.coordinates;
        if (
          Array.isArray(coords) &&
          coords.length === 2 &&
          typeof coords[0] === "number" &&
          typeof coords[1] === "number"
        ) {
          const [lng, lat] = coords;
          if (isInRajkotBounds(lat, lng)) {
            setMapCoords({ latitude: lat, longitude: lng });
          } else {
            setMapCoords(null);
          }
        }
      } catch {
        if (active) { showAlert("Error", "Failed to load address"); router.back(); }
      } finally { if (active) setAddressLoading(false); }
    };

    void loadAddress();
    return () => { active = false; };
  }, [isEditing, params.id]);

  const openMapPicker = useCallback(() => {
    if (addressLoading) return;
    Keyboard.dismiss();
    setMapModalVisible(true);
  }, [addressLoading]);

  const confirmMapLocation = async (coordinates: Coordinates) => {
    if (!isInRajkotBounds(coordinates.latitude, coordinates.longitude)) {
      throw new Error(DELIVERY_PIN_HELP_MESSAGE);
    }
    // Autofill is optional. Manual selection never prompts for GPS permission.
    // Android's native geocoder requires permission; skip it when GPS was denied.
    try {
      const permission = await Location.getForegroundPermissionsAsync();
      if (permission.status === "granted" && Platform.OS !== "web") {
        const addresses = await Promise.race([
          Location.reverseGeocodeAsync(coordinates),
          new Promise<Location.LocationGeocodedAddress[]>(resolve => setTimeout(() => resolve([]), 3000)),
        ]);
        const address = addresses[0];
        if (address) {
          applyGeocodeToForm(address, setAddressLine1, setAddressLine2, setPincode);
        }
      }
    } catch { /* The user can complete the address and PIN manually. */ }
    setMapCoords(coordinates);
    setMapModalVisible(false);
  };

  const ADDRESS_TYPES = ["home", "work", "other"] as const;


  /** Same rules for Add and Edit — used by handleSubmit for both flows */
  const validateForm = () => {
    if (!phone.trim()) {
      showAlert("Error", "Please enter phone number");
      return false;
    }
    if (phone.length !== 10) {
      showAlert("Error", "Please enter valid 10-digit phone number");
      return false;
    }
    if (!addressLine1.trim()) {
      showAlert("Error", "Please enter address line 1");
      return false;
    }
    if (!city.trim()) {
      showAlert("Error", "Please enter city");
      return false;
    }
    if (normalizeCity(city) !== normalizeCity(DELIVERY_CITY)) {
      showAlert(
        "Rajkot only",
        `Delivery is currently available only in ${DELIVERY_CITY}. Use the map picker or set city to ${DELIVERY_CITY}.`,
      );
      return false;
    }
    if (!state.trim()) {
      showAlert("Error", "Please enter state");
      return false;
    }
    if (!isGujaratState(state)) {
      showAlert(
        "Outside delivery area",
        `${DELIVERY_CITY} delivery is available only in Gujarat. Please enter Gujarat as the state.`,
      );
      return false;
    }
    if (!pincode.trim() || pincode.length !== 6) {
      showAlert("Error", "Please enter valid 6-digit pincode");
      return false;
    }

    const pinClean = pincode.trim();
    if (!isDeliveryAllowedPin(pinClean)) {
      showAlert("Outside delivery area", DELIVERY_PIN_HELP_MESSAGE);
      return false;
    }

    // Native addresses always need verified coordinates, including GPS-only APKs.
    if (locationSupported) {
      if (!mapCoords) {
        showAlert(
          "Select your delivery location",
          mapsSupported
            ? `We only deliver inside ${DELIVERY_CITY}. Tap "Select Location", confirm your pin inside Rajkot, then save.`
            : `Tap "Use current location" to verify your delivery location inside ${DELIVERY_CITY}, then save. Entering a PIN code alone does not select a location.`,
        );
        return false;
      }
      if (
        !isInRajkotBounds(mapCoords.latitude, mapCoords.longitude)
      ) {
        showAlert(
          "Outside delivery area",
          "Your map pin is outside our Rajkot delivery zone. Move the pin inside the city boundary, tap Confirm Location, then save again.",
        );
        return false;
      }
      return true;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (addressLoading || loading || mapBusy || !validateForm()) return;

    try {
      setLoading(true);

      const cleanPhone = phone.replace(/\D/g, "").trim();
      const pinClean = pincode.trim();

      const addressData: AddressPayload = {
        user: user?._id,
        type,
        phone: cleanPhone,
        addressLine1,
        city: DELIVERY_CITY,
        state: DELIVERY_STATE,
        pincode: pinClean,
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

      if (mapCoords) {
        addressData.location = {
          type: "Point",
          coordinates: [mapCoords.longitude, mapCoords.latitude],
        };
      }

      if (isEditing) {
        await API.put(`/addresses/${params.id}`, addressData);

      } else {
        await API.post("/addresses", addressData);

      }

      await refreshAddresses();
      showAlert("Success", isEditing ? "Address updated successfully" : "Address added successfully");
      router.back();
    } catch (error: any) {
      console.error("Address save error:", error);
      showAlert(
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
        <AppHeader
          title={isEditing ? "Edit Address" : "Add New Address"}
          showBack
          showCart={false}
        />

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
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
                    color={type === t ? "#fff" : C.primary}
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
              <Ionicons name="pricetag-outline" size={20} color={C.muted} />
              <TextInput placeholderTextColor={C.muted}
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
              <Ionicons name="call-outline" size={20} color={C.muted} />
              <TextInput placeholderTextColor={C.muted}
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

          {isEditing &&
            (normalizeCity(city) !== normalizeCity(DELIVERY_CITY) ||
              !isGujaratState(state) ||
              !pincode.trim() ||
              pincode.trim().length !== 6 ||
              !isDeliveryAllowedPin(pincode.trim()) ||
              (mapsSupported && !mapCoords)) && (
              <View style={styles.editComplianceNote}>
                <Ionicons
                  name="information-circle"
                  size={22}
                  color="#B45309"
                  style={styles.editComplianceIcon}
                />
                <Text style={styles.editComplianceText}>
                  Updating this address follows the same rules as creating one: Gujarat,
                  city Rajkot, PIN 360001–360007 only{mapsSupported ? ", plus a confirmed map pin inside Rajkot." : "."}
                </Text>
              </View>
            )}

          {locationSupported && (
            <TouchableOpacity
              onPress={openMapPicker}
              disabled={mapBusy}
              activeOpacity={0.92}
              style={styles.mapCardTouch}
            >
              <LinearGradient
                colors={[C.soft, "#FFFFFF"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.mapCard}
              >
                <View style={styles.mapCardIconWrap}>
                  <Ionicons name="map" size={26} color={C.ink} />
                </View>
                <View style={styles.mapCardMid}>
                  <View style={styles.mapCardBadgeRow}>
                    <View style={styles.mapCityPill}>
                      <Ionicons name="location" size={12} color={C.ink} />
                      <Text style={styles.mapCityPillText}>{DELIVERY_CITY}</Text>
                    </View>
                    <View style={styles.mapProviderPill}>
                      <Text style={styles.mapProviderPillText}>OpenStreetMap</Text>
                    </View>
                  </View>
                  <Text style={styles.mapCardTitle}>Select Location</Text>
                  <Text style={styles.mapCardSubtitle}>
                    {mapsSupported ? "Move the map to select your delivery location, then confirm. Delivery is limited to Rajkot." : "Map unavailable. Use current location to verify your delivery location, then complete your address."}
                  </Text>
                </View>
                <View style={styles.mapCardArrow}>
                  <Ionicons name="chevron-forward-circle" size={36} color={C.primary} />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          )}



          {/* ADDRESS LINE 1 */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={[styles.label, styles.labelInRow]}>
                Address Line 1 <Text style={styles.required}>*</Text>
              </Text>
              {mapsSupported && (
                <TouchableOpacity
                  onPress={openMapPicker}
                  disabled={mapBusy}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <View style={styles.mapLinkPill}>
                    <Ionicons name="map-outline" size={14} color={C.ink} />
                    <Text style={styles.mapLinkPillText}>Map</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
            <View style={[styles.inputContainer, styles.textAreaContainer]}>
              <Ionicons
                name="home-outline"
                size={20}
                color={C.muted}
                style={styles.textAreaIcon}
              />
              <TextInput placeholderTextColor={C.muted}
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
            <View style={styles.labelRow}>
              <Text style={[styles.label, styles.labelInRow]}>
                Area / Address Line 2 (Optional)
              </Text>
              {mapsSupported && (
                <TouchableOpacity
                  onPress={openMapPicker}
                  disabled={mapBusy}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <View style={styles.mapLinkPill}>
                    <Ionicons name="map-outline" size={14} color={C.ink} />
                    <Text style={styles.mapLinkPillText}>Map</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.inputContainer}>
              <Ionicons name="location-outline" size={20} color={C.muted} />
              <TextInput placeholderTextColor={C.muted}
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
              <Ionicons name="navigate-outline" size={20} color={C.muted} />
              <TextInput placeholderTextColor={C.muted}
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
              <Ionicons name="business-outline" size={20} color={C.muted} />
              <TextInput placeholderTextColor={C.muted}
                style={styles.input}
                placeholder={DELIVERY_CITY}
                value={city}
                editable={false}
                selectTextOnFocus={false}
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
                <Ionicons name="map-outline" size={20} color={C.muted} />
                <TextInput placeholderTextColor={C.muted}
                  style={styles.input}
                  placeholder="State"
                  value={state}
                  editable={false}
                  selectTextOnFocus={false}
                />
              </View>
            </View>

            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>
                Pincode <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.inputContainer}>
                <Ionicons name="pin-outline" size={20} color={C.muted} />
                <TextInput placeholderTextColor={C.muted}
                  style={styles.input}
                  placeholder="360001–360007"
                  value={pincode}
                  onChangeText={(value) => { setPincode(value.replace(/\D/g, "")); setMapCoords(null); }}
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
                color={isDefault ? C.primary : "#999"}
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

      <LocationPicker
        visible={mapModalVisible}
        initialLocation={mapCoords || RAJKOT_CENTER}
        onCancel={() => setMapModalVisible(false)}
        onConfirm={confirmMapLocation}
        searchLocations={Platform.OS === "web" ? undefined : searchRajkotAddresses}
      />
    </SafeAreaView>
  );
}

const styles = themed(() => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.page,
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
    color: C.ink,
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
    color: C.ink,
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
    backgroundColor: C.card,
    borderWidth: 1.5,
    borderColor: C.primary,
    borderRadius: 12,
    paddingVertical: 12,
    elevation: 2,
  },
  typeButtonActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  typeText: {
    fontSize: 13,
    fontWeight: "600",
    color: C.primary,
  },
  typeTextActive: {
    color: "#fff",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card,
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
    color: C.ink,
    marginLeft: 10,
    minWidth: 0,
    minHeight: 24,
    paddingVertical: 4,
  },
  textArea: {
    minHeight: 60,
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
    backgroundColor: C.card,
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
    color: C.ink,
    marginBottom: 2,
  },
  defaultToggleSubtitle: {
    fontSize: 12,
    color: C.muted,
  },
  footer: {
    padding: 14,
    backgroundColor: C.card,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  saveButton: {
    backgroundColor: C.primary,
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
  labelInRow: {
    marginBottom: 0,
    flex: 1,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    gap: 8,
  },
  editComplianceNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#FEF3C7",
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#FCD34D",
  },
  editComplianceIcon: {
    marginTop: 2,
    flexShrink: 0,
  },
  editComplianceText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: "#92400E",
    fontWeight: "500",
  },
  mapCardTouch: {
    marginBottom: 20,
    borderRadius: 16,
    elevation: 4,
    shadowColor: C.ink,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  mapCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: "#A5D6A7",
  },
  mapCardIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "rgba(46, 125, 50, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  mapCardMid: {
    flex: 1,
    minWidth: 0,
  },
  mapCardBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 6,
  },
  mapCityPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(27, 94, 32, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  mapCityPillText: {
    fontSize: 11,
    fontWeight: "800",
    color: C.ink,
    letterSpacing: 0.3,
  },
  mapProviderPill: {
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  mapProviderPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1565C0",
  },
  mapCardTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: C.ink,
    marginBottom: 4,
  },
  mapCardSubtitle: {
    fontSize: 13,
    color: "#4A6350",
    lineHeight: 19,
  },
  mapCardArrow: {
    alignSelf: "center",
  },
  mapLinkPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(27, 94, 32, 0.08)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  mapLinkPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: C.ink,
  },
}));

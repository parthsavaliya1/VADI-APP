import { isRunningInExpoGo } from "expo";
import { getAddressCapabilities } from "@/utils/addressCapabilities";
import { AnimatedLoader } from "@/components/AnimatedLoader";
import { startTransition , useCallback, useEffect, useRef, useState } from "react";
import Constants from "expo-constants";
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
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { C, themed } from "@/constants/theme";

import { DELIVERY_CITY, DELIVERY_STATE, DELIVERY_PIN_HELP_MESSAGE, RAJKOT_CENTER, clampToRajkot, isInRajkotBounds, isDeliveryAllowedPin, isGujaratState, normalizeCity } from "@/utils/deliveryZone";

import { currentRajkotLocation, searchRajkotAddresses, type AddressMapResult } from "@/utils/addressLocation";

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

  const { maps: mapsSupported, location: locationSupported } = getAddressCapabilities(Platform.OS, isRunningInExpoGo(), Constants.expoConfig?.extra?.androidMapsConfigured === true);
  // Use the platform map provider: Apple Maps on iOS, Google Maps on Android.
  const useGoogleMapTiles = Platform.OS === "android";

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
  const [mapPresented, setMapPresented] = useState(false);
  const [mapError, setMapError] = useState("");
  const [mapQuery, setMapQuery] = useState("");
  const [searchResults, setSearchResults] = useState<AddressMapResult[]>([]);
  const [locating, setLocating] = useState(false);
  const [searching, setSearching] = useState(false);
  const mapRef = useRef<MapView | null>(null);
  const mapOperation = useRef(0);
  useEffect(() => () => { mapOperation.current += 1; }, []);
  const [mapPin, setMapPin] = useState<{ latitude: number; longitude: number }>(
    () => ({
      latitude: RAJKOT_CENTER.latitude,
      longitude: RAJKOT_CENTER.longitude,
    }),
  );

  const setRajkotPin = useCallback(
    (lat: number, lng: number) => {
      const c = clampToRajkot(lat, lng);
      setMapPin(c);
      setMapError("");
      setSearchResults([]);
    },
    [],
  );
  const [mapReady, setMapReady] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const mapBusy = geoLoading || locating || searching;

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
            setMapPin(clampToRajkot(lat, lng));
          } else {
            setMapCoords(null);
            setMapPin({
              latitude: RAJKOT_CENTER.latitude,
              longitude: RAJKOT_CENTER.longitude,
            });
          }
        }
      } catch {
        showAlert("Error", "Failed to load address");
        router.back();
      }
    };

    loadAddress();
  }, [isEditing, params.id]);

  useEffect(() => {
    if (!mapModalVisible) {
      startTransition(() => { setMapReady(false); setMapPresented(false); });
    }
  }, [mapModalVisible]);

  const openMapPicker = useCallback(() => {
    if (!mapsSupported) {
      showAlert("Map unavailable", locationSupported ? "The map is unavailable in this version of the app. You can use current location or enter your address below." : "Choose your delivery location in the iOS or Android app.");
      return;
    }
    Keyboard.dismiss();
    // Opening a map does not require GPS permission or a location lookup.
    setMapPin(mapCoords && isInRajkotBounds(mapCoords.latitude, mapCoords.longitude) ? mapCoords : { ...RAJKOT_CENTER });
    setMapPresented(false);
    setMapError("");
    setMapReady(false);
    setMapModalVisible(true);
  }, [mapsSupported, locationSupported, mapCoords]);

  const closeMapPicker = () => {
    mapOperation.current += 1;
    setLocating(false);
    setSearching(false);
    setGeoLoading(false);
    setMapModalVisible(false);
  };

  const selectSearchResult = (result: AddressMapResult) => {
    Keyboard.dismiss();
    setMapPin({ latitude: result.latitude, longitude: result.longitude });
    setMapQuery(result.label);
    setSearchResults([]);
    setMapError("");
    if (mapModalVisible && mapReady) {
      mapRef.current?.animateToRegion({ latitude: result.latitude, longitude: result.longitude, latitudeDelta: 0.008, longitudeDelta: 0.008 }, 350);
    } else if (!mapModalVisible) {
      setMapPresented(false);
      setMapReady(false);
      setMapModalVisible(true);
    }
  };

  const useCurrentLocation = async () => {
    if (mapBusy) return;
    Keyboard.dismiss();
    const operation = ++mapOperation.current;
    setLocating(true);
    setMapError("");
    try {
      const result = await currentRajkotLocation();
      if (operation !== mapOperation.current) return;
      if (mapsSupported) {
        selectSearchResult(result);
      } else {
        // GPS and verified address autofill work even when native map tiles are unavailable.
        applyGeocodeToForm(result.address, setAddressLine1, setAddressLine2, setPincode);
        setPincode(result.pincode);
        setMapCoords({ latitude: result.latitude, longitude: result.longitude });
        setMapPin({ latitude: result.latitude, longitude: result.longitude });
        showAlert("Location selected", "Your current location has been added. Check the house number and address before saving.");
      }
    } catch (error) {
      if (operation !== mapOperation.current) return;
      const message = error instanceof Error ? error.message : "Could not get your current location. Search for your address instead.";
      if (mapModalVisible) setMapError(message);
      else showAlert("Current location", message);
    } finally {
      if (operation === mapOperation.current) setLocating(false);
    }
  };

  const searchMapAddress = async () => {
    if (mapBusy || !mapReady) return;
    Keyboard.dismiss();
    const operation = ++mapOperation.current;
    setSearching(true);
    setMapError("");
    setSearchResults([]);
    try {
      const results = await searchRajkotAddresses(mapQuery);
      if (operation === mapOperation.current) setSearchResults(results);
    } catch (error) {
      if (operation === mapOperation.current) setMapError(error instanceof Error ? error.message : "Search failed. Try another street or landmark.");
    } finally {
      if (operation === mapOperation.current) setSearching(false);
    }
  };

  const confirmMapLocation = useCallback(async () => {
    const operation = ++mapOperation.current;
    setMapError("");
    const pinned = mapPin;
    if (!isInRajkotBounds(pinned.latitude, pinned.longitude)) {
      setMapError(DELIVERY_PIN_HELP_MESSAGE);
      return;
    }

    setGeoLoading(true);
    try {
      if (Platform.OS === "android") {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (operation !== mapOperation.current) return;
        if (permission.status !== "granted") {
          setMapError("Allow location access to verify the PIN code for your chosen delivery address.");
          return;
        }
      }
      const rows = await Location.reverseGeocodeAsync({
        latitude: pinned.latitude,
        longitude: pinned.longitude,
      });
      if (operation !== mapOperation.current) return;
      const g = rows[0];
      if (!g) {
        setMapError("Could not resolve this pin to an address. Try moving it slightly.");
        return;
      }

      const resolvedPin = g.postalCode?.replace(/\D/g, "") || "";
      if (!isDeliveryAllowedPin(resolvedPin)) {
        setMapError(resolvedPin ? DELIVERY_PIN_HELP_MESSAGE : "Could not verify the PIN code for this spot. Move the pin to a nearby street in Rajkot and try again.");
        return;
      }
      if (g.region && !isGujaratState(g.region)) {
        setMapError(DELIVERY_PIN_HELP_MESSAGE);
        return;
      }
      applyGeocodeToForm(g, setAddressLine1, setAddressLine2, setPincode);
      setPincode(resolvedPin);

      setMapCoords(pinned);
      setMapPin(pinned);
      setMapModalVisible(false);
    } catch {
      if (operation === mapOperation.current) setMapError("Failed to fetch address details for this location. Please try again.");
    } finally {
      if (operation === mapOperation.current) setGeoLoading(false);
    }
  }, [mapPin]);

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

    /* Native / Expo Go — must confirm on map so we never save an “outside Rajkot” address */
    if (mapsSupported) {
      if (!mapCoords) {
        showAlert(
          "Pick location on map",
          `We only deliver inside ${DELIVERY_CITY}. Tap "Choose location on map", confirm your pin inside Rajkot, then save.`,
        );
        return false;
      }
      if (
        !isInRajkotBounds(mapCoords.latitude, mapCoords.longitude)
      ) {
        showAlert(
          "Outside delivery area",
          "Your map pin is outside our Rajkot delivery zone. Move the pin inside the city boundary, tap Use this location, then save again.",
        );
        return false;
      }
      return true;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

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
                  {geoLoading ? (
                    <AnimatedLoader size="small" color={C.ink} />
                  ) : (
                    <Ionicons name="map" size={26} color={C.ink} />
                  )}
                </View>
                <View style={styles.mapCardMid}>
                  <View style={styles.mapCardBadgeRow}>
                    <View style={styles.mapCityPill}>
                      <Ionicons name="location" size={12} color={C.ink} />
                      <Text style={styles.mapCityPillText}>{DELIVERY_CITY}</Text>
                    </View>
                    <View style={styles.mapGooglePill}>
                      <Text style={styles.mapGooglePillText}>{Platform.OS === "ios" ? "Apple Maps" : "Google Maps"}</Text>
                    </View>
                  </View>
                  <Text style={styles.mapCardTitle}>Choose location on map</Text>
                  <Text style={styles.mapCardSubtitle}>
                    {mapsSupported ? "Map opens centred on Rajkot. Confirm your pin to save — we only deliver inside the city boundary." : "Map unavailable. Use current location or enter your address below."}
                  </Text>
                </View>
                <View style={styles.mapCardArrow}>
                  <Ionicons name="chevron-forward-circle" size={36} color={C.primary} />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {locationSupported && (
            <TouchableOpacity style={styles.currentLocationButton} onPress={useCurrentLocation} disabled={mapBusy} accessibilityRole="button">
              {locating ? <AnimatedLoader size="small" color={C.primary} /> : <Ionicons name="locate-outline" size={20} color={C.primary} />}
              <Text style={styles.currentLocationText}>{locating ? "Finding your location..." : "Use current location"}</Text>
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

      <Modal
        visible={mapModalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={closeMapPicker}
        onShow={() => setMapPresented(true)}
        onDismiss={() => setMapPresented(false)}
      >
        <SafeAreaProvider>
        <KeyboardAvoidingView style={styles.mapModalRoot} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <SafeAreaView style={styles.mapModalSafe} edges={["top", "bottom"]}>
            <View style={styles.mapModalHeader}>
              <TouchableOpacity
                onPress={closeMapPicker}
                style={styles.mapCancelButton}
                accessibilityRole="button"
                accessibilityLabel="Cancel location selection"
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={styles.mapModalCancel}>Cancel</Text>
              </TouchableOpacity>
              <View style={styles.mapModalTitleBlock}>
                <Text style={styles.mapModalTitle}>Drop pin in Rajkot</Text>
                <View style={styles.mapModalZonePill}>
                  <Text style={styles.mapModalZonePillText}>Delivery zone</Text>
                </View>
              </View>
              <View style={{ width: 56 }} />
            </View>

            <Text style={styles.mapHint}>
              Search a street or landmark, use your current location, or move the pin. Confirm your Rajkot delivery address below.
            </Text>

            <View style={styles.mapSearchBar}>
              <Ionicons name="search-outline" size={20} color={C.muted} />
              <TextInput style={styles.mapSearchInput} placeholder="Search area or street in Rajkot" placeholderTextColor={C.muted} value={mapQuery} onChangeText={(query) => { setMapQuery(query); setSearchResults([]); setMapError(""); }} onSubmitEditing={searchMapAddress} returnKeyType="search" editable={!mapBusy} accessibilityLabel="Search address in Rajkot" />
              <TouchableOpacity style={styles.mapSearchButton} onPress={searchMapAddress} disabled={!mapReady || mapBusy || mapQuery.trim().length < 3} accessibilityRole="button">
                {searching ? <AnimatedLoader size="small" color={C.primary} /> : <Text style={styles.currentLocationText}>Search</Text>}
              </TouchableOpacity>
            </View>
            {searchResults.length > 0 && <View style={styles.mapSearchResults}>
              {searchResults.map((result) => <TouchableOpacity key={String(result.latitude) + "," + result.longitude} style={styles.mapSearchResult} onPress={() => selectSearchResult(result)} accessibilityRole="button">
                <Ionicons name="location-outline" size={20} color={C.primary} />
                <Text style={styles.mapResultLabel} numberOfLines={2}>{result.label}</Text>
                <Ionicons name="chevron-forward" size={16} color={C.muted} />
              </TouchableOpacity>)}
            </View>}
            <TouchableOpacity style={styles.mapLocateButton} onPress={useCurrentLocation} disabled={mapBusy} accessibilityRole="button">
              {locating ? <AnimatedLoader size="small" color={C.primary} /> : <Ionicons name="locate-outline" size={20} color={C.primary} />}
              <Text style={styles.currentLocationText}>{locating ? "Finding your location..." : "Use current location"}</Text>
            </TouchableOpacity>
            {!!mapError && <Text accessibilityRole="alert" style={{ color: "#B42318", paddingHorizontal: 20, paddingBottom: 12, lineHeight: 20 }}>{mapError}</Text>}
            <View style={styles.mapWrap}>
              {mapPresented && mapsSupported && <MapView
                ref={mapRef}
                provider={useGoogleMapTiles ? PROVIDER_GOOGLE : undefined}
                style={StyleSheet.absoluteFill}
                initialRegion={{
                  latitude: mapPin.latitude,
                  longitude: mapPin.longitude,
                  latitudeDelta: 0.015,
                  longitudeDelta: 0.015,
                }}
                onMapReady={() => { setMapReady(true); mapRef.current?.animateToRegion({ ...mapPin, latitudeDelta: 0.015, longitudeDelta: 0.015 }, 0); }}
                showsMyLocationButton={false}
                onPress={(e) => {
                  const c = e.nativeEvent.coordinate;
                  setRajkotPin(c.latitude, c.longitude);
                }}
              >
                <Marker
                  coordinate={mapPin}
                  draggable
                  onDragEnd={(e) =>
                    setRajkotPin(
                      e.nativeEvent.coordinate.latitude,
                      e.nativeEvent.coordinate.longitude,
                    )
                  }
                />
              </MapView>}
              {!mapReady && (
                <View style={styles.mapLoadingOverlay}>
                  <AnimatedLoader size="large" color={C.primary} />
                </View>
              )}
            </View>

            <View style={styles.mapModalFooter}>
              <TouchableOpacity
                style={[
                  styles.mapConfirmBtn,
                  (!mapReady || mapBusy) && styles.mapConfirmBtnDisabled,
                ]}
                onPress={confirmMapLocation}
                disabled={!mapReady || mapBusy}
              >
                {geoLoading ? (
                  <AnimatedLoader color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={22} color="#fff" />
                    <Text style={styles.mapConfirmBtnText}>Use this location</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
        </SafeAreaProvider>
      </Modal>
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
  mapGooglePill: {
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  mapGooglePillText: {
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
  mapModalRoot: {
    flex: 1,
    backgroundColor: C.page,
  },
  mapModalSafe: {
    flex: 1,
  },
  mapModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e8ece9",
    backgroundColor: C.card,
  },
  mapCancelButton: { minHeight: 44, minWidth: 64, justifyContent: "center" },
  mapModalCancel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1565C0",
    width: 64,
  },
  mapModalTitleBlock: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  mapModalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: C.ink,
    textAlign: "center",
  },
  mapModalZonePill: {
    backgroundColor: C.soft,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  mapModalZonePillText: {
    fontSize: 11,
    fontWeight: "700",
    color: C.primary,
  },
  currentLocationButton: { marginTop: -4, marginBottom: 20, padding: 14, minHeight: 48, borderWidth: 1, borderColor: C.line, borderRadius: 12, backgroundColor: C.soft, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  currentLocationText: { color: C.primary, fontSize: 14, fontWeight: "700" },
  mapSearchBar: { marginHorizontal: 14, paddingLeft: 12, paddingRight: 4, minHeight: 48, borderWidth: 1, borderColor: C.line, borderRadius: 12, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.card },
  mapSearchInput: { flex: 1, minWidth: 0, paddingVertical: 12, fontSize: 14, color: C.ink },
  mapSearchButton: { paddingHorizontal: 12, paddingVertical: 12, minWidth: 66, alignItems: "center" },
  mapSearchResults: { marginHorizontal: 14, marginTop: 6, borderWidth: 1, borderColor: C.line, borderRadius: 12, backgroundColor: C.card, overflow: "hidden" },
  mapSearchResult: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, minHeight: 52 },
  mapResultLabel: { flex: 1, fontSize: 13, lineHeight: 18, color: C.ink },
  mapLocateButton: { marginHorizontal: 14, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  mapHint: {
    fontSize: 13,
    color: C.muted,
    paddingHorizontal: 16,
    paddingVertical: 10,
    lineHeight: 19,
  },
  mapWrap: {
    flex: 1,
    marginHorizontal: 14,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#ddd",
  },
  mapLoadingOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.65)",
  },
  mapModalFooter: {
    padding: 14,
    backgroundColor: C.card,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  mapConfirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: C.primary,
    borderRadius: 12,
    paddingVertical: 16,
  },
  mapConfirmBtnDisabled: {
    opacity: 0.65,
  },
  mapConfirmBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
}));

import { useAuth } from "@/context/AuthContext";
import { showAlert } from "@/context/CustomAlertContext";
import { API } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
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
import { SafeAreaView } from "react-native-safe-area-context";

/** Rough Rajkot bounding box — pins are clamped & validated here only */
const RAJKOT_BOUNDS = {
  north: 22.42,
  south: 22.22,
  east: 70.92,
  west: 70.68,
} as const;

const RAJKOT_CENTER = {
  latitude: 22.3039,
  longitude: 70.8022,
} as const;

const DELIVERY_CITY = "Rajkot";

/** Only these PIN codes are eligible for delivery (areas per India Post numbering) */
const DELIVERY_ALLOWED_PINS = [
  "360001", // Rajkot HO, Jairaj Plot, Mandvi Chowk, Kalavad Road
  "360002", // Bhaktinagar Industrial Estate
  "360003", // Aji Industrial Estate, Bedi, Anandpar
  "360004", // Sadar Bazar, Race Course
  "360005", // Nana Mava, Panchayat Nagar, Mavdi
  "360006", // Gandhigram
  "360007", // Amarjeet Nagar, Railnagar
] as const;

const DELIVERY_ALLOWED_PIN_SET = new Set<string>(DELIVERY_ALLOWED_PINS);

const DELIVERY_PIN_HELP_MESSAGE =
  "We only deliver to PIN codes " +
  DELIVERY_ALLOWED_PINS.slice(0, -1).join(", ") +
  ", and " +
  DELIVERY_ALLOWED_PINS[DELIVERY_ALLOWED_PINS.length - 1] +
  " (Rajkot HO & listed localities). Correct your PIN or pin the spot on the map again.";

function isDeliveryAllowedPin(pin: string) {
  return DELIVERY_ALLOWED_PIN_SET.has(pin.trim());
}

function clampToRajkot(lat: number, lng: number) {
  return {
    latitude: Math.min(
      RAJKOT_BOUNDS.north,
      Math.max(RAJKOT_BOUNDS.south, lat),
    ),
    longitude: Math.min(
      RAJKOT_BOUNDS.east,
      Math.max(RAJKOT_BOUNDS.west, lng),
    ),
  };
}

function isInRajkotBounds(lat: number, lng: number) {
  return (
    lat <= RAJKOT_BOUNDS.north &&
    lat >= RAJKOT_BOUNDS.south &&
    lng <= RAJKOT_BOUNDS.east &&
    lng >= RAJKOT_BOUNDS.west
  );
}

/** Rajkot is in Gujarat — block obvious wrong states */
function isGujaratState(value: string) {
  const t = value.trim().toLowerCase().replace(/\s+/g, " ");
  if (!t.length) return false;
  return t.includes("gujarat") || t === "gj" || t.endsWith(", gj");
}

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
  setCity: (v: string) => void,
  setState: (v: string) => void,
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

  if (g.city?.trim()) {
    setCity(g.city.trim());
  } else {
    setCity(DELIVERY_CITY);
  }
  if (g.region?.trim()) {
    setState(g.region.trim());
  }
  if (g.postalCode?.trim()) {
    setPincode(g.postalCode.trim().slice(0, 6));
  }
}

export default function AddAddressScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const isEditing = !!params.id;

  const mapsSupported = Platform.OS !== "web";
  const useGoogleMapTiles =
    Platform.OS === "android" ||
    Boolean(Constants.expoConfig?.ios?.config?.googleMapsApiKey);

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

  /** Saved coords from map picker (or loaded address) — sent to API as GeoJSON Point */
  const [mapCoords, setMapCoords] = useState<{ latitude: number; longitude: number } | null>(
    null,
  );

  const [mapModalVisible, setMapModalVisible] = useState(false);
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
    },
    [],
  );
  const [mapReady, setMapReady] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);

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
      setMapReady(false);
    }
  }, [mapModalVisible]);

  const openMapPicker = useCallback(async () => {
    if (!mapsSupported) {
      showAlert(
        "Maps",
        "The map picker runs in the iOS/Android app. Please open VADI on your phone or use Expo Go.",
      );
      return;
    }

    setGeoLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        showAlert(
          "Permission needed",
          "Location permission centres the map when you are in Rajkot. You can still move the pin within the city.",
        );
        if (mapCoords && isInRajkotBounds(mapCoords.latitude, mapCoords.longitude)) {
          setMapPin(clampToRajkot(mapCoords.latitude, mapCoords.longitude));
        } else {
          setMapPin({
            latitude: RAJKOT_CENTER.latitude,
            longitude: RAJKOT_CENTER.longitude,
          });
        }
        setMapModalVisible(true);
        return;
      }

      let next = mapCoords;
      if (!next) {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        next = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
      }
      if (!isInRajkotBounds(next.latitude, next.longitude)) {
        showAlert(
          "Rajkot only",
          "Delivery is available in Rajkot only. The map is centred on Rajkot — place your pin there.",
        );
        next = {
          latitude: RAJKOT_CENTER.latitude,
          longitude: RAJKOT_CENTER.longitude,
        };
      }
      setMapPin(clampToRajkot(next.latitude, next.longitude));
      setMapModalVisible(true);
    } catch {
      setMapPin(
        mapCoords && isInRajkotBounds(mapCoords.latitude, mapCoords.longitude)
          ? clampToRajkot(mapCoords.latitude, mapCoords.longitude)
          : {
              latitude: RAJKOT_CENTER.latitude,
              longitude: RAJKOT_CENTER.longitude,
            },
      );
      setMapModalVisible(true);
    } finally {
      setGeoLoading(false);
    }
  }, [mapsSupported, mapCoords]);

  const confirmMapLocation = useCallback(async () => {
    const pinned = clampToRajkot(mapPin.latitude, mapPin.longitude);

    setGeoLoading(true);
    try {
      const rows = await Location.reverseGeocodeAsync({
        latitude: pinned.latitude,
        longitude: pinned.longitude,
      });
      const g = rows[0];
      if (!g) {
        showAlert("Address", "Could not resolve this pin to an address. Try moving it slightly.");
        return;
      }

      applyGeocodeToForm(
        g,
        setAddressLine1,
        setAddressLine2,
        setCity,
        setState,
        setPincode,
      );
      setCity(DELIVERY_CITY);

      const resolvedPin = g.postalCode?.trim().slice(0, 6) ?? "";
      if (
        resolvedPin.length === 6 &&
        !isDeliveryAllowedPin(resolvedPin)
      ) {
        showAlert("Outside delivery area", DELIVERY_PIN_HELP_MESSAGE);
        return;
      }

      setMapCoords(pinned);
      setMapPin(pinned);
      setMapModalVisible(false);
    } catch {
      showAlert("Address", "Failed to fetch address details for this location.");
    } finally {
      setGeoLoading(false);
    }
  }, [mapPin]);

  const ADDRESS_TYPES = ["home", "work", "other"] as const;

  const normalizeCity = (c: string) => c.trim().toLowerCase().replace(/\s+/g, "");

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
        state: state.trim(),
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
        showAlert("Success", "Address updated successfully");
      } else {
        await API.post("/addresses", addressData);
        showAlert("Success", "Address added successfully");
      }

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

          {mapsSupported && (
            <TouchableOpacity
              onPress={openMapPicker}
              disabled={geoLoading}
              activeOpacity={0.92}
              style={styles.mapCardTouch}
            >
              <LinearGradient
                colors={["#E8F5E9", "#FFFFFF"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.mapCard}
              >
                <View style={styles.mapCardIconWrap}>
                  {geoLoading ? (
                    <ActivityIndicator size="small" color="#1B5E20" />
                  ) : (
                    <Ionicons name="map" size={26} color="#1B5E20" />
                  )}
                </View>
                <View style={styles.mapCardMid}>
                  <View style={styles.mapCardBadgeRow}>
                    <View style={styles.mapCityPill}>
                      <Ionicons name="location" size={12} color="#1B5E20" />
                      <Text style={styles.mapCityPillText}>{DELIVERY_CITY}</Text>
                    </View>
                    <View style={styles.mapGooglePill}>
                      <Text style={styles.mapGooglePillText}>Google Maps</Text>
                    </View>
                  </View>
                  <Text style={styles.mapCardTitle}>Choose location on map</Text>
                  <Text style={styles.mapCardSubtitle}>
                    Map opens centred on Rajkot. Confirm your pin to save — we only deliver inside
                    the city boundary.
                  </Text>
                </View>
                <View style={styles.mapCardArrow}>
                  <Ionicons name="chevron-forward-circle" size={36} color="#2E7D32" />
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
                  disabled={geoLoading}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <View style={styles.mapLinkPill}>
                    <Ionicons name="map-outline" size={14} color="#1B5E20" />
                    <Text style={styles.mapLinkPillText}>Map</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
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
            <View style={styles.labelRow}>
              <Text style={[styles.label, styles.labelInRow]}>
                Area / Address Line 2 (Optional)
              </Text>
              {mapsSupported && (
                <TouchableOpacity
                  onPress={openMapPicker}
                  disabled={geoLoading}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <View style={styles.mapLinkPill}>
                    <Ionicons name="map-outline" size={14} color="#1B5E20" />
                    <Text style={styles.mapLinkPillText}>Map</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
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
                placeholder={DELIVERY_CITY}
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
                  placeholder="360001–360007"
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

      <Modal
        visible={mapModalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setMapModalVisible(false)}
      >
        <View style={styles.mapModalRoot}>
          <SafeAreaView style={styles.mapModalSafe} edges={["top"]}>
            <View style={styles.mapModalHeader}>
              <TouchableOpacity
                onPress={() => setMapModalVisible(false)}
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
              The map stays within Rajkot city limits. Drag the pin or tap the map, then use
              the button below to fill your address.
            </Text>

            <View style={styles.mapWrap}>
              <MapView
                provider={useGoogleMapTiles ? PROVIDER_GOOGLE : undefined}
                style={StyleSheet.absoluteFill}
                initialRegion={{
                  latitude: mapPin.latitude,
                  longitude: mapPin.longitude,
                  latitudeDelta: 0.015,
                  longitudeDelta: 0.015,
                }}
                onMapReady={() => setMapReady(true)}
                showsUserLocation
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
              </MapView>
              {!mapReady && (
                <View style={styles.mapLoadingOverlay}>
                  <ActivityIndicator size="large" color="#2E7D32" />
                </View>
              )}
            </View>

            <View style={styles.mapModalFooter}>
              <TouchableOpacity
                style={[
                  styles.mapConfirmBtn,
                  geoLoading && styles.mapConfirmBtnDisabled,
                ]}
                onPress={confirmMapLocation}
                disabled={geoLoading}
              >
                {geoLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={22} color="#fff" />
                    <Text style={styles.mapConfirmBtnText}>Use this location</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
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
    shadowColor: "#1B5E20",
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
    color: "#1B5E20",
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
    color: "#1B5E20",
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
    color: "#1B5E20",
  },
  mapModalRoot: {
    flex: 1,
    backgroundColor: "#F5F7F2",
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
    backgroundColor: "#fff",
  },
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
    color: "#1B5E20",
    textAlign: "center",
  },
  mapModalZonePill: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  mapModalZonePillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2E7D32",
  },
  mapHint: {
    fontSize: 13,
    color: "#555",
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
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.65)",
  },
  mapModalFooter: {
    padding: 14,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  mapConfirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2E7D32",
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
});

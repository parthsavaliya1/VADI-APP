import * as Location from "expo-location";
import { Platform } from "react-native";
import { DELIVERY_PIN_HELP_MESSAGE, isDeliveryAllowedPin, isGujaratState, isInRajkotBounds } from "./deliveryZone";

export type AddressMapResult = { latitude: number; longitude: number; label: string; pincode: string; address: Location.LocationGeocodedAddress };

function withTimeout<T>(request: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  return new Promise<T>((resolve, reject) => {
    timer = setTimeout(() => reject(new Error("Location is taking too long. Try again outdoors or search for your address.")), timeoutMs);
    request.then(resolve, reject);
  }).finally(() => clearTimeout(timer));
}

async function requestPermission(api: typeof Location) {
  const permission = await api.requestForegroundPermissionsAsync();
  if (permission.status !== "granted") throw new Error("Allow location access in your phone settings, then try again. You can also choose your pin manually.");
}

async function resolveResult(coords: { latitude: number; longitude: number }, api: typeof Location): Promise<AddressMapResult | null> {
  if (!isInRajkotBounds(coords.latitude, coords.longitude)) return null;
  const [address] = await api.reverseGeocodeAsync(coords);
  if (!address) return null;
  const pincode = address.postalCode?.replace(/\D/g, "") || "";
  if (!isDeliveryAllowedPin(pincode) || (address.region && !isGujaratState(address.region))) return null;
  const label = address.formattedAddress || [...new Set([address.name, address.street, address.district, "Rajkot", pincode].filter(Boolean))].join(", ");
  return { latitude: coords.latitude, longitude: coords.longitude, label, pincode, address };
}

/** Called only on a deliberate tap; opening the map itself never requests GPS. */
export async function currentRajkotLocation(api: typeof Location = Location, timeoutMs = 15000): Promise<AddressMapResult> {
  await requestPermission(api);
  if (!(await api.hasServicesEnabledAsync())) throw new Error("Turn on your phone's location services, then try again.");
  const recent = await api.getLastKnownPositionAsync({ maxAge: 30000, requiredAccuracy: 100 }).catch(() => null);
  const position = recent || await withTimeout(api.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }), timeoutMs);
  if (!isInRajkotBounds(position.coords.latitude, position.coords.longitude)) throw new Error(DELIVERY_PIN_HELP_MESSAGE);
  const result = await withTimeout(resolveResult(position.coords, api), timeoutMs);
  if (!result) throw new Error("Your current location is outside a supported Rajkot PIN code, or its PIN could not be verified. Search for your delivery address instead.");
  return result;
}

/** Explicit search rather than per-keystroke requests keeps native geocoding usage bounded. */
export async function searchRajkotAddresses(query: string, api: typeof Location = Location): Promise<AddressMapResult[]> {
  const clean = query.trim();
  if (clean.length < 3) throw new Error("Enter at least 3 characters of a street, area, or landmark in Rajkot.");
  if (Platform.OS === "android") await requestPermission(api);
  const candidates = await withTimeout(api.geocodeAsync(/rajkot/i.test(clean) ? clean : `${clean}, Rajkot, Gujarat, India`), 15000);
  const results: AddressMapResult[] = [];
  const seen = new Set<string>();
  for (const candidate of candidates.filter(c => isInRajkotBounds(c.latitude, c.longitude)).slice(0, 3)) {
    const result = await withTimeout(resolveResult(candidate, api), 15000);
    if (!result) continue;
    const key = `${result.latitude.toFixed(5)},${result.longitude.toFixed(5)}`;
    if (!seen.has(key)) { results.push(result); seen.add(key); }
  }
  if (!results.length) throw new Error("No matching address was found in our Rajkot delivery area. Try a nearby street or landmark, or move the map pin.");
  return results;
}

export const DELIVERY_CITY = "Rajkot";
export const DELIVERY_STATE = "Gujarat";
export const DELIVERY_ALLOWED_PINS = ["360001", "360002", "360003", "360004", "360005", "360006", "360007"] as const;
export const RAJKOT_BOUNDS = { north: 22.42, south: 22.22, east: 70.92, west: 70.68 } as const;
export const RAJKOT_CENTER = { latitude: 22.3039, longitude: 70.8022 } as const;
const PIN_SET = new Set<string>(DELIVERY_ALLOWED_PINS);
export const DELIVERY_PIN_HELP_MESSAGE = "We currently deliver only in Rajkot, Gujarat, to PIN codes " + DELIVERY_ALLOWED_PINS.join(", ") + ". Choose a location inside this delivery area.";

export const normalizeCity = (city: string) => city.trim().toLowerCase().replace(/\s+/g, "");
export const isDeliveryAllowedPin = (pin: string) => PIN_SET.has(pin.trim());
export const isGujaratState = (state: string) => ["gujarat", "gj", "ગુજરાત"].includes(state.trim().toLowerCase());
export function isInRajkotBounds(lat: number, lng: number) {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat <= RAJKOT_BOUNDS.north && lat >= RAJKOT_BOUNDS.south && lng <= RAJKOT_BOUNDS.east && lng >= RAJKOT_BOUNDS.west;
}
export function clampToRajkot(lat: number, lng: number) {
  return { latitude: Math.min(RAJKOT_BOUNDS.north, Math.max(RAJKOT_BOUNDS.south, lat)), longitude: Math.min(RAJKOT_BOUNDS.east, Math.max(RAJKOT_BOUNDS.west, lng)) };
}
export function deliveryAddressError(address: { city?: string; state?: string; pincode?: string; location?: { coordinates?: number[] } }) {
  if (normalizeCity(address.city || "") !== "rajkot" || !isGujaratState(address.state || "") || !isDeliveryAllowedPin(address.pincode || "")) return DELIVERY_PIN_HELP_MESSAGE;
  const coords = address.location?.coordinates;
  if (!coords || coords.length !== 2 || !isInRajkotBounds(coords[1], coords[0])) return "Confirm your delivery location on the map inside Rajkot before placing an order.";
  return null;
}

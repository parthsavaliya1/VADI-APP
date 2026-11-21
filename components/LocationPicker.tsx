import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Modal, View, Text, TouchableOpacity, TextInput, StyleSheet, Linking, Keyboard } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import Constants from "expo-constants";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedLoader } from "@/components/AnimatedLoader";
import LocationMap from "@/components/LocationMap";
import { C, themed } from "@/constants/theme";
import { DEFAULT_TILE_PROVIDER, locationMapHTML, validCoordinates, type Coordinates, type MapMessage, type TileProvider } from "@/utils/locationMap";

type SearchResult = Coordinates & { label: string };
export type LocationPickerProps = {
  visible: boolean;
  initialLocation?: Coordinates | null;
  onCancel: () => void;
  onConfirm: (coordinates: Coordinates) => void | Promise<void>;
  tileProvider?: TileProvider;
  searchLocations?: (query: string) => Promise<SearchResult[]>;
};

/** Draft coordinates stay local until Confirm. The caller owns persistence. */
export function LocationPicker(props: LocationPickerProps) {
  // Mount a fresh session for every opening; late GPS/search results cannot reach a later session.
  return props.visible ? <PickerSession {...props} /> : null;
}

function PickerSession({ initialLocation, onCancel, onConfirm, tileProvider, searchLocations }: LocationPickerProps) {
  const initial = validCoordinates(initialLocation) ? initialLocation : null;
  const [selected, setSelected] = useState<Coordinates | null>(initial);
  const [target, setTarget] = useState<Coordinates | null>(null);
  const [ready, setReady] = useState(false);
  const [moving, setMoving] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [mapFailed, setMapFailed] = useState(false);
  const [denied, setDenied] = useState(false);
  const [retry, setRetry] = useState(0);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const alive = useRef(true);
  const lock = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const html = useMemo(() => {
    const extra = Constants.expoConfig?.extra;
    const provider = tileProvider || {
      url: extra?.locationTileUrl || DEFAULT_TILE_PROVIDER.url,
      attribution: extra?.locationTileAttribution || DEFAULT_TILE_PROVIDER.attribution,
      maxZoom: Number(extra?.locationTileMaxZoom) || DEFAULT_TILE_PROVIDER.maxZoom,
    };
    return locationMapHTML(initial, provider);
    // Keep the document stable while selecting; only Retry creates a new map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retry]);
  useEffect(() => {
    const timer = setTimeout(() => { if (!ready) { setMapFailed(true); setError("The map could not load. Check your connection and retry."); } }, 25000);
    return () => clearTimeout(timer);
  }, [ready, retry]);
  const receive = useCallback((message: MapMessage) => {
    if (!alive.current || !message || typeof message !== "object") return;
    if (message.type === "error") { setReady(false); setMapFailed(true); setError("Map tiles could not load. Check your connection and retry."); }
    if (message.type === "ready") { setReady(true); }
    if (message.type === "moving") setMoving(true);
    if (message.type === "center" && validCoordinates(message)) {
      setSelected({ latitude: message.latitude, longitude: message.longitude }); setMoving(false);
    }
  }, []);
  const run = async (action: () => Promise<void>) => {
    if (lock.current) return;
    Keyboard.dismiss();
    lock.current = true; setBusy(true); setError("");
    try { await action(); } catch (e) { if (alive.current) setError(e instanceof Error ? e.message : "Please try again."); }
    finally { lock.current = false; if (alive.current) setBusy(false); }
  };
  const locate = () => run(async () => {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!alive.current) return;
    if (permission.status !== "granted") {
      setDenied(!permission.canAskAgain);
      throw new Error("Location access was denied. You can still move the map and confirm a location manually.");
    }
    setDenied(false);
    if (!(await Location.hasServicesEnabledAsync())) throw new Error("Turn on location services, or choose your location manually.");
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const position = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("GPS timed out. Try again outdoors or move the map manually.")), 15000); }),
      ]);
      if (alive.current && validCoordinates(position.coords)) { setMoving(true); setTarget({ latitude: position.coords.latitude, longitude: position.coords.longitude }); }
    } finally { clearTimeout(timer); }
  });
  const disabled = !ready || moving || busy || mapFailed || !selected;
  return <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={() => { if (!lock.current) onCancel(); }}>
    <SafeAreaProvider><SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel} disabled={busy} accessibilityRole="button"><Text style={styles.action}>Cancel</Text></TouchableOpacity>
        <Text style={styles.title}>Select Location</Text><View style={{ width: 45 }} />
      </View>
      {searchLocations && <View style={styles.search}>
        <TextInput style={styles.input} value={query} onChangeText={setQuery} placeholder="Search area or street in Rajkot" placeholderTextColor={C.muted} editable={!busy} />
        <TouchableOpacity disabled={busy || !ready || query.trim().length < 3} onPress={() => run(async () => { const found = await searchLocations(query); if (alive.current) setResults(found); })}><Text style={styles.action}>Search</Text></TouchableOpacity>
      </View>}
      {results.map(result => <TouchableOpacity key={`${result.latitude},${result.longitude}`} style={styles.result} onPress={() => { setMoving(true); setTarget({ latitude: result.latitude, longitude: result.longitude }); setResults([]); }}><Text style={styles.body}>{result.label}</Text></TouchableOpacity>)}
      <View style={styles.map}>
        <LocationMap key={retry} html={html} target={target} onMessage={receive} />
        <View pointerEvents="none" style={styles.pin}><Ionicons name="location" size={46} color={C.primary} /></View>
        {!ready && !mapFailed && <View pointerEvents="none" style={styles.loader}><AnimatedLoader size="large" /><Text style={styles.body}>Loading map…</Text></View>}
      </View>
      <View style={styles.footer}>
        <Text style={styles.body}>Move the map to place the pin at your location.</Text>
        <Text style={styles.coords}>{selected ? `${selected.latitude.toFixed(6)}, ${selected.longitude.toFixed(6)}` : "Choose a point on the map"}</Text>
        {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        {mapFailed && <TouchableOpacity onPress={() => { setMapFailed(false); setReady(false); setMoving(true); setTarget(null); setError(""); setRetry(value => value + 1); }}><Text style={styles.action}>Retry map</Text></TouchableOpacity>}
        {denied && <TouchableOpacity onPress={() => { void Linking.openSettings().catch(() => setError("Open your device settings to allow location access.")); }}><Text style={styles.action}>Open location settings</Text></TouchableOpacity>}
        <TouchableOpacity style={styles.locate} disabled={busy || !ready || mapFailed} onPress={locate} accessibilityRole="button"><Ionicons name="locate-outline" size={21} color={C.primary} /><Text style={styles.action}>Use Current Location</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.confirm, disabled && styles.disabled]} disabled={disabled} accessibilityRole="button" onPress={() => run(async () => { if (selected) await onConfirm({ ...selected }); })}>
          {busy ? <AnimatedLoader size="small" color="#fff" /> : <Text style={styles.confirmText}>Confirm Location</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView></SafeAreaProvider>
  </Modal>;
}

const styles = themed(() => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.page }, header: { padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { color: C.ink, fontSize: 18, fontWeight: "700" }, action: { color: C.primary, fontWeight: "700", paddingVertical: 8 },
  map: { flex: 1, minHeight: 160, overflow: "hidden" }, pin: { position: "absolute", left: "50%", top: "50%", marginLeft: -23, marginTop: -44 },
  loader: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center", backgroundColor: C.soft },
  footer: { padding: 16, gap: 6, backgroundColor: C.card }, body: { color: C.muted, fontSize: 13, lineHeight: 19 }, coords: { color: C.ink, fontSize: 14, fontVariant: ["tabular-nums"] },
  error: { color: "#B42318", fontSize: 13, lineHeight: 18 }, locate: { flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", padding: 4 },
  confirm: { backgroundColor: C.primary, padding: 16, borderRadius: 12, alignItems: "center" }, confirmText: { color: "#fff", fontSize: 16, fontWeight: "700" }, disabled: { opacity: 0.5 },
  search: { margin: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: C.line, borderRadius: 12, flexDirection: "row", alignItems: "center" }, input: { flex: 1, padding: 10, color: C.ink }, result: { padding: 12, borderBottomWidth: 1, borderColor: C.line },
}));

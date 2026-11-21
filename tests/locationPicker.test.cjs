/* global __dirname */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
function load(file, imports = {}) {
  const mod = { exports: {} };
  const compiled = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(compiled, { exports: mod.exports, module: mod, require: key => imports[key], setTimeout, clearTimeout });
  return mod.exports;
}
const mapUtils = load('utils/locationMap.ts');
test('coordinate validation rejects strings, missing, non-finite and out-of-range values', () => {
  for (const value of [null, {}, { latitude: '22', longitude: 70 }, { latitude: NaN, longitude: 70 }, { latitude: 91, longitude: 0 }, { latitude: 0, longitude: 181 }]) assert.equal(mapUtils.validCoordinates(value), false);
  assert.equal(mapUtils.validCoordinates({ latitude: 0, longitude: 0 }), true);
});
function mapHarness() {
  const messages = [], handlers = {}, layerHandlers = {};
  let center = { lat: 12, lng: 34 };
  const map = { setView(coords) { center = { lat: coords[0], lng: coords[1] }; handlers.movestart?.(); handlers.moveend?.(); return map; }, fitWorld() {}, getCenter: () => ({ wrap: () => center }), on: (name, fn) => { handlers[name] = fn; } };
  const layer = { addTo: () => layer, on: (name, fn) => { layerHandlers[name] = fn; } };
  const window = { ReactNativeWebView: { postMessage: data => messages.push(JSON.parse(data)) }, addEventListener() {} };
  const context = vm.createContext({ window, parent: {}, L: { map: () => map, tileLayer: () => layer, control: { zoom: () => ({ addTo() {} }) } }, setTimeout: () => 1, clearTimeout() {} });
  const html = mapUtils.locationMapHTML(null, mapUtils.DEFAULT_TILE_PROVIDER);
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  for (const script of scripts) vm.runInContext(script[1], context);
  return { messages, handlers, layerHandlers, window, map };
}
test('map reports readiness and its actual center after dragging and GPS recentering', () => {
  const h = mapHarness(); h.layerHandlers.load();
  assert.equal(h.messages[0].type, 'ready');
  h.map.setView([22.31, 70.81]);
  assert.deepEqual(h.messages.at(-1), { type: 'center', latitude: 22.31, longitude: 70.81 });
  h.window.setLocation({ latitude: 22.32, longitude: 70.82 });
  assert.equal(h.messages.at(-1).latitude, 22.32);
});
test('failed tiles cannot enable confirmation via a subsequent load event', () => {
  const h = mapHarness(); h.layerHandlers.tileerror(); h.layerHandlers.load();
  assert.equal(h.messages.some(message => message.type === 'ready'), false);
  assert.equal(h.messages[0].type, 'error');
});
test('tile configuration requires HTTPS and escapes script terminators', () => {
  assert.throws(() => mapUtils.locationMapHTML(null, { url: 'http://example.test', attribution: '', maxZoom: 19 }), /HTTPS/);
  const html = mapUtils.locationMapHTML(null, { ...mapUtils.DEFAULT_TILE_PROVIDER, attribution: '</script><script>attack()</script>' });
  assert.equal(html.includes('<script>attack()'), false);
});

function pickerHarness(permission = 'granted') {
  let cursor = 0, gpsCalls = 0; const hooks = [], confirmations = [], cleanups = [];
  const react = {
    useState(initial) { const i = cursor++; if (!(i in hooks)) hooks[i] = typeof initial === 'function' ? initial() : initial; return [hooks[i], value => { hooks[i] = typeof value === 'function' ? value(hooks[i]) : value; }]; },
    useRef(initial) { const i = cursor++; return hooks[i] ||= { current: initial }; },
    useMemo(fn) { const i = cursor++; return hooks[i] ||= fn(); }, useCallback: fn => fn,
    useEffect(fn, deps) { const i = cursor++; if (!hooks[i] || deps?.some((v, n) => v !== hooks[i].deps[n])) { hooks[i]?.cleanup?.(); const cleanup = fn(); hooks[i] = { deps, cleanup }; if (cleanup) cleanups.push(cleanup); } },
  };
  const native = { Keyboard: { dismiss() {} }, StyleSheet: { create: v => v, absoluteFill: {} }, Linking: { openSettings: async () => {} } };
  for (const key of ['Modal', 'View', 'Text', 'TouchableOpacity', 'TextInput']) native[key] = key;
  const picker = load('components/LocationPicker.tsx', {
    react, 'react/jsx-runtime': require('react/jsx-runtime'), 'react-native': native,
    'react-native-safe-area-context': { SafeAreaProvider: 'SafeAreaProvider', SafeAreaView: 'SafeAreaView' },
    'expo-location': { Accuracy: { Balanced: 3 }, requestForegroundPermissionsAsync: async () => ({ status: permission, canAskAgain: false }), hasServicesEnabledAsync: async () => true, getCurrentPositionAsync: async () => { gpsCalls++; return { coords: { latitude: 10, longitude: 20 } }; } },
    'expo-constants': { __esModule: true, default: { expoConfig: {} } }, '@expo/vector-icons': { Ionicons: 'Icon' },
    '@/components/AnimatedLoader': { AnimatedLoader: 'Loader' }, '@/components/LocationMap': { __esModule: true, default: 'Map' },
    '@/constants/theme': { C: {}, themed: fn => fn() }, '@/utils/locationMap': mapUtils,
  });
  const props = { visible: true, onCancel() {}, onConfirm: coords => confirmations.push(coords) };
  const all = (node, type) => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(n => all(n, type)) : [...(node.type === type ? [node] : []), ...all(node.props?.children, type)];
  const text = node => node == null || typeof node === 'boolean' ? '' : typeof node !== 'object' ? String(node) : Array.isArray(node) ? node.map(text).join('') : text(node.props?.children);
  const render = () => { cursor = 0; const session = picker.LocationPicker(props); return session.type(session.props); };
  const click = async label => { const button = all(render(), 'TouchableOpacity').find(n => text(n).includes(label)); assert.ok(button, label); assert.ok(!button.props.disabled); await button.props.onPress(); };
  const message = data => all(render(), 'Map')[0].props.onMessage(data);
  return { render, click, message, all, text, confirmations, gpsCalls: () => gpsCalls, close: () => cleanups.forEach(fn => fn()) };
}
test('GPS only recenters the map; confirmation returns the center reported by Leaflet', async () => {
  const h = pickerHarness(); try {
    h.message({ type: 'ready' }); h.message({ type: 'center', latitude: 1, longitude: 2 });
    await h.click('Use Current Location'); assert.equal(h.gpsCalls(), 1); assert.equal(h.confirmations.length, 0);
    h.message({ type: 'center', latitude: 10, longitude: 20 }); await h.click('Confirm Location');
    assert.equal(h.confirmations[0].latitude, 10); assert.equal(h.confirmations[0].longitude, 20);
  } finally { h.close(); }
});
test('denied GPS still permits manual confirmation and reports a usable message', async () => {
  const h = pickerHarness('denied'); try {
    h.message({ type: 'ready' }); h.message({ type: 'center', latitude: 5, longitude: 6 });
    await h.click('Use Current Location'); assert.equal(h.gpsCalls(), 0); assert.match(h.text(h.render()), /denied/);
    await h.click('Confirm Location'); assert.equal(h.confirmations[0].latitude, 5);
  } finally { h.close(); }
});

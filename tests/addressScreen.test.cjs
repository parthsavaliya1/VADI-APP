const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript'), jsx = require('react/jsx-runtime');
function compile(file) { return ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText; }
const zoneModule = { exports: {} }; vm.runInNewContext(compile('utils/deliveryZone.ts'), zoneModule);
const capsModule = { exports: {} }; vm.runInNewContext(compile('utils/addressCapabilities.ts'), capsModule);
function harness(editing) {
  let cursor = 0; const hooks = [], saves = [], alerts = [], confirmations = [];
  const same = (a, b) => a && b && a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
  const react = {
    startTransition: fn => fn(),
    useState(initial) { const i = cursor++; if (!(i in hooks)) hooks[i] = typeof initial === 'function' ? initial() : initial; return [hooks[i], value => { hooks[i] = typeof value === 'function' ? value(hooks[i]) : value; }]; },
    useRef(initial) { const i = cursor++; return hooks[i] ||= { current: initial }; },
    useCallback(fn, deps) { const i = cursor++; if (!same(hooks[i]?.deps, deps)) hooks[i] = { fn, deps }; return hooks[i].fn; },
    useEffect(fn, deps) { const i = cursor++; if (!same(hooks[i]?.deps, deps)) { hooks[i]?.cleanup?.(); hooks[i] = { deps, cleanup: fn() }; } },
  };
  const location = { latitude: 22.3039, longitude: 70.8022, pincode: '360001', label: 'Kalawad Road', address: { streetNumber: '12', street: 'Kalawad Road', district: 'Rajkot', postalCode: '360001', region: 'Gujarat' } };
  const native = { Platform: { OS: 'android', select: values => values.android || values.default }, Keyboard: { dismiss() {} }, StyleSheet: { create: values => values, absoluteFill: {}, hairlineWidth: 1 } };
  for (const name of ['KeyboardAvoidingView', 'Modal', 'ScrollView', 'Text', 'TextInput', 'TouchableOpacity', 'View']) native[name] = name;
  const sandbox = { exports: {}, console, require(name) {
    if (name === 'react') return react; if (name === 'react/jsx-runtime') return jsx; if (name === 'react-native') return native;
    if (name === 'expo') return { isRunningInExpoGo: () => false };
    if (name === 'expo-constants') return { __esModule: true, default: { expoConfig: { extra: { androidMapsConfigured: true } } } };
    if (name === 'expo-router') return { router: { back() {} }, useLocalSearchParams: () => editing ? { id: 'address1' } : {} };
    if (name === 'expo-location') return {};
    if (name === 'react-native-maps') return { __esModule: true, default: 'MapView', Marker: 'Marker', PROVIDER_GOOGLE: 'google' };
    if (name === 'react-native-safe-area-context') return { SafeAreaProvider: 'Provider', SafeAreaView: 'SafeArea' };
    if (name === 'expo-linear-gradient') return { LinearGradient: 'Gradient' }; if (name === '@expo/vector-icons') return { Ionicons: 'Icon' };
    if (name === '@/constants/theme') return { C: {}, themed: fn => fn() };
    if (name === '@/utils/deliveryZone') return zoneModule.exports; if (name === '@/utils/addressCapabilities') return capsModule.exports;
    if (name === '@/utils/addressLocation') return { currentRajkotLocation: async () => location, searchRajkotAddresses: async () => [location], confirmRajkotPin: async coords => { confirmations.push(coords); return { ...location, ...coords }; } };
    if (name === '@/context/AuthContext') return { useAuth: () => ({ user: { _id: 'customer1' } }) };
    if (name === '@/context/AddressContext') return { useAddress: () => ({ refreshAddresses: async () => {} }) };
    if (name === '@/context/CustomAlertContext') return { showAlert: (...args) => alerts.push(args) };
    if (name === '@/utils/api') return { API: { get: async () => ({ data: { type: 'home', phone: '9909049699', name: 'Existing name', addressLine1: 'Old street', pincode: '360001', location: { coordinates: [70.8, 22.3] } } }), post: async (url, body) => saves.push({ method: 'post', url, body }), put: async (url, body) => saves.push({ method: 'put', url, body }) } };
    if (name === '@/components/AppHeader') return { AppHeader: 'Header' }; if (name === '@/components/AnimatedLoader') return { AnimatedLoader: 'Loader' };
    throw Error(name);
  } };
  vm.runInNewContext(compile('app/add-address.tsx'), sandbox);
  const render = () => { cursor = 0; return sandbox.exports.default(); };
  const text = node => node == null || typeof node === 'boolean' ? '' : typeof node !== 'object' ? String(node) : Array.isArray(node) ? node.map(text).join(' ') : text(node.props?.children);
  const all = (node, type) => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(child => all(child, type)) : [...(node.type === type ? [node] : []), ...all(node.props?.children, type)];
  return { saves, alerts, confirmations, render, all, async start() { render(); await new Promise(setImmediate); render(); }, async click(label) { const button = all(render(), 'TouchableOpacity').find(value => text(value).includes(label)); assert.ok(button, label); assert.ok(!button.props.disabled, label + ' enabled'); await button.props.onPress(); await new Promise(setImmediate); render(); }, phone() { all(render(), 'TextInput').find(node => node.props.placeholder === '10-digit phone number').props.onChangeText('9909049699'); }, mapReady() { all(render(), 'Modal')[0].props.onShow(); all(render(), 'MapView')[0].props.onMapReady(); }, movePin() { all(render(), 'MapView')[0].props.onPress({ nativeEvent: { coordinate: { latitude: 22.31, longitude: 70.81 } } }); } };
}
for (const editing of [false, true]) for (const gps of [false, true]) test(`${editing ? 'Edit' : 'Add'} Address saves ${gps ? 'current GPS location' : 'manually selected map pin'} as GeoJSON`, async () => {
  const h = harness(editing); await h.start(); if (!editing) h.phone();
  await h.click(gps ? 'Use current location' : 'Choose location on map'); h.mapReady(); if (!gps) h.movePin();
  await h.click('Use this location'); await h.click(editing ? 'Update Address' : 'Save Address');
  assert.equal(h.saves.length, 1, JSON.stringify(h.alerts)); assert.equal(h.saves[0].method, editing ? 'put' : 'post');
  const body = h.saves[0].body; assert.equal(body.location.type, 'Point'); assert.equal(body.location.coordinates[0], gps ? 70.8022 : 70.81); assert.equal(body.location.coordinates[1], gps ? 22.3039 : 22.31);
  assert.equal(body.pincode, '360001'); assert.equal(body.addressLine1, '12 Kalawad Road');
  if (editing) assert.equal(body.name, 'Existing name');
});

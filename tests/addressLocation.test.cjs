/* global __dirname */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, imports = {}) {
  const moduleValue = { exports: {} };
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(compiled, { module: moduleValue, exports: moduleValue.exports, require: key => imports[key], setTimeout, clearTimeout, Set });
  return moduleValue.exports;
}
const { getAddressCapabilities } = load('utils/addressCapabilities.ts');
const zone = load('utils/deliveryZone.ts');
const api = () => ({
  Accuracy: { Balanced: 3 },
  requestForegroundPermissionsAsync: async () => ({ status: 'granted' }),
  hasServicesEnabledAsync: async () => true,
  getLastKnownPositionAsync: async () => ({ coords: { latitude: 22.3039, longitude: 70.8022 } }),
  getCurrentPositionAsync: async () => { throw new Error('Recent location should be reused'); },
  reverseGeocodeAsync: async () => [{ streetNumber: '12', street: 'Kalawad Road', district: 'Rajkot', region: 'Gujarat', postalCode: '360001' }],
});
const location = load('utils/addressLocation.ts', { 'expo-location': api(), 'react-native': { Platform: { OS: 'android' } }, './deliveryZone': zone });
test('Expo Go maps and native GPS remain available without an app Maps key', () => {
  const go = getAddressCapabilities('android', true, false);
  assert.equal(go.maps, true); assert.equal(go.location, true);
  const native = getAddressCapabilities('android', false, false);
  assert.equal(native.maps, false); assert.equal(native.location, true);
  assert.equal(getAddressCapabilities('android', false, true).maps, true);
  assert.equal(getAddressCapabilities('ios', false, false).maps, true);
  assert.equal(getAddressCapabilities('web', false, false).maps, false);
});
test('verified current location includes coordinates, PIN and address fields for autofill without map tiles', async () => {
  const result = await location.currentRajkotLocation(api());
  assert.equal(result.pincode, '360001'); assert.equal(result.latitude, 22.3039);
  assert.equal(result.address.street, 'Kalawad Road'); assert.equal(result.address.streetNumber, '12');
});
test('denied GPS permissions and disabled services produce usable errors', async () => {
  await assert.rejects(location.currentRajkotLocation({ ...api(), requestForegroundPermissionsAsync: async () => ({ status: 'denied' }) }), /Allow location access/);
  await assert.rejects(location.currentRajkotLocation({ ...api(), hasServicesEnabledAsync: async () => false }), /Turn on/);
});
test('current location refuses unsupported delivery coordinates and PIN codes', async () => {
  await assert.rejects(location.currentRajkotLocation({ ...api(), getLastKnownPositionAsync: async () => ({ coords: { latitude: 23, longitude: 72 } }) }), /Rajkot/);
  await assert.rejects(location.currentRajkotLocation({ ...api(), reverseGeocodeAsync: async () => [{ postalCode: '380001', region: 'Gujarat' }] }), /PIN/);
});

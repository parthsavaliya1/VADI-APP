const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../app.config.js'), 'utf8');
function config(env) { const moduleValue = { exports: {} }; vm.runInNewContext(source, { module: moduleValue, __dirname: '/test-app', process: { env }, require: name => name === 'fs' ? { existsSync: () => false } : require(name) }); return moduleValue.exports({ config: { android: {}, extra: {} } }); }
test('Android preview APK and production builds allow no Maps key and disable native map selection', () => {
  for (const profile of ['preview', 'production']) { const value = config({ EAS_BUILD_PLATFORM: 'android', EAS_BUILD_PROFILE: profile }); assert.equal(value.extra.androidMapsConfigured, false); assert.equal(value.android.config.googleMaps.apiKey, ''); }
});
test('configured Android build adds one Maps plugin and enables map capability', () => {
  const value = config({ EAS_BUILD_PLATFORM: 'android', EAS_BUILD_PROFILE: 'preview', EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: 'test-maps-key' });
  assert.equal(value.extra.androidMapsConfigured, true);
  assert.equal(value.android.config.googleMaps.apiKey, 'test-maps-key');
  assert.equal(value.plugins.filter(plugin => Array.isArray(plugin) && plugin[0] === 'react-native-maps').length, 1);
});
test('Apple Maps builds and local GPS-only development do not require Android Maps keys', () => {
  assert.equal(config({ EAS_BUILD_PLATFORM: 'ios', EAS_BUILD_PROFILE: 'production' }).extra.androidMapsConfigured, false);
  assert.equal(config({}).extra.androidMapsConfigured, false);
});

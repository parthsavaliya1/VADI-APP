/* global __dirname */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function loadFirebase(fetchImpl) {
  const module = { exports: {} };
  const source = fs.readFileSync(path.join(__dirname, '..', 'firebase.ts'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(compiled, { module, exports: module.exports, URL, AbortController, setTimeout, clearTimeout, fetch: fetchImpl, console: { log() {} } });
  return module.exports;
}
const response = entries => async () => ({ ok: true, json: async () => ({ entries }) });
test('Firebase key supplies the backend URL and trims trailing slashes', async () => {
  const firebase = loadFirebase(response({ product_api_base_url: 'https://remote.example.test///', api_base_url: 'https://other-app.example.test' }));
  await firebase.loadRemoteConfig();
  assert.equal(firebase.getApiUrl(), 'https://remote.example.test');
});
test('Firebase object values are supported', async () => {
  const firebase = loadFirebase(response({ product_api_base_url: { value: 'https://remote.example.test' } }));
  await firebase.loadRemoteConfig();
  assert.equal(firebase.getApiUrl(), 'https://remote.example.test');
});
test('missing or invalid remote URLs keep the production fallback', async () => {
  for (const value of [undefined, 'http://192.168.29.55:5000', 'https:192.168.29.55:5000', 'not a URL', 'https://user:password@example.test', 'https://example.test?token=value', 'https://example.test#fragment']) {
    const firebase = loadFirebase(response({ product_api_base_url: value }));
    const fallback = firebase.getApiUrl();
    await firebase.loadRemoteConfig();
    assert.equal(firebase.getApiUrl(), fallback);
    assert.equal(fallback, 'https://api.product.vadindia.com');
  }
});
test('fetch errors and rejected responses preserve the fallback', async () => {
  for (const fetchImpl of [async () => { throw new Error('offline'); }, async () => ({ ok: false, status: 503 })]) {
    const firebase = loadFirebase(fetchImpl);
    const fallback = firebase.getApiUrl();
    await firebase.loadRemoteConfig();
    assert.equal(firebase.getApiUrl(), fallback);
  }
});
test('a failed refresh retains the last valid Firebase URL', async () => {
  let calls = 0;
  const firebase = loadFirebase(async () => { if (calls++) throw new Error('offline'); return { ok: true, json: async () => ({ entries: { product_api_base_url: 'https://remote.example.test' } }) }; });
  await firebase.loadRemoteConfig();
  await firebase.loadRemoteConfig();
  assert.equal(firebase.getApiUrl(), 'https://remote.example.test');
});
test('a stalled Firebase request is aborted and leaves a usable fallback', async () => {
  let aborted = false;
  const firebase = loadFirebase((_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => { aborted = true; reject(new Error('aborted')); }, { once: true });
  }));
  await firebase.loadRemoteConfig();
  assert.equal(aborted, true);
  assert.equal(firebase.getApiUrl(), 'https://api.product.vadindia.com');
});

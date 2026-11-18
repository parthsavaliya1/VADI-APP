const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
const jsx = require('react/jsx-runtime');
function harness(patch = {}) {
  const order = { _id: 'order-tracking-123', status: 'delivered', deliveredAt: new Date(Date.now() - 60000).toISOString(),
    items: [{ variantId: 'variant1', productName: 'Tomato', quantity: 2 }], ...patch };
  let cursor = 0, fail = false, refreshed = 0;
  const state = [], requests = [], alerts = [];
  const react = { useState(initial) {
    const index = cursor++; if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial;
    return [state[index], value => { state[index] = typeof value === 'function' ? value(state[index]) : value; }];
  }, useRef(initial) { const index = cursor++; return state[index] ||= { current: initial }; } };
  const source = fs.readFileSync(path.join(__dirname, '../components/OrderReturn.tsx'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const sandbox = { exports: {}, require(name) {
    if (name === 'react') return react;
    if (name === 'react/jsx-runtime') return jsx;
    if (name === 'react-native') return { Pressable: 'Pressable', Text: 'Text', TextInput: 'TextInput', View: 'View' };
    if (name === '@/context/AuthContext') return { useAuth: () => ({ user: { _id: 'customer1' } }) };
    if (name === '@/context/CustomAlertContext') return { showAlert: (...args) => alerts.push(args) };
    if (name === '@/utils/orderActionPresentation') return { isWithinReturnWindow: date => Number.isFinite(+new Date(date)) && Date.now() - +new Date(date) < 86400000 };
    if (name === '@/constants/theme') return { C: { ink: '#111', muted: '#555', primary: '#070', line: '#ddd' } };
    if (name === '@/utils/api') return { API: { async post(url, body) {
      requests.push({ url, body }); if (fail) throw { response: { data: { message: 'The return window has ended' } } };
      return { data: { success: true, data: { returnRequest: { status: 'pending' } } } };
    } } };
    throw Error(name);
  } };
  vm.runInNewContext(compiled, sandbox);
  const render = () => { cursor = 0; return sandbox.exports.default({ order, onRefresh: async () => { refreshed++; } }); };
  const text = node => node == null || typeof node === 'boolean' ? '' : typeof node === 'string' || typeof node === 'number' ? String(node)
    : Array.isArray(node) ? node.map(text).join(' ') : text(node.props?.children);
  function all(node, predicate) {
    if (!node || typeof node !== 'object') return [];
    if (Array.isArray(node)) return node.flatMap(item => all(item, predicate));
    return [...(predicate(node) ? [node] : []), ...all(node.props?.children, predicate)];
  }
  const normalizedText = node => text(node).replace(/\s+/g, ' ').trim();
  const button = label => all(render(), node => node.type === 'Pressable').find(node => normalizedText(node) === label || node.props.accessibilityLabel === label);
  return { requests, alerts, get refreshed() { return refreshed; }, text: () => normalizedText(render()), button,
    async press(label) { const element = button(label); assert.ok(element, 'Button exists: ' + label); assert.ok(!element.props.disabled, 'Button enabled: ' + label); element.props.onPress(); await new Promise(setImmediate); render(); },
    reason(value) { const field = all(render(), node => node.type === 'TextInput')[0]; assert.ok(field); field.props.onChangeText(value); render(); },
    async confirmPackaging() { const field = all(render(), node => node.props?.accessibilityRole === 'checkbox')[0]; assert.ok(field); field.props.onPress(); await new Promise(setImmediate); render(); },
    fail: value => { fail = value; },
  };
}
test('Request return opens the form on the current screen', async () => {
  const h = harness(); await h.press('Request return');
  assert.ok(h.button('Refund')); assert.ok(h.button('Replace')); assert.ok(h.button('Submit return request'));
  assert.equal(h.requests.length, 0);
});
test('submission stays disabled until item, reason and packaging confirmation are supplied', async () => {
  const h = harness(); await h.press('Request return'); assert.equal(h.button('Submit return request').props.disabled, true);
  await h.press('Refund'); h.reason('Damaged sealed item'); assert.equal(h.button('Submit return request').props.disabled, true);
  await h.confirmPackaging(); assert.equal(h.button('Submit return request').props.disabled, false);
});
test('tracking return submits the current order ID and chosen quantity', async () => {
  const h = harness(); await h.press('Request return'); await h.press('Refund');
  await h.press('Reduce return quantity for Tomato'); h.reason('Damaged sealed item'); await h.confirmPackaging();
  await h.press('Submit return request');
  assert.equal(h.requests[0].url, '/orders/order-tracking-123/return');
  assert.equal(h.requests[0].body.items[0].quantity, 1); assert.equal(h.requests[0].body.items[0].action, 'refund');
  assert.equal(h.requests[0].body.packagingConfirmed, true); assert.equal(h.refreshed, 1);
  assert.ok(h.text().includes('Awaiting admin review')); assert.equal(h.button('Submit return request'), undefined);
});
test('replacement requests use replacement action and never claim an immediate refund', async () => {
  const h = harness(); await h.press('Request return'); await h.press('Replace'); h.reason('Wrong sealed item'); await h.confirmPackaging();
  await h.press('Submit return request'); assert.equal(h.requests[0].body.items[0].action, 'replace');
  assert.ok(h.alerts.at(-1)[1].includes('admin review'));
});
test('quantity controls enforce one through ordered quantity', async () => {
  const h = harness(); await h.press('Request return'); await h.press('Refund');
  assert.equal(h.button('Increase return quantity for Tomato').props.disabled, true);
  await h.press('Reduce return quantity for Tomato'); assert.equal(h.button('Reduce return quantity for Tomato').props.disabled, true);
});
test('expired orders show the policy message instead of an ineffective return button', () => {
  const h = harness({ deliveredAt: new Date(Date.now() - 25 * 3600000).toISOString() });
  assert.equal(h.button('Request return'), undefined); assert.ok(h.text().includes('24-hour return window has ended'));
});
test('existing requests and approved refunds remain visible on returned orders', () => {
  const h = harness({ status: 'returned', returnRequest: { status: 'approved', refundedTo: 'original', refundAmount: 100 } });
  assert.ok(h.text().includes('Request approved')); assert.ok(h.text().includes('original payment method'));
  assert.equal(h.button('Request return'), undefined);
});
test('server rejection displays the error and refreshes the order without claiming success', async () => {
  const h = harness(); h.fail(true); await h.press('Request return'); await h.press('Refund'); h.reason('Damaged sealed item'); await h.confirmPackaging();
  await h.press('Submit return request'); assert.ok(h.alerts.at(-1)[1].includes('window has ended'));
  assert.ok(!h.text().includes('Request pending')); assert.equal(h.refreshed, 1);
});

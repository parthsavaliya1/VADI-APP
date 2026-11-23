const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const ts = require('typescript');

function load(file, imports) {
  const module = { exports: {} };
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  vm.runInNewContext(compiled, { module, exports: module.exports, require: name => imports[name] || require(name), Error, console, setTimeout, clearTimeout });
  return module.exports;
}

function recoverySetup() {
  const values = new Map(), requests = [];
  const storage = { async getItem(key) { return values.get(key) || null; }, async setItem(key, value) { values.set(key, value); }, async removeItem(key) { values.delete(key); } };
  const API = {
    async post(url, body) { requests.push({ url, body }); return { data: { success: true } }; },
    async get(url) { requests.push({ url }); return { data: { success: true, data: { order: { _id: 'existing' } } } }; },
  };
  const recovery = load('utils/checkoutRecovery.ts', { '@react-native-async-storage/async-storage': storage, '@/utils/api': { API } });
  return { recovery, requests, values };
}
const payment = () => ({ userId: 'customer', amount: 20, payload: { address: { _id: 'address' }, paymentMethod: 'upi', deliveryFee: 0, paymentDetails: { razorpayPaymentId: 'payment-1', razorpayOrderId: 'gateway-1', razorpaySignature: 'signature' } } });

test('preserves the backend amount-mismatch detail instead of the generic order error', () => {
  const { recovery: r } = recoverySetup();
  const error = r.orderPlacementError({ response: { status: 500, data: { message: 'Failed to create order', error: 'Payment amount does not match the order total' } } });
  assert.equal(r.isPaymentAmountMismatch(error), true);
  assert.equal(r.isPaymentAmountMismatch(new Error('Network error')), false);
});

test('uncertain confirmation retains payment proof across reloads and isolates customers', async () => {
  const { recovery: r } = recoverySetup(), pending = payment();
  await r.savePendingCheckout(pending);
  await assert.rejects(r.confirmPendingCheckout(pending, async () => { throw new Error('Connection interrupted'); }), /Connection interrupted/);
  assert.equal((await r.readPendingCheckout('customer')).payload.paymentDetails.razorpayPaymentId, 'payment-1');
  assert.equal(await r.readPendingCheckout('other-customer'), null);
});

test('a lost successful order response recovers the existing order without a new payment or cart deletion', async () => {
  const { recovery: r, requests } = recoverySetup();
  const result = await r.confirmPendingCheckout(payment(), async () => { throw new r.OrderPlacementError('Already used', 409, 'existing'); });
  assert.equal(result.data.order._id, 'existing');
  assert.deepEqual(requests.map(request => request.url), ['/payments/verify-signature', '/orders/existing']);
});

function checkoutSetup({ gatewayFailure = false, orderFailure = false, lostResponse = false } = {}) {
  const { recovery, values } = recoverySetup();
  let cursor = 0, gatewayCount = 0, failGateway = gatewayFailure, failOrder = orderFailure, lost = lostResponse;
  let items = [{ id: 'first', productId: 'first', variantId: 'pack', name: 'First product', variantLabel: '1kg', price: 20, qty: 1 }];
  const state = [], effects = [], alerts = [], attempts = [], gatewayAmounts = [], calls = [];
  const react = {
    useState(initial) { const i = cursor++; if (!(i in state)) state[i] = typeof initial === 'function' ? initial() : initial; return [state[i], value => { state[i] = typeof value === 'function' ? value(state[i]) : value; }]; },
    useRef(initial) { const i = cursor++; return state[i] ||= { current: initial }; },
    useEffect(callback, deps) { const i = cursor++, previous = state[i]; if (!previous || deps.some((value, index) => value !== previous[index])) { state[i] = deps; effects.push(callback); } },
  };
  const jsx = { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
  const animation = () => ({ start() {}, stop() {} });
  const address = { _id: 'address', name: 'Home', city: 'Rajkot', phone: '9999999999', addressLine1: 'Road', state: 'Gujarat', pincode: '360001' };
  const refreshCart = async () => ({ ok: true, itemCount: items.length, grandTotal: items.reduce((sum, item) => sum + item.price * item.qty, 0) });
  const imports = {
    react, 'react/jsx-runtime': jsx,
    'react-native': { Animated: { Value: class { interpolate() { return 1; } }, View: 'AnimatedView', timing: animation, spring: animation, loop: animation, parallel: animation, sequence: animation }, LayoutAnimation: { configureNext() {}, Presets: { easeInEaseOut: {} } }, Platform: { OS: 'ios' }, StyleSheet: { create: value => value }, UIManager: {}, ScrollView: 'ScrollView', Text: 'Text', TextInput: 'TextInput', TouchableOpacity: 'Button', View: 'View' },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    'expo-router': { router: { push() {}, replace() {} } }, '@expo/vector-icons': { Ionicons: 'Icon' },
    '@/components/AppHeader': { AppHeader: 'Header' }, '@/utils/deliveryZone': { deliveryAddressError: () => null },
    '@/context/AuthContext': { useAuth: () => ({ user: { _id: 'customer', name: 'Customer' } }) },
    '@/context/AddressContext': { useAddress: () => ({ selectedAddress: address, defaultAddress: address, addresses: [address], setSelectedAddress() {}, refreshAddresses: async () => {} }) },
    '@/context/CustomAlertContext': { showAlert: (...args) => alerts.push(args) },
    '../context/CartContext': { useCart: () => ({ items, loading: false, refreshCart, clearCart: async () => { calls.push('clearCart'); items = []; } }) },
    '@/context/OrderContext': { useOrders: () => ({ async placeOrder(payload) {
      attempts.push(payload);
      if (failOrder) { failOrder = false; throw new recovery.OrderPlacementError('Payment amount does not match the order total', 500); }
      if (lost) { lost = false; items = []; throw new Error('Connection interrupted'); }
      if (lostResponse && attempts.length > 1) throw new recovery.OrderPlacementError('Already used', 409, 'existing');
      items = []; return { success: true };
    } }) },
    '@/utils/api': { API: { async get(url) { if (url.startsWith('/addresses/')) return { data: [address] }; return { data: { data: { balance: 100 } } }; } } },
    '@/utils/checkoutRecovery': recovery,
    '../utils/deliveryQuote': { DEFAULT_FEE_SETTINGS: { deliveryFee: 0, freeDeliveryAbove: 100 }, fetchFeeSettings: async () => ({ deliveryFee: 0, freeDeliveryAbove: 100 }), quoteDeliveryFee: () => 0 },
    '@/constants/theme': { C: { primary: '#164f2d' }, themed: create => create() },
    '@/utils/razorpay': { async openRazorpay(options) {
      gatewayCount++; gatewayAmounts.push(options.amount);
      if (failGateway) { failGateway = false; options.onFailure('Payment cancelled'); return; }
      await options.onSuccess({ paymentId: `payment-${gatewayCount}`, orderId: `gateway-${gatewayCount}`, signature: 'signature' });
    } },
  };
  const Screen = load('app/checkout.tsx', imports).default;
  function render() { cursor = 0; const tree = Screen(); while (effects.length) effects.shift()(); return tree; }
  const all = (node, predicate) => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(child => all(child, predicate)) : [...(predicate(node) ? [node] : []), ...all(node.props?.children, predicate)];
  const text = node => node == null || typeof node === 'boolean' ? '' : typeof node === 'string' || typeof node === 'number' ? String(node) : Array.isArray(node) ? node.map(text).join('') : text(node.props?.children);
  const button = label => all(render(), node => node.type === 'Button').find(node => typeof label === 'string' ? text(node).trim() === label : label.test(text(node).trim()));
  async function settle() { render(); await new Promise(setImmediate); render(); }
  return { settle, values, attempts, calls, gatewayAmounts, alerts, get gatewayCount() { return gatewayCount; }, get itemCount() { return items.length; },
    addSecond() { items = [...items, { ...items[0], id: 'second', productId: 'second', name: 'Second product', price: 10, qty: 1 }]; render(); },
    button, async press(label) { const target = button(label); assert.ok(target, `Button exists: ${label}`); assert.ok(!target.props.disabled, `Button enabled: ${label}`); await target.props.onPress(); await settle(); },
  };
}

test('cancelled payment releases checkout, preserves the cart and permits a second item and a fresh payment', async () => {
  const h = checkoutSetup({ gatewayFailure: true }); await h.settle();
  await h.press('PAY ₹20'); assert.equal(h.itemCount, 1);
  h.addSecond(); await h.press('PAY ₹30');
  assert.deepEqual(h.gatewayAmounts, [20, 30]); assert.equal(h.attempts.length, 1); assert.equal(h.itemCount, 0); assert.equal(h.calls.length, 0);
});

test('failed order with mismatched amount allows another item and a new checkout with fresh payment proof', async () => {
  const h = checkoutSetup({ orderFailure: true }); await h.settle(); await h.press('PAY ₹20');
  assert.equal(h.itemCount, 1); assert.equal(h.values.size, 1); assert.ok(h.button('PAY ₹20').props.disabled);
  h.addSecond(); await h.press('Start new checkout'); assert.equal(h.values.size, 0); assert.equal(h.itemCount, 2);
  await h.press('PAY ₹30');
  assert.equal(h.attempts[0].paymentDetails.razorpayPaymentId, 'payment-1'); assert.equal(h.attempts[1].paymentDetails.razorpayPaymentId, 'payment-2');
  assert.deepEqual(h.gatewayAmounts, [20, 30]); assert.equal(h.calls.length, 0);
});

test('uncertain successful order retries confirmation without charging again or clearing a newly added item', async () => {
  const h = checkoutSetup({ lostResponse: true }); await h.settle(); await h.press('PAY ₹20');
  assert.equal(h.itemCount, 0); assert.equal(h.button('Start new checkout'), undefined);
  h.addSecond(); await h.press('Retry order confirmation');
  assert.equal(h.gatewayCount, 1); assert.equal(h.itemCount, 1); assert.equal(h.values.size, 0); assert.equal(h.calls.length, 0);
});

test('failed COD and wallet orders release checkout and allow a second item without deleting the cart', async () => {
  for (const method of ['cod', 'balance']) {
    const h = checkoutSetup({ orderFailure: true }); await h.settle();
    await h.press(method === 'cod' ? /Cash on Delivery/ : /VADI Wallet/);
    await h.press(method === 'cod' ? 'PLACE ORDER' : 'PAY ₹20 FROM WALLET');
    assert.equal(h.itemCount, 1);
    h.addSecond();
    await h.press(method === 'cod' ? 'PLACE ORDER' : 'PAY ₹30 FROM WALLET');
    assert.equal(h.attempts.length, 2); assert.equal(h.gatewayCount, 0); assert.equal(h.calls.length, 0); assert.equal(h.itemCount, 0);
  }
});

test('Razorpay waits for asynchronous order confirmation and hands over proof before verification', async () => {
  const requests = [];
  const gateway = load('utils/razorpay.ts', {
    '@/context/CustomAlertContext': { showAlert() {} },
    '@/utils/api': { API: { async post(url) { requests.push(url); return { data: { success: true, data: { key: 'key', razorpayOrderId: 'gateway', amountInPaise: 2000, currency: 'INR' } } }; } } },
    '@/components/RazorpayCheckout': { payWithRazorpayCheckout: async () => ({ razorpay_payment_id: 'payment', razorpay_order_id: 'gateway', razorpay_signature: 'signature' }) },
  });
  let release, received = false, finished = false;
  const confirmation = new Promise(resolve => { release = resolve; });
  const pending = gateway.openRazorpay({ userId: 'customer', amount: 20, deliveryFee: 0, paymentMethod: 'upi',
    async onSuccess(proof) { assert.equal(proof.paymentId, 'payment'); received = true; await confirmation; },
    onFailure(message) { assert.fail(message); },
  }).then(() => { finished = true; });
  await new Promise(setImmediate);
  assert.equal(received, true); assert.equal(finished, false);
  assert.deepEqual(requests, ['/payments/create-order']);
  release(); await pending; assert.equal(finished, true);
});

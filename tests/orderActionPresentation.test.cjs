const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../utils/orderActionPresentation.ts'), 'utf8');
const sandbox = { exports: {} }; vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, sandbox);
const { canCancelOrder, isWithinReturnWindow, cancellationMessage } = sandbox.exports;
test('cancel action is available only before out-for-delivery', () => {
  for (const status of ['placed', 'confirmed', 'packed', 'shipped']) assert.equal(canCancelOrder(status), true);
  for (const status of ['out_for_delivery', 'delivered', 'cancelled', 'returned']) assert.equal(canCancelOrder(status), false);
});
test('return window includes exactly 24 hours and excludes unknown delivery dates', () => {
  assert.equal(isWithinReturnWindow('2026-11-18T00:00:00Z', +new Date('2026-11-19T00:00:00Z')), true);
  assert.equal(isWithinReturnWindow('2026-11-18T00:00:00Z', +new Date('2026-11-19T00:00:01Z')), false);
  assert.equal(isWithinReturnWindow(undefined), false);
});
test('unpaid cancellation clearly says no refund is needed', () => {
  assert.ok(cancellationMessage({ refundAmount: 0, refundedTo: 'none' }).includes('no refund is needed'));
});
test('pending refund is not presented as completed', () => {
  const text = cancellationMessage({ state: 'processing', refundAmount: 120, refundedTo: 'original' });
  assert.ok(text.includes('pending')); assert.ok(text.includes('original payment method')); assert.ok(text.includes('History'));
});
test('wallet and online refunds describe their actual destination', () => {
  assert.ok(cancellationMessage({ state: 'completed', refundAmount: 120, refundedTo: 'wallet' }).includes('VADI wallet'));
  assert.ok(cancellationMessage({ state: 'completed', refundAmount: 120, refundedTo: 'original' }).includes('original payment method'));
});
test('provider-confirmed refund failure tells the customer to contact support', () => {
  const text = cancellationMessage({ state: 'processing', refundStatus: 'failed', refundAmount: 120, refundedTo: 'original' });
  assert.ok(text.includes('needs attention')); assert.ok(text.includes('Contact support')); assert.ok(!text.includes('refunded to'));
});

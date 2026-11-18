const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../utils/returnProgress.ts'), 'utf8');
const sandbox = { exports: {} };
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, sandbox);
const { getReturnProgress } = sandbox.exports;
const request = stage => ({ status: 'approved', items: [{ action: 'replace' }], fulfillment: { stage } });
test('ordinary orders retain the existing delivery timeline', () => {
  for (const status of ['placed', 'confirmed', 'out_for_delivery', 'delivered']) assert.equal(getReturnProgress(status), null);
});
test('approved return begins at Return accepted rather than Order Placed', () => {
  const result = getReturnProgress('returned', { status: 'approved', items: [{ action: 'refund' }] });
  assert.equal(result.label, 'Return accepted'); assert.equal(result.index, 1); assert.equal(result.complete, false);
  assert.ok(result.steps.every(step => !step.label.includes('Order Placed')));
});
test('returned and delivered orders reflect the actual pickup and replacement stage', () => {
  for (const status of ['returned', 'delivered']) {
    for (const [stage, label] of Object.entries({ pickup_assigned: 'Pickup scheduled', collected: 'Items collected', received: 'Received at VADI', inspected: 'Inspection complete', replacement_ready: 'Replacement packed', out_for_delivery: 'Replacement out for delivery', completed: 'Replacement delivered' })) {
      const result = getReturnProgress(status, request(stage)); assert.equal(result.label, label); assert.equal(result.steps[result.index].key, stage); assert.equal(result.complete, stage === 'completed');
    }
  }
});
test('refund-only return omits replacement delivery stages', () => {
  const result = getReturnProgress('returned', { status: 'approved', items: [{ action: 'refund' }], fulfillment: { stage: 'completed' } });
  assert.equal(result.label, 'Return completed'); assert.equal(result.complete, true);
  assert.ok(result.steps.every(step => !step.label.includes('Replacement')));
});
test('pending and processing requests do not claim pickup has been accepted', () => {
  assert.equal(getReturnProgress('delivered', { status: 'pending' }).label, 'Return requested');
  assert.equal(getReturnProgress('delivered', { status: 'processing' }).label, 'Refund processing');
});
test('rejected and legacy returned orders never fall back to placed', () => {
  const rejected = getReturnProgress('delivered', { status: 'rejected' }); assert.equal(rejected.label, 'Return rejected'); assert.equal(rejected.complete, true);
  assert.equal(getReturnProgress('returned').label, 'Return completed');
});

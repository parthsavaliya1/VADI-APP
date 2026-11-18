const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../utils/walletPresentation.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const sandbox = { exports: {} }; vm.runInNewContext(compiled, sandbox);
const present = sandbox.exports.walletHistoryPresentation;
const base = { _id: 'txn', amount: 100, createdAt: '2026-11-18T00:00:00Z', status: 'paid' };
test('pending top-up does not display an added balance', () => {
  const row = present({ ...base, reason: 'topup', status: 'pending', direction: 'credit' });
  assert.equal(row.amount, '₹100'); assert.equal(row.noCredit, true); assert.equal(row.statusText, 'Awaiting payment confirmation');
});
test('confirmed top-up displays a credit', () => {
  const row = present({ ...base, reason: 'topup', direction: 'credit' });
  assert.equal(row.amount, '+₹100'); assert.equal(row.statusText, 'Completed');
});
test('original-method refunds do not look like wallet credits', () => {
  const row = present({ ...base, reason: 'original_refund', direction: 'credit', affectsBalance: false, order: { orderNumber: 'ORD-1' } });
  assert.equal(row.amount, '₹100'); assert.equal(row.external, true); assert.ok(row.title.includes('ORD-1'));
  assert.equal(row.statusText, 'Refund processed');
});
test('pending wallet refund shows reserved debit and pending status', () => {
  const row = present({ ...base, reason: 'withdrawal', direction: 'debit', status: 'processing' });
  assert.equal(row.amount, '−₹100'); assert.equal(row.statusText, 'Refund pending');
  assert.equal(row.destination, 'Original payment method');
});
test('failed refund and its balance restoration are distinct history entries', () => {
  const failed = present({ ...base, reason: 'withdrawal', direction: 'debit', status: 'failed', fundsRestored: true });
  const restored = present({ ...base, reason: 'withdrawal_reversal', direction: 'credit' });
  assert.equal(failed.statusText, 'Failed · money restored'); assert.equal(restored.amount, '+₹100');
  assert.ok(restored.title.includes('restored to wallet'));
});
test('wallet order refunds include the order number', () => {
  const row = present({ ...base, reason: 'refund', direction: 'credit', order: { orderNumber: 'ORD-2' } });
  assert.equal(row.title, 'Order refund to wallet · #ORD-2'); assert.equal(row.amount, '+₹100');
});
test('referral rewards and unlinked legacy credits are not falsely labelled order refunds', () => {
  assert.equal(present({ ...base, reason: 'referral' }).title, 'Referral reward');
  assert.equal(present({ ...base, reason: 'refund' }).title, 'Wallet credit');
});
test('order spending displays a debit with its order reference', () => {
  const row = present({ ...base, reason: 'order', direction: 'debit', order: { orderNumber: 'ORD-3' } });
  assert.equal(row.amount, '−₹100'); assert.equal(row.title, 'Order payment · #ORD-3');
});

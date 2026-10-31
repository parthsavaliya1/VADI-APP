/* global __dirname */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const moduleValue = { exports: {} };
const source = fs.readFileSync(path.join(__dirname, '../utils/productLayout.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
vm.runInNewContext(compiled, { module: moduleValue, exports: moduleValue.exports, Math });
const { getProductLayout } = moduleValue.exports;
test('cards fit phone, split-window and tablet widths with small through maximum text scaling', () => {
  for (const width of [240, 280, 320, 360, 393, 414, 600, 768, 1024]) {
    for (const fontScale of [0.85, 1, 1.15, 1.3, 1.5, 2, 3.2]) {
      const layout = getProductLayout(width, fontScale);
      const available = width - 32;
      assert.ok(layout.gridCardWidth > 0);
      assert.ok(layout.gridCardWidth * layout.columns + (layout.columns - 1) * 10 <= available + 0.01);
      for (const key of ['horizontalCardWidth', 'trendingCardWidth']) assert.ok(layout[key] > 0 && layout[key] <= available, `${width}/${fontScale}/${key}`);
      assert.equal(layout.columns, 2);
      assert.ok(layout.horizontalCardWidth * 2 + 12 <= available);
      assert.ok(layout.trendingCardWidth * 2 + 12 <= available);
    }
  }
});
test('increasing text size preserves two columns and card widths', () => {
  for (const width of [280, 320, 360, 414, 768]) {
    let previous = getProductLayout(width, 0.85);
    for (const scale of [1, 1.3, 1.5, 2, 3.2]) {
      const current = getProductLayout(width, scale);
      assert.equal(current.columns, 2);
      assert.equal(current.horizontalCardWidth, previous.horizontalCardWidth);
      assert.equal(current.trendingCardWidth, previous.trendingCardWidth);
      previous = current;
    }
  }
});
test('large text and narrow windows use stacked price and add actions', () => {
  assert.equal(getProductLayout(360, 2).stackActions, true);
  assert.equal(getProductLayout(280, 1).stackActions, true);
  assert.equal(getProductLayout(393, 1).stackActions, false);
});

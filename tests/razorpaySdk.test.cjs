const { test } = require('node:test');
const assert = require('node:assert/strict');
const { applyRazorpaySdkPin } = require('../plugins/withRazorpaySdk');

test('repeated prebuilds preserve existing Gradle configuration and produce one Razorpay override', () => {
  const original = "buildscript { repositories { google(); mavenCentral() } }\nallprojects { repositories { mavenCentral() } }\n";
  const once = applyRazorpaySdkPin(original);
  const twice = applyRazorpaySdkPin(once);
  assert.equal(twice, once);
  assert.ok(twice.startsWith(original.trimEnd()));
  assert.equal((twice.match(/@generated begin vadi-razorpay-sdk/g) || []).length, 1);
  assert.match(twice, /details.requested.group == 'com.razorpay' && details.requested.name == 'standard-core'/);
  assert.match(twice, /details.useVersion '1.7.18'/);
  assert.doesNotMatch(twice, /exclude|disableValidation|enforceUniquePackageName/);
});

test('a previously generated dependency pin is replaced rather than duplicated', () => {
  const old = applyRazorpaySdkPin('allprojects {}').replace("details.useVersion '1.7.18'", "details.useVersion '1.7.1'");
  const updated = applyRazorpaySdkPin(old);
  assert.doesNotMatch(updated, /details.useVersion '1.7.1'/);
  assert.match(updated, /details.useVersion '1.7.18'/);
  assert.equal((updated.match(/resolutionStrategy.eachDependency/g) || []).length, 1);
});

test('an incomplete generated block fails explicitly instead of truncating project configuration', () => {
  assert.throws(() => applyRazorpaySdkPin('allprojects {}\n// @generated begin vadi-razorpay-sdk\n'), /Incomplete VADI Razorpay/);
});

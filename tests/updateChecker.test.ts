import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSemver, isNewerVersion } from '../src/domain/updateChecker.ts';

test('1.1 parseSemver extracts numeric segments correctly', () => {
  assert.deepEqual(parseSemver('0.2.6'), [0, 2, 6]);
  assert.deepEqual(parseSemver('v0.2.6'), [0, 2, 6]);
  assert.deepEqual(parseSemver('1.0.0'), [1, 0, 0]);
  assert.deepEqual(parseSemver('v2.15.3-beta1'), [2, 15, 3]);
  assert.deepEqual(parseSemver('1.2'), [1, 2, 0]);
  assert.deepEqual(parseSemver(''), [0, 0, 0]);
  assert.deepEqual(parseSemver(null), [0, 0, 0]);
});

test('1.2 isNewerVersion accurately detects newer releases', () => {
  // Newer patch
  assert.equal(isNewerVersion('0.2.5', '0.2.6'), true);
  assert.equal(isNewerVersion('v0.2.5', 'v0.2.6'), true);
  assert.equal(isNewerVersion('0.2.6', '0.2.7'), true);

  // Newer minor
  assert.equal(isNewerVersion('0.2.6', '0.3.0'), true);
  assert.equal(isNewerVersion('0.2.6', '0.3.1'), true);

  // Newer major
  assert.equal(isNewerVersion('0.2.6', '1.0.0'), true);

  // Equal versions
  assert.equal(isNewerVersion('0.2.6', '0.2.6'), false);
  assert.equal(isNewerVersion('v0.2.6', '0.2.6'), false);
  assert.equal(isNewerVersion('0.2.6', 'v0.2.6'), false);

  // Older versions
  assert.equal(isNewerVersion('0.2.6', '0.2.5'), false);
  assert.equal(isNewerVersion('0.3.0', '0.2.6'), false);
  assert.equal(isNewerVersion('1.0.0', '0.9.9'), false);
});
